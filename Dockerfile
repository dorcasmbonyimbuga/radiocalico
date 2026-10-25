# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

# ---- Dependencies: production packages only, installed from the lockfile ----
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ---- Runtime ----
FROM node:${NODE_VERSION}-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    DB_FILE=/data/radiocalico.db

WORKDIR /app

# SQLite data directory, owned by the unprivileged "node" user from the base image
RUN mkdir -p /data && chown node:node /data

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public

USER node

# Database file plus its WAL/SHM companions live here; mount a volume to persist them
VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# Run node directly (not through npm) so SIGTERM reaches the graceful shutdown handler
CMD ["node", "src/server.js"]
