# 1. Base stage
FROM node:26-alpine AS base
WORKDIR /app

# 2. Dependencies
FROM base AS deps
COPY package*.json ./
RUN npm install

# 2.1 Dev stage (for development mode)
FROM deps AS dev
ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# 3. Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 4. Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "start"]
