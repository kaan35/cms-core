export const SYSTEM_PERMISSIONS = {
  PLUGINS_READ: "system:plugins:read",
  PLUGINS_WRITE: "system:plugins:write",
  SETTINGS_READ: "system:settings:read",
  SETTINGS_WRITE: "system:settings:write",
  FEATURE_FLAGS_READ: "system:feature-flags:read",
  FEATURE_FLAGS_WRITE: "system:feature-flags:write",
  AUDIT_LOG_READ: "system:audit-log:read",
} as const;

export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const FEATURE_FLAG_KEY_REGEX = /^[a-zA-Z0-9_.-]{2,64}$/;

export function validateHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color.trim());
}

export function validateFeatureFlagKey(key: string): boolean {
  return FEATURE_FLAG_KEY_REGEX.test(key.trim());
}
