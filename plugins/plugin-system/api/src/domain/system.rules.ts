import { PERMISSIONS, validateWithSchema } from "@cms/core";
import { z } from "zod";

export const SYSTEM_PERMISSIONS = {
  PLUGINS_READ: PERMISSIONS.SYSTEM.PLUGINS_READ,
  PLUGINS_WRITE: PERMISSIONS.SYSTEM.PLUGINS_WRITE,
  SETTINGS_READ: PERMISSIONS.SYSTEM.SETTINGS_READ,
  SETTINGS_WRITE: PERMISSIONS.SYSTEM.SETTINGS_WRITE,
  FEATURE_FLAGS_READ: PERMISSIONS.SYSTEM.FEATURE_FLAGS_READ,
  FEATURE_FLAGS_WRITE: PERMISSIONS.SYSTEM.FEATURE_FLAGS_WRITE,
  AUDIT_LOG_READ: PERMISSIONS.SYSTEM.AUDIT_LOG_READ,
} as const;

export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const FEATURE_FLAG_KEY_REGEX = /^[a-zA-Z0-9_.-]{2,64}$/;

export type SiteTheme = "dark" | "light" | "system";

export function validateHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color.trim());
}

export function validateFeatureFlagKey(key: string): boolean {
  return FEATURE_FLAG_KEY_REGEX.test(key.trim());
}

export function validateTheme(theme: string): boolean {
  return ["dark", "light", "system"].includes(theme.trim().toLowerCase());
}

export interface NavigationMenuItem {
  id: string;
  label: string;
  url: string;
  type?: "page" | "custom" | "blog" | undefined;
  pageId?: string | undefined;
  customLabel?: boolean | undefined;
  external?: boolean | undefined;
  style?: "link" | "button" | undefined;
  badge?: string | undefined;
  icon?: string | undefined;
}

// 1. Zod Ingress Schemas
export const NavigationMenuItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Menu label is required"),
  url: z.string().min(1, "Menu URL is required"),
  type: z.enum(["page", "custom", "blog"]).optional(),
  pageId: z.string().optional(),
  customLabel: z.boolean().optional(),
  external: z.boolean().optional(),
  style: z.enum(["link", "button"]).optional(),
  badge: z.string().optional(),
  icon: z.string().optional(),
});

export const UpdateSettingsSchema = z.object({
  adminTitle: z.string().trim().min(1, "Admin title cannot be empty").optional(),
  siteTitle: z.string().trim().min(1, "Site title cannot be empty").optional(),
  siteDescription: z.string().trim().optional(),
  brandColor: z
    .string()
    .regex(HEX_COLOR_REGEX, "Invalid hex color format (e.g. #3b82f6)")
    .optional(),
  brandFont: z.string().trim().optional(),
  primaryColor: z.string().regex(HEX_COLOR_REGEX, "Invalid hex color format").optional(),
  fontFamily: z.string().trim().optional(),
  defaultTheme: z.enum(["dark", "light", "system"]).optional(),
  footerText: z.string().trim().optional(),
  headerMenu: z.array(NavigationMenuItemSchema).optional(),
  footerMenu: z.array(NavigationMenuItemSchema).optional(),
  allowRegistration: z.boolean().optional(),
  sessionTimeoutMinutes: z.number().int().positive().optional(),
});

export const CreateFeatureFlagSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(
      FEATURE_FLAG_KEY_REGEX,
      "Flag key must be 2-64 alphanumeric, dash, dot, or underscore characters",
    ),
  label: z.string().trim().optional(),
  description: z.string().trim().optional(),
  value: z.boolean().default(false),
});

export const UpdateFeatureFlagSchema = z.object({
  label: z.string().trim().optional(),
  description: z.string().trim().optional(),
  value: z.boolean().optional(),
});

export const TogglePluginSchema = z.object({
  enabled: z.boolean(),
});

// Inferred TypeScript Types
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
export type CreateFeatureFlagInput = z.infer<typeof CreateFeatureFlagSchema>;
export type UpdateFeatureFlagInput = z.infer<typeof UpdateFeatureFlagSchema>;
export type TogglePluginInput = z.infer<typeof TogglePluginSchema>;

// Validation Helpers
export function validateUpdateSettings(input: unknown): UpdateSettingsInput {
  return validateWithSchema(UpdateSettingsSchema, input, "Invalid system settings payload");
}

export function validateCreateFeatureFlag(input: unknown): CreateFeatureFlagInput {
  return validateWithSchema(CreateFeatureFlagSchema, input, "Invalid feature flag payload");
}

export function validateUpdateFeatureFlag(input: unknown): UpdateFeatureFlagInput {
  return validateWithSchema(UpdateFeatureFlagSchema, input, "Invalid feature flag update payload");
}

export function validateTogglePlugin(input: unknown): TogglePluginInput {
  return validateWithSchema(TogglePluginSchema, input, "Invalid plugin toggle payload");
}
