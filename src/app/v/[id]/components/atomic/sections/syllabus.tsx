'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Play,
  ShieldCheck,
  Instagram,
  Linkedin,
  Youtube,
  MessageCircle,
  Globe,
  Phone,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
} from 'lucide-react';
import {
  SectionProps,
  contrastTextOn,
  darkenHex,
  hexToRgba,
  parseStat,
  FlashCountdown,
  CompactCountdown,
  CountdownTimer,
  SecureVideoPlayer,
  TikTokIcon,
  XIcon,
} from '../shared';

export function SyllabusSection({ sec, ctx, isEven }: SectionProps) {
  const {
    page,
    onPurchase,
    mentorProfile,
    bundleProducts,
    isClassic,
    isFlashSale,
    isCorporate,
    isTechB2b,
    isExecutiveDark,
    isLuxurySerif,
    isEditorial,
    isModernClean,
    isLaunchCountdown,
    isDark,
    isGlass,
    pageBg,
    pageFg,
    surfaceMuted,
    primaryColor,
    secondaryColor,
    accentColor,
    btnBg,
    btnText,
    onPrimary,
    onAccent,
    onDark,
    cardStyle,
    componentRadius,
    componentBorder,
    componentShadow,
    componentBg,
    sectionPadding,
    contentGap,
    transitionDuration,
    extraTokens,
    ctaShadow,
    buttonRadius,
    buttonStyle,
    headingWeight,
    headingTracking,
    sectionBgAlt,
    fontHeading,
    fontMono,
    overlayOpacity,
    fg2Color,
    mutedColor,
    overlayColor,
    heroOverlay,
  } = ctx;

            if (isFlashSale) {
              return (
                <section key={sec.id} className="py-16 md:py-24 px-6" style={{ background: 'var(--bg)' }}>
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-10">
                      {sec.kicker && <span className="od-fs-kicker">{sec.kicker}</span>}
                      {sec.title && <h2 className="od-fs-heading text-3xl md:text-5xl">{sec.title}</h2>}
                    </div>
                    <div className="border-t-[3px]" style={{ borderColor: 'var(--fg)' }}>
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const [bTitle, ...bDescArr] = bullet.split(':');
                        const bDesc = bDescArr.join(':');
                        const tag = sec.tags?.[i] || (sec.tagLabel ? `${sec.tagLabel} ${i + 1}` : '');
                        return (
                          <div key={i} className="grid grid-cols-[72px_1fr] md:grid-cols-[88px_1fr_auto] items-center gap-3 md:gap-5 py-5 md:py-6 border-b-[3px] px-1 md:px-2" style={{ borderColor: 'var(--fg)' }}>
                            <div className="text-[26px] md:text-[34px] font-black leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
                              {String(i + 1).padStart(2, '0')}
                            </div>
                            <div>
                              <h3 className="text-lg md:text-2xl font-headline font-bold leading-snug" style={{ color: 'var(--fg)' }}>{bTitle.replace(/\*\*/g, '')}</h3>
                              {bDesc && <p className="mt-1 text-sm md:text-base leading-relaxed max-w-[70ch]" style={{ color: 'var(--muted)' }}>{bDesc}</p>}
                            </div>
                            {tag && (
                              <span className="col-start-2 md:col-start-auto justify-self-start md:justify-self-end font-mono text-[11px] uppercase tracking-[.08em] px-3 py-1.5 rounded-full" style={{ background: 'var(--fg)', color: 'var(--on-dark)' }}>
                                {tag}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {sec.ctaText && (
                      <div className="flex justify-center pt-14">
                        <button onClick={onPurchase} className="od-fs-btn od-fs-btn-primary">{sec.ctaText}</button>
                      </div>
                    )}
                  </div>
                </section>
              );
            }
            if (isCorporate) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                      {sec.kicker && (
                        <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                          {sec.kicker}
                        </span>
                      )}
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold mt-3" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="mt-4 text-opacity-70 max-w-2xl mx-auto leading-relaxed">{sec.content}</p>}
                    </div>
                    <div>
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const [bTitle, ...bDescArr] = bullet.split(':');
                        const bDesc = bDescArr.join(':');
                        const tag = sec.tags?.[i];
                        return (
                          <div key={i} className="py-6 border-b first:border-t" style={{ borderColor: 'var(--component-border)' }}>
                            <div className="flex items-start justify-between gap-6">
                              <div>
                                <h3 className="text-lg md:text-xl font-bold" style={{ color: pageFg }}>{bTitle.replace(/\*\*/g, '')}</h3>
                                {bDesc && <p className="mt-2 text-sm text-opacity-70 leading-relaxed max-w-[65ch]">{bDesc}</p>}
                              </div>
                              {tag && (
                                <span className="flex-shrink-0 text-xs font-semibold uppercase tracking-[0.08em] px-3 py-1" style={{ borderRadius: 'var(--component-radius)', backgroundColor: primaryColor, color: onPrimary }}>
                                  {tag}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {sec.ctaText && (
                      <div className="flex justify-center pt-12">
                        <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                </section>
              );
            }
            if (isTechB2b || isExecutiveDark || isLuxurySerif || isEditorial) {
              const serif = isLuxurySerif || isEditorial;
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                      {sec.kicker && (
                        <span className={cn("inline-block text-xs font-semibold uppercase tracking-[0.18em]", isTechB2b && "font-mono")} style={{ color: accentColor }}>
                          {sec.kicker}
                        </span>
                      )}
                      {sec.title && <h2 className={cn("text-3xl md:text-5xl font-headline font-bold mt-3", serif && "font-medium")} style={{ color: pageFg }}>{sec.title}</h2>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-0">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const [bTitle, ...bDescArr] = bullet.split(':');
                        const bDesc = bDescArr.join(':');
                        const tag = sec.tags?.[i];
                        return (
                          <div key={i} className="py-6 border-b" style={{ borderColor: 'var(--component-border)' }}>
                            <div className="flex items-start gap-5">
                              {isTechB2b ? (
                                <span className="font-mono text-sm font-bold flex-shrink-0 mt-1" style={{ color: accentColor }}>{"0" + (i + 1)}</span>
                              ) : (
                                <span className={cn("text-3xl flex-shrink-0 leading-none", serif ? "font-headline font-bold" : "font-bold")} style={{ color: accentColor }}>{String(i + 1).padStart(2, '0')}</span>
                              )}
                              <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h3 className={cn("text-lg md:text-xl font-bold", serif && "font-headline font-medium")} style={{ color: pageFg }}>{bTitle.replace(/\*\*/g, '')}</h3>
                                  {tag && (
                                    <span className="text-xs font-semibold uppercase tracking-[0.08em] px-3 py-1" style={{ borderRadius: 'var(--component-radius)', border: '1px solid ' + accentColor, color: accentColor }}>
                                      {tag}
                                    </span>
                                  )}
                                </div>
                                {bDesc && <p className="mt-2 text-sm text-opacity-70 leading-relaxed max-w-[52ch]">{bDesc}</p>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {sec.ctaText && (
                      <div className="flex justify-center pt-12">
                        <Button onClick={onPurchase} className={cn("h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]", isLuxurySerif && "text-sm font-medium tracking-[0.08em] uppercase")} style={isLuxurySerif ? { borderRadius: 'var(--component-radius)', border: '1px solid ' + primaryColor, backgroundColor: 'transparent', color: primaryColor } : { backgroundColor: btnBg, color: btnText }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                </section>
              );
            }
            if (isModernClean) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="mt-4 text-opacity-70 max-w-2xl mx-auto leading-relaxed">{sec.content}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--content-gap)]">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const [bTitle, ...bDescArr] = bullet.split(':');
                        const bDesc = bDescArr.join(':');
                        const tag = sec.tags?.[i];
                        return (
                          <div key={i} className="p-7 bg-[var(--component-bg)] rounded-[var(--component-radius)]" style={{ border: 'var(--component-border)', boxShadow: 'var(--component-shadow)' }}>
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="text-lg md:text-xl font-bold" style={{ color: pageFg }}>{bTitle.replace(/\*\*/g, '')}</h3>
                              {tag && (
                                <span className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: hexToRgba(accentColor, 0.12), color: accentColor }}>
                                  {tag}
                                </span>
                              )}
                            </div>
                            {bDesc && <p className="mt-2 text-sm text-opacity-70 leading-relaxed">{bDesc}</p>}
                          </div>
                        );
                      })}
                    </div>
                    {sec.ctaText && (
                      <div className="flex justify-center pt-12">
                        <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                </section>
              );
            }
            if (isLaunchCountdown) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                      {sec.kicker && (
                        <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>
                          {sec.kicker}
                        </span>
                      )}
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-black mt-3" style={{ color: pageFg }}>{sec.title}</h2>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const [bTitle, ...bDescArr] = bullet.split(':');
                        const bDesc = bDescArr.join(':');
                        const tag = sec.tags?.[i];
                        return (
                          <div key={i} className="p-7 bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)' }}>
                            <div className="flex items-start gap-4">
                              <span className="text-4xl font-black leading-none flex-shrink-0" style={{ color: accentColor }}>{String(i + 1).padStart(2, '0')}</span>
                              <div>
                                <h3 className="text-lg md:text-xl font-bold" style={{ color: pageFg }}>{bTitle.replace(/\*\*/g, '')}</h3>
                                {bDesc && <p className="mt-2 text-sm text-opacity-70 leading-relaxed">{bDesc}</p>}
                                {tag && (
                                  <span className="mt-3 inline-block font-mono text-xs font-bold uppercase tracking-[0.1em] px-3 py-1 rounded-full" style={{ border: `1px solid ${hexToRgba(accentColor, 0.6)}`, color: accentColor }}>
                                    {tag}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {sec.ctaText && (
                      <div className="flex justify-center pt-12">
                        <Button onClick={onPurchase} className="h-14 px-12 text-base font-bold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                </section>
              );
            }
            return (
              <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--surface-muted)]">
                <div className="max-w-6xl mx-auto">
                  {sec.title && <h2 className="text-3xl md:text-5xl font-black font-headline mb-12 text-center" style={{ color: pageFg }}>{sec.title}</h2>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--content-gap)]">
                    {sec.bullets?.map((bullet: string, i: number) => {
                      const [bTitle, ...bDescArr] = bullet.split(':');
                      const bDesc = bDescArr.join(':');
                      return (
                        <div key={i} className="p-8 rounded-[var(--component-radius)] bg-[var(--component-bg)]" style={cardStyle}>
                          <h3 className="text-xl font-bold mb-3">{bTitle.replace(/\*\*/g, '')}</h3>
                          <p className="text-opacity-70 leading-relaxed">{bDesc}</p>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Botón de Acción Opcional */}
                  {sec.ctaText && (
                    <div className="flex justify-center pt-16 w-full">
                      <Button onClick={onPurchase} className="h-16 px-12 text-lg md:text-xl font-bold rounded-[var(--component-radius)] transition-transform hover:scale-105" style={{ backgroundColor: btnBg, color: btnText }}>
                        {sec.ctaText}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            );

}
