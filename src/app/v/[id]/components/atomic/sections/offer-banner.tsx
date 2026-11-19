'use client';

import React from 'react';
import { SectionProps, contrastTextOn, CompactCountdown } from '../shared';

export function OfferBannerSection({ sec, ctx }: SectionProps) {
  const {
    page,
    isFlashSale,
    accentColor,
  } = ctx;

  if (!page.activeUntil) return null;
  if (isFlashSale) {
    const nowPrice = typeof page.price === 'number' ? page.price : 0;
    const oldPrice = (typeof page.oldPrice === 'number' && page.oldPrice > 0) ? Math.round(page.oldPrice) : (nowPrice > 0 ? Math.round(nowPrice * 2.94) : 0);
    return (
      <div key={sec.id} className="od-fs-topbar w-full sticky top-20 z-40 flex items-center justify-center gap-4 flex-wrap px-4 py-2.5 text-center text-[13px] md:text-sm">
        <span className="font-mono uppercase tracking-[.08em] font-semibold" style={{ color: 'var(--accent)' }}>{sec.title || sec.content || 'OFERTA RELÁMPAGO'}</span>
        {nowPrice > 0 && (
          <span className="font-headline font-semibold">
            <span className="line-through opacity-60">${oldPrice.toLocaleString('es-AR')}</span>&nbsp;&nbsp;${nowPrice.toLocaleString('es-AR')}
          </span>
        )}
        <span className="font-mono font-semibold px-2 py-0.5 rounded-full text-xs md:text-sm" style={{ background: 'var(--accent)', color: 'var(--fg)' }}>
          <CompactCountdown activeUntil={page.activeUntil} color="inherit" />
        </span>
      </div>
    );
  }
  const onAccent = contrastTextOn(accentColor);
  return (
    <div key={sec.id} className="w-full sticky top-20 z-40 flex items-center justify-center gap-4 flex-wrap px-4 py-2.5" style={{ backgroundColor: accentColor, color: onAccent }}>
      <span className="text-xs md:text-sm font-black uppercase tracking-[0.14em]">{sec.title || sec.content || 'OFERTA POR TIEMPO LIMITADO'}</span>
      {page.activeUntil && <CompactCountdown activeUntil={page.activeUntil} color={onAccent} />}
    </div>
  );
}
