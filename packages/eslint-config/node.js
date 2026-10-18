import js from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Shared ESLint configuration for Node.js backend packages.
 */
export function nodeConfig(tsconfigRootDir) {
  return defineConfig([
    {
      ignores: ["dist/**", "node_modules/**", "coverage/**", "**/*.d.ts", ".tsbuildinfo"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    eslintPluginPrettierRecommended,
    {
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        globals: {
          ...globals.node,
        },
        parserOptions: {
          tsconfigRootDir,
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
          {
            selector: "CallExpression[callee.name='exec']",
            message:
              "child_process.exec is disallowed due to shell injection risks. Use execFile or spawn with { shell: false }.",
          },
        ],
        "no-proto": "error",
        "no-restricted-properties": [
          "error",
          {
            object: "Math",
            property: "random",
            message:
              "Math.random() is disallowed for security reasons. Use crypto.randomUUID(), crypto.randomBytes(), or crypto.getRandomValues().",
          },
          {
            property: "__proto__",
            message:
              "Direct __proto__ access is disallowed. Use Object.getPrototypeOf/setPrototypeOf or Map.",
          },
        ],
        "no-console": [
          "error",
          {
            allow: ["warn", "error"],
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
      files: ["**/*.test.ts", "**/tests/**"],
      rules: {
        "no-console": "off",
      },
    },
  ]);
}

export default nodeConfig;
