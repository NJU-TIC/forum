import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "520mb",
    },
    proxyClientMaxBodySize: "520mb",
  },
};

export default nextConfig;
