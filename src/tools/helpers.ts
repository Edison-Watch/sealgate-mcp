import { type SealgateConfig, loadConfig } from "../config";

interface ToolResult {
    content: { type: "text"; text: string }[];
    isError?: boolean;
    [key: string]: unknown;
}

function textResult(text: string, isError = false): ToolResult {
    return { content: [{ type: "text", text }], isError };
}

/**
 * Shared plumbing for every proxy tool: resolve config (returning a clear error
 * result when unset), run the gateway call, and marshal success or failure into
 * an MCP tool result. Keeps the individual tool modules to their endpoint.
 */
export async function withGateway(
    run: (config: SealgateConfig) => Promise<unknown>,
): Promise<ToolResult> {
    const result = loadConfig();
    if (!result.ok) {
        return textResult(result.message, true);
    }
    try {
        const data = await run(result.config);
        return textResult(JSON.stringify(data, null, 2));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return textResult(`Sealgate gateway request failed: ${message}`, true);
    }
}
