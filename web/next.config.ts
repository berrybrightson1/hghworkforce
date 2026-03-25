import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Monorepo: repo root is one level above `web/` (matches npm workspaces).
  outputFileTracingRoot: path.join(process.cwd(), ".."),

  // When the Git/Vercel project root is the monorepo (not `web/`), Next still runs with
  // cwd `web/`; emit the build to `../.next` so `/vercel/path0/.next` exists for deploy.
  // Relative distDir only—absolute paths break on Windows (Next joins them incorrectly).
  distDir: "../.next",

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
