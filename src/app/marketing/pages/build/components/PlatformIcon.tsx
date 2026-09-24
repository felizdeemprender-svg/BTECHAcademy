'use client';

import { Instagram, Twitter, Linkedin, Circle } from 'lucide-react';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

interface PlatformIconProps {
  platform: string;
  className?: string;
}

export function PlatformIcon({ platform, className }: PlatformIconProps) {
  if (platform?.toLowerCase() === 'instagram') return <Instagram className={className} />;
  if (platform?.toLowerCase() === 'twitter' || platform?.toLowerCase() === 'x') return <Twitter className={className} />;
  if (platform?.toLowerCase() === 'tiktok') return <TikTokIcon className={className} />;
  if (platform?.toLowerCase() === 'linkedin') return <Linkedin className={className} />;
  return <Circle className={className} />;
}
