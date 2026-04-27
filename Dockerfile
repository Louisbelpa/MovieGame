# syntax=docker/dockerfile:1
# Single-stage build — keeps the setup simple and avoids native-addon
# cross-compilation issues between Alpine build and runtime stages.
FROM node:20-alpine
WORKDIR /app

# Build tools required by better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

# ── Frontend dependencies ──────────────────────────────────────────────────────
COPY package*.json ./
RUN npm ci

# ── Backend dependencies ───────────────────────────────────────────────────────
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# ── Source ─────────────────────────────────────────────────────────────────────
COPY . .

# ── Build ──────────────────────────────────────────────────────────────────────
# 1. Vite builds the React SPA → backend/public/  (Express will serve it)
RUN npm run build
# 2. TypeScript compiles the backend → backend/dist/
RUN cd backend && npm run build

# ── Runtime ────────────────────────────────────────────────────────────────────
# Mount a Railway/Render persistent volume at /data so the SQLite file
# survives container restarts and redeployments.
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/moviegame.db
ENV PORT=3001

EXPOSE 3001

# Run migrations (idempotent — safe to re-run on every start), then serve.
CMD ["sh", "-c", "node backend/dist/db/migrate.js && node backend/dist/server.js"]
