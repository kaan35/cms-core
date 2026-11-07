import { nextConfig } from "@cms/eslint-config/next";
import { nodeConfig } from "@cms/eslint-config/node";
import { reactConfig } from "@cms/eslint-config/react";

/**
 * Helper to scope modular package configs to specific workspace paths
 * while preserving their internal rule sets, plugins, and overrides.
 */
function scopeConfigs(configs, files) {
  return configs
    .filter((cfg) => !(cfg.ignores && Object.keys(cfg).length === 1))
    .map((cfg) => ({
      ...cfg,
      files: cfg.files ? cfg.files : files,
    }));
}

export default [
  // Global monorepo ignores
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.d.ts",
      "**/.tsbuildinfo",
      "**/.next/**",
      "projects/**",
      "backups/**",
      "scripts/rules-fixtures/**",
    ],
  },
  // 1. Backend packages & Node services (uses @cms/eslint-config/node)
  ...scopeConfigs(nodeConfig(import.meta.dirname), [
    "api/**/*.{ts,js,mjs}",
    "packages/core/**/*.{ts,js,mjs}",
    "packages/db/**/*.{ts,js,mjs}",
    "packages/client-sdk/**/*.{ts,js,mjs}",
    "plugins/*/api/**/*.{ts,js,mjs}",
    "cli/**/*.{ts,js,mjs}",
    "scripts/**/*.{ts,js,mjs}",
  ]),
  // 2. React Admin Shell & UI Plugins (uses @cms/eslint-config/react)
  ...scopeConfigs(reactConfig(import.meta.dirname), [
    "packages/admin-shell/**/*.{ts,tsx,js,jsx}",
    "plugins/*/admin/**/*.{ts,tsx,js,jsx}",
  ]),
  // 3. Next.js Applications (uses @cms/eslint-config/next)
  ...scopeConfigs(nextConfig(import.meta.dirname), [
    "admin/**/*.{ts,tsx,js,jsx}",
    "client-template/**/*.{ts,tsx,js,jsx}",
  ]),
  // 4. CLI & Scripts overrides (allow console output)
  {
    files: ["cli/**/*.{ts,js}", "scripts/**/*.{ts,js,mjs}"],
    rules: {
      "no-console": "off",
    },
  },
  // 5. Test files protection: ban ad-hoc stubs and unauthorized test runners
  {
    files: ["**/*.test.{ts,js}", "**/*.integration.{ts,js}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            ":matches(FunctionDeclaration, VariableDeclarator)[id.name=/(stub|mock|fake).*(db|database|collection|cache)|(db|database|collection|cache).*(stub|mock|fake)/i]",
          message:
            "Use the shared port fakes from @cms/core/testing instead of defining ad-hoc stubs.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "vitest", message: "Use native node:test." },
            { name: "jest", message: "Use native node:test." },
            {
              name: "sinon",
              message: "Mock only shared state through port fakes in @cms/core/testing.",
            },
          ],
        },
      ],
    },
  },
  // 6. Production code safety: ban importing @cms/core/testing in production code
  {
    files: [
      "packages/*/src/**/*.{ts,js}",
      "plugins/*/api/src/**/*.{ts,js}",
      "api/src/**/*.{ts,js}",
    ],
    ignores: ["**/*.test.ts", "**/*.integration.ts", "packages/core/src/testing/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@cms/core/testing",
              message:
                "Test utilities from @cms/core/testing must not be imported in production code.",
            },
          ],
        },
      ],
    },
  },
];
