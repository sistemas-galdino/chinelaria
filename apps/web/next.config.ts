import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd().includes('/apps/web') ? `${process.cwd()}/../..` : undefined,
  transpilePackages: ['@chinelaria/agent', '@chinelaria/mcp-magazord', '@chinelaria/db', '@chinelaria/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
