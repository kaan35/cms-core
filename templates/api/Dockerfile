# ── Production: monorepo root'tan build edilir ──────────────────────────────
# Build context: repo root (docker-compose.yml'de context: . olarak ayarlı)
FROM node

WORKDIR /app

ENV NODE_ENV=production

# Root workspace manifest
COPY package*.json ./

# Shared packages (workspace symlinks için gerekli)
COPY packages/ ./packages/

# Plugins (PluginLoader'ın erişeceği kaynak — production'da npm'den gelir ama dev için)
COPY plugins/ ./plugins/

# API template
COPY templates/api/ ./templates/api/

# Workspace bağımlılıklarını kur (--omit=dev production build için)
RUN npm ci --omit=dev --workspace=templates/api --include-workspace-root

WORKDIR /app/templates/api

EXPOSE 3001

# Node 26 native strip-types ile doğrudan TypeScript çalıştır
CMD ["node", "--experimental-strip-types", "--preserve-symlinks", "--env-file=.env", "src/main.ts"]
