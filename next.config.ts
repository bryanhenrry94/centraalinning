import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,

  allowedDevOrigins: ["auth.cio.test", "dazzsoft-sas.cio.test", "*.cio.test"],

  experimental: {
    serverActions: {
      // Server Actions that accept a File (e.g. support message attachments)
      // are capped at 10 MB app-side — raise Next's default 1 MB body limit
      // to match.
      bodySizeLimit: "10mb",
    },
  },
};

export default config;
