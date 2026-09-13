import { UnauthorizedError } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { RolesRepository } from "../repositories/rolesRepository.js";
import type { UsersRepository } from "../repositories/usersRepository.js";
import type { SessionService } from "../sessionService.js";

export function createAuthenticateMiddleware(
  sessionService: SessionService,
  usersRepo: UsersRepository,
  rolesRepo?: RolesRepository,
  cookiePrefix = "",
) {
  const tokenCookieName = `${cookiePrefix}token`;
  return async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const cookieToken =
      request.cookies[tokenCookieName] || (!cookiePrefix ? request.cookies["token"] : undefined);
    let token = cookieToken;

    if (!token && request.headers.authorization) {
      const parts = request.headers.authorization.split(" ");
      if (parts.length === 2 && /^Bearer$/i.test(parts[0] ?? "")) {
        token = parts[1];
      }
    }

    if (!token) {
      throw new UnauthorizedError("Authentication required");
    }

    const sessionUser = await sessionService.validateAndSlideSession(token);
    const userDoc = await usersRepo.findById(sessionUser.id);

    if (!userDoc) {
      throw new UnauthorizedError("User no longer exists");
    }

    let permissions = sessionUser.permissions || [];
    let roleNames: string[] = [];
    if (rolesRepo) {
      let roleIds = userDoc.roleIds || [];
      if (roleIds.length === 0) {
        const adminRole = await rolesRepo.findByName("admin");
        if (adminRole) {
          roleIds = [adminRole.id];
          await usersRepo.update(userDoc.id, { roleIds });
        }
      }
      const roles = await rolesRepo.findByIds(roleIds);
      roleNames = roles.map((r) => r.name);
      const rolePermissions = roles.flatMap((r) => r.permissions || []);
      const directPermissions = userDoc.permissions || [];
      permissions = Array.from(new Set([...permissions, ...rolePermissions, ...directPermissions]));
    }

    const primaryRole = roleNames[0] || (permissions.includes("*") ? "admin" : "user");

    request.user = {
      id: userDoc.id,
      email: userDoc.email,
      name: userDoc.name,
      role: primaryRole,
      roles: roleNames,
      roleIds: userDoc.roleIds,
      permissions,
      sessionId: sessionUser.sessionId,
    };
  };
}
