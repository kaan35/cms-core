import js from "@eslint/js";
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
