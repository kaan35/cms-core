import {
  IdParamSchema,
  PaginatedMetaSchema,
  SearchPaginationQuerySchema,
  validateWithSchema,
} from "@cms/core";
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
  EXPORTED: "vault.items.exported",
  IMPORTED: "vault.items.imported",
} as const;

export const VaultIdParamSchema = z.object({
  id: z.string().min(1, "Vault item ID is required").max(128),
});
export type VaultIdParam = z.infer<typeof VaultIdParamSchema>;
export { IdParamSchema };
export type IdParam = z.infer<typeof IdParamSchema>;

export const VaultQuerySchema = SearchPaginationQuerySchema.extend({
  category: z.string().trim().max(50).optional(),
  q: z.string().trim().max(200).optional(),
});
export type VaultQuery = z.infer<typeof VaultQuerySchema>;

export const VaultFormatQuerySchema = z.object({
  format: z.enum(["csv", "xlsx"]).optional().default("xlsx"),
});
export type VaultFormatQuery = z.infer<typeof VaultFormatQuerySchema>;

export const VaultPreviewSchema = z.object({
  csv: z.string().max(10_000_000).optional(),
  fileBase64: z.string().max(20_000_000).optional(),
  filename: z.string().max(255).optional(),
});
export type VaultPreviewInput = z.infer<typeof VaultPreviewSchema>;

export const VaultImportSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())).max(1000).optional(),
  csv: z.string().max(10_000_000).optional(),
  fileBase64: z.string().max(20_000_000).optional(),
  filename: z.string().max(255).optional(),
});
export type VaultImportInput = z.infer<typeof VaultImportSchema>;

export const CreateVaultItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  username: z.string().max(120).optional().default(""),
  password: z.string().min(1, "Password is required").max(500),
  url: z.string().max(255).optional().default(""),
  category: z.string().max(50).optional().default("General"),
  notes: z.string().max(2000).optional().default(""),
  tags: z
    .union([
      z.array(z.string().max(30)).max(50),
      z.string().transform((s) =>
        s
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ])
    .optional()
    .default([]),
  passwordChangedAt: z.coerce.date().optional(),
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

export const VaultItemDocSchema = CreateVaultItemSchema.extend({
  id: z.string(),
  tags: z.array(z.string()),
  passwordChangedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const VaultItemSingleResponseSchema = z.object({
  item: VaultItemDocSchema,
});

export const VaultItemListResponseSchema = z.object({
  items: z.array(VaultItemDocSchema),
  data: z.array(VaultItemDocSchema),
  meta: PaginatedMetaSchema,
  categories: z.array(z.string()),
});

export const VaultDeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const VaultPasswordResponseSchema = z.object({
  password: z.string(),
});

export const VaultPreviewResponseSchema = z.object({
  validCount: z.number(),
  invalidCount: z.number(),
  rows: z.array(z.record(z.string(), z.unknown())),
});

export const VaultImportResponseSchema = z.object({
  success: z.boolean(),
  count: z.number(),
  errors: z.array(z.string()),
});

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
  passwordChangedAt?: Date;
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
