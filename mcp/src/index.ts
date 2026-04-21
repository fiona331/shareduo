import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { pushArtifactSchema, handlePushArtifact }     from "./tools/push_artifact.js";
import { deleteArtifactSchema, handleDeleteArtifact } from "./tools/delete_artifact.js";

// Validate env at startup
import "./lib/env.js";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const MCP_TOKEN = process.env.SHAREDUO_MCP_TOKEN;
if (!MCP_TOKEN) throw new Error("Missing required env var: SHAREDUO_MCP_TOKEN");

function isAuthorized(authHeader: string | undefined): boolean {
  return authHeader === `Bearer ${MCP_TOKEN}`;
}

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

// Active SSE sessions keyed by session ID
const sessions = new Map<string, SSEServerTransport>();

// Health check (no auth required)
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Establish SSE connection
app.get("/sse", async (req, res) => {
  if (!isAuthorized(req.headers.authorization)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const transport = new SSEServerTransport("/messages", res);
  sessions.set(transport.sessionId, transport);

  res.on("close", () => {
    sessions.delete(transport.sessionId);
  });

  const server = createMcpServer();
  await server.connect(transport);
});

// Receive messages from client
app.post("/messages", async (req, res) => {
  if (!isAuthorized(req.headers.authorization)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

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
