import { ForbiddenError } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { timingSafeEqual } from "node:crypto";

export function createVerifyCsrfMiddleware(cookiePrefix = "") {
  const csrfCookieName = `${cookiePrefix}csrfToken`;
  return async function verifyCsrf(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const method = request.method.toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return;
    }

    const cookieCsrf =
      request.cookies[csrfCookieName] ||
      (!cookiePrefix
        ? request.cookies["csrfToken"] || request.cookies["csrf_token"] || request.cookies["_csrf"]
        : undefined);
    const headerCsrf = request.headers["x-csrf-token"] || request.headers["x-xsrf-token"];

    if (!cookieCsrf || !headerCsrf || typeof headerCsrf !== "string") {
      throw new ForbiddenError("Invalid or missing CSRF token");
    }

    // Compare tokens in constant time to prevent byte-by-byte timing side-channel leaks.
    const cookieBuf = Buffer.from(cookieCsrf, "utf8");
    const headerBuf = Buffer.from(headerCsrf, "utf8");
    if (cookieBuf.length !== headerBuf.length || !timingSafeEqual(cookieBuf, headerBuf)) {
      throw new ForbiddenError("Invalid or missing CSRF token");
    }
  };
}
