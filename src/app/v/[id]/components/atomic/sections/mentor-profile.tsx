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

export function MentorProfileSection({ sec, ctx, isEven }: SectionProps) {
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
                  <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                    {sec.imageUrl && (
                      <div className="w-full md:w-2/5">
                        <div className="relative aspect-[4/5] rounded-[var(--component-radius)] overflow-hidden bg-[var(--component-bg)]" style={{ border: 'var(--component-border)' }}>
                          <img src={sec.imageUrl} alt={sec.title || "Equipo docente"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        </div>
                      </div>
                    )}
                    <div className={cn("w-full space-y-8", sec.imageUrl ? "md:w-3/5" : "text-center")}>
                      {sec.kicker && (
                        <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                          {sec.kicker}
                        </span>
                      )}
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold leading-tight" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && (
                        <div className={cn("prose prose-lg prose-p:leading-relaxed max-w-none text-opacity-80 whitespace-pre-wrap", isDark && "prose-invert")}>
                          {sec.content}
                        </div>
                      )}
                      {sec.bullets && sec.bullets.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {sec.bullets.map((b: string, i: number) => (
                            <span key={i} className="text-xs font-semibold px-3 py-1.5" style={{ borderRadius: 'var(--component-radius)', border: 'var(--component-border)', color: primaryColor }}>
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                      {sec.ctaText && (
                        <div className="flex justify-center md:justify-start pt-4">
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
            if (isTechB2b || isExecutiveDark || isLuxurySerif || isEditorial) {
              const serif = isLuxurySerif || isEditorial;
              const grayscale = isExecutiveDark;
              return (
                <section key={sec.id} className={cn("py-[var(--section-padding)] px-6", isExecutiveDark && "bg-[var(--surface-muted)]")}>
                  <div className={cn("max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20", isLuxurySerif && "gap-16")}>
                    {sec.imageUrl && (
                      <div className={cn("w-full flex-shrink-0", isLuxurySerif ? "md:w-2/5" : "md:w-2/5")}>
                        <div className={cn("relative aspect-[4/5] overflow-hidden bg-[var(--component-bg)]", isModernClean ? "rounded-full md:aspect-square" : "")} style={{ border: 'var(--component-border)', borderRadius: isModernClean ? undefined : 'var(--component-radius)' }}>
                          <img src={sec.imageUrl} alt={sec.title || "Mentor"} className={cn("w-full h-full object-cover", grayscale && "grayscale")} loading="lazy" decoding="async" />
                        </div>
                      </div>
                    )}
                    <div className={cn("w-full space-y-6", sec.imageUrl ? "md:w-3/5" : "text-center")}>
                      {sec.kicker && (
                        <span className={cn("inline-block text-xs font-semibold uppercase tracking-[0.18em]", isTechB2b && "font-mono")} style={{ color: accentColor }}>
                          {sec.kicker}
                        </span>
                      )}
                      {sec.title && <h2 className={cn("font-headline leading-tight", serif ? "font-medium text-4xl md:text-5xl" : "font-bold text-3xl md:text-5xl")} style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && (
                        <div className={cn("text-opacity-75 leading-relaxed whitespace-pre-wrap", isLuxurySerif ? "text-lg font-light" : "prose prose-lg prose-p:leading-relaxed max-w-none", isDark && "prose-invert")}>
                          {sec.content}
                        </div>
                      )}
                      {sec.bullets && sec.bullets.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {sec.bullets.map((b: string, i: number) => (
                            <span key={i} className={cn("text-xs font-semibold px-3 py-1.5", isTechB2b && "font-mono")} style={{ borderRadius: 'var(--component-radius)', border: '1px solid ' + accentColor, color: accentColor }}>
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                      {sec.ctaText && (
                        <div className={cn("flex", sec.imageUrl ? "justify-start" : "justify-center", "pt-2")}>
                          <Button onClick={onPurchase} className={cn("h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]", isLuxurySerif && "text-sm font-medium tracking-[0.08em] uppercase")} style={isLuxurySerif ? { borderRadius: 'var(--component-radius)', border: '1px solid ' + primaryColor, backgroundColor: 'transparent', color: primaryColor } : { backgroundColor: btnBg, color: btnText }}>
                            {sec.ctaText}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isModernClean) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-16">
                    {sec.imageUrl && (
                      <div className="w-full md:w-2/5 flex-shrink-0">
                        <div className="relative aspect-square overflow-hidden rounded-full" style={{ border: 'var(--component-border)', boxShadow: 'var(--component-shadow)' }}>
                          <img src={sec.imageUrl} alt={sec.title || "Mentor"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        </div>
                      </div>
                    )}
                    <div className={cn("w-full space-y-6", sec.imageUrl ? "md:w-3/5" : "text-center")}>
                      {sec.kicker && (
                        <span className="inline-block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: accentColor }}>
                          {sec.kicker}
                        </span>
                      )}
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold leading-tight" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && (
                        <div className={cn("text-opacity-75 leading-relaxed whitespace-pre-wrap text-lg", isDark && "prose-invert")}>
                          {sec.content}
                        </div>
                      )}
                      {sec.bullets && sec.bullets.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {sec.bullets.map((b: string, i: number) => (
                            <span key={i} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: hexToRgba(accentColor, 0.12), color: accentColor }}>
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                      {sec.ctaText && (
                        <div className={cn("flex", sec.imageUrl ? "justify-start" : "justify-center", "pt-2")}>
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
            if (isLaunchCountdown) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-16">
                    {sec.imageUrl && (
                      <div className="w-full md:w-2/5 flex-shrink-0">
                        <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--component-radius)] bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', boxShadow: `0 0 40px ${hexToRgba(accentColor, 0.18)}` }}>
                          <img src={sec.imageUrl} alt={sec.title || "Mentor"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        </div>
                      </div>
                    )}
                    <div className={cn("w-full space-y-6", sec.imageUrl ? "md:w-3/5" : "text-center")}>
                      {sec.kicker && <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>{sec.kicker}</span>}
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-black leading-tight" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <div className="text-opacity-75 leading-relaxed whitespace-pre-wrap text-lg">{sec.content}</div>}
                      {sec.bullets && sec.bullets.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {sec.bullets.map((b: string, i: number) => (
                            <span key={i} className="text-xs font-semibold font-mono px-3 py-1.5 rounded-full" style={{ backgroundColor: hexToRgba(accentColor, 0.12), color: accentColor }}>{b}</span>
                          ))}
                        </div>
                      )}
                      {sec.ctaText && (
                        <div className={cn("flex", sec.imageUrl ? "justify-start" : "justify-center", "pt-2")}>
                          <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText, boxShadow: `0 0 26px ${hexToRgba(btnBg, 0.5)}` }}>{sec.ctaText}</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            return (
              <section key={sec.id} className="py-[var(--section-padding)] px-6 overflow-hidden">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                  {sec.imageUrl && (
                    <div className="w-full md:w-1/2">
                      <div className="relative aspect-[4/5] rounded-[var(--component-radius)] overflow-hidden bg-[var(--surface-muted)]" style={{ border: 'var(--component-border)' }}>
                        <img src={sec.imageUrl} alt={sec.title || "Mentor Profile"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      </div>
                    </div>
                  )}
                  <div className={cn("w-full space-y-8", sec.imageUrl ? "md:w-1/2" : "text-center")}>
                    {sec.title && <h2 className="text-4xl md:text-6xl font-black font-headline leading-tight" style={{ color: pageFg }}>{sec.title}</h2>}
                    <div className={cn("prose prose-lg prose-p:leading-relaxed max-w-none text-opacity-80 whitespace-pre-wrap", isDark && "prose-invert")}>
                      {sec.content}
                    </div>
                    
                    {/* Botón de Acción Opcional */}
                    {sec.ctaText && (
                      <div className="flex justify-center md:justify-start pt-8 mt-8 w-full">
                        <Button onClick={onPurchase} className="h-16 px-10 text-lg md:text-xl font-bold rounded-[var(--component-radius)] transition-transform hover:scale-105" style={{ backgroundColor: btnBg, color: btnText }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );

}
