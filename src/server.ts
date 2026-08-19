import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetSessionStatus } from "./tools/get-session-status";
import { registerListMcpServers } from "./tools/list-mcp-servers";

export const SERVER_NAME = "sealgate";
export const SERVER_VERSION = "0.1.1";

const INSTRUCTIONS =
    "Sealgate governs how AI agents access data. These tools proxy your " +
    "organisation's Sealgate gateway, configured through the SEALGATE_GATEWAY_URL " +
    "and SEALGATE_API_KEY environment variables. When those are unset, each tool " +
    "returns a configuration message instead of failing.";

export function buildServer(): McpServer {
    const server = new McpServer(
        { name: SERVER_NAME, version: SERVER_VERSION },
        { instructions: INSTRUCTIONS },
    );
    registerListMcpServers(server);
    registerGetSessionStatus(server);
    return server;
}
