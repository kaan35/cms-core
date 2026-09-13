import { validateWithSchema } from "@cms/core";
import { z } from "zod";

export const VAULT_PERMISSIONS = {
  READ: "vault:read",
  WRITE: "vault:write",
} as const;

export const VAULT_EVENTS = {
  CREATED: "vault.item.created",
  UPDATED: "vault.item.updated",
  DELETED: "vault.item.deleted",
  REVEALED: "vault.secret.revealed",
} as const;

export const CreateVaultItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  username: z.string().max(120).optional().default(""),
  password: z.string().min(1, "Password is required").max(500),
  url: z.string().max(255).optional().default(""),
  category: z.string().max(50).optional().default("General"),
  notes: z.string().max(2000).optional().default(""),
  tags: z.array(z.string().max(30)).optional().default([]),
});

export const UpdateVaultItemSchema = CreateVaultItemSchema.partial();

export const GeneratePasswordSchema = z.object({
  length: z.number().min(6).max(64).optional().default(16),
  uppercase: z.boolean().optional().default(true),
  lowercase: z.boolean().optional().default(true),
  numbers: z.boolean().optional().default(true),
  symbols: z.boolean().optional().default(true),
});

export type CreateVaultItemInput = z.input<typeof CreateVaultItemSchema>;
export type UpdateVaultItemInput = z.input<typeof UpdateVaultItemSchema>;
export type GeneratePasswordInput = z.input<typeof GeneratePasswordSchema>;

export interface VaultItemDoc extends Record<string, unknown> {
  _id?: string;
  id?: string;
  title: string;
  username: string;
  password: string;
  url: string;
  category: string;
  notes: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export function validateCreateVaultItem(data: unknown): CreateVaultItemInput {
  return validateWithSchema(CreateVaultItemSchema, data);
}

export function validateUpdateVaultItem(data: unknown): UpdateVaultItemInput {
  return validateWithSchema(UpdateVaultItemSchema, data);
}

export function validateGeneratePassword(data: unknown): GeneratePasswordInput {
  return validateWithSchema(GeneratePasswordSchema, data);
}
