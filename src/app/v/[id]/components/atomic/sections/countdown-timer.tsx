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

export function CountdownTimerSection({ sec, ctx, isEven }: SectionProps) {
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

            // Removed strict return null so Oportunidad Reservada can show its content/image even without a date
            if (isFlashSale) {
              const nowPrice = typeof page.price === 'number' ? page.price : 0;
              const oldPrice = (typeof page.oldPrice === 'number' && page.oldPrice > 0) ? Math.round(page.oldPrice) : (nowPrice > 0 ? Math.round(nowPrice * 2.94) : 0);
              return (
                <section key={sec.id} className="py-16 md:py-24 px-6 text-center border-y-4" style={{ background: 'var(--accent)', borderColor: 'var(--fg)' }}>
                  <div className="max-w-4xl mx-auto space-y-8">
                    {sec.title && (
                      <h2 className="od-fs-heading text-3xl md:text-5xl" style={{ color: 'var(--fg)', textShadow: '4px 4px 0 var(--surface)' }}>
                        {sec.title}
                      </h2>
                    )}
                    {sec.content && (
                      <p className="text-lg md:text-xl mx-auto max-w-[52ch] leading-relaxed" style={{ color: 'var(--fg)', opacity: 0.92 }}>{sec.content}</p>
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-5">
                      {oldPrice > 0 && <span className="font-mono text-lg line-through" style={{ color: 'rgba(14,14,15,.6)' }}>${oldPrice.toLocaleString('es-AR')}</span>}
                      {nowPrice > 0 && <span className="font-headline font-black text-4xl md:text-6xl leading-none" style={{ color: 'var(--fg)' }}>${nowPrice.toLocaleString('es-AR')}</span>}
                    </div>
                    {page.activeUntil && (
                      <FlashCountdown activeUntil={page.activeUntil} shadowColor={primaryColor} />
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                      <button onClick={onPurchase} className="od-fs-btn od-fs-btn-dark">{sec.ctaText || 'Inscribirme Ahora'}</button>
                    </div>
                  </div>
                </section>
              );
            }
            if (isCorporate) {
              const nowPrice = typeof page.price === 'number' ? page.price : 0;
              const oldPrice = (typeof page.oldPrice === 'number' && page.oldPrice > 0) ? Math.round(page.oldPrice) : (nowPrice > 0 ? Math.round(nowPrice * 2.94) : 0);
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6" style={{ backgroundColor: accentColor }}>
                  <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                    <div>
                      {sec.title && <h2 className="text-2xl md:text-3xl font-headline font-bold" style={{ color: contrastTextOn(accentColor) }}>{sec.title}</h2>}
                      {sec.content && <p className="mt-2 text-sm md:text-base opacity-80" style={{ color: contrastTextOn(accentColor) }}>{sec.content}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      {oldPrice > 0 && <span className="text-lg line-through opacity-60" style={{ color: contrastTextOn(accentColor) }}>${oldPrice.toLocaleString('es-AR')}</span>}
                      {nowPrice > 0 && <span className="font-headline font-black text-3xl md:text-4xl" style={{ color: contrastTextOn(accentColor) }}>${nowPrice.toLocaleString('es-AR')}</span>}
                      {page.activeUntil && <CompactCountdown activeUntil={page.activeUntil} color={contrastTextOn(accentColor)} />}
                      {sec.ctaText && (
                        <Button onClick={onPurchase} className="h-12 px-8 text-sm font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: onPrimary, color: primaryColor }}>
                          {sec.ctaText}
                        </Button>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isTechB2b) {
              const nowPrice = typeof page.price === 'number' ? page.price : 0;
              const oldPrice = (typeof page.oldPrice === 'number' && page.oldPrice > 0) ? Math.round(page.oldPrice) : (nowPrice > 0 ? Math.round(nowPrice * 2.94) : 0);
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--surface-muted)]">
                  <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="text-center md:text-left space-y-3">
                      {sec.kicker && <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>{sec.kicker}</span>}
                      {sec.title && <h2 className="text-2xl md:text-4xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="text-opacity-70 leading-relaxed max-w-xl">{sec.content}</p>}
                    </div>
                    <div className="flex flex-col items-center gap-5">
                      {(nowPrice > 0 || oldPrice > 0) && (
                        <div className="flex items-baseline gap-3">
                          {oldPrice > 0 && <span className="font-mono text-lg line-through text-opacity-50">${oldPrice.toLocaleString('es-AR')}</span>}
                          {nowPrice > 0 && <span className="font-headline font-black text-3xl md:text-4xl" style={{ color: pageFg }}>${nowPrice.toLocaleString('es-AR')}</span>}
                        </div>
                      )}
                      {page.activeUntil && (
                        <div className="px-6 py-4 bg-[var(--component-bg)]" style={{ border: '1px solid ' + accentColor, borderRadius: 'var(--component-radius)', boxShadow: 'var(--component-shadow)' }}>
                          <FlashCountdown activeUntil={page.activeUntil} boxBg="transparent" boxText={pageFg} boxBorder={accentColor} labelColor={accentColor} />
                        </div>
                      )}
                      {sec.ctaText && (
                        <Button onClick={onPurchase} className="h-12 px-8 text-sm font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>{sec.ctaText}</Button>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isExecutiveDark) {
              const nowPrice = typeof page.price === 'number' ? page.price : 0;
              const oldPrice = (typeof page.oldPrice === 'number' && page.oldPrice > 0) ? Math.round(page.oldPrice) : (nowPrice > 0 ? Math.round(nowPrice * 2.94) : 0);
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--surface-muted)]">
                  <div className="max-w-4xl mx-auto text-center space-y-8">
                    {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                    {sec.content && <p className="text-opacity-70 leading-relaxed max-w-2xl mx-auto">{sec.content}</p>}
                    {(nowPrice > 0 || oldPrice > 0) && (
                      <div className="flex items-baseline justify-center gap-3">
                        {oldPrice > 0 && <span className="font-mono text-xl line-through text-opacity-50">${oldPrice.toLocaleString('es-AR')}</span>}
                        {nowPrice > 0 && <span className="font-headline font-black text-4xl md:text-6xl" style={{ color: accentColor }}>${nowPrice.toLocaleString('es-AR')}</span>}
                      </div>
                    )}
                    {page.activeUntil && (
                      <FlashCountdown activeUntil={page.activeUntil} boxBg={hexToRgba(accentColor, 0.06)} boxText={pageFg} boxBorder={hexToRgba(accentColor, 0.5)} labelColor={accentColor} shadowColor={hexToRgba(accentColor, 0.18)} />
                    )}
                    {sec.ctaText && (
                      <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>{sec.ctaText}</Button>
                    )}
                  </div>
                </section>
              );
            }
            if (isLuxurySerif || isEditorial) {
              const nowPrice = typeof page.price === 'number' ? page.price : 0;
              const oldPrice = (typeof page.oldPrice === 'number' && page.oldPrice > 0) ? Math.round(page.oldPrice) : (nowPrice > 0 ? Math.round(nowPrice * 2.94) : 0);
              const grayscale = isExecutiveDark;
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                    {sec.imageUrl && (
                      <div className="w-full md:w-1/2 flex-shrink-0">
                        <div className="relative aspect-[4/5] overflow-hidden" style={{ borderRadius: isEditorial ? 'var(--component-radius)' : 0 }}>
                          <img src={sec.imageUrl} alt={sec.title || "Oferta"} className={cn("w-full h-full object-cover", grayscale && "grayscale")} loading="lazy" decoding="async" />
                        </div>
                      </div>
                    )}
                    <div className={cn("w-full flex flex-col", sec.imageUrl ? "md:w-1/2 md:items-start md:text-left" : "items-center text-center max-w-2xl mx-auto")}>
                      {sec.title && <h2 className={cn("font-headline mb-4", isLuxurySerif ? "font-medium text-3xl md:text-5xl" : "font-bold text-3xl md:text-5xl")} style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className={cn("text-opacity-70 leading-relaxed mb-8", isLuxurySerif && "font-light")}>{sec.content}</p>}
                      <div className="w-full py-8 mb-8" style={{ borderTop: '1px solid var(--component-border)', borderBottom: '1px solid var(--component-border)' }}>
                        <div className={cn("flex items-center gap-3", sec.imageUrl ? "justify-start" : "justify-center")}>
                          {oldPrice > 0 && <span className={cn("font-mono text-lg line-through text-opacity-50", isLuxurySerif && "font-light")}>${oldPrice.toLocaleString('es-AR')}</span>}
                          {nowPrice > 0 && <span className="font-headline font-black text-4xl" style={{ color: accentColor }}>${nowPrice.toLocaleString('es-AR')}</span>}
                        </div>
                        {page.activeUntil && (
                          <div className="mt-6 text-[26px] md:text-4xl tracking-[0.14em]" style={{ color: pageFg }}>
                            <CompactCountdown activeUntil={page.activeUntil} color={pageFg} />
                          </div>
                        )}
                      </div>
                      {sec.ctaText && (
                        <Button onClick={onPurchase} className={cn("h-14 px-12 text-sm font-medium tracking-[0.08em] uppercase rounded-[var(--component-radius)]", isLuxurySerif && "border")} style={isLuxurySerif ? { borderColor: pageFg, backgroundColor: 'transparent', color: pageFg } : { backgroundColor: btnBg, color: btnText }}>{sec.ctaText}</Button>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isModernClean) {
              const nowPrice = typeof page.price === 'number' ? page.price : 0;
              const oldPrice = (typeof page.oldPrice === 'number' && page.oldPrice > 0) ? Math.round(page.oldPrice) : (nowPrice > 0 ? Math.round(nowPrice * 2.94) : 0);
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--surface-muted)]">
                  <div className="max-w-4xl mx-auto flex flex-col items-center gap-7 text-center">
                    {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                    {sec.content && <p className="text-opacity-70 leading-relaxed max-w-2xl">{sec.content}</p>}
                    <div className="flex items-center gap-4">
                      {oldPrice > 0 && <span className="font-mono text-lg line-through text-opacity-50">${oldPrice.toLocaleString('es-AR')}</span>}
                      {nowPrice > 0 && <span className="font-headline font-black text-4xl" style={{ color: accentColor }}>${nowPrice.toLocaleString('es-AR')}</span>}
                    </div>
                    {page.activeUntil && (
                      <div className="px-7 py-4 bg-[var(--component-bg)] rounded-[var(--component-radius)]" style={{ border: 'var(--component-border)', boxShadow: 'var(--component-shadow)' }}>
                        <CompactCountdown activeUntil={page.activeUntil} color={accentColor} />
                      </div>
                    )}
                    {sec.ctaText && (
                      <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>{sec.ctaText}</Button>
                    )}
                  </div>
                </section>
              );
            }
            if (isLaunchCountdown) {
              const nowPrice = typeof page.price === 'number' ? page.price : 0;
              const oldPrice = (typeof page.oldPrice === 'number' && page.oldPrice > 0) ? Math.round(page.oldPrice) : (nowPrice > 0 ? Math.round(nowPrice * 2.94) : 0);
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-4xl mx-auto text-center space-y-8">
                    {sec.kicker && <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>{sec.kicker}</span>}
                    {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-black" style={{ color: pageFg }}>{sec.title}</h2>}
                    {sec.content && <p className="text-opacity-75 leading-relaxed max-w-2xl mx-auto">{sec.content}</p>}
                    {(nowPrice > 0 || oldPrice > 0) && (
                      <div className="flex items-baseline justify-center gap-3">
                        {oldPrice > 0 && <span className="font-mono text-xl line-through text-opacity-50">${oldPrice.toLocaleString('es-AR')}</span>}
                        {nowPrice > 0 && <span className="font-headline font-black text-4xl md:text-6xl" style={{ color: accentColor }}>${nowPrice.toLocaleString('es-AR')}</span>}
                      </div>
                    )}
                    {page.activeUntil && (
                      <FlashCountdown activeUntil={page.activeUntil} boxBg={hexToRgba(accentColor, 0.08)} boxText={pageFg} boxBorder={accentColor} labelColor={accentColor} shadowColor={hexToRgba(accentColor, 0.25)} />
                    )}
                    {sec.ctaText && (
                      <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText, boxShadow: `0 0 26px ${hexToRgba(btnBg, 0.5)}` }}>{sec.ctaText}</Button>
                    )}
                  </div>
                </section>
              );
            }
            return (
              <div 
                key={sec.id}
                onClick={onPurchase}
                className="fixed top-1/2 right-4 -translate-y-1/2 z-[100] w-64 md:w-72 rounded-[var(--component-radius)] overflow-hidden cursor-pointer group transition-transform hover:scale-105"
              >
                {sec.imageUrl ? (
                  <div className="absolute inset-0">
                    <img src={sec.imageUrl} className="w-full h-full object-cover" alt="Oferta" loading="lazy" decoding="async" />
                    <div className="absolute inset-0 group-hover:opacity-90 transition-opacity" style={{ backgroundColor: overlayColor }}></div>
                  </div>
                ) : (
                  <div className="absolute inset-0 opacity-95" style={{ backgroundColor: primaryColor }}></div>
                )}
                
                <div className="relative z-10 p-6 flex flex-col items-center text-center border border-white/10 rounded-[var(--component-radius)]" style={{ color: sec.imageUrl ? '#FFFFFF' : onPrimary }}>
                  <div className="w-12 h-12 rounded-full bg-danger/20 text-danger flex items-center justify-center mb-4 animate-pulse border border-danger/30">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <h4 className="font-black text-xl mb-2 leading-tight font-headline">{sec.title || '¡Oferta por Tiempo Limitado!'}</h4>
                  {sec.content && <p className="text-sm opacity-80 mb-4">{sec.content}</p>}
                  
                  <CountdownTimer activeUntil={page.activeUntil} />
                  
                  <Button 
                    className="w-full mt-6 font-bold"
                    style={{ backgroundColor: btnBg, color: btnText }}
                  >
                    {sec.ctaText || 'Acceder Ahora'}
                  </Button>
                </div>
              </div>
            );

}
