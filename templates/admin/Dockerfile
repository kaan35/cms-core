# ── Stage 1: Build ───────────────────────────────────────────────────────────
# Build context: repo root
FROM node AS builder

WORKDIR /app

COPY package*.json ./
COPY templates/admin/package.json ./templates/admin/

RUN npm ci --workspace=templates/admin --include-workspace-root

COPY templates/admin/ ./templates/admin/

WORKDIR /app/templates/admin

# Build Next.js (standalone output for smaller image)
RUN npm run build

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

COPY --from=builder /app/templates/admin/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/templates/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/templates/admin/.next/static ./.next/static

USER nextjs

EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
