import { validateWithSchema } from "@cms/core";
import { z } from "zod";
import { getDefaultPasswordMinLength } from "./password.rules.js";

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
  .refine(
    (val) => /[a-zA-Z]/.test(val) && /[0-9]/.test(val),
    "Password must contain both letters and numbers",
  );

// 2. Authentication Schemas
export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Password is required"),
});

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().trim().optional(),
});

export const SetupSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().trim().optional(),
  siteTitle: z.string().trim().optional(),
});

// 3. User Management Schemas
export const CreateUserSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().trim().optional(),
  roleIds: z.array(z.string()).default([]),
});

export const UpdateUserSchema = z.object({
  name: z.string().trim().optional(),
  email: EmailSchema.optional(),
  roleIds: z.array(z.string()).optional(),
  password: PasswordSchema.optional(),
});

// 4. Role Management Schemas
export const CreateRoleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required"),
  description: z.string().trim().optional(),
  permissions: z.array(z.string()).min(1, "Role must have at least one permission"),
});

export const UpdateRoleSchema = z.object({
  name: z.string().trim().min(1, "Role name cannot be empty").optional(),
  description: z.string().trim().optional(),
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
