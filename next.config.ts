/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: {
  //   turbopack: {
  //     // Evita que ciertos módulos se traten como externos
  //     serverExternalPackages: ["prettier", "puppeteer", "rimraf", "emitter"],
  //   },
  // },
  experimental: {
    esmExternals: "loose",
  },
};

export default nextConfig;
