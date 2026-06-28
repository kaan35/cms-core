import {
  AuditLogService,
  BackupService,
  cache,
  config,
  logger,
  pluginLoader,
  WebhookService,
} from "@cms/core";
import { database } from "@cms/db";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { ZodError } from "zod";

export async function createServer() {
  const app = Fastify({
    logger: false, // We use our custom Pino logger
  });

  // Decorate Fastify with core services for Plugin Dependency Injection
  app.decorate("db", database);
  app.decorate("cache", cache);
  app.decorate("config", config);
  app.decorate("logger", logger);

  // 1. Set Zod Validator Compiler
  app.setValidatorCompiler(({ schema }: { schema: unknown }) => {
    return (data: unknown) => {
      const s = schema as { safeParse?: (d: unknown) => { success: boolean; data?: unknown; error?: Error } };
      if (s && typeof s.safeParse === "function") {
        const result = s.safeParse(data);
        if (result.success) return { value: result.data };
        return { error: result.error };
      }
      return { value: data };
    };
  });

  // 2. Global Error Handler
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({
        status: "error",
        message: "Validation Error",
        details: error.issues.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }

    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode) {
      reply.status(statusCode).send({
        status: "error",
        message: (error as Error).message,
      });
      return;
    }

    logger.error(error, `💥 Unhandled Server Error on ${request.method} ${request.url}`);
    reply.status(500).send({
      status: "error",
      message: "Internal Server Error",
    });
  });

  // 3. Register Security & Core Plugins
  await app.register(cors, {
    origin: true, // Configurable or true for all in dev
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  });

  await app.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === "production",
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await app.register(cookie, {
    secret: config.JWT_SECRET,
  });

  // 4. OpenAPI/Swagger Documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Modular Headless CMS API",
        description: "API Documentation for CMS core and active plugins",
        version: "1.0.0",
      },
      servers: [{ url: `http://localhost:${config.PORT}` }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  // 5. Health Check Endpoint
  app.get("/health", async (request, reply) => {
    const mongoConnected = database.getDb() ? true : false;
    // We can run a simple ping on cache
    let redisConnected: boolean;
    try {
      await cache.get("health_ping");
      redisConnected = true;
    } catch {
      redisConnected = false;
    }

    const status = mongoConnected && redisConnected ? "ok" : "degraded";
    reply.status(status === "ok" ? 200 : 503).send({
      status,
      services: {
        database: mongoConnected ? "connected" : "disconnected",
        cache: redisConnected ? "connected" : "disconnected",
      },
      timestamp: new Date().toISOString(),
    });
  });

  // 6. Connect to databases
  await database.connect(config, logger);
  await cache.connect();

  // Initialize core services after DB is ready
  AuditLogService.init();
  WebhookService.init();
  BackupService.init();

  // 7. Load Plugins from DB
  await pluginLoader.loadAll(app);

  return app;
}

// Start Server if run directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.endsWith("main.ts")) {
  createServer()
    .then(async (app) => {
      const port = config.PORT;
      await app.listen({ port, host: "0.0.0.0" });
      logger.info(`✨ Fastify Server is Live on port ${port}`);
      logger.info(`📚 Documentation available at http://localhost:${port}/docs`);

      const shutdown = async () => {
        logger.info("🛑 Shutting down gracefully...");
        await app.close();
        await database.disconnect();
        await cache.disconnect();
        logger.info("👋 Good bye!");
        process.exit(0);
      };

      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    })
    .catch((err) => {
      logger.error(err, "💥 Server failed to start");
      process.exit(1);
    });
}
