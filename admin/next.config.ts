import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  transpilePackages: [
    "@cms/admin-shell",
    "@cms/plugin-auth-admin",
    "@cms/plugin-blog-admin",
    "@cms/plugin-forms-admin",
    "@cms/plugin-media-admin",
    "@cms/plugin-pages-admin",
    "@cms/plugin-system-admin",
    "@cms/plugin-vault-admin",
  ],
};

export default nextConfig;
