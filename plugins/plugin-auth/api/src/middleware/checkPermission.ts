import { ForbiddenError, UnauthorizedError } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { hasPermission } from "../domain/permission.rules.js";

export function createCheckPermissionMiddleware() {
  return function checkPermission(permission: string) {
    return async function permissionHook(
      request: FastifyRequest,
      _reply: FastifyReply,
    ): Promise<void> {
      if (!request.user) {
        throw new UnauthorizedError("Authentication required before permission check");
      }

      if (!hasPermission(request.user.permissions, permission)) {
        throw new ForbiddenError(`Forbidden: missing required permission '${permission}'`);
      }
    };
  };
}
