import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: false,
  images: {
    unoptimized: true
  },
  distDir: 'out',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  generateBuildId: async () => {
    // 強制的にキャッシュを破るためにタイムスタンプを使用
    return `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
};

export default nextConfig;
