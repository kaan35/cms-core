import js from "@eslint/js";

export default [
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
];
