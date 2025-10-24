import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ✅ Allow both localhost and your LAN IP for Flutter/web bridge
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://169.254.83.107",
    "http://10.0.2.2",
  ],
};

export default nextConfig;
