import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
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
// MCP_BASE_URL is this server's own public URL (used for OAuth metadata/issuer)
// SHAREDUO_BASE_URL is the ShareDuo web app URL (used for uploading artifacts)
const ISSUER_URL = new URL(process.env.MCP_BASE_URL ?? "https://mcp.shareduo.com");

// ---------------------------------------------------------------------------
// MCP server factory (one instance per SSE connection)
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
app.use(express.json());

// Mount OAuth endpoints at root (/.well-known/*, /authorize, /token, /revoke)
app.use(
  mcpAuthRouter({
    provider: oauthProvider,
    issuerUrl: ISSUER_URL,
    resourceName: "ShareDuo MCP",
  })
);

// Password form submission — validates SHAREDUO_MCP_TOKEN, issues auth code, redirects back
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

// Bearer auth middleware — validates access tokens issued by our OAuth server
const bearerAuth = requireBearerAuth({
  verifier: oauthProvider,
  resourceMetadataUrl: new URL(
    "/.well-known/oauth-protected-resource",
    ISSUER_URL
  ).toString(),
});

// Active SSE sessions
const sessions = new Map<string, SSEServerTransport>();

// Health check (no auth)
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Favicon — shown as the connector icon in claude.ai
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

app.get("/favicon.ico", (_req, res) => {
  res.redirect("/favicon.svg");
});

// SSE endpoint — requires valid Bearer token
app.get("/", bearerAuth, async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  sessions.set(transport.sessionId, transport);
  res.on("close", () => sessions.delete(transport.sessionId));

  const server = createMcpServer();
  await server.connect(transport);
});

// Message endpoint — requires valid Bearer token
app.post("/messages", bearerAuth, async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = sessions.get(sessionId);
  if (!transport) {
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
