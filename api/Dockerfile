# Stage 1: builder
FROM node:26 AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY packages/ ./packages/
COPY plugins/ ./plugins/
COPY api/package.json ./api/

RUN npm install

COPY api/ ./api/

RUN npm run build
RUN npm prune --omit=dev

# Stage 2: runner
FROM node:26-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

USER node

COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/plugins ./plugins
COPY --chown=node:node --from=builder /app/api/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main.js"]
