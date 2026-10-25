import { ForbiddenError, UnauthorizedError } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { RolesRepository } from "../repositories/rolesRepository.js";
import type { UsersRepository } from "../repositories/usersRepository.js";
import type { ApiTokenService } from "../services/ApiTokenService.js";
import type { SessionService } from "../sessionService.js";

export function createAuthenticateMiddleware(
  sessionService: SessionService,
  usersRepo: UsersRepository,
  rolesRepo?: RolesRepository,
  cookiePrefix = "",
  apiTokenService?: ApiTokenService,
) {
  const tokenCookieName = `${cookiePrefix}token`;
  return async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const cookieToken =
      request.cookies?.[tokenCookieName] ||
      (!cookiePrefix ? request.cookies?.["token"] : undefined);
    let token = cookieToken;

    if (!token && request.headers.authorization) {
      const authHeader = request.headers.authorization.trim();
      if (authHeader.startsWith("Bearer ") || authHeader.startsWith("bearer ")) {
        token = authHeader.slice(7).trim();
      }
    }

    if (!token) {
      throw new UnauthorizedError("Authentication required");
    }

    let userId: string;
    let sessionId: string;
    let initialPermissions: string[];
    const isApiToken = apiTokenService ? apiTokenService.isApiToken(token) : false;

    let tokenName: string | undefined;
    let tokenPrefix: string | undefined;

    if (isApiToken) {
      if (!apiTokenService) {
        throw new UnauthorizedError("API tokens not configured");
      }
      const validation = await apiTokenService.validateToken(token);
      userId = validation.userId;
      sessionId = `api-token:${validation.tokenId}`;
      tokenName = validation.tokenName;
      tokenPrefix = validation.tokenPrefix;
      initialPermissions = validation.scopes || [];
    } else {
      const sessionUser = await sessionService.validateAndSlideSession(token);
      userId = sessionUser.id;
      sessionId = sessionUser.sessionId;
      initialPermissions = sessionUser.permissions || [];
    }

    const userDoc = await usersRepo.findById(userId);
    if (!userDoc) {
      throw new UnauthorizedError("User no longer exists");
    }

    if (userDoc.status === "suspended") {
      throw new ForbiddenError("Account is suspended");
    }

    let permissions = initialPermissions;
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
      const userEffectivePerms = Array.from(new Set([...rolePermissions, ...directPermissions]));

      if (isApiToken) {
        if (initialPermissions.includes("*")) {
          permissions = userEffectivePerms.length > 0 ? userEffectivePerms : ["*"];
        } else {
          if (userEffectivePerms.includes("*") || userEffectivePerms.length === 0) {
            permissions = initialPermissions;
          } else {
            permissions = initialPermissions.filter((s) => userEffectivePerms.includes(s));
          }
        }
      } else {
        permissions = Array.from(new Set([...permissions, ...userEffectivePerms]));
      }
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
      sessionId,
      ...(tokenName ? { tokenName } : {}),
      ...(tokenPrefix ? { tokenPrefix } : {}),
    };
  };
}
