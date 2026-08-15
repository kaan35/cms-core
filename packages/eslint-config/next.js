import js from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Shared ESLint configuration for Next.js applications.
 */
export function nextConfig(tsconfigRootDir) {
  return defineConfig([
    {
      ignores: [
        ".next/**",
        "dist/**",
        "node_modules/**",
        "coverage/**",
        "**/*.d.ts",
        ".tsbuildinfo",
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    eslintPluginPrettierRecommended,
    {
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        globals: {
          ...globals.browser,
          ...globals.node,
        },
        parserOptions: {
          tsconfigRootDir,
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      rules: {
        "@typescript-eslint/no-explicit-any": "error",
        "no-restricted-syntax": [
          "error",
          {
            selector: "TSParameterProperty",
            message:
              "Constructor parameter properties are banned (Rule 14). Declare class fields explicitly.",
          },
        ],
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
          },
        ],
      },
    },
  ]);
}
