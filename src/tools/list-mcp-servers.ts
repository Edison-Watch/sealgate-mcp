import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { gatewayFetch } from "../gateway";
import { withGateway } from "./helpers";

export function registerListMcpServers(server: McpServer): void {
    server.registerTool(
        "list_mcp_servers",
        {
            title: "List governed MCP servers",
            description:
                "List the MCP servers registered with your Sealgate gateway, with " +
                "their access-control classification and connection status.",
        },
        () =>
            withGateway((config) => gatewayFetch(config, { path: "/api/v1/servers" })),
    );
}
