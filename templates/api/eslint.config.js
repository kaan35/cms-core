import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  { ignores: ["dist/**"] },
  {
    extends: ["js/recommended"],
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: { globals: globals.node },
    plugins: { js },
  },
  tseslint.configs.recommended,
  prettier,
]);
