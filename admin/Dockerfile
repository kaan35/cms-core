# Stage 1: builder
FROM node:26 AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY packages/ ./packages/
COPY plugins/ ./plugins/
COPY admin/package.json ./admin/

RUN npm install

COPY admin/ ./admin/

RUN npm run build
RUN npm run build --workspace=admin

# Stage 2: runner
FROM node:26-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

USER node

COPY --chown=node:node --from=builder /app/admin/.next/standalone ./
COPY --chown=node:node --from=builder /app/admin/.next/static ./admin/.next/static
COPY --chown=node:node --from=builder /app/admin/public ./admin/public

EXPOSE 3002

CMD ["node", "admin/server.js"]
