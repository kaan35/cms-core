import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: [
    "@cms/client-sdk",
    "@cms/plugin-pages-api",
    "@cms/plugin-blog-api",
    "@cms/plugin-forms-api",
    "@cms/plugin-media-api",
    "@cms/plugin-system-api",
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
