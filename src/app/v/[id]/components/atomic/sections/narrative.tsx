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

export function NarrativeSection({ sec, ctx, isEven: propIsEven, index = 0 }: SectionProps) {
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
                  <div className="max-w-[1180px] mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
                      <div>
                        {sec.kicker && <span className="od-fs-kicker">{sec.kicker}</span>}
                        {sec.title && <h2 className="od-fs-heading text-3xl md:text-5xl">{sec.title}</h2>}
                      </div>
                      {sec.content && <p className="max-w-[46ch] leading-relaxed text-base" style={{ color: 'var(--muted)' }}>{sec.content}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const hasColon = bullet.includes(':');
                        const [bt, ...bd] = hasColon ? bullet.split(':') : [bullet, ''];
                        return (
                          <div key={i} className="od-fs-card p-6 md:p-7 od-fs-card-lift" style={{ boxShadow: 'var(--component-shadow)' }}>
                            <div className="text-[40px] font-black leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
                              {String(i + 1).padStart(2, '0')}
                            </div>
                            {bt && <h3 className="mt-4 text-xl md:text-[22px] font-headline font-bold leading-snug" style={{ color: 'var(--fg)' }}>{bt}</h3>}
                            {bd && <p className="mt-2 leading-relaxed text-[15px]" style={{ color: 'var(--muted)' }}>{bd.join(':')}</p>}
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
            const isEven = propIsEven ?? (index % 2 === 0);
            if (isCorporate) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-3xl mx-auto space-y-10 text-center">
                    {sec.kicker && (
                      <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                        {sec.kicker}
                      </span>
                    )}
                    {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold leading-[1.15]" style={{ color: pageFg }}>{sec.title}</h2>}
                    {sec.content && (
                      <div className={cn("prose prose-lg prose-p:leading-relaxed max-w-none text-opacity-75 whitespace-pre-wrap", isDark && "prose-invert")}>
                        {sec.content}
                      </div>
                    )}
                    {sec.bullets && sec.bullets.length > 0 && (
                      <div className="border-t pt-8 mt-8" style={{ borderColor: 'var(--component-border)' }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5 text-left">
                          {sec.bullets.slice(0, 6).map((bullet: string, i: number) => (
                            <div key={i} className="flex items-start gap-3">
                              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: accentColor }}>
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span className="text-sm md:text-base text-opacity-80 leading-relaxed">{bullet}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
              const alt = index % 2 === 1;
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className={cn("max-w-6xl mx-auto flex flex-col gap-12 lg:gap-16", alt ? "lg:flex-row-reverse" : "lg:flex-row")}>
                    <div className="w-full lg:w-1/2 space-y-6">
                      {sec.kicker && (
                        <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                          {sec.kicker}
                        </span>
                      )}
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold leading-[1.1]" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && (
                        <div className={cn("prose prose-lg prose-p:leading-relaxed max-w-none text-opacity-75 whitespace-pre-wrap", isDark && "prose-invert")}>
                          {sec.content}
                        </div>
                      )}
                      {sec.bullets && sec.bullets.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                          {sec.bullets.slice(0, 4).map((bullet: string, i: number) => {
                            const hasColon = bullet.includes(':');
                            const [bt, ...bd] = hasColon ? bullet.split(':') : [bullet, ''];
                            return (
                              <div key={i} className="flex items-start gap-3">
                                <span className="font-mono text-sm font-bold flex-shrink-0 mt-0.5" style={{ color: accentColor }}>{"0" + (i + 1)}</span>
                                <div>
                                  {bt && <span className="text-sm font-semibold">{bt}</span>}
                                  {bd[0] && <span className="text-sm text-opacity-60"> {bd.join(':')}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {sec.ctaText && (
                        <div className="pt-2">
                          <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                            {sec.ctaText}
                          </Button>
                        </div>
                      )}
                    </div>
                    {sec.imageUrl && (
                      <div className="w-full lg:w-1/2">
                        <div className="overflow-hidden bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)', boxShadow: 'var(--component-shadow)' }}>
                          <img src={sec.imageUrl} alt={sec.title || "Datos"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            }
            if (isExecutiveDark) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-3xl mx-auto space-y-8 text-center">
                    {sec.kicker && (
                      <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>
                        {sec.kicker}
                      </span>
                    )}
                    {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold leading-[1.1]" style={{ color: pageFg }}>{sec.title}</h2>}
                    {sec.content && (
                      <div className={cn("prose prose-lg prose-p:leading-relaxed max-w-none text-opacity-75 whitespace-pre-wrap", isDark && "prose-invert")}>
                        {sec.content}
                      </div>
                    )}
                    {sec.bullets && sec.bullets.length > 0 && (
                      <div className="space-y-4 text-left">
                        {sec.bullets.slice(0, 6).map((bullet: string, i: number) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="font-mono text-sm font-bold flex-shrink-0 mt-0.5" style={{ color: accentColor }}>{String(i + 1).padStart(2, '0')}</span>
                            <span className="text-base text-opacity-80 leading-relaxed">{bullet}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {sec.ctaText && (
                      <div className="flex justify-center pt-2">
                        <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                </section>
              );
            }
            if (isLuxurySerif) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-2xl mx-auto space-y-8 text-left">
                    {sec.kicker && (
                      <span className="inline-block text-xs font-medium uppercase tracking-[0.3em]" style={{ color: accentColor }}>
                        {sec.kicker}
                      </span>
                    )}
                    {sec.title && <h2 className="font-headline font-medium text-4xl md:text-5xl leading-[1.15]" style={{ color: pageFg }}>{sec.title}</h2>}
                    {sec.content && (
                      <div className="text-lg text-opacity-70 font-light leading-loose whitespace-pre-wrap">{sec.content}</div>
                    )}
                    {sec.bullets && sec.bullets.length > 0 && (
                      <div className="space-y-5 pt-2">
                        {sec.bullets.slice(0, 6).map((bullet: string, i: number) => (
                          <div key={i} className="flex items-start gap-4">
                            <span className="text-lg font-light flex-shrink-0" style={{ color: accentColor }}>·</span>
                            <span className="text-base text-opacity-75 leading-relaxed font-light">{bullet}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {sec.ctaText && (
                      <div className="pt-2">
                        <Button onClick={onPurchase} className="h-14 px-12 text-sm font-medium tracking-[0.08em] uppercase" style={{ borderRadius: 'var(--component-radius)', border: '1px solid ' + primaryColor, backgroundColor: 'transparent', color: primaryColor }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                    <div className="pt-4 text-right font-headline text-2xl font-medium" style={{ color: pageFg }}>— {sec.title?.split(' ')[0] || ''}</div>
                  </div>
                </section>
              );
            }
            if (isEditorial) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-start gap-6">
                      <span className="font-headline text-6xl md:text-7xl font-bold leading-none flex-shrink-0" style={{ color: accentColor }}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="space-y-6">
                        {sec.title && <h2 className="font-headline font-bold text-4xl md:text-5xl leading-[1.1]" style={{ color: pageFg }}>{sec.title}</h2>}
                        {sec.content && (
                          <div className={cn("prose prose-lg prose-p:leading-relaxed max-w-[62ch] text-opacity-80 whitespace-pre-wrap", isDark && "prose-invert")}>
                            {sec.content}
                          </div>
                        )}
                        {sec.bullets && sec.bullets.length > 0 && (
                          <div className="space-y-4">
                            {sec.bullets.slice(0, 5).map((bullet: string, i: number) => (
                              <div key={i} className="flex items-start gap-3">
                                <span className="font-headline font-bold flex-shrink-0" style={{ color: accentColor }}>—</span>
                                <span className="text-base text-opacity-80 leading-relaxed">{bullet}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {sec.ctaText && (
                          <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                            {sec.ctaText}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            }
            if (isModernClean) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-3xl mx-auto space-y-8 text-center">
                    {sec.kicker && (
                      <span className="inline-block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: accentColor }}>
                        {sec.kicker}
                      </span>
                    )}
                    {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold leading-[1.1]" style={{ color: pageFg }}>{sec.title}</h2>}
                    {sec.content && (
                      <div className={cn("prose prose-lg prose-p:leading-relaxed max-w-none text-opacity-75 whitespace-pre-wrap", isDark && "prose-invert")}>
                        {sec.content}
                      </div>
                    )}
                    {sec.bullets && sec.bullets.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                        {sec.bullets.slice(0, 6).map((bullet: string, i: number) => (
                          <div key={i} className="p-5 bg-[var(--component-bg)] rounded-[var(--component-radius)]" style={{ border: 'var(--component-border)' }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: hexToRgba(accentColor, 0.14), color: accentColor }}>
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                            <span className="text-sm font-medium leading-relaxed">{bullet}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {sec.ctaText && (
                      <div className="flex justify-center pt-2">
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
                  <div className={cn("max-w-4xl mx-auto flex flex-col gap-10", index % 2 === 1 ? "md:items-end md:text-right" : "md:items-start md:text-left")}>
                    {sec.kicker && (
                      <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>
                        {sec.kicker}
                      </span>
                    )}
                    {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-black leading-[1.05]" style={{ color: pageFg }}>{sec.title}</h2>}
                    {sec.content && (
                      <div className="text-lg text-opacity-80 leading-relaxed max-w-[58ch] whitespace-pre-wrap">{sec.content}</div>
                    )}
                    {sec.bullets && sec.bullets.length > 0 && (
                      <div className="space-y-3">
                        {sec.bullets.slice(0, 6).map((bullet: string, i: number) => (
                          <div key={i} className="flex items-start gap-3">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: accentColor }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span className="text-base text-opacity-85 leading-relaxed">{bullet}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {sec.badgeText && (
                      <span className="inline-block font-mono text-xs font-bold uppercase tracking-[0.12em] px-4 py-2 rounded-full" style={{ border: `1px solid ${hexToRgba(accentColor, 0.6)}`, color: accentColor, boxShadow: `0 0 20px ${hexToRgba(accentColor, 0.25)}` }}>
                        {sec.badgeText}
                      </span>
                    )}
                    {sec.ctaText && (
                      <Button onClick={onPurchase} className="h-14 px-12 text-base font-bold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                        {sec.ctaText}
                      </Button>
                    )}
                  </div>
                </section>
              );
            }
            return (
              <section key={sec.id} className="py-8 md:py-16 px-6">
                {sec.imageUrl && !isClassic ? (
                  <div className={cn("mx-auto flex flex-col gap-12 lg:gap-20 items-center w-full", isEven ? "md:flex-row" : "md:flex-row-reverse")} style={{ maxWidth: 'var(--container-max)' }}>
                    <div className="w-full md:w-1/2">
                      <div className="w-full aspect-[4/3] rounded-[var(--component-radius)] overflow-hidden relative bg-[var(--surface-muted)]" style={{ border: 'var(--component-border)' }}>
                        <img src={sec.imageUrl} alt={sec.title || "Imagen narrativa"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      </div>
                    </div>
                    <div className="w-full md:w-1/2 space-y-8">
                      {sec.title && <h2 className="text-4xl md:text-5xl font-black font-headline leading-[1.1]" style={{ color: pageFg }}>{sec.title}</h2>}
                      <div className={cn("prose prose-lg prose-p:leading-relaxed max-w-none text-opacity-90 whitespace-pre-wrap", isDark && "prose-invert")}>
                        {sec.content}
                      </div>
                      
                      {/* Viñetas bajo descripción */}
                      {sec.bullets && sec.bullets.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-left">
                          {sec.bullets.slice(0, 4).map((bullet: string, i: number) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-[var(--component-radius)] flex-shrink-0 flex items-center justify-center shadow-sm mt-0.5" style={{ backgroundColor: btnBg, color: btnText }}>
                                ✓
                              </div>
                              <span className="text-sm md:text-base text-opacity-80 leading-relaxed font-medium">{bullet}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-8 text-center md:text-left">
                    {sec.title && <h2 className="text-4xl md:text-5xl font-black font-headline leading-[1.1]" style={{ color: pageFg }}>{sec.title}</h2>}
                    <div className={cn("prose prose-lg prose-p:leading-relaxed max-w-none text-opacity-90 whitespace-pre-wrap", isDark && "prose-invert")}>
                      {sec.content}
                    </div>
                    
                    {/* Viñetas bajo descripción */}
                    {sec.bullets && sec.bullets.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-left">
                        {sec.bullets.slice(0, 4).map((bullet: string, i: number) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-[var(--component-radius)] flex-shrink-0 flex items-center justify-center shadow-sm mt-0.5" style={{ backgroundColor: btnBg, color: btnText }}>
                              ✓
                            </div>
                            <span className="text-sm md:text-base text-opacity-80 leading-relaxed font-medium">{bullet}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Botón de Acción Opcional */}
                    {sec.ctaText && (
                      <div className="flex justify-center md:justify-start pt-8 mt-8 w-full">
                        <Button onClick={onPurchase} className="h-16 px-10 text-lg md:text-xl font-bold rounded-[var(--component-radius)] transition-transform hover:scale-105" style={{ backgroundColor: btnBg, color: btnText }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );

}
