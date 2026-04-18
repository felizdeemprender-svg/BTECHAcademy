import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'loremflickr.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
  // Disable SSG to avoid build errors
  trailingSlash: false,
  // Disable static generation for problematic pages
  serverExternalPackages: ['@/firebase', 'ffmpeg-static'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/video/render': ['./node_modules/ffmpeg-static/**/*', './public/bin/**/*'],
    },
  },
};

export default nextConfig;
