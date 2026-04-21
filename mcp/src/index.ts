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
import { createOAuthProvider } from "./auth/provider.js";

// Validate env at startup
import "./lib/env.js";

// ---------------------------------------------------------------------------
// OAuth provider
// ---------------------------------------------------------------------------

const oauthProvider = createOAuthProvider();
const ISSUER_URL = new URL(process.env.SHAREDUO_BASE_URL ?? "https://mcp.shareduo.com");

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
