import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   output: 'export',
  /* config options here */
  allowedDevOrigins: [
    '192.168.0.109',
  ],
};

export default nextConfig;
