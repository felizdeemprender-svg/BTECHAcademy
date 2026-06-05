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
  serverExternalPackages: [
    '@/firebase', 
    'ffmpeg-static', 
    'genkit', 
    '@genkit-ai/google-genai', 
    '@genkit-ai/core', 
    '@genkit-ai/ai',
    '@opentelemetry/api',
    '@opentelemetry/sdk-node'
  ],
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
  outputFileTracingIncludes: {
    '/api/video/render': ['./node_modules/ffmpeg-static/**/*', './node_modules/custom-ffmpeg-build/**/*'],
  },
};

export default nextConfig;
