import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@chinelaria/agent', '@chinelaria/mcp-magazord', '@chinelaria/db', '@chinelaria/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
