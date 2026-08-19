import { z } from "zod";

/**
 * Sealgate MCP is a thin client for the Sealgate Management REST API (the
 * control plane at e.g. https://dashboard.sealgate.ai). The bridge is
 * host-agnostic: managed users point at Sealgate's release hosts, while demo and
 * self-hosted orgs point at their own, so the base URL and API key are supplied
 * by the user through environment variables.
 */
export const configSchema = z.object({
    gatewayUrl: z.url(),
    apiKey: z.string().min(1),
});

export type SealgateConfig = z.infer<typeof configSchema>;

type ConfigResult =
    | { ok: true; config: SealgateConfig }
    | { ok: false; message: string };

const MISSING_CONFIG_MESSAGE =
    "Sealgate is not configured. Set SEALGATE_GATEWAY_URL (your Sealgate " +
    "Management API base URL, e.g. https://dashboard.sealgate.ai) and " +
    "SEALGATE_API_KEY (a key issued from your Sealgate dashboard), then restart " +
    "the server. See https://docs.sealgate.ai.";

/**
 * Validate the two required environment variables. Returns a discriminated
 * result instead of throwing, so registry probes and `--help` never crash on
 * an unconfigured environment.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ConfigResult {
    const parsed = configSchema.safeParse({
        gatewayUrl: env.SEALGATE_GATEWAY_URL,
        apiKey: env.SEALGATE_API_KEY,
    });
    if (parsed.success) {
        return { ok: true, config: parsed.data };
    }
    return { ok: false, message: MISSING_CONFIG_MESSAGE };
}
