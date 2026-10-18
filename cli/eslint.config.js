import { nodeConfig } from "@cms/eslint-config/node";

export default [
  ...nodeConfig(import.meta.dirname),
  {
    rules: {
      "no-console": "off",
    },
  },
];
