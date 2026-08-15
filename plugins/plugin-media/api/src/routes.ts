import multipart from "@fastify/multipart";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { MAX_MEDIA_FILE_SIZE, MEDIA_PERMISSIONS } from "./domain/media.rules.js";
import type { MediaController } from "./mediaController.js";

export function registerMediaRoutes(app: FastifyInstance, controller: MediaController): void {
  const authenticate = (req: FastifyRequest, reply: FastifyReply) => app.authenticate(req, reply);
  const verifyCsrf = (req: FastifyRequest, reply: FastifyReply) => app.verifyCsrf(req, reply);
  const checkPermission = (permission: string) => (req: FastifyRequest, reply: FastifyReply) =>
    app.checkPermission(permission)(req, reply);

  // Register multipart scoped to this plugin only
  void app.register(multipart, {
    limits: {
      fileSize: MAX_MEDIA_FILE_SIZE,
      files: 1,
    },
  });

  app.post(
    "/media",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(MEDIA_PERMISSIONS.WRITE)],
    },
    (request, reply) => controller.upload(request, reply),
  );

  app.get(
    "/media",
    {
      preHandler: [authenticate, checkPermission(MEDIA_PERMISSIONS.READ)],
    },
    (request, reply) => controller.list(request as Parameters<typeof controller.list>[0], reply),
  );

  app.delete(
    "/media/:id",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(MEDIA_PERMISSIONS.WRITE)],
    },
    (request, reply) =>
      controller.deleteById(request as Parameters<typeof controller.deleteById>[0], reply),
  );
}
