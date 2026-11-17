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

export function BundleGridSection({ sec, ctx, isEven }: SectionProps) {
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

            if (!bundleProducts || bundleProducts.length === 0) return null;
            return (
              <section key={sec.id} className="py-[var(--section-padding)] px-6" style={{ backgroundColor: 'var(--section-alt)' }}>
                <div className="max-w-6xl mx-auto space-y-12">
                  <div className="text-center space-y-4">
                    <h2 className="text-3xl md:text-5xl font-black font-headline uppercase" style={{ color: 'var(--fg)' }}>
                      {sec.title || '¿Qué incluye este Combo?'}
                    </h2>
                    <p className="text-lg md:text-xl text-opacity-80 max-w-2xl mx-auto" style={{ color: 'var(--muted)' }}>
                      {sec.content || 'Obtén acceso inmediato a todos estos programas de formación con un descuento único.'}
                    </p>
                  </div>
                  
                  <div className="space-y-24">
                    {bundleProducts.map((p: any, i: number) => {
                      const isEven = i % 2 === 0;
                      return (
                        <div key={`${p.id}_${i}`} className={cn("flex flex-col gap-12 lg:gap-16 items-center", isEven ? "lg:flex-row" : "lg:flex-row-reverse")}>
                          <div className="w-full lg:w-1/2 space-y-6 text-left">
                            <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
                              {p.productType === 'course' ? 'Curso Online' : 'Mentoría'}
                            </span>
                            <h3 className="text-3xl md:text-4xl font-headline font-bold leading-tight" style={{ color: 'var(--fg)' }}>
                              {p.title}
                            </h3>
                            <div className="prose prose-lg prose-p:leading-relaxed max-w-none text-opacity-80" style={{ color: 'var(--muted)' }}>
                              {p.description?.split('\n').map((line: string, idx: number) => {
                                if (line.trim().startsWith('- ') || line.trim().match(/^\d+\s*·/)) {
                                  return (
                                    <div key={idx} className="flex items-start gap-3 mt-3">
                                      <svg className="w-5 h-5 flex-shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                      <span className="text-base leading-relaxed">{line.replace(/^-\s*|^\d+\s*·\s*/, '')}</span>
                                    </div>
                                  );
                                }
                                return <p key={idx} className="mb-4">{line}</p>;
                              })}
                            </div>
                            
                            <div className="pt-6 flex items-center gap-6 border-t" style={{ borderColor: 'var(--border)' }}>
                              <div className="font-mono text-sm font-bold opacity-70 uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                                Incluido en el pack
                              </div>
                              {p.salesPageId && (
                                <a 
                                  href={`/v/${p.salesPageId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-bold uppercase tracking-wider hover:underline flex items-center gap-2"
                                  style={{ color: 'var(--accent-text)' }}
                                >
                                  Ver Detalle <Globe className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="w-full lg:w-1/2">
                            <div className="overflow-hidden aspect-[4/3] relative rounded-[var(--component-radius)]" style={{ border: 'var(--component-border)', boxShadow: 'var(--component-shadow)' }}>
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted/30" style={{ color: 'var(--muted)' }}>
                                  <ShoppingCart className="w-16 h-16 opacity-30" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex justify-center pt-8">
                    <button onClick={onPurchase} className="od-fs-btn od-fs-btn-primary px-8 py-4">
                      Comprar Todo el Combo
                    </button>
                  </div>
                </div>
              </section>
            );

}
