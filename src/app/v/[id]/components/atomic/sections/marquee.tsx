'use client';

import React from 'react';
import { SectionProps, contrastTextOn } from '../shared';

export function MarqueeSection({ sec, ctx }: SectionProps) {
  const {
    isFlashSale,
    accentColor,
  } = ctx;

  const marqueeItems = (sec.bullets?.length ? sec.bullets : (sec.content || '').split(/[•·|,;]/).map((s: string) => s.trim()).filter(Boolean));
  if (!marqueeItems.length) return null;
  const marqueeText = contrastTextOn(accentColor);
  const loop = [...marqueeItems, ...marqueeItems];

  if (isFlashSale) {
    return (
      <section key={sec.id} className="relative overflow-hidden select-none border-y-[3px]" aria-hidden style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--fg)' }}>
        <div className="od-marquee-track flex whitespace-nowrap w-max py-3.5" style={{ animation: 'od-marquee 22s linear infinite' }}>
          {loop.map((item: string, i: number) => (
            <span key={i} className="mx-5 font-headline font-black uppercase text-lg tracking-[.02em]" style={{ color: 'var(--fg)' }}>
              {item}<span className="mx-3 opacity-40">•</span>
            </span>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section key={sec.id} className="relative overflow-hidden py-3 select-none" aria-hidden style={{ backgroundColor: accentColor }}>
      <div className="od-marquee-track flex whitespace-nowrap w-max" style={{ animation: 'od-marquee 24s linear infinite' }}>
        {loop.map((item: string, i: number) => (
          <span key={i} className="mx-5 text-xs md:text-sm font-black uppercase tracking-[0.14em]" style={{ color: marqueeText }}>
            {item}<span className="mx-3 opacity-50">•</span>
          </span>
        ))}
      </div>
    </section>
  );
}
