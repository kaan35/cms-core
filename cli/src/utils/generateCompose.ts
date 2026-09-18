export interface GenerateComposeOptions {
  includeAdmin?: boolean | undefined;
  includeClient?: boolean | undefined;
}

export function generateComposeContent(options: GenerateComposeOptions = {}): string {
  const includeAdmin = options.includeAdmin !== false;
  const includeClient = Boolean(options.includeClient);

  const adminBlock = includeAdmin
    ? `
  admin:
    container_name: \${PROJECT_NAME}-admin
    image: kaan/cms-admin:\${CMS_TAG:-latest}
    restart: \${RESTART_POLICY:-unless-stopped}
    env_file: .env
    environment:
      - API_URL=http://api:3001
    command: \${ADMIN_COMMAND:-sh -c 'if [ "$$NODE_ENV" = "development" ]; then npm run dev --workspace=admin; else npm run start; fi'}
    ports:
      - "\${ADMIN_PORT:-3002}:3002"
    depends_on:
      api:
        condition: service_healthy
`
    : "";

  const clientBlock = includeClient
    ? `
  client:
    container_name: \${PROJECT_NAME}-client
    build:
      context: ./client
      dockerfile: Dockerfile
      target: \${CLIENT_TARGET:-runner}
    restart: \${RESTART_POLICY:-unless-stopped}
    ports:
      - "\${CLIENT_PORT:-3000}:3000"
    environment:
      - API_URL=http://api:3001
    depends_on:
      api:
        condition: service_healthy
`
    : "";

  return `services:
  api:
    container_name: \${PROJECT_NAME}-api
    image: kaan/cms-api:\${CMS_TAG:-latest}
    restart: \${RESTART_POLICY:-unless-stopped}
    env_file: .env
    environment:
      - PORT=3001
      - PLUGINS_PROFILE=\${PLUGINS_PROFILE:-full}
    command: \${API_COMMAND:-sh -c 'if [ "$$NODE_ENV" = "development" ]; then npm run dev --workspace=api; else npm run start --workspace=api; fi'}
    ports:
      - "\${API_PORT:-3001}:3001"
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 3s
      timeout: 3s
      retries: 10
      start_period: 3s
${adminBlock}${clientBlock}
  mongo:
    container_name: \${PROJECT_NAME}-mongo
    image: mongo:7
    restart: unless-stopped
    environment:
      MONGO_INITDB_DATABASE: \${MONGO_DB_NAME:-cms}
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    container_name: \${PROJECT_NAME}-redis
    image: redis:7
    restart: unless-stopped
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  mongo_data:
  redis_data:
`;
}

export function generateDevComposeContent(options: GenerateComposeOptions = {}): string {
  const includeAdmin = options.includeAdmin !== false;
  const adminDevBlock = includeAdmin
    ? `
  admin:
    working_dir: /app
    volumes:
      - ../..:/app
      - /app/node_modules
      - /app/admin/.next
    command: npm run dev --workspace=admin
`
    : "";

  return `services:
  api:
    volumes:
      - ../..:/app
      - /app/node_modules
    command: npm run dev --workspace=api
${adminDevBlock}`;
}
