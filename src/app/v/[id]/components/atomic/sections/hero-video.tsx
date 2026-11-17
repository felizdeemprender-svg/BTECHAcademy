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

export function HeroVideoSection({ sec, ctx, isEven }: SectionProps) {
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
              const heroImg = sec.imageUrl || 'https://picsum.photos/seed/lanza-negocio/900/1200';
              const stampText = sec.badge || 'Cupo limitado';
              const nowPrice = typeof page.price === 'number' ? page.price : 0;
              const oldPrice = (typeof page.oldPrice === 'number' && page.oldPrice > 0) ? Math.round(page.oldPrice) : (nowPrice > 0 ? Math.round(nowPrice * 2.94) : 0);
              const pct = nowPrice > 0 ? Math.round((1 - nowPrice / (oldPrice || 1)) * 100) : 66;
              return (
                <section key={sec.id} className="relative overflow-hidden px-6 bg-[var(--bg)]">
                  <div className="max-w-[1180px] mx-auto grid md:grid-cols-[1.05fr_0.95fr] gap-12 items-center py-16 md:py-24">
                    <div>
                      <span className="inline-flex items-center gap-2 font-headline font-black uppercase text-sm bg-[var(--accent)] px-4 py-2 rounded-full -rotate-2 shadow-[4px_4px_0_var(--fg)]" style={{ color: 'var(--fg)' }}>
                        {stampText}
                      </span>
                      <h1 className="mt-5 font-headline font-black uppercase leading-[1.05] text-4xl md:text-6xl" style={{ color: 'var(--fg)' }}>
                        {sec.title}
                      </h1>
                      {sec.subtitle && (
                        <p className="mt-5 text-lg md:text-xl leading-relaxed max-w-[52ch]" style={{ color: 'var(--muted)' }}>{sec.subtitle}</p>
                      )}
                      <div className="mt-7 flex flex-wrap items-center gap-4">
                        {nowPrice > 0 && (
                          <div className="flex items-baseline gap-2 font-headline font-black text-2xl md:text-3xl" style={{ color: 'var(--fg)' }}>
                            <span className="font-mono text-lg line-through" style={{ color: 'var(--muted)' }}>${oldPrice.toLocaleString('es-AR')}</span>
                            <span>${nowPrice.toLocaleString('es-AR')}</span>
                          </div>
                        )}
                        <button
                          onClick={onPurchase}
                          className="od-fs-btn od-fs-btn-primary"
                        >
                          {sec.ctaText || 'Quiero empezar ahora'}
                        </button>
                      </div>
                      {sec.micro && (
                        <div className="mt-4 font-mono text-[13px]" style={{ color: 'var(--muted)' }}>
                          <span className="tracking-widest" style={{ color: 'var(--accent)' }}>★★★★★</span>&nbsp; {sec.micro}
                        </div>
                      )}
                      {page.activeUntil && (
                        <div className="mt-6">
                          <FlashCountdown activeUntil={page.activeUntil} />
                          {sec.timerNote && (
                            <div className="mt-3 font-mono text-[13px]" style={{ color: 'var(--muted)' }}>
                              {sec.timerNote}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="relative mt-10 md:mt-0">
                      <div className="relative border-4 rounded-[var(--component-radius)] overflow-hidden rotate-[1.5deg] shadow-[14px_14px_0_var(--fg)]" style={{ borderColor: 'var(--fg)' }}>
                        <img src={heroImg} alt={sec.title || "Oferta"} className="w-full h-[420px] md:h-[560px] object-cover" loading="eager" fetchPriority="high" decoding="async" />
                      </div>
                      <span className="absolute -top-6 -right-3 md:-right-6 font-headline font-black uppercase text-[15px] leading-tight text-center bg-[var(--accent)] px-4 py-3 rounded-full border-[3px] rotate-6 shadow-[4px_4px_0_var(--fg)]" style={{ color: 'var(--fg)', borderColor: 'var(--fg)' }}>
                        -{pct}%
                        <small className="block text-[10px] tracking-[.08em]">SOLO HOY</small>
                      </span>
                      {nowPrice > 0 && (
                        <span className="absolute -bottom-5 -left-3 md:-left-5 font-headline font-black text-3xl md:text-[44px] px-5 py-1.5 rounded-[14px] border-[3px] -rotate-3 shadow-[5px_5px_0_var(--fg)]" style={{ color: 'var(--fg)', borderColor: 'var(--fg)', background: 'var(--bg)' }}>
                          ${nowPrice.toLocaleString('es-AR')}
                        </span>
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isCorporate) {
              return (
                <section key={sec.id} className="relative py-[var(--section-padding)] overflow-hidden px-6">
                  <div className="max-w-4xl mx-auto space-y-6 text-center">
                    {sec.kicker && (
                      <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                        {sec.kicker}
                      </span>
                    )}
                    <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight leading-[1.15]" style={{ color: pageFg }}>
                      {sec.title}
                    </h1>
                    {sec.subtitle && (
                      <p className="text-lg md:text-xl text-opacity-70 max-w-3xl mx-auto font-normal leading-relaxed">
                        {sec.subtitle}
                      </p>
                    )}
                    {sec.ctaText && (
                      <div className="pt-4">
                        <Button
                          onClick={onPurchase}
                          className="h-14 px-12 text-base font-semibold rounded-[var(--component-radius)]"
                          style={{ backgroundColor: btnBg, color: btnText }}
                        >
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                  {sec.videoUrl ? (
                    <div className="mt-14 mx-auto w-full max-w-5xl">
                      <SecureVideoPlayer videoUrl={sec.videoUrl} />
                    </div>
                  ) : sec.imageUrl ? (
                    <div className="mt-14 mx-auto w-full max-w-5xl aspect-[16/6] overflow-hidden" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)' }}>
                      <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
                    </div>
                  ) : null}
                </section>
              );
            }
            if (isTechB2b) {
              return (
                <section key={sec.id} className="relative py-[var(--section-padding)] overflow-hidden px-6">
                  <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                    <div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left">
                      {sec.kicker && (
                        <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                          {sec.kicker}
                        </span>
                      )}
                      <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight leading-[1.1]" style={{ color: pageFg }}>
                        {sec.title}
                      </h1>
                      {sec.subtitle && (
                        <p className="text-lg md:text-xl text-opacity-70 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
                          {sec.subtitle}
                        </p>
                      )}
                      {sec.micro && (
                        <p className="font-mono text-sm text-opacity-60">{sec.micro}</p>
                      )}
                      {sec.ctaText && (
                        <div className="flex justify-center lg:justify-start pt-2">
                          <Button onClick={onPurchase} className="h-14 px-12 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                            {sec.ctaText}
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="w-full lg:w-1/2">
                      {sec.videoUrl ? (
                        <SecureVideoPlayer videoUrl={sec.videoUrl} />
                      ) : sec.imageUrl ? (
                        <div className="overflow-hidden bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)', boxShadow: 'var(--component-shadow)' }}>
                          <img src={sec.imageUrl} alt={sec.title || "Dashboard"} className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
                        </div>
                      ) : (
                        <div className="aspect-[4/3] bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)', boxShadow: 'var(--component-shadow)' }} />
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isExecutiveDark) {
              return (
                <section key={sec.id} className="relative py-[var(--section-padding)] overflow-hidden px-6">
                  <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                    <div className="w-full md:w-3/5 space-y-6 text-center md:text-left">
                      {sec.kicker && (
                        <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                          {sec.kicker}
                        </span>
                      )}
                      <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight leading-[1.05]" style={{ color: pageFg }}>
                        {sec.title}
                      </h1>
                      {sec.subtitle && (
                        <p className="text-lg md:text-xl text-opacity-70 max-w-xl mx-auto md:mx-0 font-normal leading-relaxed">
                          {sec.subtitle}
                        </p>
                      )}
                      {sec.ctaText && (
                        <div className="flex justify-center md:justify-start pt-2">
                          <Button onClick={onPurchase} className="h-14 px-12 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                            {sec.ctaText}
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="w-full md:w-2/5">
                      {sec.videoUrl ? (
                        <SecureVideoPlayer videoUrl={sec.videoUrl} />
                      ) : sec.imageUrl ? (
                        <div className="overflow-hidden bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)' }}>
                          <img src={sec.imageUrl} alt={sec.title || "Visual"} className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
                        </div>
                      ) : (
                        <div className="aspect-square bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)' }} />
                      )}
                    </div>
                  </div>
                </section>
              );
            }
            if (isLuxurySerif) {
              return (
                <section key={sec.id} className="relative py-[var(--section-padding)] overflow-hidden px-6 text-center">
                  <div className="max-w-3xl mx-auto space-y-8">
                    {sec.kicker && (
                      <span className="inline-block text-xs font-medium uppercase tracking-[0.3em]" style={{ color: accentColor }}>
                        {sec.kicker}
                      </span>
                    )}
                    <h1 className="font-headline font-medium text-5xl md:text-7xl leading-[1.05] tracking-tight" style={{ color: pageFg }}>
                      {sec.title}
                    </h1>
                    {sec.subtitle && (
                      <p className="text-lg md:text-xl text-opacity-60 max-w-2xl mx-auto font-light leading-relaxed">
                        {sec.subtitle}
                      </p>
                    )}
                    {sec.ctaText && (
                      <div className="flex justify-center pt-2">
                        <Button onClick={onPurchase} className="h-14 px-14 text-sm font-medium tracking-[0.08em] uppercase" style={{ borderRadius: 'var(--component-radius)', border: '1px solid ' + primaryColor, backgroundColor: 'transparent', color: primaryColor }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                  {sec.videoUrl ? (
                    <div className="mt-16 mx-auto w-full max-w-4xl">
                      <SecureVideoPlayer videoUrl={sec.videoUrl} />
                    </div>
                  ) : sec.imageUrl ? (
                    <div className="mt-16 mx-auto w-full max-w-4xl overflow-hidden" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)' }}>
                      <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
                    </div>
                  ) : null}
                </section>
              );
            }
            if (isEditorial) {
              return (
                <section key={sec.id} className="relative py-[var(--section-padding)] overflow-hidden px-6">
                  <div className="max-w-6xl mx-auto">
                    <div className="max-w-4xl">
                      <h1 className="font-headline font-bold text-5xl md:text-7xl leading-[1.05] tracking-tight" style={{ color: pageFg }}>
                        {sec.title}
                      </h1>
                    </div>
                    <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
                      <div className="lg:col-span-5 space-y-6">
                        {sec.subtitle && (
                          <p className="text-lg md:text-xl text-opacity-70 font-normal leading-relaxed">
                            {sec.subtitle}
                          </p>
                        )}
                        {sec.ctaText && (
                          <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                            {sec.ctaText}
                          </Button>
                        )}
                      </div>
                      <div className="lg:col-span-7">
                        {sec.videoUrl ? (
                          <SecureVideoPlayer videoUrl={sec.videoUrl} />
                        ) : sec.imageUrl ? (
                          <div className="overflow-hidden bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)' }}>
                            <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-12 border-t pt-4 text-xs uppercase tracking-[0.2em] text-opacity-50">
                      {sec.micro || sec.badge || 'Línea de detalle'}
                    </div>
                  </div>
                </section>
              );
            }
            if (isModernClean) {
              return (
                <section key={sec.id} className="relative py-[var(--section-padding)] overflow-hidden px-6">
                  <div className="max-w-3xl mx-auto text-center space-y-6">
                    {sec.badge && (
                      <span className="inline-block text-xs font-semibold px-3 py-1" style={{ borderRadius: '999px', backgroundColor: hexToRgba(accentColor, 0.12), color: accentColor }}>
                        {sec.badge}
                      </span>
                    )}
                    <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight leading-[1.1]" style={{ color: pageFg }}>
                      {sec.title}
                    </h1>
                    {sec.subtitle && (
                      <p className="text-lg md:text-xl text-opacity-70 max-w-xl mx-auto font-normal leading-relaxed">
                        {sec.subtitle}
                      </p>
                    )}
                    {sec.ctaText && (
                      <div className="flex flex-wrap justify-center gap-4 pt-2">
                        <Button onClick={onPurchase} className="h-14 px-12 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>
                          {sec.ctaText}
                        </Button>
                        {sec.micro && (
                          <button onClick={onPurchase} className="h-14 px-8 text-base font-semibold rounded-[var(--component-radius)]" style={{ border: 'var(--component-border)', color: primaryColor, backgroundColor: 'transparent' }}>
                            {sec.micro}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {sec.videoUrl ? (
                    <div className="mt-14 mx-auto w-full max-w-4xl">
                      <SecureVideoPlayer videoUrl={sec.videoUrl} />
                    </div>
                  ) : sec.imageUrl ? (
                    <div className="mt-14 mx-auto w-full max-w-4xl overflow-hidden rounded-[var(--component-radius)]" style={{ border: 'var(--component-border)', boxShadow: 'var(--component-shadow)' }}>
                      <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
                    </div>
                  ) : null}
                </section>
              );
            }
            if (isLaunchCountdown) {
              return (
                <section key={sec.id} className="relative py-[var(--section-padding)] overflow-hidden px-6">
                  <div className="max-w-3xl mx-auto text-center space-y-6">
                    {sec.kicker && (
                      <span className="inline-block font-mono text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: accentColor }}>
                        {sec.kicker}
                      </span>
                    )}
                    <h1 className="text-5xl md:text-7xl font-headline font-black tracking-tight leading-[1.0]" style={{ color: pageFg }}>
                      {sec.title}
                    </h1>
                    {sec.subtitle && (
                      <p className="text-lg md:text-xl text-opacity-75 max-w-2xl mx-auto font-normal leading-relaxed">
                        {sec.subtitle}
                      </p>
                    )}
                    {page.activeUntil && (
                      <div className="flex justify-center pt-2">
                        <FlashCountdown activeUntil={page.activeUntil} shadowColor={hexToRgba(accentColor, 0.35)} boxBg={accentColor} boxText={onAccent} boxBorder={accentColor} labelColor={onAccent} />
                      </div>
                    )}
                    {sec.ctaText && (
                      <div className="flex justify-center pt-4">
                        <Button onClick={onPurchase} className="h-14 px-14 text-base font-bold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText, boxShadow: `0 0 30px ${hexToRgba(btnBg, 0.5)}` }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                  {sec.videoUrl ? (
                    <div className="mt-14 mx-auto w-full max-w-4xl">
                      <SecureVideoPlayer videoUrl={sec.videoUrl} />
                    </div>
                  ) : sec.imageUrl ? (
                    <div className="mt-14 mx-auto w-full max-w-4xl overflow-hidden" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)', boxShadow: `0 0 40px ${hexToRgba(accentColor, 0.15)}` }}>
                      <img src={sec.imageUrl} alt={sec.title || "Teaser"} className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
                    </div>
                  ) : null}
                </section>
              );
            }
            if (isExecutiveDark || isLuxurySerif || isEditorial) {
              const serif = isLuxurySerif || isEditorial;
              return (
                <section key={sec.id} className="relative py-[var(--section-padding)] overflow-hidden px-6">
                  {isExecutiveDark && (
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(1px 1px at 15% 20%, ${hexToRgba(accentColor, 0.35)} 50%, transparent 50%), radial-gradient(1px 1px at 85% 65%, ${hexToRgba(accentColor, 0.2)} 50%, transparent 50%)`, backgroundSize: '220px 220px' }} />
                  )}
                  <div className={cn("relative z-10", isExecutiveDark ? "max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16" : serif ? "max-w-3xl mx-auto space-y-6" : "")}>
                    <div className={cn(isExecutiveDark ? "w-full lg:w-1/2 space-y-6 text-center lg:text-left" : "text-center space-y-6")}>
                      {sec.kicker && (
                        <span className={cn("inline-block text-xs font-semibold uppercase", isExecutiveDark ? "font-mono tracking-[0.22em]" : "tracking-[0.28em]")} style={{ color: accentColor }}>
                          {sec.kicker}
                        </span>
                      )}
                      <h1 className={cn("font-headline tracking-tight leading-[1.1]", isExecutiveDark ? "text-4xl md:text-6xl font-black" : isEditorial ? "text-5xl md:text-7xl font-black" : "text-5xl md:text-6xl font-medium")} style={{ color: pageFg }}>
                        {sec.title}
                      </h1>
                      {isLuxurySerif && <div className="mx-auto w-16" style={{ borderTop: '2px solid ' + accentColor }} />}
                      {sec.subtitle && (
                        <p className={cn("leading-relaxed", isExecutiveDark ? "text-lg md:text-xl text-opacity-70 max-w-xl mx-auto lg:mx-0" : isEditorial ? "text-lg md:text-xl text-opacity-75 max-w-2xl mx-auto" : "text-lg md:text-xl text-opacity-60 max-w-2xl mx-auto font-light")}>
                          {sec.subtitle}
                        </p>
                      )}
                      {sec.micro && (
                        <p className={cn("text-sm", isExecutiveDark ? "font-mono text-opacity-60" : isLuxurySerif ? "text-opacity-50 font-light uppercase tracking-[0.18em] text-xs" : "text-opacity-60")}>{sec.micro}</p>
                      )}
                      {sec.ctaText && (
                        <div className={cn("flex", isExecutiveDark || serif ? "justify-center" : "justify-center", isExecutiveDark && "lg:justify-start", "pt-2")}>
                          <Button onClick={onPurchase} className={cn("h-14 rounded-[var(--component-radius)]", isExecutiveDark ? "px-12 text-base font-semibold" : isLuxurySerif ? "px-12 text-sm font-medium tracking-[0.08em] uppercase" : "px-12 text-base font-semibold")} style={isLuxurySerif ? { border: '1px solid ' + pageFg, backgroundColor: 'transparent', color: pageFg } : { backgroundColor: btnBg, color: btnText, boxShadow: isExecutiveDark ? `0 0 30px ${hexToRgba(btnBg, 0.4)}` : undefined }}>
                            {sec.ctaText}
                          </Button>
                        </div>
                      )}
                    </div>
                    {isExecutiveDark && (sec.imageUrl || sec.videoUrl) && (
                      <div className="w-full lg:w-1/2">
                        {sec.videoUrl ? (
                          <SecureVideoPlayer videoUrl={sec.videoUrl} />
                        ) : (
                          <div className="overflow-hidden" style={{ border: '1px solid ' + hexToRgba(accentColor, 0.4), borderRadius: 'var(--component-radius)', boxShadow: `0 0 44px ${hexToRgba(accentColor, 0.22)}` }}>
                            <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full aspect-[4/3] object-cover" loading="eager" fetchPriority="high" decoding="async" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {serif && !isExecutiveDark && (sec.videoUrl || sec.imageUrl) && (
                    <div className="mt-14 mx-auto w-full max-w-4xl">
                      {sec.videoUrl ? (
                        <SecureVideoPlayer videoUrl={sec.videoUrl} />
                      ) : (
                        <div className="overflow-hidden" style={{ border: isEditorial ? '4px solid ' + accentColor : '1px solid var(--component-border)', borderRadius: 'var(--component-radius)' }}>
                          <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full aspect-[16/7] object-cover" loading="eager" fetchPriority="high" decoding="async" />
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            }
            return (
              <section key={sec.id} className="relative py-[var(--section-padding)] overflow-hidden flex flex-col items-center text-center px-6">
                <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-black font-headline tracking-tight leading-[1.1]" style={{ color: pageFg }}>
                    {sec.title}
                  </h1>
                  {sec.subtitle && (
                    <p className="text-xl md:text-2xl text-opacity-80 max-w-2xl mx-auto font-medium">
                      {sec.subtitle}
                    </p>
                  )}
                  {sec.videoUrl ? (
                    <div className="mt-12 mx-auto w-full max-w-4xl">
                      <SecureVideoPlayer videoUrl={sec.videoUrl} />
                    </div>
                  ) : sec.imageUrl ? (
                    <div className="mt-12 mx-auto w-full max-w-4xl overflow-hidden rounded-[var(--component-radius)] relative bg-[var(--surface-muted)]" style={{ border: 'var(--component-border)', boxShadow: 'var(--component-shadow)' }}>
                      <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
                    </div>
                  ) : null}
                  <div className="pt-8">
                    <Button
                      onClick={onPurchase}
                      className="h-16 px-12 text-xl font-bold rounded-[var(--component-radius)] hover:scale-105 transition-transform"
                      style={{ backgroundColor: btnBg, color: btnText }}
                    >
                      {sec.ctaText || 'Inscribirme Ahora'}
                    </Button>
                  </div>
                </div>
              </section>
            );

}
