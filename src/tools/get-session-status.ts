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
                "see what agents did, which data flowed, and any blocked actions. " +
                "Returns a paginated page of sessions (agent_name, user_email, " +
                "created_at, status, tool_call_count, trifecta_flags, block_severity, " +
                "acl_level).",
            inputSchema: {
                perPage: z
                    .number()
                    .int()
                    .positive()
                    .max(200)
                    .optional()
                    .describe("Maximum sessions to return per page (default 50)"),
                status: z
                    .string()
                    .optional()
                    .describe("Filter by session status (e.g. active, completed)"),
                risk: z.string().optional().describe("Filter by risk level"),
            },
        },
        ({ perPage, status, risk }) =>
            withGateway((config) =>
                gatewayFetch(config, {
                    path: "/api/v1/sessions",
                    query: { per_page: perPage, status, risk },
                }),
            ),
    );
}
