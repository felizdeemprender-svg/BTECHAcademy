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

export function FaqsSection({ sec, ctx, isEven }: SectionProps) {
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
                  <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-10">
                      {sec.kicker && <span className="od-fs-kicker">{sec.kicker}</span>}
                      {sec.title && <h2 className="od-fs-heading text-3xl md:text-5xl">{sec.title}</h2>}
                    </div>
                    <div className="border-t-[3px]" style={{ borderColor: 'var(--fg)' }}>
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const [q, ...a] = bullet.split('?');
                        return (
                          <div key={i} className="border-b-[3px]" style={{ borderColor: 'var(--fg)' }}>
                            <div className="py-5 px-1 md:px-2">
                              <h4 className="font-headline font-bold text-lg md:text-xl uppercase leading-snug" style={{ color: 'var(--fg)' }}>{q}?</h4>
                              <p className="mt-2 leading-relaxed" style={{ color: 'var(--muted)' }}>{a.join('?')}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {sec.ctaText && (
                      <div className="flex justify-center pt-12">
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
                  <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                      {sec.kicker && (
                        <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                          {sec.kicker}
                        </span>
                      )}
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold mt-3" style={{ color: pageFg }}>{sec.title}</h2>}
                    </div>
                    <div>
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const [q, ...a] = bullet.split('?');
                        return (
                          <div key={i} className="py-6 border-b first:border-t" style={{ borderColor: 'var(--component-border)' }}>
                            <h4 className="font-bold text-base md:text-lg" style={{ color: pageFg }}>{q}?</h4>
                            <p className="mt-2 text-sm text-opacity-70 leading-relaxed">{a.join('?')}</p>
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
            if (isTechB2b || isExecutiveDark) {
              const mono = isTechB2b || isExecutiveDark;
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                      {sec.kicker && <span className={cn("inline-block text-xs font-semibold uppercase tracking-[0.18em]", mono && "font-mono")} style={{ color: accentColor }}>{sec.kicker}</span>}
                      {sec.title && <h2 className={cn("text-3xl md:text-5xl font-headline font-bold mt-3", isExecutiveDark && "font-black")} style={{ color: pageFg }}>{sec.title}</h2>}
                    </div>
                    <div>
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const [q, ...a] = bullet.split('?');
                        return (
                          <div key={i} className={cn("py-6 border-b first:border-t", isExecutiveDark && "px-0")} style={{ borderColor: 'var(--component-border)' }}>
                            <div className={cn("flex gap-4", mono && "items-baseline")}>
                              <span className={cn("font-mono text-sm font-bold mt-0.5", mono ? "" : "hidden")} style={{ color: accentColor }}>{String(i + 1).padStart(2, '0')}</span>
                              <div>
                                <h4 className={cn("font-bold text-base md:text-lg", mono && "font-mono tracking-tight")} style={{ color: pageFg }}>{q}?</h4>
                                <p className="mt-2 text-sm text-opacity-70 leading-relaxed">{a.join('?')}</p>
                              </div>
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
            if (isLuxurySerif || isEditorial) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                      {sec.kicker && <span className="inline-block text-xs font-medium uppercase tracking-[0.28em]" style={{ color: accentColor }}>{sec.kicker}</span>}
                      {sec.title && <h2 className={cn("text-4xl md:text-5xl font-headline mt-3", isLuxurySerif ? "font-medium" : "font-black")} style={{ color: pageFg }}>{sec.title}</h2>}
                    </div>
                    <div>
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const [q, ...a] = bullet.split('?');
                        return (
                          <div key={i} className={cn("py-6", isEditorial && "border-b last:border-b-0 first:border-t")} style={{ borderColor: 'var(--component-border)' }}>
                            <h4 className={cn("text-lg", isLuxurySerif ? "font-headline font-medium" : "font-bold")} style={{ color: pageFg }}>{q}?</h4>
                            <p className={cn("mt-2 text-sm leading-relaxed", isLuxurySerif ? "font-light text-opacity-70" : "text-opacity-70")}>{a.join('?')}</p>
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
                  <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                    </div>
                    <div className="space-y-4">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const [q, ...a] = bullet.split('?');
                        return (
                          <div key={i} className="p-6 rounded-[var(--component-radius)] bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', boxShadow: 'var(--component-shadow)' }}>
                            <h4 className="font-bold text-lg" style={{ color: pageFg }}>{q}?</h4>
                            <p className="mt-2 text-sm text-opacity-70 leading-relaxed">{a.join('?')}</p>
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
                  <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-black" style={{ color: pageFg }}>{sec.title}</h2>}
                    </div>
                    <div className="space-y-4">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const [q, ...a] = bullet.split('?');
                        return (
                          <div key={i} className="p-6 bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)' }}>
                            <h4 className="font-bold text-lg" style={{ color: pageFg }}>{q}?</h4>
                            <p className="mt-2 text-sm text-opacity-70 leading-relaxed">{a.join('?')}</p>
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
              <section key={sec.id} className="py-[var(--section-padding)] px-6">
                <div className="max-w-4xl mx-auto">
                  {sec.title && <h2 className="text-3xl md:text-5xl font-black font-headline mb-12 text-center" style={{ color: pageFg }}>{sec.title}</h2>}
                  <div className="space-y-6">
                    {sec.bullets?.map((bullet: string, i: number) => {
                      const [q, ...a] = bullet.split('?');
                      return (
                        <div key={i} className="p-6 rounded-[var(--component-radius)] bg-[var(--surface-muted)]">
                          <h4 className="font-bold text-xl mb-3">{q}?</h4>
                          <p className="text-opacity-70">{a.join('?')}</p>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Botón de Acción Opcional */}
                  {sec.ctaText && (
                    <div className="flex justify-center pt-12 w-full">
                      <Button onClick={onPurchase} className="h-16 px-12 text-lg md:text-xl font-bold rounded-[var(--component-radius)] transition-transform hover:scale-105" style={{ backgroundColor: btnBg, color: btnText }}>
                        {sec.ctaText}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            );

}
