import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { gatewayFetch } from "../gateway";
import { withGateway } from "./helpers";

export function registerGetSessionStatus(server: McpServer): void {
    server.registerTool(
        "get_session_status",
        {
            title: "Get recent session and audit status",
            description:
                "Fetch recent Sealgate agent sessions and audit events so you can " +
                "see what agents did, which data flowed, and any blocked actions.",
            inputSchema: {
                limit: z
                    .number()
                    .int()
                    .positive()
                    .max(100)
                    .optional()
                    .describe("Maximum number of recent sessions to return"),
            },
        },
        ({ limit }) =>
            withGateway((config) =>
                gatewayFetch(config, { path: "/api/v1/sessions", query: { limit } }),
            ),
    );
}
