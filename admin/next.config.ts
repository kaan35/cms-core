import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: [
    "@cms/admin-shell",
    "@cms/plugin-auth-admin",
    "@cms/plugin-blog-admin",
    "@cms/plugin-forms-admin",
    "@cms/plugin-media-admin",
    "@cms/plugin-pages-admin",
    "@cms/plugin-system-admin",
  ],
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
