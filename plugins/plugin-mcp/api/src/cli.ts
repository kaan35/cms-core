#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import process from "node:process";
import { createCmsMcpServer } from "./server/createMcpServer.js";

async function main(): Promise<void> {
  const server = createCmsMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const handleShutdown = async () => {
    try {
      await server.close();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", handleShutdown);
  process.on("SIGTERM", handleShutdown);
}

main().catch((err: unknown) => {
  console.error("Fatal error starting CMS MCP Server:", err);
  process.exit(1);
});
