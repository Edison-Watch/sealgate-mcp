---
name: sealgate
description: Govern how AI agents access data through your organisation's Sealgate gateway. Use when you need to list governed MCP servers, review agent session and audit status, or check whether a tool call is allowed by policy.
---

# Govern agent data access with Sealgate

Sealgate is an AI data-leak-prevention platform: a security gateway and data
firewall that sits between AI agents and enterprise data and tools. This skill
uses the `@sealgate/mcp` MCP server, a thin proxy to your organisation's Sealgate
gateway.

## Setup

The server needs two environment variables, supplied by your organisation:

- `SEALGATE_GATEWAY_URL` - base URL of your Sealgate MCP gateway.
- `SEALGATE_API_KEY` - a Sealgate API key issued from your dashboard.

Sealgate runs a managed release gateway, and demo or self-hosted orgs run their
own, so this bridge stays host-agnostic. If either variable is unset, every tool
returns a clear configuration message instead of failing.

Install for an MCP client (for example, Claude Desktop or Cursor):

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

## Tools

- `list_mcp_servers` - list the MCP servers registered with the gateway, with
  their access-control classification and connection status. Accepts optional
  `query` (free-text filter) and `perPage`.
- `get_session_status` - review recent agent sessions and audit events: what
  agents did, which data flowed, and any blocked actions. Accepts optional
  `perPage`, `status`, and `risk` filters.

## When to use

Reach for these tools when a security, IT, or compliance workflow needs to see
or control how agents access data: auditing agent activity, confirming a shadow
MCP server is governed, or checking a decision before an agent takes an action.

Docs: https://docs.sealgate.ai
