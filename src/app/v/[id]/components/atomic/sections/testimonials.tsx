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

export function TestimonialsSection({ sec, ctx, isEven }: SectionProps) {
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
                  <div className="max-w-[1180px] mx-auto text-center">
                    <div className="mb-10">
                      {sec.kicker && <span className="od-fs-kicker">{sec.kicker}</span>}
                      {sec.title && <h2 className="od-fs-heading text-3xl md:text-5xl">{sec.title}</h2>}
                    </div>
                    {sec.bullets && sec.bullets.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                        {sec.bullets.map((bullet: string, i: number) => {
                          const hasColon = bullet.includes(':');
                          const [name, ...quoteArr] = hasColon ? bullet.split(':') : ['', bullet];
                          const quote = hasColon ? quoteArr.join(':') : bullet;
                          return (
                            <div key={i} className="od-fs-card p-6 md:p-7 flex flex-col gap-5 od-fs-card-lift" style={{ boxShadow: 'var(--component-shadow)' }}>
                              <div className="text-lg tracking-[3px]" style={{ color: 'var(--accent)' }}>{'★'.repeat(5)}</div>
                              <p className="leading-relaxed text-[15px] flex-1" style={{ color: 'var(--fg)' }}>"{quote.trim()}"</p>
                              <div className="flex flex-col">
                                {hasColon && <div className="font-headline font-bold text-[15px]" style={{ color: 'var(--fg)' }}>{name.replace(/\*\*/g, '').trim()}</div>}
                                {sec.roles?.[i] && <div className="font-mono text-[11px] uppercase tracking-[.06em] mt-1" style={{ color: 'var(--muted)' }}>{sec.roles[i]}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                      {sec.kicker && (
                        <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                          {sec.kicker}
                        </span>
                      )}
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold mt-3" style={{ color: pageFg }}>{sec.title}</h2>}
                    </div>
                    {sec.bullets && sec.bullets.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--content-gap)]">
                        {sec.bullets.map((bullet: string, i: number) => {
                          const hasColon = bullet.includes(':');
                          const [name, ...quoteArr] = hasColon ? bullet.split(':') : ['', bullet];
                          const quote = hasColon ? quoteArr.join(':') : bullet;
                          return (
                            <div key={i} className="p-8 bg-[var(--component-bg)] flex flex-col gap-5" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)' }}>
                              <div className="text-lg" style={{ color: accentColor }}>“</div>
                              <p className="text-opacity-80 leading-relaxed flex-1">"{quote.trim()}"</p>
                              {hasColon && (
                                <div>
                                  <h4 className="font-bold text-sm" style={{ color: pageFg }}>{name.replace(/\*\*/g, '').trim()}</h4>
                                  {sec.roles?.[i] && <p className="text-xs text-opacity-60 mt-1">{sec.roles[i]}</p>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
            if (isTechB2b) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--surface-muted)]">
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--content-gap)]">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const hasColon = bullet.includes(':');
                        const [name, ...quoteArr] = hasColon ? bullet.split(':') : ['', bullet];
                        const quote = hasColon ? quoteArr.join(':') : bullet;
                        return (
                          <div key={i} className="p-8 bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)', boxShadow: 'var(--component-shadow)' }}>
                            <span className="font-mono text-2xl font-bold" style={{ color: accentColor }}>{sec.metrics?.[i] || '+00'}</span>
                            <p className="mt-4 text-opacity-80 leading-relaxed flex-1">"{quote.trim()}"</p>
                            {hasColon && (
                              <div className="mt-5">
                                <h4 className="font-bold text-sm">{name.replace(/\*\*/g, '').trim()}</h4>
                                {sec.roles?.[i] && <p className="text-xs text-opacity-60 mt-1">{sec.roles[i]}</p>}
                              </div>
                            )}
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
            if (isExecutiveDark || isLuxurySerif || isEditorial) {
              const serif = isLuxurySerif || isEditorial;
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                      {sec.title && <h2 className={cn("font-headline font-bold", serif ? "font-medium text-4xl md:text-5xl" : "text-3xl md:text-5xl")} style={{ color: pageFg }}>{sec.title}</h2>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--content-gap)]">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const hasColon = bullet.includes(':');
                        const [name, ...quoteArr] = hasColon ? bullet.split(':') : ['', bullet];
                        const quote = hasColon ? quoteArr.join(':') : bullet;
                        return (
                          <div key={i} className={cn("flex flex-col gap-4", isExecutiveDark ? "p-8 bg-[var(--component-bg)]" : "py-8", serif && "text-center")} style={{ borderTop: '1px solid ' + accentColor }}>
                            <span className={cn("font-mono text-2xl font-bold", serif && "hidden")} style={{ color: accentColor }}>{sec.metrics?.[i] || '—'}</span>
                            <p className={cn("leading-relaxed flex-1", serif ? "font-headline font-medium text-2xl md:text-3xl italic text-opacity-80" : "text-opacity-85 text-lg")}>
                              "{quote.trim()}"
                            </p>
                            {hasColon && (
                              <div>
                                <h4 className={cn("font-semibold text-sm", serif && "font-medium tracking-wide")}>{name.replace(/\*\*/g, '').trim()}</h4>
                                {sec.roles?.[i] && <p className="text-xs text-opacity-60 mt-1">{sec.roles[i]}</p>}
                              </div>
                            )}
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
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--content-gap)]">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const hasColon = bullet.includes(':');
                        const [name, ...quoteArr] = hasColon ? bullet.split(':') : ['', bullet];
                        const quote = hasColon ? quoteArr.join(':') : bullet;
                        return (
                          <div key={i} className="p-7 bg-[var(--component-bg)] rounded-[var(--component-radius)]" style={{ border: 'var(--component-border)', boxShadow: 'var(--component-shadow)' }}>
                            <div className="text-lg" style={{ color: accentColor }}>{'★'.repeat(5)}</div>
                            <p className="mt-3 text-opacity-85 leading-relaxed flex-1">"{quote.trim()}"</p>
                            <div className="mt-5 flex flex-col">
                              {hasColon && <h4 className="font-bold text-sm">{name.replace(/\*\*/g, '').trim()}</h4>}
                              {sec.roles?.[i] && <p className="text-xs text-opacity-60 mt-0.5">{sec.roles[i]}</p>}
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
            if (isLaunchCountdown) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-black" style={{ color: pageFg }}>{sec.title}</h2>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const hasColon = bullet.includes(':');
                        const [name, ...quoteArr] = hasColon ? bullet.split(':') : ['', bullet];
                        const quote = hasColon ? quoteArr.join(':') : bullet;
                        return (
                          <div key={i} className={cn("p-7 bg-[var(--component-bg)] flex flex-col gap-4", i % 2 === 1 && "md:-translate-y-3")} style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)' }}>
                            <span className="font-mono text-2xl font-bold" style={{ color: accentColor }}>{sec.metrics?.[i] || '+00'}</span>
                            <p className="text-opacity-85 leading-relaxed flex-1 text-sm">"{quote.trim()}"</p>
                            <div className="flex flex-col">
                              {hasColon && <h4 className="font-bold text-sm">{name.replace(/\*\*/g, '').trim()}</h4>}
                              {sec.roles?.[i] && <p className="text-xs text-opacity-60 mt-0.5">{sec.roles[i]}</p>}
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
                <div className="max-w-6xl mx-auto text-center space-y-16">
                  {sec.title && <h2 className="text-4xl md:text-5xl font-black font-headline" style={{ color: pageFg }}>{sec.title}</h2>}
                  {sec.content && <div className={cn("prose prose-lg mx-auto text-opacity-90", isDark && "prose-invert")}>{sec.content}</div>}


                  {sec.bullets && sec.bullets.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--content-gap)] text-left mt-12">
                      {sec.bullets.map((bullet: string, i: number) => {
                        const hasColon = bullet.includes(':');
                        const [name, ...quoteArr] = hasColon ? bullet.split(':') : ['', bullet];
                        const quote = hasColon ? quoteArr.join(':') : bullet;
                        
                        return (
                          <div key={i} className="p-8 rounded-[var(--component-radius)] bg-[var(--component-bg)] flex flex-col gap-5" style={cardStyle}>
                            <div className="flex gap-1 text-xl" style={{ color: accentColor }}>
                              {'★'.repeat(5)}
                            </div>
                            <p className="text-opacity-80 italic leading-relaxed flex-1 text-lg">"{quote.trim()}"</p>
                            {hasColon && <h4 className="font-bold text-lg">{name.replace(/\*\*/g, '').trim()}</h4>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
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
