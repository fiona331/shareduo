import { randomUUID } from "crypto";
import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { pushArtifactSchema, handlePushArtifact }     from "./tools/push_artifact.js";
import { deleteArtifactSchema, handleDeleteArtifact } from "./tools/delete_artifact.js";
import { createOAuthProvider, checkMcpToken, issueAuthCode, passwordPageHtml } from "./auth/provider.js";

// Validate env at startup
import "./lib/env.js";

// ---------------------------------------------------------------------------
// OAuth provider
// ---------------------------------------------------------------------------

const oauthProvider = createOAuthProvider();
const ISSUER_URL = new URL(process.env.MCP_BASE_URL ?? "https://mcp.shareduo.com");

// ---------------------------------------------------------------------------
// MCP server factory (one instance per connection)
// ---------------------------------------------------------------------------

function createMcpServer(): Server {
  const server = new Server(
    { name: "shareduo-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [pushArtifactSchema, deleteArtifactSchema],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      switch (name) {
        case "push_artifact":   return await handlePushArtifact(args);
        case "delete_artifact": return await handleDeleteArtifact(args);
        default:
          return {
            content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const app = express();

// Railway's edge proxy sets X-Forwarded-For / X-Forwarded-Proto. Without
// trust proxy, express-rate-limit (used by the MCP SDK auth router on
// /authorize, /token, /register) throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// and the OAuth endpoints fail. Trust one hop (Railway's edge).
app.set("trust proxy", 1);

// CORS — must come before auth middleware so preflight OPTIONS succeeds.
// MCP clients use custom headers (Mcp-Session-Id, Last-Event-ID) and need
// to read Mcp-Session-Id off responses to resume sessions.
app.use(
  cors({
    origin: true, // reflect request origin
    credentials: true,
    exposedHeaders: ["Mcp-Session-Id", "WWW-Authenticate"],
    allowedHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id", "Last-Event-ID"],
  })
);

// Parse bodies at app level so our logger and downstream handlers both
// see req.body. Express body parsers are idempotent, so the SDK's own
// urlencoded middleware will no-op once we've already parsed.
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Dev logging — path, headers, plus redacted body for /token and /register.
app.use((req, res, next) => {
  const p = req.path;
  if (
    p === "/" ||
    p === "/token" ||
    p === "/register" ||
    p === "/authorize" ||
    p === "/auth-verify" ||
    p === "/messages" ||
    p.startsWith("/.well-known")
  ) {
    const hasAuth = req.headers.authorization ? "✓auth" : "✗auth";
    const hasSess = req.headers["mcp-session-id"] ? "✓sess" : "";
    const ct = req.headers["content-type"] ?? "-";
    console.log(`[req] ${req.method} ${p} ${hasAuth} ${hasSess} ct=${ct}`);

    if (p === "/token" || p === "/register") {
      const body = { ...(req.body ?? {}) } as Record<string, unknown>;
      if (body.client_secret) body.client_secret = "***";
      if (typeof body.code_verifier === "string") {
        body.code_verifier = `len=${body.code_verifier.length}`;
      }
      if (typeof body.code === "string") {
        body.code = `${body.code.slice(0, 8)}...`;
      }
      console.log(`[${p} body]`, JSON.stringify(body));
    }

    res.on("finish", () => {
      console.log(`[res] ${req.method} ${p} → ${res.statusCode}`);
    });
  }
  next();
});

// Mount OAuth endpoints (/.well-known/*, /authorize GET, /token, /revoke)
app.use(
  mcpAuthRouter({
    provider: oauthProvider,
    issuerUrl: ISSUER_URL,
    resourceName: "ShareDuo MCP",
  })
);

// Password form submission — on a path OUTSIDE /authorize so it doesn't get
// routed through the SDK's authorization sub-router (which applies rate
// limiting and its own body parsing that can shadow our handler).
app.post("/auth-verify", express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, string>;
    const token          = body.token          ?? "";
    const code_challenge = body.code_challenge ?? "";
    const redirect_uri   = body.redirect_uri   ?? "";
    const state          = body.state          ?? "";

    if (!code_challenge || !redirect_uri) {
      res.status(400).send("Missing required parameters. Please restart the connection from Claude.");
      return;
    }

    if (!checkMcpToken(token)) {
      res.setHeader("Content-Type", "text/html");
      res.send(
        passwordPageHtml({
          codeChallenge: code_challenge,
          redirectUri:   redirect_uri,
          state,
          error:         "Incorrect token. Please try again.",
        })
      );
      return;
    }

    const code = await issueAuthCode(code_challenge, redirect_uri, state || undefined);
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("code", code);
    if (state) redirectUrl.searchParams.set("state", state);
    res.redirect(redirectUrl.toString());
  } catch (err) {
    console.error("[/auth-verify] error:", err);
    res.status(500).send(
      "Internal error: " + (err instanceof Error ? err.message : String(err))
    );
  }
});

// Bearer auth middleware
const bearerAuth = requireBearerAuth({
  verifier: oauthProvider,
  resourceMetadataUrl: new URL("/.well-known/oauth-protected-resource", ISSUER_URL).toString(),
});

// ---------------------------------------------------------------------------
// Session store — both transport types keyed by session ID
// ---------------------------------------------------------------------------

type AnyTransport = StreamableHTTPServerTransport | SSEServerTransport;
const sessions = new Map<string, AnyTransport>();

// ---------------------------------------------------------------------------
// Health + favicon (no auth)
// ---------------------------------------------------------------------------

app.get("/health", (_req, res) => res.json({ ok: true }));

// Paper airplane — classic "send/share" symbol. Dark rounded background
// matches the brand; white wing + blue fold accent reads clearly even at
// 16px where the connector icon actually renders.
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#111827"/>
  <path d="M 7 16 L 25 8 L 19 25 L 15.5 18 Z" fill="#ffffff"/>
  <path d="M 7 16 L 15.5 18 L 19 25 Z" fill="#60a5fa"/>
</svg>`;

function serveFavicon(_req: express.Request, res: express.Response) {
  // Serve SVG bytes directly at both /favicon.svg AND /favicon.ico — many
  // scrapers (including claude.ai's connector UI) request /favicon.ico and
  // don't follow redirects. Modern clients accept SVG regardless of filename.
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(FAVICON_SVG);
}

app.get("/favicon.svg", serveFavicon);
app.get("/favicon.ico", serveFavicon);

// ---------------------------------------------------------------------------
// Root endpoint — smart dispatch based on method and headers
//
// Streamable HTTP (protocol 2025-11-25, used by claude.ai / Cowork):
//   POST  /   initialize or send (no session ID = new session)
//   GET   /   open SSE stream for server→client messages  (has Mcp-Session-Id)
//   DELETE /  terminate session
//
// Legacy SSE (protocol 2024-11-05, used by Claude Code CLI):
//   GET   /   establish SSE stream (no Mcp-Session-Id header)
//   POST  /messages  send message
// ---------------------------------------------------------------------------

app.all("/", bearerAuth, async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    // ── Streamable HTTP: resume existing session ──────────────────────────
    if (sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId)!;
      if (transport instanceof StreamableHTTPServerTransport) {
        await transport.handleRequest(req, res, req.body);
        return;
      }
      // SSE session ID collision — shouldn't happen, but guard anyway
      res.status(400).json({ error: "Session uses a different transport" });
      return;
    }

    // ── Streamable HTTP: new session (POST with initialize request) ───────
    if (req.method === "POST" && isInitializeRequest(req.body)) {
      const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid: string) => { sessions.set(sid, transport); },
      });
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
      await createMcpServer().connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // ── Legacy SSE: GET with no session ID → establish SSE stream ─────────
    if (req.method === "GET" && !sessionId) {
      const transport = new SSEServerTransport("/messages", res);
      sessions.set(transport.sessionId, transport);
      res.on("close", () => sessions.delete(transport.sessionId));
      await createMcpServer().connect(transport);
      return;
    }

    res.status(400).json({ error: "Invalid request" });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
  }
});

// Legacy SSE: POST /messages — send message to existing SSE session
app.post("/messages", bearerAuth, async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = sessions.get(sessionId);
  if (!transport || !(transport instanceof SSEServerTransport)) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  await transport.handlePostMessage(req, res);
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT ?? "3002", 10);
app.listen(PORT, () => {
  console.log(`ShareDuo MCP server listening on port ${PORT}`);
});
