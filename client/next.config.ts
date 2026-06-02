import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/distrito/:path*',
        destination: `${process.env.DISTRITO_BOT_URL || 'http://127.0.0.1:8000'}/:path*`
      },
      {
        source: '/distrito',
        destination: `${process.env.DISTRITO_BOT_URL || 'http://127.0.0.1:8000'}/`
      }
    ]
  }
};

export default nextConfig;
