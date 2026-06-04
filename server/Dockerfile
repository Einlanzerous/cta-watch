# syntax=docker/dockerfile:1
#
# Build context is the REPO ROOT (not server/) because this is an npm-workspaces
# monorepo with a single root package-lock.json. Build with:
#   docker build -f server/Dockerfile -t cta-watch-server .

# ── Build stage: install all deps + compile TypeScript ───────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
# better-sqlite3 is a native addon; Alpine (musl) has no prebuilt binary, so it
# compiles from source — which needs a C/C++ toolchain + python3.
RUN apk add --no-cache python3 make g++
# Copy the root lockfile + every workspace manifest so `npm ci` can resolve the
# workspace tree, then install before copying source for better layer caching.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci
COPY server ./server
RUN npm run build --workspace=server

# ── Deps stage: production-only node_modules (server workspace) ───────────────
FROM node:20-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
# Only the server's runtime deps (compiles better-sqlite3 against this musl/arch).
RUN npm ci --omit=dev --workspace=server

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S -G app app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder   /app/server/dist  ./server/dist
COPY server/package.json ./server/package.json
COPY package.json ./package.json
# SQLite DB lives here (DB_PATH defaults to ./data/cta-watch.db relative to /app).
RUN mkdir -p /app/data && chown -R app:app /app
USER app
VOLUME /app/data
EXPOSE 3001
CMD ["node", "server/dist/index.js"]
