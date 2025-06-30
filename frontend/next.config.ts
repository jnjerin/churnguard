import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.css': {
          loaders: ['@tailwindcss/postcss'],
        },
      },
    },
  },
};

export default nextConfig;
