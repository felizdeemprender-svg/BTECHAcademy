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

export function GuaranteeSection({ sec, ctx, isEven }: SectionProps) {
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
                <section key={sec.id} className="py-16 md:py-24 px-6" style={{ background: 'var(--section-alt)' }}>
                  <div className="max-w-5xl mx-auto">
                    <div className="od-fs-card grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-8 md:gap-7 p-8 md:p-9" style={{ borderStyle: 'dashed', borderColor: 'var(--accent)', boxShadow: 'none' }}>
                      <div className="w-28 h-28 mx-auto md:mx-0 shrink-0 rounded-full flex flex-col items-center justify-center text-center -rotate-8 border-4" style={{ background: 'var(--accent)', color: 'var(--fg)', borderColor: 'var(--fg)', boxShadow: '5px 5px 0 var(--fg)' }}>
                        <span className="font-headline font-black uppercase text-[13px] leading-tight">{sec.sealText || '14 días\ngarantía\ntotal'}</span>
                      </div>
                      <div className="text-center md:text-left">
                        {sec.title && <h3 className="od-fs-heading text-2xl md:text-[32px]">{sec.title}</h3>}
                        {sec.content && <p className="mt-3 leading-relaxed max-w-[60ch]" style={{ color: 'var(--muted)' }}>{sec.content}</p>}
                      </div>
                      {sec.ctaText && (
                        <div className="flex justify-center md:justify-end">
                          <button onClick={onPurchase} className="od-fs-btn od-fs-btn-primary whitespace-nowrap">{sec.ctaText}</button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isCorporate) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--surface-muted)]">
                  <div className="max-w-3xl mx-auto text-center">
                    <div className="p-10 md:p-14 bg-[var(--component-bg)]" style={{ border: '1px solid ' + accentColor, borderRadius: 'var(--component-radius)' }}>
                      <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center" style={{ borderRadius: '50%', border: '2px solid ' + accentColor, color: accentColor }}>
                        <ShieldCheck className="h-8 w-8" />
                      </div>
                      {sec.title && <h2 className="text-3xl md:text-4xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="mt-4 text-opacity-70 leading-relaxed">{sec.content}</p>}
                      {sec.sealText && <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>{sec.sealText}</p>}
                      {sec.ctaText && (
                        <div className="mt-8">
                          <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                            {sec.ctaText}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isTechB2b) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--surface-muted)]">
                  <div className="max-w-3xl mx-auto text-center">
                    <div className="p-10 md:p-14 bg-[var(--component-bg)]" style={{ border: '1px solid ' + accentColor, borderRadius: 'var(--component-radius)' }}>
                      <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center" style={{ borderRadius: 'var(--component-radius)', border: '1px solid ' + accentColor, color: accentColor }}>
                        <ShieldCheck className="h-8 w-8" />
                      </div>
                      {sec.title && <h2 className="text-3xl md:text-4xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="mt-4 text-opacity-70 leading-relaxed">{sec.content}</p>}
                      {sec.sealText && <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>{sec.sealText}</p>}
                      {sec.ctaText && (
                        <div className="mt-8">
                          <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>{sec.ctaText}</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isExecutiveDark) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--surface-muted)]">
                  <div className="max-w-3xl mx-auto text-center">
                    <div className="p-10 md:p-14 bg-[var(--component-bg)]" style={{ border: '1px solid ' + accentColor, borderRadius: 'var(--component-radius)', boxShadow: `0 0 34px ${hexToRgba(accentColor, 0.12)}` }}>
                      <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center" style={{ borderRadius: '50%', border: '1px solid ' + accentColor, color: accentColor }}>
                        <ShieldCheck className="h-8 w-8" />
                      </div>
                      {sec.title && <h2 className="text-3xl md:text-4xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="mt-4 text-opacity-70 leading-relaxed">{sec.content}</p>}
                      {sec.sealText && <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>{sec.sealText}</p>}
                      {sec.ctaText && (
                        <div className="mt-8">
                          <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>{sec.ctaText}</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isLuxurySerif) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--surface-muted)]">
                  <div className="max-w-2xl mx-auto text-center">
                    <div className="p-10 md:p-14" style={{ border: '1px solid ' + accentColor, borderTop: '2px solid ' + accentColor }}>
                      <span className="font-headline text-2xl font-light" style={{ color: accentColor }}>·</span>
                      {sec.title && <h2 className="mt-2 text-3xl md:text-4xl font-headline font-medium" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="mt-4 text-opacity-60 font-light leading-relaxed">{sec.content}</p>}
                      {sec.sealText && <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: accentColor }}>{sec.sealText}</p>}
                      {sec.ctaText && (
                        <div className="mt-8">
                          <Button onClick={onPurchase} className="text-sm font-medium tracking-[0.08em] uppercase h-14 px-12" style={{ border: '1px solid ' + pageFg, backgroundColor: 'transparent', color: pageFg }}>{sec.ctaText}</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isEditorial) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-3xl mx-auto text-center">
                    <div className="p-10 md:p-14 border-t-4 border-b" style={{ borderColor: accentColor }}>
                      {sec.title && <h2 className="text-3xl md:text-4xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="mt-4 text-lg text-opacity-75 leading-relaxed">{sec.content}</p>}
                      {sec.sealText && <p className="mt-6 font-headline text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accentColor }}>{sec.sealText}</p>}
                      {sec.ctaText && (
                        <div className="mt-8">
                          <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>{sec.ctaText}</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isModernClean) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--surface-muted)]">
                  <div className="max-w-3xl mx-auto text-center">
                    <div className="p-10 md:p-14 bg-[var(--component-bg)] rounded-[var(--component-radius)]" style={{ border: 'var(--component-border)', boxShadow: 'var(--component-shadow)' }}>
                      <div className="w-14 h-14 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: hexToRgba(accentColor, 0.12), color: accentColor }}>
                        <ShieldCheck className="h-7 w-7" />
                      </div>
                      {sec.title && <h2 className="text-3xl md:text-4xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="mt-4 text-opacity-70 leading-relaxed">{sec.content}</p>}
                      {sec.sealText && <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: accentColor }}>{sec.sealText}</p>}
                      {sec.ctaText && (
                        <div className="mt-8">
                          <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>{sec.ctaText}</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isLaunchCountdown) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-3xl mx-auto text-center">
                    <div className="p-10 md:p-14 bg-[var(--component-bg)] rounded-[var(--component-radius)]" style={{ border: '1px solid ' + accentColor, boxShadow: `0 0 40px ${hexToRgba(accentColor, 0.14)}` }}>
                      <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: hexToRgba(accentColor, 0.14), color: accentColor, boxShadow: `0 0 20px ${hexToRgba(accentColor, 0.4)}` }}>
                        <ShieldCheck className="h-8 w-8" />
                      </div>
                      {sec.title && <h2 className="text-3xl md:text-4xl font-headline font-black" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="mt-4 text-opacity-75 leading-relaxed">{sec.content}</p>}
                      {sec.sealText && <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>{sec.sealText}</p>}
                      {sec.ctaText && (
                        <div className="mt-8">
                          <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText, boxShadow: `0 0 26px ${hexToRgba(btnBg, 0.5)}` }}>{sec.ctaText}</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            return (
              <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--section-alt)]">
                <div className="max-w-3xl mx-auto text-center space-y-6">
                  <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4" style={{ borderColor: accentColor, color: accentColor }}>
                    <ShieldCheck className="h-10 w-10" />
                  </div>
                  {sec.title && <h2 className="text-3xl md:text-4xl font-black font-headline" style={{ color: pageFg }}>{sec.title}</h2>}
                  {sec.content && <p className="text-lg opacity-80 leading-relaxed">{sec.content}</p>}
                  {sec.ctaText && (
                    <Button onClick={onPurchase} className="h-14 px-10 text-lg font-bold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                      {sec.ctaText}
                    </Button>
                  )}
                </div>
              </section>
            );

}
