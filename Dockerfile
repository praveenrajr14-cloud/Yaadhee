# ── Stage 1: deps ─────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app

# Copy manifests and install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: runner ───────────────────────────────────────────
FROM node:20-slim AS runner

# Install sqlite3 native build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all application source files
COPY . .

# Persistent volume mount point for SQLite DB
# Fly.io will mount a volume here so data survives restarts/redeploys
RUN mkdir -p /data

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/data/yadhee.db

EXPOSE 8080

# Healthcheck so Fly knows when the app is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
