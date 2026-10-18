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
          jsxPragma: null,
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      rules: {
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/ban-ts-comment": [
          "error",
          {
            "ts-expect-error": "allow-with-description",
            "ts-ignore": true,
            "ts-nocheck": true,
            "ts-check": false,
            minimumDescriptionLength: 5,
          },
        ],
        "no-restricted-syntax": [
          "error",
          {
            selector: "TSParameterProperty",
            message:
              "Constructor parameter properties are disallowed. Declare class fields explicitly.",
          },
        ],
        "no-proto": "error",
        "no-restricted-properties": [
          "error",
          {
            object: "Math",
            property: "random",
            message:
              "Math.random() is disallowed for security reasons. Use Web Crypto crypto.getRandomValues() or crypto.randomUUID().",
          },
          {
            property: "__proto__",
            message:
              "Direct __proto__ access is disallowed. Use Object.getPrototypeOf/setPrototypeOf or Map.",
          },
        ],
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "mongodb",
                message: "Do not import MongoDB in Next.js client packages.",
              },
              {
                name: "ioredis",
                message: "Do not import Redis in Next.js client packages.",
              },
              {
                name: "child_process",
                message: "Node child_process cannot be used in client code.",
              },
              {
                name: "node:child_process",
                message: "Node child_process cannot be used in client code.",
              },
              {
                name: "fs",
                message: "Node fs cannot be used in client code.",
              },
              {
                name: "node:fs",
                message: "Node fs cannot be used in client code.",
              },
            ],
            patterns: [
              {
                group: ["../*", "../../*", "../../../*"],
                message:
                  "Relative parent imports are restricted. Please use the '@/*' path alias instead.",
              },
            ],
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
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "**/tests/**"],
      rules: {
        "no-console": "off",
      },
    },
  ]);
}

export default nextConfig;
