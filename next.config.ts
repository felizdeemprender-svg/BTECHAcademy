import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'framer-motion',
      'recharts',
      '@radix-ui/react-icons',
    ],
  },
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'loremflickr.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: '*.firebasestorage.app' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'fastoria.com.ar' },
      { protocol: 'https', hostname: '*.fastoria.com.ar' },
      { protocol: 'https', hostname: '*.hosted.app' },
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
    '@opentelemetry/sdk-node',
    'pdf-parse',
    '@google-cloud/tasks',
    'google-gax'
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
    '/api/**/*': ['./node_modules/@google-cloud/tasks/**/*', './node_modules/@google-cloud/tasks/build/esm/src/v2/*.json'],
  },
};

export default nextConfig;
