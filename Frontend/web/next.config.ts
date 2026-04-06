import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ✅ Allow both localhost and your LAN IP for Flutter/web bridge
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://frontend.sentrizk.me",
    "https://frontend.sentrizk.me",
  ],
};

export default nextConfig;
