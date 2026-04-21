import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { pushArtifactSchema, handlePushArtifact }     from "./tools/push_artifact.js";
import { deleteArtifactSchema, handleDeleteArtifact } from "./tools/delete_artifact.js";

// Validate env vars at startup — crashes fast with a clear message if anything is missing
import "./lib/env.js";

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

const transport = new StdioServerTransport();
await server.connect(transport);
