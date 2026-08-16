import { ForbiddenError } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";

export function createVerifyCsrfMiddleware() {
  return async function verifyCsrf(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const method = request.method.toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return;
    }

    const cookieCsrf =
      request.cookies["csrfToken"] || request.cookies["csrf_token"] || request.cookies["_csrf"];
    const headerCsrf = request.headers["x-csrf-token"] || request.headers["x-xsrf-token"];

    if (!cookieCsrf || !headerCsrf || typeof headerCsrf !== "string" || cookieCsrf !== headerCsrf) {
      throw new ForbiddenError("Invalid or missing CSRF token");
    }
  };
}
