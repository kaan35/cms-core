# Stage 1: Dependencies
FROM node:26 AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

# Stage 1.1: Development stage (optional target for local container dev)
FROM deps AS dev
WORKDIR /app
ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Stage 2: Builder
FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build

# Stage 3: Runner (Minimal production image ~150MB)
FROM node:26-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

USER node

COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static
COPY --chown=node:node --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
