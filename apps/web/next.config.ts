import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
    ],
  },
  transpilePackages: ['@pixmatch/types', '@pixmatch/auth', '@pixmatch/config', '@pixmatch/ui'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
