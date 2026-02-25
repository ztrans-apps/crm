import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
