# Sealgate MCP Server

[![MCP](https://img.shields.io/badge/protocol-MCP-blue)](https://modelcontextprotocol.io)
[![npm](https://img.shields.io/npm/v/@sealgate/mcp)](https://www.npmjs.com/package/@sealgate/mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![M8ven Score](https://m8ven.ai/badge/mcp/edison-watch-sealgate-mcp-1svx50)](https://m8ven.ai/mcp/edison-watch-sealgate-mcp-1svx50)

The Model Context Protocol (MCP) server for [Sealgate](https://sealgate.ai),
the AI data-leak-prevention platform: a security gateway and data firewall that
sits between AI agents (Claude, ChatGPT, Cursor, Copilot) and your organisation's
data and tools.

This server is a thin MCP proxy. It forwards a small set of tool calls to a
**Sealgate gateway**, which you configure with two environment variables.
Sealgate runs managed release hosts (the remote MCP gateway at `mcp.sealgate.ai`
and the Management API at `dashboard.sealgate.ai`), and demo or self-hosted orgs
run their own, so this bridge stays host-agnostic: you supply the URL and key.

## Tools

| Tool | What it does |
|------|--------------|
| `list_mcp_servers` | List the MCP servers governed by your Sealgate gateway, with access-control classification and connection status. |
| `get_session_status` | Review recent agent sessions and audit events: what agents did, which data flowed, and any blocked actions. |

## Configuration

Set two environment variables, both issued or hosted by your organisation:

| Variable | Description |
|----------|-------------|
| `SEALGATE_GATEWAY_URL` | Base URL of your Sealgate Management API (e.g. `https://dashboard.sealgate.ai`). |
| `SEALGATE_API_KEY` | Sealgate API key from your dashboard. |

If either is unset, every tool returns a clear configuration message instead of
failing, so registry probes and `--help` never crash.

## Install

Add the server to your MCP client. It runs over stdio via `npx`.

### Claude Desktop, Cursor

```json
{
    "mcpServers": {
        "sealgate": {
            "command": "npx",
            "args": ["-y", "@sealgate/mcp"],
            "env": {
                "SEALGATE_GATEWAY_URL": "https://dashboard.sealgate.ai",
                "SEALGATE_API_KEY": "your-sealgate-api-key"
            }
        }
    }
}
```

### VS Code

```json
{
    "servers": {
        "sealgate": {
            "type": "stdio",
            "command": "npx",
            "args": ["-y", "@sealgate/mcp"],
            "env": {
                "SEALGATE_GATEWAY_URL": "https://dashboard.sealgate.ai",
                "SEALGATE_API_KEY": "your-sealgate-api-key"
            }
        }
    }
}
```

Copy-paste configs also live in [`examples/`](examples/).

## Usage

```bash
# Run over stdio (default transport)
npx -y @sealgate/mcp

# Show usage
npx -y @sealgate/mcp --help
```

Set `SEALGATE_MCP_TRANSPORT=http` (with an optional `PORT`, default 3000) to
serve streamable HTTP instead of stdio.

## Develop

Requires [Bun](https://bun.sh).

```bash
bun install
bun run src/index.ts --help   # run from source
bun test                      # run tests
bun run build                 # bundle to dist/
make ci                       # lint, typecheck, dead-code, and the rest
```

## Links

- Website: https://sealgate.ai
- Docs: https://docs.sealgate.ai
- Contact: hello@sealgate.ai

## License

MIT. Copyright GPU-EVM LTD (Sealgate). See [LICENSE](LICENSE).
