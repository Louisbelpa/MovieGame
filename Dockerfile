# syntax=docker/dockerfile:1
#
# Multi-stage build:
#   stage 1 (frontend-builder) – Vite builds the React SPA → backend/public/
#   stage 2 (backend-builder)  – tsc compiles backend, then devDeps are pruned
#   stage 3 (runtime)          – only compiled artifacts + prod node_modules

# ── Stage 1: Build frontend ────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app
ARG VITE_ENABLE_SERIES=true
ARG VITE_ENABLE_WIKI=true
ENV VITE_ENABLE_SERIES=$VITE_ENABLE_SERIES
ENV VITE_ENABLE_WIKI=$VITE_ENABLE_WIKI

# Sign in with Apple (web) — injectés au build Vite (import.meta.env), pas au runtime seul
ARG VITE_APPLE_CLIENT_ID=""
ARG VITE_APPLE_REDIRECT_URI=""
ENV VITE_APPLE_CLIENT_ID=$VITE_APPLE_CLIENT_ID
ENV VITE_APPLE_REDIRECT_URI=$VITE_APPLE_REDIRECT_URI

# Google Sign-In + canonical site URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_PUBLIC_SITE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL

COPY package*.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig*.json eslint.config.js ./
COPY public ./public
COPY src ./src

# Vite outputs to backend/public/ — create the directory first
RUN mkdir -p backend
RUN npm run build

# ── Stage 2: Build + prune backend ────────────────────────────────────────────
FROM node:20-alpine AS backend-builder

# Build tools required by better-sqlite3 native addon (only at build time)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/src ./src
COPY backend/tsconfig.json ./
RUN npm run build

# Remove devDependencies — keeps node_modules lean for the runtime stage
RUN npm prune --omit=dev

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Persistent volume: DB + uploads (mount at /data on Railway)
RUN mkdir -p /data/uploads

# Compiled backend (JS + schema.sql copied by the build script)
COPY --from=backend-builder /app/dist           ./backend/dist
# Production node_modules (includes compiled better-sqlite3 .node binary)
COPY --from=backend-builder /app/node_modules   ./backend/node_modules
# Built React SPA
COPY --from=frontend-builder /app/backend/public ./backend/public

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/moviegame.db
ENV UPLOADS_DIRECTORY=/data/uploads
ENV PORT=3001

EXPOSE 3001

# Run migrations (idempotent — safe to re-run on every deploy), then serve.
CMD ["sh", "-c", "node backend/dist/db/migrate.js && node backend/dist/server.js"]
