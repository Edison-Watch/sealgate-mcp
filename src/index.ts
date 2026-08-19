#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startHttpServer } from "./http";
import { SERVER_NAME, SERVER_VERSION, buildServer } from "./server";

const HELP = `${SERVER_NAME} ${SERVER_VERSION}
Sealgate MCP server: a thin MCP proxy to your organisation's Sealgate security gateway.

Usage:
  sealgate            Start the server over stdio (default)
  sealgate --help     Show this help
  sealgate --version  Print the version

Environment:
  SEALGATE_GATEWAY_URL    Base URL of your Sealgate MCP gateway (required at call time)
  SEALGATE_API_KEY        Sealgate API key issued from your dashboard (required at call time)
  SEALGATE_MCP_TRANSPORT  Set to "http" to serve streamable HTTP instead of stdio
  PORT                    HTTP port when SEALGATE_MCP_TRANSPORT=http (default 3000)

Docs: https://docs.sealgate.ai
`;

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    if (args.includes("--help") || args.includes("-h")) {
        process.stdout.write(HELP);
        return;
    }
    if (args.includes("--version") || args.includes("-v")) {
        process.stdout.write(`${SERVER_VERSION}\n`);
        return;
    }
    if (process.env.SEALGATE_MCP_TRANSPORT === "http") {
        startHttpServer(Number(process.env.PORT) || 3000);
        return;
    }
    const server = buildServer();
    await server.connect(new StdioServerTransport());
}

main().catch((error) => {
    const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
});
