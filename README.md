<p align="center">
  <img src=".github/assets/banner.png" alt="SealGate &mdash; connect &amp; govern how AI interacts with your data" width="820">
</p>

# Sealgate MCP Server

[![MCP](https://img.shields.io/badge/protocol-MCP-blue)](https://modelcontextprotocol.io)
[![npm](https://img.shields.io/npm/v/@sealgate/mcp)](https://www.npmjs.com/package/@sealgate/mcp)
[![smithery badge](https://smithery.ai/badge/sealgate/gateway)](https://smithery.ai/servers/sealgate/gateway)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

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

## Connect to the hosted gateway

Sealgate runs a managed remote MCP gateway at `https://mcp.sealgate.ai/mcp`. It
is a per-user proxy that aggregates every MCP server you have enabled behind one
Streamable HTTP endpoint and enforces Sealgate's access-control policies on every
call.

### OAuth 2.1 (recommended)

The gateway is now an OAuth 2.1 authorization server, so most clients can connect
with no API key at all. Point your client at the gateway URL and sign in when
prompted:

```
https://mcp.sealgate.ai/mcp
```

The flow uses dynamic client registration (RFC 7591) and client ID metadata
documents, mandatory PKCE (`S256`), and issues refresh tokens via the
`offline_access` scope, so a session stays connected without re-authenticating
every hour. Discovery, consent, and token endpoints all live on the gateway
origin, so self-hosted single-origin deployments work with no extra
configuration.

### API key in the URL

Clients that cannot run an OAuth flow can pass a Sealgate API key as a URL path
segment instead:

```
https://mcp.sealgate.ai/mcp/{api_key}/?client={label}
```

Replace `{api_key}` with the key from your dashboard and `{label}` with an
optional session label. This is not OAuth and not an `Authorization` header; the
key travels in the path.

`mcp.sealgate.ai` is the managed release host. Demo and self-hosted orgs run
their own gateway host, so substitute your own URL where needed.

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
