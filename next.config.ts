import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Playwright runs only in the standalone Publisher Worker process.
  // Keeping it external prevents Next.js from bundling browser automation code
  // into the server runtime.
  serverExternalPackages: ["playwright", "playwright-core"],
};

export default nextConfig;
