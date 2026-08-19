import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { gatewayFetch } from "../gateway";
import { withGateway } from "./helpers";

export function registerCheckPolicy(server: McpServer): void {
    server.registerTool(
        "check_policy",
        {
            title: "Check whether an action is allowed by policy",
            description:
                "Evaluate a proposed tool call against your Sealgate policy engine " +
                "and return the deterministic decision (allow, block, or review) " +
                "with the matching rule.",
            inputSchema: {
                tool: z
                    .string()
                    .min(1)
                    .describe("Name of the tool or action to evaluate"),
                server: z
                    .string()
                    .optional()
                    .describe("MCP server that exposes the tool"),
                arguments: z
                    .record(z.string(), z.unknown())
                    .optional()
                    .describe("Proposed tool-call arguments"),
            },
        },
        ({ tool, server: serverName, arguments: toolArguments }) =>
            withGateway((config) =>
                gatewayFetch(config, {
                    path: "/api/v1/policy/evaluate",
                    method: "POST",
                    body: { tool, server: serverName, arguments: toolArguments },
                }),
            ),
    );
}
