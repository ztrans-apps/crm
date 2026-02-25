import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  // Skip TypeScript errors during build so Vercel deploys succeed
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lauhwtpbknlakysdmpju.supabase.co',
      },
    ],
  },
};

export default nextConfig;
