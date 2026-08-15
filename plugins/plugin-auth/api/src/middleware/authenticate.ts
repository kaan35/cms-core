import { UnauthorizedError } from "@cms/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { UsersRepository } from "../repositories/usersRepository.js";
import type { SessionService } from "../sessionService.js";

export function createAuthenticateMiddleware(
  sessionService: SessionService,
  usersRepo: UsersRepository,
) {
  return async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const cookieToken = request.cookies["token"];
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

    request.user = {
      id: userDoc.id,
      email: userDoc.email,
      permissions: sessionUser.permissions,
      sessionId: sessionUser.sessionId,
    };
  };
}
