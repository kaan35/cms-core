import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  // cacheComponents: true,
  // partialPrefetching: true,

  // Proxy /api/* requests to the internal API server.
  // This replaces NEXT_PUBLIC_API_URL — the real API address never reaches the browser.
  // In production Docker: API_URL=http://api:3001
  // In local dev: API_URL=http://localhost:3001
  async rewrites() {
    const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
