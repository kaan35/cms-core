"use client";

import * as React from "react";

export type ShortcutPreset = "save" | "search" | "close" | "submit";

export interface ShortcutOptions {
  /**
   * Matches either Ctrl on Windows/Linux or Cmd (⌘) on macOS.
   * @default false
   */
  ctrlOrMeta?: boolean | undefined;

  /**
   * Matches Shift key modifier.
   * @default false
   */
  shift?: boolean | undefined;

  /**
   * Matches Alt / Option key modifier.
   * @default false
   */
  alt?: boolean | undefined;

  /**
   * Automatically calls event.preventDefault() when shortcut matches.
   * @default true
   */
  preventDefault?: boolean | undefined;

  /**
   * Whether the keyboard listener is currently active.
   * @default true
   */
  enabled?: boolean | undefined;
}

export interface ShortcutConfig extends ShortcutOptions {
  key: string;
  /**
   * Optional custom badge display string (e.g. "⌘S", "Ctrl+P").
   * If omitted, symbol is generated automatically from key and modifier flags.
   */
  symbol?: string | undefined;
  /**
   * Optional human-readable description for tooltips/accessibility.
   */
  label?: string | undefined;
}

export type ShortcutParam = ShortcutPreset | ShortcutConfig | string;

export const SHORTCUT_PRESETS: Record<
  ShortcutPreset,
  ShortcutConfig & { symbol: string; label: string }
> = {
  save: {
    key: "s",
    ctrlOrMeta: true,
    preventDefault: true,
    symbol: "⌘S",
    label: "Save (Ctrl+S)",
  },
  search: {
    key: "k",
    ctrlOrMeta: true,
    preventDefault: true,
    symbol: "⌘K",
    label: "Search (Ctrl+K)",
  },
  close: {
    key: "Escape",
    preventDefault: true,
    symbol: "Esc",
    label: "Close (Escape)",
  },
  submit: {
    key: "Enter",
    ctrlOrMeta: true,
    preventDefault: true,
    symbol: "⌘↵",
    label: "Submit (Ctrl+Enter)",
  },
};

/**
 * Generates an intuitive visual badge symbol (e.g. "⌘S", "⇧⌘K", "Esc")
 * from a shortcut configuration object.
 */
export function getShortcutSymbol(config: ShortcutConfig): string {
  if (config.symbol) return config.symbol;

  const parts: string[] = [];
  if (config.ctrlOrMeta) parts.push("⌘");
  if (config.alt) parts.push("⌥");
  if (config.shift) parts.push("⇧");

  const keyDisplay =
    config.key.length === 1
      ? config.key.toUpperCase()
      : config.key.charAt(0).toUpperCase() + config.key.slice(1);

  parts.push(keyDisplay);
  return parts.join("");
}

/**
 * Resolves a preset name, string, or config object into standardized shortcut parameters.
 */
export function resolveShortcut(
  param: ShortcutParam,
  overrideOptions: ShortcutOptions = {},
): {
  key: string;
  options: ShortcutOptions;
  symbol: string;
  label: string;
} {
  if (typeof param === "string") {
    if (param in SHORTCUT_PRESETS) {
      const preset = SHORTCUT_PRESETS[param as ShortcutPreset];
      const mergedOptions: ShortcutOptions = {
        ctrlOrMeta: preset.ctrlOrMeta,
        shift: preset.shift,
        alt: preset.alt,
        preventDefault: preset.preventDefault ?? true,
        enabled: overrideOptions.enabled ?? true,
        ...overrideOptions,
      };
      return {
        key: preset.key,
        options: mergedOptions,
        symbol: preset.symbol,
        label: preset.label,
      };
    }

    const config: ShortcutConfig = { key: param, ...overrideOptions };
    return {
      key: param,
      options: {
        ctrlOrMeta: false,
        shift: false,
        alt: false,
        preventDefault: true,
        enabled: true,
        ...overrideOptions,
      },
      symbol: getShortcutSymbol(config),
      label: config.key,
    };
  }

  const mergedOptions: ShortcutOptions = {
    ctrlOrMeta: param.ctrlOrMeta ?? false,
    shift: param.shift ?? false,
    alt: param.alt ?? false,
    preventDefault: param.preventDefault ?? true,
    enabled: overrideOptions.enabled ?? param.enabled ?? true,
    ...overrideOptions,
  };

  return {
    key: param.key,
    options: mergedOptions,
    symbol: getShortcutSymbol(param),
    label: param.label || param.key,
  };
}

/**
 * Universal keyboard shortcut hook supporting presets ("save", "search", "close", "submit")
 * or custom configuration objects ({ key: "p", ctrlOrMeta: true }).
 *
 * @example
 * ```tsx
 * // Using preset
 * useShortcut("save", handleSave);
 *
 * // Using custom config
 * useShortcut({ key: "p", ctrlOrMeta: true }, handlePrint);
 * ```
 */
export function useShortcut(
  shortcut: ShortcutParam,
  handler: (e: KeyboardEvent) => void | Promise<void>,
  options?: ShortcutOptions,
) {
  const resolved = resolveShortcut(shortcut, options);
  const { key, options: finalOptions } = resolved;
  const {
    ctrlOrMeta = false,
    shift = false,
    alt = false,
    preventDefault = true,
    enabled = true,
  } = finalOptions;

  React.useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const matchesKey = e.key.toLowerCase() === key.toLowerCase();
      const matchesCtrlOrMeta = ctrlOrMeta ? e.metaKey || e.ctrlKey : !e.metaKey && !e.ctrlKey;
      const matchesShift = shift ? e.shiftKey : !e.shiftKey;
      const matchesAlt = alt ? e.altKey : !e.altKey;

      if (matchesKey && matchesCtrlOrMeta && matchesShift && matchesAlt) {
        if (preventDefault) {
          e.preventDefault();
        }
        handler(e);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, handler, ctrlOrMeta, shift, alt, preventDefault, enabled]);
}

/**
 * Convenience preset for quick save shortcuts (Ctrl+S on Windows/Linux, Cmd+S on macOS).
 *
 * @param handler Callback to execute when Ctrl+S / Cmd+S is pressed
 * @param enabled Optional boolean flag to enable/disable the shortcut listener
 *
 * @example
 * ```tsx
 * useSaveShortcut(handleSave);
 * ```
 */
export function useSaveShortcut(handler: () => void | Promise<void>, enabled = true) {
  useShortcut("save", handler, { enabled });
}
