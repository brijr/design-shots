import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],

  // Chromium ships as brotli archives that are resolved at runtime through a
  // computed path, so file tracing cannot see them. Without this the capture
  // function deploys without a browser to launch.
  outputFileTracingIncludes: {
    "/api/capture": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
