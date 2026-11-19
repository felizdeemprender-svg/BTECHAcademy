'use client';

import React from 'react';
import { SectionProps, parseStat } from '../shared';

export function StatsSection({ sec, ctx }: SectionProps) {
  const {
    isFlashSale,
    pageFg,
    accentColor,
  } = ctx;

  const statItems = (sec.bullets?.length ? sec.bullets : (sec.content || '').split('\n').map((s: string) => s.trim()).filter(Boolean));
  if (!statItems.length) return null;

  if (isFlashSale) {
    return (
      <section key={sec.id} className="py-14 md:py-20 px-6 border-b-[3px] bg-[var(--surface)]" style={{ borderColor: 'var(--fg)' }}>
        <div className="max-w-[1180px] mx-auto">
          {sec.title && (
            <div className="text-center mb-10">
              <span className="od-fs-kicker">Resultados comprobados</span>
              <h2 className="od-fs-heading text-3xl md:text-5xl">{sec.title}</h2>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {statItems.slice(0, 4).map((item: string, i: number) => {
              const { num, label } = parseStat(item);
              return (
                <div key={i} className="od-fs-card p-6 text-center shadow-[6px_6px_0_var(--fg)]">
                  <div className="font-headline font-black text-3xl md:text-5xl leading-none" style={{ color: 'var(--accent-text)' }}>{num}</div>
                  {label && <div className="mt-2 font-mono text-xs uppercase tracking-[.06em] font-semibold" style={{ color: 'var(--fg)' }}>{label}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section key={sec.id} className="py-[var(--section-padding)] px-6">
      <div className="max-w-6xl mx-auto">
        {sec.title && <h2 className="text-3xl md:text-5xl font-black font-headline mb-12 text-center" style={{ color: pageFg }}>{sec.title}</h2>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[var(--content-gap)] text-center">
          {statItems.slice(0, 4).map((item: string, i: number) => {
            const { num, label } = parseStat(item);
            return (
              <div key={i} className="space-y-2">
                <div className="font-mono text-4xl md:text-6xl font-black tracking-tight" style={{ color: accentColor }}>{num}</div>
                {label && <div className="text-xs md:text-sm font-bold uppercase tracking-[0.1em] opacity-70">{label}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
