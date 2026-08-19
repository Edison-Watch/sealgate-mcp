import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { loadConfig } from "../src/config";
import { buildServer } from "../src/server";

describe("config", () => {
    test("reports missing environment clearly", () => {
        const result = loadConfig({});
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.message).toContain("SEALGATE_GATEWAY_URL");
            expect(result.message).toContain("SEALGATE_API_KEY");
        }
    });

    test("rejects a non-URL gateway", () => {
        const result = loadConfig({
            SEALGATE_GATEWAY_URL: "not-a-url",
            SEALGATE_API_KEY: "key",
        });
        expect(result.ok).toBe(false);
    });

    test("accepts a valid gateway URL and key", () => {
        const result = loadConfig({
            SEALGATE_GATEWAY_URL: "https://gateway.example.com",
            SEALGATE_API_KEY: "sk-test",
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.gatewayUrl).toBe("https://gateway.example.com");
        }
    });
});

describe("server", () => {
    test("builds and exposes the two proxy tools over MCP", async () => {
        const server = buildServer();
        const client = new Client({ name: "test-client", version: "0.0.0" });
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await Promise.all([
            server.connect(serverTransport),
            client.connect(clientTransport),
        ]);

        const { tools } = await client.listTools();
        const names = tools.map((tool) => tool.name).sort();
        expect(names).toEqual(["get_session_status", "list_mcp_servers"]);

        await client.close();
        await server.close();
    });

    test("a proxy tool returns a configuration error when env is unset", async () => {
        const priorUrl = process.env.SEALGATE_GATEWAY_URL;
        const priorKey = process.env.SEALGATE_API_KEY;
        // Empty strings fail zod validation the same way missing vars do.
        process.env.SEALGATE_GATEWAY_URL = "";
        process.env.SEALGATE_API_KEY = "";

        const server = buildServer();
        const client = new Client({ name: "test-client", version: "0.0.0" });
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await Promise.all([
            server.connect(serverTransport),
            client.connect(clientTransport),
        ]);

        const result = await client.callTool({
            name: "list_mcp_servers",
            arguments: {},
        });
        expect(result.isError).toBe(true);
        const [block] = result.content as { type: string; text: string }[];
        expect(block?.text).toContain("Sealgate is not configured");

        await client.close();
        await server.close();
        process.env.SEALGATE_GATEWAY_URL = priorUrl ?? "";
        process.env.SEALGATE_API_KEY = priorKey ?? "";
    });
});
