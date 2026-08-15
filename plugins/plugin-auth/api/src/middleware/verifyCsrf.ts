import { ForbiddenError } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";

export function createVerifyCsrfMiddleware() {
  return async function verifyCsrf(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const method = request.method.toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return;
    }

    const cookieCsrf = request.cookies["csrfToken"];
    const headerCsrf = request.headers["x-csrf-token"];

    if (!cookieCsrf || !headerCsrf || typeof headerCsrf !== "string" || cookieCsrf !== headerCsrf) {
      throw new ForbiddenError("Invalid or missing CSRF token");
    }
  };
}
