# syntax=docker/dockerfile:1
#
# Astritsa — production image.
# Single runtime dependency (astronomy-engine) is pure JS, so Alpine is safe.

FROM node:20-alpine AS base
ENV NODE_ENV=production
WORKDIR /app

# --- dependencies -----------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# --- runtime image ----------------------------------------------------------
FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules

# Runtime sources only (server, ephemeris, sign table, static UI).
# mock-ai.js, test/ and data/ are deliberately NOT copied: the image ships
# without dev data and connects to a real AI provider via env vars.
COPY server.js package.json zodiac-signs.js ephemeris.js ./
COPY public ./public

# The app persists its whole state in data/db.json — mount a volume here.
RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3000
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]