'use client';

import { useAppTheme } from '@/components/theme-provider';

const logos = {
  monogram: {
    light: (
      <path d="M52 52h28l24 38-24 38H52V52z" fill="#c96442" opacity="0.15" />
    ),
    dark: (
      <path d="M52 52h28l24 38-24 38H52V52z" fill="#c96442" opacity="0.2" />
    )
  },
  arc: {
    light: (
      <>
        <path d="M38 112c0-33 23-58 52-58s52 25 52 58" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M38 112c0-33 23-58 52-58" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.3" />
        <line x1="90" y1="54" x2="90" y2="128" stroke="currentColor" strokeWidth="2" opacity="0.4" />
        <circle cx="90" cy="112" r="4" fill="currentColor" />
        <path d="M80 128h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
    dark: (
      <>
        <path d="M38 112c0-33 23-58 52-58s52 25 52 58" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M38 112c0-33 23-58 52-58" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.3" />
        <line x1="90" y1="54" x2="90" y2="128" stroke="currentColor" strokeWidth="2" opacity="0.4" />
        <circle cx="90" cy="112" r="4" fill="currentColor" />
        <path d="M80 128h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </>
    )
  },
  diamond: {
    light: (
      <>
        <path d="M90 32l44 36-44 80-44-80 44-36z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.08" />
        <path d="M90 32v116" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <path d="M134 68H46" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <circle cx="90" cy="68" r="3" fill="currentColor" />
        <path d="M77 85l13-13 13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
    dark: (
      <>
        <path d="M90 32l44 36-44 80-44-80 44-36z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.12" />
        <path d="M90 32v116" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <path d="M134 68H46" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <circle cx="90" cy="68" r="3" fill="currentColor" />
        <path d="M77 85l13-13 13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    )
  }
};

export function Logo({ size = 40, inverse = false }: { size?: number; inverse?: boolean }) {
  const theme = useAppTheme();
  const logoType = theme?.logoType || 'arc';

  const logo = logos[logoType as keyof typeof logos];
  if (!logo) return null;

  const content = inverse ? logo.dark : logo.light;

  return (
    <svg width={size} height={size} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      {content}
    </svg>
  );
}
