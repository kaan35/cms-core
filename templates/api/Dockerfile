FROM node

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

COPY packages/ ./packages/

COPY plugins/ ./plugins/

# API template
COPY templates/api/ ./templates/api/

RUN npm ci --omit=dev --workspace=templates/api --include-workspace-root

WORKDIR /app/templates/api

EXPOSE 3001

CMD ["node", "--preserve-symlinks", "--env-file=../../.env", "src/main.ts"] 