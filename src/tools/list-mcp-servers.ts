import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { gatewayFetch } from "../gateway";
import { withGateway } from "./helpers";

export function registerListMcpServers(server: McpServer): void {
    server.registerTool(
        "list_mcp_servers",
        {
            title: "List governed MCP servers",
            description:
                "List the MCP servers registered with your Sealgate gateway, with " +
                "their access-control classification and connection status. Returns " +
                "a paginated page of servers (name, display_name, domain, enabled, " +
                "tool_count, needs_config, transport_type).",
            inputSchema: {
                query: z
                    .string()
                    .optional()
                    .describe("Free-text filter matched against server name/domain"),
                perPage: z
                    .number()
                    .int()
                    .positive()
                    .max(200)
                    .optional()
                    .describe("Maximum servers to return per page (default 50)"),
            },
        },
        ({ query, perPage }) =>
            withGateway((config) =>
                gatewayFetch(config, {
                    path: "/api/v1/servers",
                    query: { q: query, per_page: perPage },
                }),
            ),
    );
}
