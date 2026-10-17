import type { NextConfig } from 'next';

// Every page depends on the signed-in user and their firm, so pages render per
// request; Cache Components are left off.
const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  serverExternalPackages: ['unpdf'],
};

export default nextConfig;
