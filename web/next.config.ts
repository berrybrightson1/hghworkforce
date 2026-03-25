import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // distDir must stay relative to the project root. An absolute path (e.g. os.tmpdir())
  // breaks on Windows: Next joins it with cwd and mkdir fails with ENOENT.

  // Repo-wide ESLint cleanup is tracked separately; do not block production builds.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Compress responses with gzip (reduces transfer size)
  compress: true,

  // Aggressive static asset caching
  headers: async () => [
    {
      source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|woff|woff2)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],

  // Bundle optimizations
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js", "zod"],
  },
};

export default nextConfig;
