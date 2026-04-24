import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactCompiler is now a top-level property, not inside 'experimental'
  reactCompiler: true, 
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;