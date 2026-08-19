import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// The published Sealgate Management API (dashboard.sealgate.ai/api/v1) exposes
// policy rules for listing and management, but has no endpoint that evaluates
// an arbitrary proposed tool call against the full policy engine and returns an
// allow/block/review verdict. (The backend's POST /api/v1/policies/evaluate is
// a rule-editor preview: it requires a complete rule definition plus a
// structured evaluation context, which is a different operation from "check
// this action".) Rather than invent an endpoint, the tool reports that clearly.
const UNSUPPORTED_MESSAGE =
    "check_policy is not yet supported. The Sealgate Management API does not " +
    "publish an endpoint that evaluates a proposed tool call against the full " +
    "policy engine and returns an allow/block/review verdict. Use " +
    "list_mcp_servers and get_session_status to inspect governance and audited " +
    "decisions, and confirm the intended policy-evaluation endpoint with Sealgate " +
    "before enabling this tool.";

export function registerCheckPolicy(server: McpServer): void {
    server.registerTool(
        "check_policy",
        {
            title: "Check whether an action is allowed by policy",
            description:
                "Evaluate a proposed tool call against your Sealgate policy engine " +
                "and return the deterministic decision (allow, block, or review) " +
                "with the matching rule. NOTE: not yet supported by the published " +
                "Sealgate Management API - returns a message explaining this.",
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
        () => ({
            content: [{ type: "text" as const, text: UNSUPPORTED_MESSAGE }],
            isError: true,
        }),
    );
}
