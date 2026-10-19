import { validateWithSchema } from "@cms/core";
import { z } from "zod";
import { getDefaultPasswordMinLength, MAX_BCRYPT_PASSWORD_BYTES } from "./password.rules.js";

// 1. Core Field Validations
export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
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
  name: z.string().trim().optional(),
  password: PasswordSchema,
});

export const SetupSchema = z.object({
  email: EmailSchema,
  name: z.string().trim().optional(),
  password: PasswordSchema,
  siteTitle: z.string().trim().optional(),
});

// 3. User Management Schemas
export const CreateUserSchema = z.object({
  email: EmailSchema,
  name: z.string().trim().optional(),
  password: PasswordSchema,
  permissions: z.array(z.string()).optional(),
  role: z.string().trim().optional(),
  roleIds: z.array(z.string()).default([]),
});

export const UpdateUserSchema = z.object({
  email: EmailSchema.optional(),
  name: z.string().trim().optional(),
  password: PasswordSchema.optional(),
  permissions: z.array(z.string()).optional(),
  role: z.string().trim().optional(),
  roleIds: z.array(z.string()).optional(),
});

// 4. Role Management Schemas
export const CreateRoleSchema = z.object({
  description: z.string().trim().optional(),
  name: z.string().trim().min(1, "Role name is required"),
  permissions: z.array(z.string()).min(1, "Role must have at least one permission"),
});

export const UpdateRoleSchema = z.object({
  description: z.string().trim().optional(),
  name: z.string().trim().min(1, "Role name cannot be empty").optional(),
  permissions: z.array(z.string()).min(1, "Role must have at least one permission").optional(),
});

// 5. Auth Settings Schema
export const UpdateAuthSettingsSchema = z.object({
  registrationEnabled: z.boolean(),
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
