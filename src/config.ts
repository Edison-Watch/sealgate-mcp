import { z } from "zod";

/**
 * Sealgate MCP is a thin client. It does not host a fixed public endpoint:
 * every organisation runs its own Sealgate gateway, so the gateway URL and
 * API key are supplied by the user through environment variables.
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
    "Sealgate is not configured. Set SEALGATE_GATEWAY_URL (your organisation's " +
    "Sealgate MCP gateway base URL) and SEALGATE_API_KEY (a key issued from your " +
    "Sealgate dashboard), then restart the server. See https://docs.sealgate.ai.";

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
