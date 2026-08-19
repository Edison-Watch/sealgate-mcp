import { type IncomingMessage, createServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildServer } from "./server";

function readBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(chunk as Buffer));
        req.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf-8");
            if (!raw) return resolve(undefined);
            try {
                resolve(JSON.parse(raw));
            } catch {
                resolve(undefined);
            }
        });
    });
}

/**
 * Optional stateless streamable-HTTP transport, enabled with
 * SEALGATE_MCP_TRANSPORT=http. Each request gets a fresh server and transport,
 * so no session state is shared. stdio remains the default for registries.
 */
export function startHttpServer(port: number): void {
    const httpServer = createServer(async (req, res) => {
        const server = buildServer();
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        res.on("close", () => {
            void transport.close();
            void server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, await readBody(req));
    });
    httpServer.listen(port, () => {
        process.stderr.write(`sealgate listening on http://127.0.0.1:${port}\n`);
    });
}
