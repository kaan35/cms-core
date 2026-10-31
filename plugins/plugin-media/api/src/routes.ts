import { registerZodValidation } from "@cms/core";
import multipart from "@fastify/multipart";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  MAX_MEDIA_FILE_SIZE,
  MEDIA_PERMISSIONS,
  MediaDocSchema,
  MediaIdParamSchema,
  MediaListResponseSchema,
  MediaQuerySchema,
  type MediaIdParam,
  type MediaQuery,
} from "./domain/media.rules.js";
import type { MediaController } from "./mediaController.js";

export function registerMediaRoutes(app: FastifyInstance, controller: MediaController): void {
  registerZodValidation(app);

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
      schema: {
        tags: ["Media"],
        summary: "Upload image/file asset to S3/MinIO storage (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        response: { 201: MediaDocSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(MEDIA_PERMISSIONS.WRITE)],
    },
    controller.upload.bind(controller),
  );

  app.get<{ Querystring: MediaQuery }>(
    "/media",
    {
      schema: {
        tags: ["Media"],
        summary: "List media assets with filtering and pagination (Admin)",
        security: [{ cookieAuth: [] }],
        querystring: MediaQuerySchema,
        response: { 200: MediaListResponseSchema },
      },
      preHandler: [authenticate, checkPermission(MEDIA_PERMISSIONS.READ)],
    },
    controller.list.bind(controller),
  );

  app.delete<{ Params: MediaIdParam }>(
    "/media/:id",
    {
      schema: {
        tags: ["Media"],
        summary: "Delete media asset from database and S3/MinIO storage (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: MediaIdParamSchema,
        response: { 204: z.null() },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(MEDIA_PERMISSIONS.WRITE)],
    },
    controller.deleteById.bind(controller),
  );
}
