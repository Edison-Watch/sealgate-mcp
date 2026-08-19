import type { SealgateConfig } from "./config";

interface GatewayRequest {
    path: string;
    method?: "GET" | "POST";
    body?: unknown;
    query?: Record<string, string | number | undefined>;
}

const MAX_ERROR_BODY = 500;

function baseUrl(gatewayUrl: string): string {
    return gatewayUrl.endsWith("/") ? gatewayUrl : `${gatewayUrl}/`;
}

function truncate(text: string): string {
    return text.length > MAX_ERROR_BODY ? `${text.slice(0, MAX_ERROR_BODY)}...` : text;
}

function parseBody(text: string): unknown {
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

function buildUrl(config: SealgateConfig, request: GatewayRequest): URL {
    const url = new URL(request.path.replace(/^\//, ""), baseUrl(config.gatewayUrl));
    for (const [key, value] of Object.entries(request.query ?? {})) {
        if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url;
}

/**
 * Call the org-supplied Sealgate gateway with Bearer auth. Throws an Error with
 * a readable message on non-2xx responses; the caller turns that into an MCP
 * tool error result.
 */
export async function gatewayFetch(
    config: SealgateConfig,
    request: GatewayRequest,
): Promise<unknown> {
    const hasBody = request.body !== undefined;
    const response = await fetch(buildUrl(config, request), {
        method: request.method ?? "GET",
        headers: {
            authorization: `Bearer ${config.apiKey}`,
            accept: "application/json",
            ...(hasBody ? { "content-type": "application/json" } : {}),
        },
        body: hasBody ? JSON.stringify(request.body) : undefined,
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${truncate(text)}`);
    }
    return parseBody(text);
}
