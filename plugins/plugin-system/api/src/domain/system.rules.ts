import { PERMISSIONS, validateWithSchema } from "@cms/core";
import { z } from "zod";

export const SYSTEM_PERMISSIONS = {
  PLUGINS_READ: PERMISSIONS.SYSTEM.PLUGINS_READ,
  PLUGINS_WRITE: PERMISSIONS.SYSTEM.PLUGINS_WRITE,
  SETTINGS_READ: PERMISSIONS.SYSTEM.SETTINGS_READ,
  SETTINGS_WRITE: PERMISSIONS.SYSTEM.SETTINGS_WRITE,
  AUDIT_LOG_READ: PERMISSIONS.SYSTEM.AUDIT_LOG_READ,
} as const;

export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export type SiteTheme = "dark" | "light" | "system";

export function validateHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color.trim());
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
  label: z.string().min(1, "Menu label is required").max(80),
  url: z.string().min(1, "Menu URL is required").max(500),
  type: z.enum(["page", "custom", "blog"]).optional(),
  pageId: z.string().optional(),
  customLabel: z.boolean().optional(),
  external: z.boolean().optional(),
  style: z.enum(["link", "button"]).optional(),
  badge: z.string().max(30).optional(),
  icon: z.string().max(64).optional(),
});

export const UpdateSettingsSchema = z.object({
  adminTitle: z.string().trim().min(1, "Admin title cannot be empty").max(120).optional(),
  siteTitle: z.string().trim().min(1, "Site title cannot be empty").max(120).optional(),
  siteDescription: z.string().trim().max(500).optional(),
  brandColor: z
    .string()
    .regex(HEX_COLOR_REGEX, "Invalid hex color format (e.g. #3b82f6)")
    .optional(),
  brandFont: z.string().trim().max(80).optional(),
  primaryColor: z.string().regex(HEX_COLOR_REGEX, "Invalid hex color format").optional(),
  fontFamily: z.string().trim().max(80).optional(),
  defaultTheme: z.enum(["dark", "light", "system"]).optional(),
  footerText: z.string().trim().max(500).optional(),
  headerMenu: z.array(NavigationMenuItemSchema).max(30).optional(),
  footerMenu: z.array(NavigationMenuItemSchema).max(30).optional(),
  allowRegistration: z.boolean().optional(),
  sessionTimeoutMinutes: z.number().int().positive().optional(),
});

export const TogglePluginSchema = z.object({
  enabled: z.boolean(),
});

// Inferred TypeScript Types
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
export type TogglePluginInput = z.infer<typeof TogglePluginSchema>;

export interface SystemSettingsDoc {
  adminTitle?: string | undefined;
  siteTitle?: string | undefined;
  siteDescription?: string | undefined;
  defaultTheme?: SiteTheme | string | undefined;
  brandColor?: string | undefined;
  primaryColor?: string | undefined;
  brandFont?: string | undefined;
  fontFamily?: string | undefined;
  footerText?: string | undefined;
  headerMenu?: NavigationMenuItem[] | undefined;
  footerMenu?: NavigationMenuItem[] | undefined;
  allowRegistration?: boolean | undefined;
  sessionTimeoutMinutes?: number | undefined;
}

export type SettingsDoc = SystemSettingsDoc;

// Validation Helpers
export function validateUpdateSettings(input: unknown): UpdateSettingsInput {
  return validateWithSchema(UpdateSettingsSchema, input, "Invalid system settings payload");
}

export function validateTogglePlugin(input: unknown): TogglePluginInput {
  return validateWithSchema(TogglePluginSchema, input, "Invalid plugin toggle payload");
}
