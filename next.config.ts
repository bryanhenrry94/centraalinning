import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,

  allowedDevOrigins: ["auth.cio.test", "dazzsoft-sas.cio.test", "*.cio.test"],
};

export default config;
