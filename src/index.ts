#!/usr/bin/env node
/**
 * Asteroid MCP — Model Context Protocol Server for Axis Colleges ERP.
 *
 * Supports Dual Transports:
 *   1. Stdio (Default): For Claude Desktop, Cursor, Zed, Windsurf, Claude Code
 *   2. SSE (--sse): For Remote Web Connectors and hosted cloud deployments
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";
import { credentials } from "./credentials.js";

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`
Asteroid MCP Server — Model Context Protocol for Axis Colleges ERP

Usage:
  asteroid-mcp                Start MCP server over Stdio with curated 14 lean tools (Claude, Cursor, Zed)
  asteroid-mcp --all-tools    Start MCP server exposing full legacy 33 tools for diagnosis
  asteroid-mcp --sse          Start MCP server over SSE (for Claude Web & Remote Connectors)
  asteroid-mcp --port <port>  Specify port for SSE server (default: 3001 or PORT env)

Environment Variables:
  ASTEROID_URL                Backend API URL (default: https://erp.handlebid.lol)
  ASTEROID_TOOLS              Set to "all" to expose all 33 tools
  PORT                        Port for SSE server (default: 3001)

Session Persistence:
  Credentials & session tokens are cached in ~/.asteroid/credentials.json
  after calling the "sign_in" tool. Students only log in once per session.
`);
    process.exit(0);
  }

  const isSse = process.argv.includes("--sse");
  const portArgIdx = process.argv.indexOf("--port");
  const port = portArgIdx !== -1 && process.argv[portArgIdx + 1]
    ? Number(process.argv[portArgIdx + 1])
    : Number(process.env.PORT || 3001);

  // Initialize MCP Server with complete capabilities
  const server = new McpServer({
    name: "asteroid-mcp",
    version: "1.0.0",
  });

  // Register all 33 tools, resources, and prompts
  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  if (isSse) {
    // ── Mode B: Remote Web Connector (SSE over HTTP) ─────────────────────────
    const app = express();
    app.use(cors());

    const transports: Record<string, SSEServerTransport> = {};

    app.get("/sse", async (req, res) => {
      process.stderr.write("[asteroid-mcp] New incoming SSE connection\n");
      const transport = new SSEServerTransport("/message", res);
      const sessionId = transport.sessionId;
      transports[sessionId] = transport;

      req.on("close", () => {
        delete transports[sessionId];
      });

      await server.connect(transport);
    });

    app.post("/message", async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports[sessionId];
      if (!transport) {
        res.status(404).send("Session not found");
        return;
      }
      await transport.handlePostMessage(req, res);
    });

    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        name: "asteroid-mcp",
        transport: "sse",
        authenticated: credentials.isAuthenticated(),
        backend: credentials.getBaseUrl(),
      });
    });

    app.listen(port, () => {
      process.stderr.write(
        `[asteroid-mcp] Remote SSE Server running at http://127.0.0.1:${port}/sse\n` +
        `[asteroid-mcp] Target Backend: ${credentials.getBaseUrl()}\n` +
        `[asteroid-mcp] Ready for Claude Web & Remote Connectors\n`
      );
    });
  } else {
    // ── Mode A: Local Subprocess (Stdio for Claude Desktop / Cursor) ────────
    process.stderr.write(
      `[asteroid-mcp] Starting Stdio Server for Claude Desktop\n` +
      `[asteroid-mcp] Target Backend: ${credentials.getBaseUrl()}\n` +
      `[asteroid-mcp] Auth: ${credentials.isAuthenticated() ? `Loaded (~/.asteroid)` : "Awaiting sign_in"}\n`
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch((err) => {
  process.stderr.write(`[asteroid-mcp] Fatal error: ${err.message}\n`);
  process.exit(1);
});
