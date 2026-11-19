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

export function BenefitsSection({ sec, ctx, isEven }: SectionProps) {
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

            if (isCorporate) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--surface-muted)]">
                  <div className="max-w-6xl mx-auto text-center space-y-12">
                    {sec.kicker && (
                      <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                        {sec.kicker}
                      </span>
                    )}
                    {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--content-gap)] text-left">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const hasColon = bullet.includes(':');
                        const [bt, ...bd] = hasColon ? bullet.split(':') : [bullet, ''];
                        return (
                          <div key={i} className="p-8 bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)' }}>
                            <div className="w-10 h-10 flex items-center justify-center mb-5" style={{ borderRadius: 'var(--component-radius)', backgroundColor: primaryColor, color: onPrimary }}>
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-bold mb-2" style={{ color: pageFg }}>{bt}</h3>
                            {bd[0] && <p className="text-sm text-opacity-70 leading-relaxed">{bd.join(':')}</p>}
                          </div>
                        );
                      })}
                    </div>
                    {sec.ctaText && (
                      <div className="flex justify-center pt-4">
                        <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                </section>
              );
            }
            if (isTechB2b) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--surface-muted)]">
                  <div className="max-w-6xl mx-auto text-center space-y-12">
                    {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--content-gap)] text-left">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const hasColon = bullet.includes(':');
                        const [bt, ...bd] = hasColon ? bullet.split(':') : [bullet, ''];
                        return (
                          <div key={i} className="p-8 bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)', boxShadow: 'var(--component-shadow)' }}>
                            <div className="flex items-center justify-between mb-5">
                              <span className="font-mono text-sm font-bold" style={{ color: accentColor }}>{"0" + (i + 1)}</span>
                              <span className="w-8 h-8 flex items-center justify-center" style={{ borderRadius: 'var(--component-radius)', backgroundColor: hexToRgba(accentColor, 0.12), color: accentColor }}>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              </span>
                            </div>
                            {bt && <h3 className="text-lg font-bold mb-2" style={{ color: pageFg }}>{bt}</h3>}
                            {bd[0] && <p className="text-sm text-opacity-70 leading-relaxed">{bd.join(':')}</p>}
                          </div>
                        );
                      })}
                    </div>
                    {sec.ctaText && (
                      <div className="flex justify-center pt-4">
                        <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                </section>
              );
            }
            if (isExecutiveDark || isLuxurySerif || isEditorial) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className={cn("space-y-10", isLuxurySerif ? "max-w-2xl mx-auto" : "max-w-4xl mx-auto")}>
                    <div className="text-center">
                      {sec.title && <h2 className={cn("font-headline font-bold", isLuxurySerif ? "font-medium text-4xl md:text-5xl" : "text-3xl md:text-5xl")} style={{ color: pageFg }}>{sec.title}</h2>}
                    </div>
                    <div className={cn("space-y-8", isEditorial && "md:space-y-10")}>
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const hasColon = bullet.includes(':');
                        const [bt, ...bd] = hasColon ? bullet.split(':') : [bullet, ''];
                        return (
                          <div key={i} className={cn("flex items-start gap-4", isLuxurySerif ? "border-b last:border-0 py-4" : "")} style={isLuxurySerif ? { borderColor: 'var(--component-border)' } : {}}>
                            <div className="flex-shrink-0 mt-1">
                              {isLuxurySerif ? (
                                <span className="text-xl font-light" style={{ color: accentColor }}>·</span>
                              ) : isEditorial ? (
                                <span className="font-headline font-bold" style={{ color: accentColor }}>—</span>
                              ) : (
                                <span className="w-6 h-6 flex items-center justify-center" style={{ border: '1px solid ' + accentColor, color: accentColor, borderRadius: 'var(--component-radius)' }}>
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </span>
                              )}
                            </div>
                            <div>
                              {bt && <h3 className={cn("text-lg", isLuxurySerif ? "font-medium tracking-wide" : "font-bold")} style={{ color: pageFg }}>{bt}</h3>}
                              {bd[0] && <p className={cn("text-sm mt-1", isLuxurySerif ? "text-opacity-60 font-light" : "text-opacity-70")}>{bd.join(':')}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {sec.ctaText && (
                      <div className={cn("flex", isLuxurySerif ? "justify-start" : "justify-center")}>
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
                  <div className="max-w-6xl mx-auto text-center space-y-12">
                    {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--content-gap)] text-left">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const hasColon = bullet.includes(':');
                        const [bt, ...bd] = hasColon ? bullet.split(':') : [bullet, ''];
                        return (
                          <div key={i} className="p-7 bg-[var(--component-bg)] rounded-[var(--component-radius)]" style={{ border: 'var(--component-border)', boxShadow: 'var(--component-shadow)' }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: hexToRgba(accentColor, 0.14), color: accentColor }}>
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                            {bt && <h3 className="text-lg font-bold mb-2">{bt}</h3>}
                            {bd[0] && <p className="text-sm text-opacity-70 leading-relaxed">{bd.join(':')}</p>}
                          </div>
                        );
                      })}
                    </div>
                    {sec.ctaText && (
                      <div className="flex justify-center pt-4">
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
                  <div className="max-w-6xl mx-auto text-center space-y-12">
                    {sec.kicker && <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>{sec.kicker}</span>}
                    {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-black" style={{ color: pageFg }}>{sec.title}</h2>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--content-gap)] text-left">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const hasColon = bullet.includes(':');
                        const [bt, ...bd] = hasColon ? bullet.split(':') : [bullet, ''];
                        return (
                          <div key={i} className="p-8 bg-[var(--component-bg)] rounded-[var(--component-radius)]" style={{ border: 'var(--component-border)', boxShadow: `0 0 24px ${hexToRgba(accentColor, 0.12)}` }}>
                            <div className="flex items-center justify-between mb-5">
                              <span className="font-mono text-sm font-bold" style={{ color: accentColor }}>{"0" + (i + 1)}</span>
                              <span className="w-8 h-8 flex items-center justify-center rounded-full" style={{ backgroundColor: hexToRgba(accentColor, 0.14), color: accentColor, boxShadow: `0 0 16px ${hexToRgba(accentColor, 0.4)}` }}>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              </span>
                            </div>
                            {bt && <h3 className="text-lg font-bold mb-2" style={{ color: pageFg }}>{bt}</h3>}
                            {bd[0] && <p className="text-sm text-opacity-70 leading-relaxed">{bd.join(':')}</p>}
                          </div>
                        );
                      })}
                    </div>
                    {sec.ctaText && (
                      <div className="flex justify-center pt-4">
                        <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText, boxShadow: `0 0 26px ${hexToRgba(btnBg, 0.5)}` }}>
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
                <div className="max-w-6xl mx-auto text-center space-y-16">
                  {sec.title && <h2 className="text-3xl md:text-5xl font-black font-headline" style={{ color: pageFg }}>{sec.title}</h2>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--content-gap)] text-left">
                    {sec.bullets?.map((bullet: string, i: number) => (
                      <div key={i} className="space-y-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{ backgroundColor: btnBg, color: btnText }}>
                          {i + 1}
                        </div>
                        <p className="text-lg font-medium text-opacity-90">{bullet}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Botón de Acción Opcional */}
                  {sec.ctaText && (
                    <div className="flex pt-8 mt-auto w-full">
                      <Button onClick={onPurchase} className="h-16 px-10 text-lg md:text-xl font-bold rounded-[var(--component-radius)] transition-transform hover:scale-105" style={{ backgroundColor: btnBg, color: btnText }}>
                        {sec.ctaText}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            );

}
