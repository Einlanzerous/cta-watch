# syntax=docker/dockerfile:1
#
# Build context is the REPO ROOT (not client/) because this is an npm-workspaces
# monorepo with a single root package-lock.json. Build with:
#   docker build -f client/Dockerfile -t cta-watch-client .

# ── Build stage: build the Vue SPA ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci
COPY client ./client
# `build` runs `vue-tsc && vite build` — type errors fail the image build.
RUN npm run build --workspace=client

# ── Runtime stage: nginx serving the static bundle ───────────────────────────
FROM nginx:alpine
COPY --from=builder /app/client/dist /usr/share/nginx/html
# nginx:alpine renders templates through envsubst at startup, substituting
# ${BACKEND_HOST} (and leaving nginx's own $host/$uri vars untouched).
COPY client/nginx.conf /etc/nginx/templates/default.conf.template
ENV BACKEND_HOST=server
EXPOSE 80
