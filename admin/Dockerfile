# 1. Base stage
FROM node:26 AS base
WORKDIR /app

# 2. Dependencies stage
FROM base AS deps
COPY package*.json ./
COPY tsconfig*.json ./
COPY packages/ ./packages/
COPY plugins/ ./plugins/
COPY admin/package.json ./admin/
RUN npm install

# 3. Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/plugins ./plugins
COPY . .
RUN npm run build
RUN npm run build --workspace=admin

# 4. Runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

WORKDIR /app/admin

COPY --from=builder /app/admin/.next ./.next
COPY --from=builder /app/admin/public ./public
COPY --from=builder /app/admin/package.json ./package.json
COPY --from=builder /app/node_modules ../node_modules
COPY --from=builder /app/packages ../packages
COPY --from=builder /app/plugins ../plugins

EXPOSE 3002

CMD ["npm", "run", "start"]
