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

app.use(express.json());

// Mount OAuth endpoints (/.well-known/*, /authorize GET, /token, /revoke)
app.use(
  mcpAuthRouter({
    provider: oauthProvider,
    issuerUrl: ISSUER_URL,
    resourceName: "ShareDuo MCP",
  })
);

// Password form submission — POST /authorize handled here (mcpAuthRouter owns GET)
app.post("/authorize", express.urlencoded({ extended: false }), (req, res) => {
  const { token, code_challenge, redirect_uri, state } = req.body as Record<string, string>;

  if (!checkMcpToken(token)) {
    res.setHeader("Content-Type", "text/html");
    res.send(
      passwordPageHtml({
        codeChallenge: code_challenge,
        redirectUri:   redirect_uri,
        state:         state ?? "",
        error:         "Incorrect token. Please try again.",
      })
    );
    return;
  }

  const code = issueAuthCode(code_challenge, redirect_uri, state);
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);
  res.redirect(redirectUrl.toString());
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

app.get("/favicon.svg", (_req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#111827"/>
  <circle cx="10" cy="10" r="3" fill="white"/>
  <circle cx="22" cy="16" r="3" fill="white"/>
  <circle cx="10" cy="22" r="3" fill="white"/>
  <line x1="10" y1="10" x2="22" y2="16" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="10" y1="22" x2="22" y2="16" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
</svg>`);
});

app.get("/favicon.ico", (_req, res) => res.redirect("/favicon.svg"));

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
