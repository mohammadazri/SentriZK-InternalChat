import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ✅ Allow both localhost and your LAN IP for Flutter/web bridge
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://frontend.a4innovation.shop",
    "https://frontend.a4innovation.shop",
  ],
};

export default nextConfig;
