import { ValidationError } from "@cms/core";
import {
  validateLogin,
  validateRegister,
  validateSetup,
  type LoginInput,
  type RegisterInput,
  type SetupInput,
} from "../domain/auth.rules.js";
import { validatePasswordStrength } from "../domain/password.rules.js";
import type { RolesRepository } from "../repositories/rolesRepository.js";
import type { UserDoc } from "../repositories/usersRepository.js";
import type { ISessionService } from "../sessionService.js";

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name?: string | undefined;
    roleIds: string[];
    permissions: string[];
    createdAt?: Date;
  };
  session: {
    token: string;
    csrfToken: string;
    expiresAt: Date;
    sessionId: string;
  };
}

export function normalizeSetupInput(
  emailOrInput: string | unknown,
  passwordRaw?: string,
): SetupInput {
  if (typeof emailOrInput === "string") {
    return { email: emailOrInput, password: passwordRaw || "" };
  }
  return validateSetup(emailOrInput);
}

export function normalizeRegisterInput(
  emailOrInput: string | unknown,
  passwordRaw?: string,
): RegisterInput {
  if (typeof emailOrInput === "string") {
    return { email: emailOrInput, password: passwordRaw || "" };
  }
  return validateRegister(emailOrInput);
}

export function normalizeLoginInput(
  emailOrInput: string | unknown,
  passwordRaw?: string,
): LoginInput {
  if (typeof emailOrInput === "string") {
    return { email: emailOrInput, password: passwordRaw || "" };
  }
  return validateLogin(emailOrInput);
}

export function validateEmail(email: string): string {
  const sanitized = email.trim().toLowerCase();
  if (!sanitized || !sanitized.includes("@")) {
    throw new ValidationError("A valid email address is required");
  }
  return sanitized;
}

export function validatePassword(password: string, minLength = 8): void {
  const val = validatePasswordStrength(password, minLength);
  if (!val.valid) {
    throw new ValidationError(val.error ?? "Invalid password");
  }
}

export async function createAuthResult(
  user: UserDoc,
  rolesRepo: RolesRepository,
  sessionService: ISessionService,
  meta: { userAgent?: string | undefined; ip?: string | undefined },
): Promise<AuthResult> {
  const roles = await rolesRepo.findByIds(user.roleIds || []);
  const rolePermissions = roles.flatMap((r) => r.permissions || []);
  const directPermissions = user.permissions || [];
  const permissions = Array.from(new Set([...rolePermissions, ...directPermissions]));

  const session = await sessionService.createSession(user.id, permissions, meta);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleIds: user.roleIds,
      permissions,
      createdAt: user.createdAt,
    },
    session,
  };
}
