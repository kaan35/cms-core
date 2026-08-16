# 1. Base stage
FROM node:26 AS base
WORKDIR /app

# 2. Dependencies stage
FROM base AS deps
COPY package*.json ./
COPY tsconfig*.json ./
COPY packages/ ./packages/
COPY plugins/ ./plugins/
COPY api/package.json ./api/
RUN npm install

# 3. Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 4. Runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/plugins ./plugins
COPY --from=builder /app/api ./api

EXPOSE 3001

CMD ["npm", "run", "start", "--workspace=api"]
