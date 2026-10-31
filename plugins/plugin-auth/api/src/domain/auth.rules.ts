import {
  IdParamSchema,
  OkResponseSchema,
  PaginatedMetaSchema,
  SearchPaginationQuerySchema,
  createPaginatedResponseSchema,
  type IdParam,
  validateWithSchema,
} from "@cms/core";
import { z } from "zod";
import { getDefaultPasswordMinLength, MAX_BCRYPT_PASSWORD_BYTES } from "./password.rules.js";

export { OkResponseSchema };

export const AuthIdParamSchema = IdParamSchema;
export type AuthIdParam = IdParam;

export const UserSessionParamSchema = z.object({
  id: z.string().min(1).max(128),
  sessionId: z.string().min(1).max(128),
});
export type UserSessionParam = z.infer<typeof UserSessionParamSchema>;

export const SessionsQuerySchema = z.object({
  includeHistory: z.string().max(10).optional(),
});
export type SessionsQuery = z.infer<typeof SessionsQuerySchema>;

export const UsersQuerySchema = SearchPaginationQuerySchema.extend({
  status: z.enum(["active", "suspended", "all", ""]).optional(),
  role: z.string().trim().max(64).optional(),
});
export type UsersQuery = z.infer<typeof UsersQuerySchema>;

export const RolesQuerySchema = SearchPaginationQuerySchema.extend({
  type: z.enum(["system", "custom", "all", ""]).optional(),
});
export type RolesQuery = z.infer<typeof RolesQuerySchema>;

export const ApiTokensQuerySchema = SearchPaginationQuerySchema.extend({
  scope: z.enum(["full", "scoped", "all", ""]).optional(),
  status: z.enum(["active", "revoked", "expired", "all", ""]).optional(),
});
export type ApiTokensQuery = z.infer<typeof ApiTokensQuerySchema>;

export const CreateApiTokenSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Token name must be between 1 and 50 characters")
    .max(50, "Token name must be between 1 and 50 characters"),
  scopes: z.array(z.string().trim().min(1).max(64)).max(100).optional(),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
});
export type CreateApiTokenInput = z.infer<typeof CreateApiTokenSchema>;

export function validateCreateApiToken(input: unknown): CreateApiTokenInput {
  return validateWithSchema(
    CreateApiTokenSchema,
    input,
    "Token name must be between 1 and 50 characters",
  );
}

// 1. Core Field Validations
export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(254, "Email must not exceed 254 characters")
  .email("Invalid email address format");

export const PasswordSchema = z
  .string()
  .min(
    getDefaultPasswordMinLength(),
    `Password must be at least ${getDefaultPasswordMinLength()} characters long`,
  )
  .max(
    MAX_BCRYPT_PASSWORD_BYTES,
    `Password must not exceed ${MAX_BCRYPT_PASSWORD_BYTES} characters`,
  )
  .refine(
    (val) => Buffer.byteLength(val, "utf8") <= MAX_BCRYPT_PASSWORD_BYTES,
    `Password must not exceed ${MAX_BCRYPT_PASSWORD_BYTES} bytes`,
  )
  .refine(
    (val) => /[a-zA-Z]/.test(val) && /[0-9]/.test(val),
    "Password must contain both letters and numbers",
  );

// 2. Authentication Schemas
export const LoginSchema = z.object({
  email: EmailSchema,
  // Cap login password length at the schema boundary to prevent multi-kilobyte bcrypt DoS payloads.
  password: z
    .string()
    .min(1, "Password is required")
    .max(
      MAX_BCRYPT_PASSWORD_BYTES,
      `Password must not exceed ${MAX_BCRYPT_PASSWORD_BYTES} characters`,
    )
    .refine(
      (val) => Buffer.byteLength(val, "utf8") <= MAX_BCRYPT_PASSWORD_BYTES,
      `Password must not exceed ${MAX_BCRYPT_PASSWORD_BYTES} bytes`,
    ),
});

export const RegisterSchema = z.object({
  email: EmailSchema,
  name: z.string().trim().max(128, "Name must not exceed 128 characters").optional(),
  password: PasswordSchema,
});

export const SetupSchema = z.object({
  email: EmailSchema,
  name: z.string().trim().max(128, "Name must not exceed 128 characters").optional(),
  password: PasswordSchema,
  siteTitle: z.string().trim().max(128).optional(),
});

// 3. User Management Schemas
export const CreateUserSchema = z.object({
  email: EmailSchema,
  name: z.string().trim().max(128, "Name must not exceed 128 characters").optional(),
  password: PasswordSchema,
  permissions: z.array(z.string().max(64)).max(100).optional(),
  role: z.string().trim().max(64).optional(),
  roleIds: z.array(z.string().max(128)).max(50).default([]),
  status: z.enum(["active", "suspended"]).optional().default("active"),
});

export const UpdateUserSchema = z.object({
  email: EmailSchema.optional(),
  name: z.string().trim().max(128, "Name must not exceed 128 characters").optional(),
  password: PasswordSchema.optional(),
  permissions: z.array(z.string().max(64)).max(100).optional(),
  role: z.string().trim().max(64).optional(),
  roleIds: z.array(z.string().max(128)).max(50).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export const createUserSchema = CreateUserSchema;
export const updateUserSchema = UpdateUserSchema;

// 4. Role Management Schemas
export const CreateRoleSchema = z.object({
  description: z.string().trim().max(500).optional(),
  name: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .max(64, "Role name must not exceed 64 characters"),
  permissions: z
    .array(z.string().max(64))
    .min(1, "Role must have at least one permission")
    .max(100),
});

export const UpdateRoleSchema = z.object({
  description: z.string().trim().max(500).optional(),
  name: z
    .string()
    .trim()
    .min(1, "Role name cannot be empty")
    .max(64, "Role name must not exceed 64 characters")
    .optional(),
  permissions: z
    .array(z.string().max(64))
    .min(1, "Role must have at least one permission")
    .max(100)
    .optional(),
});

// 5. Auth Settings Schema
export const UpdateAuthSettingsSchema = z.object({
  registrationEnabled: z.boolean(),
});

// 6. Response Schemas
export const UserStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  adminCount: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
});

export const RoleStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  systemCount: z.number().int().nonnegative(),
  customCount: z.number().int().nonnegative(),
});

export const ApiTokenStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  fullAccessCount: z.number().int().nonnegative(),
});

export const UserDocSchema = CreateUserSchema.omit({ password: true }).extend({
  id: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const UserSingleResponseSchema = z.object({
  user: UserDocSchema,
});

export const UserListResponseSchema = createPaginatedResponseSchema(UserDocSchema).extend({
  stats: UserStatsSchema.optional(),
});

export const AuthSessionResponseSchema = z.object({
  user: UserDocSchema,
  token: z.string(),
  csrfToken: z.string(),
});

export const SetupStatusResponseSchema = z.object({
  needsSetup: z.boolean(),
});

export const SessionInfoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
  createdAt: z.string(),
  expiresAt: z.string(),
  lastActiveAt: z.string().optional(),
  current: z.boolean().optional(),
  status: z.enum(["active", "expired", "revoked"]).optional(),
  revokedAt: z.string().optional(),
  revokeReason: z.string().optional(),
});

export const SessionsListResponseSchema = z.object({
  sessions: z.array(SessionInfoSchema),
});

export const RevokeCountResponseSchema = z.object({
  ok: z.boolean(),
  count: z.number().optional(),
});

export const RoleDocSchema = CreateRoleSchema.extend({
  id: z.string(),
  isSystem: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const RoleSingleResponseSchema = z.object({
  role: RoleDocSchema,
});

export const RoleListResponseSchema = z.object({
  roles: z.array(RoleDocSchema),
  data: z.array(RoleDocSchema),
  meta: PaginatedMetaSchema,
  stats: RoleStatsSchema.optional(),
});

export const ApiTokenInfoSchema = CreateApiTokenSchema.omit({ expiresInDays: true }).extend({
  id: z.string(),
  tokenPrefix: z.string(),
  scopes: z.array(z.string()),
  lastUsedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  revokedAt: z.string().nullable().optional(),
  revokeReason: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const CreateApiTokenResponseSchema = z.object({
  token: z.string(),
  mcpServerPath: z.string(),
  tokenInfo: ApiTokenInfoSchema,
});

export const ApiTokenListResponseSchema = z.object({
  tokens: z.array(ApiTokenInfoSchema),
  data: z.array(ApiTokenInfoSchema),
  meta: PaginatedMetaSchema,
  mcpServerPath: z.string(),
  stats: ApiTokenStatsSchema.optional(),
});

export const RevealApiTokenResponseSchema = z.object({
  token: z.string(),
});

// Inferred TypeScript Types
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type SetupInput = z.infer<typeof SetupSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type UpdateAuthSettingsInput = z.infer<typeof UpdateAuthSettingsSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;
export type RoleStats = z.infer<typeof RoleStatsSchema>;
export type ApiTokenStats = z.infer<typeof ApiTokenStatsSchema>;

// Validation Helpers
export function validateLogin(input: unknown): LoginInput {
  return validateWithSchema(LoginSchema, input, "Invalid login credentials format");
}

export function validateRegister(input: unknown): RegisterInput {
  return validateWithSchema(RegisterSchema, input, "Invalid registration payload");
}

export function validateSetup(input: unknown): SetupInput {
  return validateWithSchema(SetupSchema, input, "Invalid setup wizard payload");
}

export function validateCreateUser(input: unknown): CreateUserInput {
  return validateWithSchema(CreateUserSchema, input, "Invalid user creation payload");
}

export function validateUpdateUser(input: unknown): UpdateUserInput {
  return validateWithSchema(UpdateUserSchema, input, "Invalid user update payload");
}

export function validateCreateRole(input: unknown): CreateRoleInput {
  return validateWithSchema(CreateRoleSchema, input, "Invalid role creation payload");
}

export function validateUpdateRole(input: unknown): UpdateRoleInput {
  return validateWithSchema(UpdateRoleSchema, input, "Invalid role update payload");
}

export function validateUpdateAuthSettings(input: unknown): UpdateAuthSettingsInput {
  return validateWithSchema(UpdateAuthSettingsSchema, input, "Invalid auth settings payload");
}
