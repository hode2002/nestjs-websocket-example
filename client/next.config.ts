import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   images: {
    remotePatterns: [
      {
      hostname: 'kdagrndfeayvsbhwhbsc.supabase.co',
    },
    {
      hostname: 'img.clerk.com'
    }
  ],
  },
};

export default nextConfig;
