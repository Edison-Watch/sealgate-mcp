FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN bun run build

FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY package.json ./

# The server speaks MCP over stdio. SEALGATE_GATEWAY_URL and SEALGATE_API_KEY
# are supplied at runtime by the host (Smithery config, mcp.so, or the client).
ENTRYPOINT ["bun", "run", "dist/index.js"]
