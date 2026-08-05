'use client';

import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getLandingStyle } from '@/lib/landing-styles';
import { Play, ShieldCheck, Instagram, Linkedin, Youtube, MessageCircle, Globe, Phone } from 'lucide-react';

// TikTok icon inline (not in lucide)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

// Twitter/X icon inline
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export function AtomicRenderer({ page, onPurchase, mentorProfile }: { page: any; onPurchase: () => void; mentorProfile?: any }) {
  const designTokens = page.content?.designTokens || {};
  const styleTokens = designTokens.styleTokens || {};
  const primaryColor = designTokens.primary || page.branding?.primaryColor || '#3B2D86';
  const secondaryColor = designTokens.secondary || page.branding?.secondaryColor || '#F1F5F9';
  const accentColor = designTokens.accent || '#FACC15';
  const themeMode = styleTokens.themeMode || designTokens.themeMode || 'light';
  const isDark = themeMode === 'dark';
  const isGlass = themeMode === 'glass';
  // Estilo + flags: declarados antes de extraTokens/sectionBgAlt que los consumen.
  const styleDefinition = getLandingStyle(page.styleId || 'classic');
  const styleId = styleDefinition?.id || 'classic';
  const isClassic = styleId === 'classic';
  const isFlashSale = styleId === 'flash-sale';
  const isCorporate = styleId === 'corporate';
  const isTechB2b = styleId === 'tech-b2b';
  const isExecutiveDark = styleId === 'executive-dark';
  const isLuxurySerif = styleId === 'luxury-serif';
  const isEditorial = styleId === 'editorial';
  const isModernClean = styleId === 'modern-clean';
  const isLaunchCountdown = styleId === 'launch-countdown';
  // Paleta → semántica de página: light usa secondary como fondo y primary como tinta;
  // dark/glass usan primary como fondo y secondary como tinta (misma semántica que la demo flash-sale).
  const pageBg = isDark || isGlass ? primaryColor : secondaryColor;
  const pageFg = isDark || isGlass ? secondaryColor : primaryColor;
  const surfaceMuted = hexToRgba(pageFg, isDark || isGlass ? 0.07 : 0.06);
  // Fuente de verdad de tokens: page.styleTokens (brand/runtime) → styleDefinition.tokens (catálogo).
  // No hay literales genéricos: si falta en runtime cae al token del catálogo (siempre declarado).
  const styleBase = (styleDefinition?.tokens as any) || {};
  const componentRadius = styleTokens.componentRadius || styleBase.componentRadius;
  const componentBorder = styleTokens.componentBorder || styleBase.componentBorder;
  const componentShadow = styleTokens.componentShadow || styleBase.componentShadow;
  const componentBg = styleTokens.componentBg || styleBase.componentBg;
  const sectionPadding = styleTokens.sectionPadding || styleBase.sectionPadding;
  const contentGap = styleTokens.contentGap || styleBase.contentGap;
  const transitionDuration = styleTokens.transitionDuration || styleBase.transitionDuration;
  const extraTokens = styleTokens.extraTokens || styleBase.extraTokens || {};
  const ctaShadow = extraTokens.ctaShadow || `0 10px 0 ${primaryColor}`;
  const buttonRadius = extraTokens.buttonRadius || componentRadius;
  const buttonStyle = extraTokens.buttonStyle || styleBase.extraTokens?.buttonStyle;
  const headingWeight = extraTokens.headingWeight || styleBase.extraTokens?.headingWeight;
  const headingTracking = extraTokens.headingLetterSpacing || styleBase.extraTokens?.headingLetterSpacing;
  const sectionBgAlt = extraTokens.sectionBgAlternate || styleBase.extraTokens?.sectionBgAlternate || surfaceMuted;
  const onDark = '#FFFFFF';
  const fontHeading = designTokens.typography?.headingFont || 'Inter';
  const fontMono = designTokens.styleTokens?.fontMono || '"JetBrains Mono", ui-monospace, monospace';
  // Tokens extra declarados pero no inyectados: exponerlos al markup vía CSS vars (plan §2.2.5).
  const overlayOpacity = extraTokens.overlayOpacity || '0.55';
  const mutedAlpha = parseFloat(overlayOpacity);
  const fg2Color = hexToRgba(pageFg, !isNaN(mutedAlpha) ? mutedAlpha : 0.55);
  const mutedColor = hexToRgba(pageFg, !isNaN(mutedAlpha) ? mutedAlpha * 0.7 : 0.47);
  const overlayColor = hexToRgba(pageBg, !isNaN(mutedAlpha) ? mutedAlpha : 0.55);
  // Resolución token-driven del overlay hero: prioriza gradientOverlay real, si no 'none'/vacio usa opacidad declarada.
  const hasGradientOverlay = !!extraTokens.gradientOverlay && extraTokens.gradientOverlay !== 'none';
  const heroOverlay = hasGradientOverlay ? String(extraTokens.gradientOverlay) : `linear-gradient(to top, ${overlayColor}, transparent)`;
  // Mapeo dinámico: cualquier extra token declarado → --<kebab-case>. Nuevos tokens = no edits en renderer.
  const styleVars: Record<string, string> = {
    ...(extraTokens.gradientOverlay ? { '--hero-overlay': extraTokens.gradientOverlay } : {}),
    ...(extraTokens.containerMaxWidth ? { '--container-max': extraTokens.containerMaxWidth } : {}),
    ...(extraTokens.navbarHeight ? { '--navbar-height': extraTokens.navbarHeight } : {}),
    ...(extraTokens.overlayOpacity ? { '--overlay-opacity': extraTokens.overlayOpacity } : {}),
  };
  Object.entries(extraTokens).forEach(([k, v]) => {
    const kebab = k.replace(/([A-Z])/g, '-$1').replace(/^-/, '').toLowerCase();
    styleVars[`--${kebab}`] = String(v);
  });
  const cardStyle = {
    background: componentBg,
    border: componentBorder,
    boxShadow: componentShadow,
    borderRadius: componentRadius,
  } as React.CSSProperties;
  const allSections = [...(page.content?.sections || [])];
  // Botón CTA primario: en dark usa el accent (visible sobre fondo oscuro); en light usa primary (tinta).
  const btnBg = isDark || isGlass ? accentColor : primaryColor;
  const btnText = contrastTextOn(btnBg);
  const onAccent = contrastTextOn(accentColor);
  const onPrimary = contrastTextOn(primaryColor);
  // Footer: fondo "tinta" (contraste sobre la página) + texto con contraste.
  const footerBg = isDark || isGlass ? secondaryColor : primaryColor;
  const footerText = contrastTextOn(footerBg);
  
  // Extraer el footer si existe para no renderizarlo en el flujo normal
  const footerSection = allSections.find((s: any) => s.id.startsWith('footer'));
  const regularSections = allSections.filter((s: any) => !s.id.startsWith('footer'));

  const sections = regularSections.sort((a: any, b: any) => {
    const aBase = a.id.split('_')[0];
    const bBase = b.id.split('_')[0];
    const aIdx = styleDefinition?.availableSections?.findIndex(s => s.id === aBase) ?? 999;
    const bIdx = styleDefinition?.availableSections?.findIndex(s => s.id === bBase) ?? 999;
    return aIdx - bIdx;
  });

  return (
    <div
      className={cn("w-full flex flex-col font-body", isFlashSale ? "bg-[var(--bg)] text-[var(--fg)]" : "bg-[var(--page-bg)] text-[var(--page-fg)]")}
      style={{
        ['--page-bg' as any]: pageBg,
        ['--page-fg' as any]: pageFg,
        ['--primary' as any]: primaryColor,
        ['--secondary' as any]: secondaryColor,
        ['--accent' as any]: accentColor,
        ['--component-radius' as any]: componentRadius,
        ['--component-border' as any]: componentBorder,
        ['--component-shadow' as any]: componentShadow,
        ['--component-bg' as any]: componentBg,
        ['--section-padding' as any]: sectionPadding,
        ['--content-gap' as any]: contentGap,
         ['--transition-duration' as any]: transitionDuration,
         ['--surface-muted' as any]: surfaceMuted,
         ['--section-alt' as any]: sectionBgAlt,
        ['--on-dark' as any]: onDark,
        ['--cta-shadow' as any]: ctaShadow,
        ['--radius-pill' as any]: buttonRadius,
        ['--font-display' as any]: `${fontHeading}, system-ui, sans-serif`,
        ['--font-mono' as any]: fontMono,
        ['--hero-overlay' as any]: heroOverlay,
        ['--hero-overlay-color' as any]: overlayColor,
        ...styleVars,
        ...(isFlashSale ? {
          ['--bg' as any]: secondaryColor,
          ['--surface' as any]: componentBg,
          ['--fg' as any]: primaryColor,
          ['--fg-2' as any]: fg2Color,
          ['--muted' as any]: mutedColor,
          ['--border' as any]: primaryColor,
          ['--accent-text' as any]: darkenHex(accentColor, 0.22),
          ['--cta-shadow' as any]: `0 10px 0 ${primaryColor}`,
          ['--radius-pill' as any]: '999px',
          ['--accent-muted' as any]: darkenHex(accentColor, 0.08),
        } : {})
      }}
    >
      <style>{`
        @keyframes od-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .od-marquee-track { animation: none !important; } }

        /* ===== Flash Sale (demo Ébano y Naranja) ===== */
        .od-fs-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          font-family: var(--font-display); font-weight: 800;
          text-transform: uppercase; letter-spacing: .02em;
          font-size: 16px; padding: 20px 34px;
          border-radius: var(--radius-pill);
          border: 3px solid var(--fg);
          cursor: pointer; transition: transform .12s ease, box-shadow .12s ease, background .12s ease, color .12s ease;
          position: relative; outline: none; text-align: center;
        }
        .od-fs-btn-primary { background: var(--accent); color: var(--fg); box-shadow: var(--cta-shadow); }
        .od-fs-btn-primary:hover { transform: translateY(2px); box-shadow: 0 7px 0 var(--fg); background: var(--accent-muted); }
        .od-fs-btn-primary:active { transform: translateY(6px); box-shadow: 0 0 0 var(--fg); }
        .od-fs-btn-dark { background: var(--fg); color: var(--on-dark); box-shadow: var(--cta-shadow); }
        .od-fs-btn-dark:hover { transform: translateY(2px); box-shadow: 0 7px 0 var(--accent-text); background: var(--fg-2); }
        .od-fs-btn-dark:active { transform: translateY(6px); box-shadow: 0 0 0 var(--fg); }
        .od-fs-btn-ghost { background: transparent; color: var(--fg); }
        .od-fs-btn-ghost:hover { background: var(--fg); color: var(--on-dark); }
        .od-fs-card { border: 3px solid var(--fg); border-radius: var(--component-radius); background: var(--surface); }
        .od-fs-card-lift { transition: transform .18s ease, box-shadow .18s ease; }
        .od-fs-card-lift:hover { transform: translateY(-6px); }
        .od-fs-kicker { font-family: var(--font-mono); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600; color: var(--accent-text); margin-bottom: 8px; display: inline-block; }
        .od-fs-heading { font-family: var(--font-display); font-weight: 800; text-transform: uppercase; letter-spacing: -.02em; line-height: 1.08; color: var(--fg); }
        .od-fs-topbar { background: var(--fg); color: var(--on-dark); }
      `}</style>
      {sections.map((sec: any, index: number) => {
        const baseId = sec.id.split('_')[0];

        switch (baseId) {
          case 'heroVideo':
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
                        <img src={heroImg} alt={sec.title || "Oferta"} className="w-full h-[420px] md:h-[560px] object-cover" />
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
                      <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full h-full object-cover" />
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
                          <img src={sec.imageUrl} alt={sec.title || "Dashboard"} className="w-full h-full object-cover" />
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
                          <img src={sec.imageUrl} alt={sec.title || "Visual"} className="w-full h-full object-cover" />
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
                      <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full h-full object-cover" />
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
                            <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full h-full object-cover" />
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
                      <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full h-full object-cover" />
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
                      <img src={sec.imageUrl} alt={sec.title || "Teaser"} className="w-full h-full object-cover" />
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
                            <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full aspect-[4/3] object-cover" />
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
                          <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full aspect-[16/7] object-cover" />
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
                  {sec.imageUrl && !sec.videoUrl && (
                    <div className="mx-auto w-full max-w-3xl overflow-hidden" style={cardStyle}>
                      <img src={sec.imageUrl} alt={sec.title || "Oferta"} className="w-full aspect-video object-cover" />
                    </div>
                  )}
                  {sec.videoUrl ? (
                    <div className="mt-12 mx-auto w-full max-w-4xl">
                      <SecureVideoPlayer videoUrl={sec.videoUrl} />
                    </div>
                  ) : sec.imageUrl ? (
                    <div className="mt-12 mx-auto w-full max-w-4xl overflow-hidden rounded-[var(--component-radius)] relative bg-[var(--surface-muted)]" style={{ border: 'var(--component-border)', boxShadow: 'var(--component-shadow)' }}>
                      <img src={sec.imageUrl} alt={sec.title || "Hero"} className="w-full h-full object-cover" />
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

          case 'narrativeSections':
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
            const isEven = index % 2 === 0;
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
                          <img src={sec.imageUrl} alt={sec.title || "Datos"} className="w-full h-full object-cover" />
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
                        <img src={sec.imageUrl} alt={sec.title || "Imagen narrativa"} className="w-full h-full object-cover" />
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

          case 'syllabus':
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

          case 'benefits':
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

          case 'faqs':
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

          case 'mentorProfile':
            if (isCorporate) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6 bg-[var(--surface-muted)]">
                  <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                    {sec.imageUrl && (
                      <div className="w-full md:w-2/5">
                        <div className="relative aspect-[4/5] rounded-[var(--component-radius)] overflow-hidden bg-[var(--component-bg)]" style={{ border: 'var(--component-border)' }}>
                          <img src={sec.imageUrl} alt={sec.title || "Equipo docente"} className="w-full h-full object-cover" />
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
                          <img src={sec.imageUrl} alt={sec.title || "Mentor"} className={cn("w-full h-full object-cover", grayscale && "grayscale")} />
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
                          <img src={sec.imageUrl} alt={sec.title || "Mentor"} className="w-full h-full object-cover" />
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
                          <img src={sec.imageUrl} alt={sec.title || "Mentor"} className="w-full h-full object-cover" />
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
                        <img src={sec.imageUrl} alt={sec.title || "Mentor Profile"} className="w-full h-full object-cover" />
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

          case 'testimonials':
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

          case 'bonuses':
            if (isFlashSale) {
              return (
                <section key={sec.id} className="py-16 md:py-24 px-6" style={{ background: 'var(--bg)' }}>
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-10">
                      {sec.kicker && <span className="od-fs-kicker">{sec.kicker}</span>}
                      {sec.title && <h2 className="od-fs-heading text-3xl md:text-5xl">{sec.title}</h2>}
                      {sec.content && <p className="mt-3 max-w-[52ch] mx-auto leading-relaxed" style={{ color: 'var(--muted)' }}>{sec.content}</p>}
                    </div>
                    
                    <div className={cn("flex flex-col md:flex-row items-center gap-10 md:gap-12", index % 2 === 1 && "md:flex-row-reverse")}>
                      {sec.imageUrl && (
                        <div className="w-full md:w-2/5 flex-shrink-0 aspect-[4/5] overflow-hidden" style={{ borderRadius: 'var(--component-radius)', boxShadow: 'var(--component-shadow)' }}>
                          <img src={sec.imageUrl} alt={sec.title || 'Bonus'} className="w-full h-full object-cover" />
                        </div>
                      )}
                      
                      <div className={cn("w-full", sec.imageUrl ? "md:w-3/5 grid grid-cols-1 sm:grid-cols-2 gap-6" : "grid grid-cols-1 md:grid-cols-3 gap-6")}>
                        {sec.bullets?.map((bullet: string, i: number) => {
                          const [bName, ...bDescArr] = bullet.split(':');
                          const bDesc = bDescArr.join(':');
                          return (
                            <div key={i} className="od-fs-card overflow-hidden od-fs-card-lift flex flex-col justify-center p-5 md:p-6" style={{ boxShadow: 'var(--component-shadow)' }}>
                              <div className="mb-4">
                                <span className="font-headline font-black uppercase text-[11px] px-3 py-1 rounded-full border-2" style={{ background: 'var(--accent)', color: 'var(--fg)', borderColor: 'var(--fg)' }}>
                                  {sec.badgeText || 'GRATIS'}
                                </span>
                              </div>
                              {bName && <h3 className="text-xl font-headline font-bold leading-snug" style={{ color: 'var(--fg)' }}>{bName}</h3>}
                              {bDesc && <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{bDesc}</p>}
                              {(sec.oldValues?.[i] || sec.newValues?.[i]) && (
                                <div className="mt-4 font-mono text-[13px]">
                                  {sec.oldValues?.[i] && <s className="mr-2" style={{ color: 'var(--muted)' }}>{sec.oldValues[i]}</s>}
                                  {sec.newValues?.[i] && <b style={{ color: 'var(--accent-text)' }}>{sec.newValues[i]}</b>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
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
                  <div className="max-w-5xl mx-auto space-y-12">
                    <div className="text-center space-y-4">
                      {sec.kicker && (
                        <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                          {sec.kicker}
                        </span>
                      )}
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="text-opacity-70 max-w-2xl mx-auto leading-relaxed">{sec.content}</p>}
                    </div>
                    
                    <div className={cn("flex flex-col md:flex-row items-center gap-10 md:gap-12", index % 2 === 1 && "md:flex-row-reverse")}>
                      {sec.imageUrl && (
                        <div className="w-full md:w-2/5 flex-shrink-0 aspect-[4/5] overflow-hidden" style={{ borderRadius: 'var(--component-radius)' }}>
                          <img src={sec.imageUrl} alt={sec.title || 'Bonus'} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className={cn("w-full space-y-4", sec.imageUrl ? "md:w-3/5" : "")}>
                        {sec.bullets?.map((bullet: string, i: number) => {
                          const [bName, ...bDescArr] = bullet.split(':');
                          const bDesc = bDescArr.join(':');
                          return (
                            <div key={i} className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)' }}>
                              <div className="flex-1 text-center sm:text-left">
                                {bName && <h3 className="text-lg font-bold" style={{ color: pageFg }}>{bName}</h3>}
                                {bDesc && <p className="mt-1 text-sm text-opacity-70 leading-relaxed">{bDesc}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {sec.ctaText && (
                      <div className="flex justify-center">
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
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-5xl mx-auto space-y-10">
                    <div className="text-center space-y-4">
                      {sec.kicker && <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>{sec.kicker}</span>}
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="text-opacity-70 max-w-2xl mx-auto leading-relaxed">{sec.content}</p>}
                    </div>
                    
                    <div className={cn("flex flex-col md:flex-row items-center gap-10 md:gap-12", index % 2 === 1 && "md:flex-row-reverse")}>
                      {sec.imageUrl && (
                        <div className="w-full md:w-2/5 flex-shrink-0 aspect-[4/5] overflow-hidden" style={{ borderRadius: 'var(--component-radius)' }}>
                          <img src={sec.imageUrl} alt={sec.title || 'Bonus'} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className={cn("w-full space-y-4", sec.imageUrl ? "md:w-3/5" : "")}>
                        {sec.bullets?.map((bullet: string, i: number) => {
                          const [bName, ...bDescArr] = bullet.split(':');
                          const bDesc = bDescArr.join(':');
                          return (
                            <div key={i} className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: 'var(--component-radius)', boxShadow: 'var(--component-shadow)' }}>
                              <span className="font-mono text-sm font-bold flex-shrink-0" style={{ color: accentColor }}>{"0" + (i + 1)}</span>
                              <div className="flex-1 text-center sm:text-left">
                                {bName && <h3 className="text-lg font-bold" style={{ color: pageFg }}>{bName}</h3>}
                                {bDesc && <p className="mt-1 text-sm text-opacity-70 leading-relaxed">{bDesc}</p>}
                                {(sec.oldValues?.[i] || sec.newValues?.[i]) && (
                                  <div className="mt-2 font-mono text-[13px]">
                                    {sec.oldValues?.[i] && <s className="mr-2 text-opacity-50">{sec.oldValues[i]}</s>}
                                    {sec.newValues?.[i] && <b style={{ color: accentColor }}>{sec.newValues[i]}</b>}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {sec.ctaText && (
                      <div className="flex justify-center pt-6">
                        <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>{sec.ctaText}</Button>
                      </div>
                    )}
                  </div>
                </section>
              );
            }
            if (isExecutiveDark || isLuxurySerif || isEditorial) {
              const serif = isLuxurySerif || isEditorial;
              const grayscale = isExecutiveDark;
              const isRight = index % 2 === 1;
              return (
                <section key={sec.id} className={cn("py-[var(--section-padding)] px-6", isExecutiveDark && "bg-[var(--surface-muted)]")}>
                  <div className="max-w-6xl mx-auto space-y-12 lg:space-y-16">
                    {(sec.title || sec.content) && (
                      <div className="text-center">
                        {sec.title && <h2 className={cn("font-headline", serif ? "font-medium text-4xl md:text-5xl" : "font-bold text-3xl md:text-5xl")} style={{ color: pageFg }}>{sec.title}</h2>}
                        {sec.content && <p className={cn("text-opacity-60 leading-relaxed max-w-2xl mx-auto mt-4", serif && "font-light")}>{sec.content}</p>}
                      </div>
                    )}
                    
                    <div className={cn("flex flex-col items-center gap-10 md:gap-16", isRight ? "md:flex-row-reverse" : "md:flex-row")}>
                      {sec.imageUrl && (
                        <div className="w-full md:w-2/5 flex-shrink-0 aspect-[4/5] overflow-hidden bg-[var(--component-bg)]" style={{ border: 'var(--component-border)', borderRadius: serif ? 0 : 'var(--component-radius)' }}>
                          <img src={sec.imageUrl} alt={sec.title || 'Bonus'} className={cn("w-full h-full object-cover", grayscale && "grayscale")} />
                        </div>
                      )}
                      
                      <div className={cn("w-full flex flex-col gap-8 md:gap-10", sec.imageUrl ? "md:w-3/5 text-center md:text-left" : "md:text-center items-center")}>
                        {sec.bullets?.map((bullet: string, i: number) => {
                          const [bName, ...bDescArr] = bullet.split(':');
                          const bDesc = bDescArr.join(':');
                          return (
                            <div key={i} className="flex flex-col justify-center">
                              {serif ? (
                                <>
                                  <div className="mb-2">
                                    <span className="font-headline text-3xl font-light" style={{ color: accentColor }}>·</span>
                                  </div>
                                  {bName && <h3 className="font-headline font-medium text-2xl tracking-wide" style={{ color: pageFg }}>{bName}</h3>}
                                  {bDesc && <p className="mt-3 text-base text-opacity-70 font-light leading-relaxed">{bDesc}</p>}
                                </>
                              ) : (
                                <>
                                  <div className="mb-2">
                                    <span className="font-mono text-xl font-bold" style={{ color: accentColor }}>{"0" + (i + 1)}</span>
                                  </div>
                                  {bName && <h3 className="text-2xl font-bold" style={{ color: pageFg }}>{bName}</h3>}
                                  {bDesc && <p className="mt-2 text-base text-opacity-70 leading-relaxed">{bDesc}</p>}
                                </>
                              )}
                              {(sec.oldValues?.[i] || sec.newValues?.[i]) && (
                                <div className="mt-4 font-mono text-sm">
                                  {sec.oldValues?.[i] && <s className="mr-3 text-opacity-50">{sec.oldValues[i]}</s>}
                                  {sec.newValues?.[i] && <b className="text-lg" style={{ color: accentColor }}>{sec.newValues[i]}</b>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {sec.ctaText && (
                      <div className="flex justify-center pt-8">
                        <Button onClick={onPurchase} className={cn("h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]", serif && "text-sm font-medium tracking-[0.08em] uppercase")} style={isLuxurySerif ? { border: '1px solid ' + pageFg, backgroundColor: 'transparent', color: pageFg } : { backgroundColor: btnBg, color: btnText }}>{sec.ctaText}</Button>
                      </div>
                    )}
                  </div>
                </section>
              );
            }
            if (isModernClean) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-5xl mx-auto space-y-12">
                    <div className="text-center space-y-4">
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-bold" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="text-opacity-70 max-w-2xl mx-auto leading-relaxed">{sec.content}</p>}
                    </div>
                    
                    <div className={cn("flex flex-col md:flex-row items-center gap-10 md:gap-12", index % 2 === 1 && "md:flex-row-reverse")}>
                      {sec.imageUrl && (
                        <div className="w-full md:w-2/5 flex-shrink-0 aspect-[4/5] overflow-hidden" style={{ borderRadius: 'var(--component-radius)' }}>
                          <img src={sec.imageUrl} alt={sec.title || 'Bonus'} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className={cn("w-full space-y-5", sec.imageUrl ? "md:w-3/5" : "")}>
                        {sec.bullets?.map((bullet: string, i: number) => {
                          const [bName, ...bDescArr] = bullet.split(':');
                          const bDesc = bDescArr.join(':');
                          return (
                            <div key={i} className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-[var(--component-bg)] rounded-[var(--component-radius)]" style={{ border: 'var(--component-border)', boxShadow: 'var(--component-shadow)' }}>
                              <div className="flex-1 text-center sm:text-left">
                                <div className="inline-flex items-center gap-2">
                                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: hexToRgba(accentColor, 0.12), color: accentColor }}>BONO {i + 1}</span>
                                  {bName && <h3 className="text-lg font-bold" style={{ color: pageFg }}>{bName}</h3>}
                                </div>
                                {bDesc && <p className="mt-1 text-sm text-opacity-70 leading-relaxed">{bDesc}</p>}
                                {(sec.oldValues?.[i] || sec.newValues?.[i]) && (
                                  <div className="mt-2 font-mono text-[13px]">
                                    {sec.oldValues?.[i] && <s className="mr-2 text-opacity-50">{sec.oldValues[i]}</s>}
                                    {sec.newValues?.[i] && <b style={{ color: accentColor }}>{sec.newValues[i]}</b>}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {sec.ctaText && (
                      <div className="flex justify-center pt-4">
                        <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText }}>{sec.ctaText}</Button>
                      </div>
                    )}
                  </div>
                </section>
              );
            }
            if (isLaunchCountdown) {
              return (
                <section key={sec.id} className="py-[var(--section-padding)] px-6">
                  <div className="max-w-5xl mx-auto space-y-12">
                    <div className="text-center space-y-4">
                      {sec.kicker && <span className="inline-block font-mono text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>{sec.kicker}</span>}
                      {sec.title && <h2 className="text-3xl md:text-5xl font-headline font-black" style={{ color: pageFg }}>{sec.title}</h2>}
                      {sec.content && <p className="text-opacity-75 max-w-2xl mx-auto leading-relaxed">{sec.content}</p>}
                    </div>
                    {sec.imageUrl && (
                      <div className="w-full max-w-4xl mx-auto aspect-[16/9] overflow-hidden rounded-[var(--component-radius)] mb-10" style={{ boxShadow: 'var(--component-shadow)' }}>
                        <img src={sec.imageUrl} alt={sec.title || 'Bonus'} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--content-gap)]">
                      {sec.bullets?.map((bullet: string, i: number) => {
                        const [bName, ...bDescArr] = bullet.split(':');
                        const bDesc = bDescArr.join(':');
                        return (
                          <div key={i} className="p-6 bg-[var(--component-bg)] rounded-[var(--component-radius)] flex flex-col gap-4" style={{ border: 'var(--component-border)', boxShadow: `0 0 28px ${hexToRgba(accentColor, 0.1)}` }}>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-lg font-black" style={{ color: accentColor }}>{"0" + (i + 1)}</span>
                            </div>
                            {bName && <h3 className="text-lg font-bold" style={{ color: pageFg }}>{bName}</h3>}
                            {bDesc && <p className="text-sm text-opacity-70 leading-relaxed">{bDesc}</p>}
                            {(sec.oldValues?.[i] || sec.newValues?.[i]) && (
                              <div className="mt-auto font-mono text-[13px]">
                                {sec.oldValues?.[i] && <s className="mr-2 text-opacity-50">{sec.oldValues[i]}</s>}
                                {sec.newValues?.[i] && <b style={{ color: accentColor }}>{sec.newValues[i]}</b>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {sec.ctaText && (
                      <div className="flex justify-center pt-2">
                        <Button onClick={onPurchase} className="h-14 px-10 text-base font-semibold rounded-[var(--component-radius)]" style={{ backgroundColor: btnBg, color: btnText, boxShadow: `0 0 26px ${hexToRgba(btnBg, 0.5)}` }}>{sec.ctaText}</Button>
                      </div>
                    )}
                  </div>
                </section>
              );
            }
            return (
              <section key={sec.id} className="py-[var(--section-padding)] px-6">
                <div className="max-w-5xl mx-auto space-y-16">
                  <div className="text-center space-y-6">
                    {sec.title && <h2 className="text-4xl md:text-5xl font-black font-headline" style={{ color: accentColor }}>{sec.title}</h2>}
                    {sec.content && <div className={cn("prose prose-lg mx-auto text-opacity-90", isDark && "prose-invert")}>{sec.content}</div>}
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center gap-12 p-8 md:p-12 rounded-[var(--component-radius)] bg-[var(--surface-muted)]" style={{ border: 'var(--component-border)' }}>
                    {sec.imageUrl && (
                      <div className="w-full md:w-5/12 flex-shrink-0">
                        <div className="relative aspect-square rounded-[var(--component-radius)] overflow-hidden transform -rotate-3 hover:rotate-0 transition-all duration-500" style={{ border: 'var(--component-border)' }}>
                          <img src={sec.imageUrl} alt={sec.title || "Bonus"} className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                    <div className="w-full md:w-7/12 space-y-6 text-left">
                      <h3 className="text-2xl font-black uppercase tracking-wider text-opacity-90">Bonus Exclusivo</h3>
                      {sec.bullets && sec.bullets.length > 0 && (
                        <ul className="space-y-4">
                          {sec.bullets.map((bullet: string, i: number) => (
                            <li key={i} className="flex items-start gap-4">
                              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm mt-0.5" style={{ backgroundColor: accentColor, color: contrastTextOn(accentColor) }}>
                                ★
                              </div>
                              <span className="text-lg text-opacity-80 leading-relaxed">{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  
                  {/* Botón de Acción Opcional */}
                  {sec.ctaText && (
                    <div className="flex justify-center pt-8 w-full">
                      <Button onClick={onPurchase} className="h-16 px-12 text-lg md:text-xl font-bold rounded-[var(--component-radius)] transition-transform hover:scale-105" style={{ backgroundColor: btnBg, color: btnText }}>
                        {sec.ctaText}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            );

          case 'offerBanner': {
            if (!page.activeUntil) return null;
            if (isFlashSale) {
              const nowPrice = typeof page.price === 'number' ? page.price : 0;
              const oldPrice = (typeof page.oldPrice === 'number' && page.oldPrice > 0) ? Math.round(page.oldPrice) : (nowPrice > 0 ? Math.round(nowPrice * 2.94) : 0);
              return (
                <div key={sec.id} className="od-fs-topbar w-full sticky top-20 z-40 flex items-center justify-center gap-4 flex-wrap px-4 py-2.5 text-center text-[13px] md:text-sm">
                  <span className="font-mono uppercase tracking-[.08em] font-semibold" style={{ color: 'var(--accent)' }}>{sec.title || sec.content || 'OFERTA RELÁMPAGO'}</span>
                  {nowPrice > 0 && (
                    <span className="font-headline font-semibold">
                      <span className="line-through opacity-60">${oldPrice.toLocaleString('es-AR')}</span>&nbsp;&nbsp;${nowPrice.toLocaleString('es-AR')}
                    </span>
                  )}
                  <span className="font-mono font-semibold px-2 py-0.5 rounded-full text-xs md:text-sm" style={{ background: 'var(--accent)', color: 'var(--fg)' }}>
                    <CompactCountdown activeUntil={page.activeUntil} color="inherit" />
                  </span>
                </div>
              );
            }
            const onAccent = contrastTextOn(accentColor);
            return (
              <div key={sec.id} className="w-full sticky top-20 z-40 flex items-center justify-center gap-4 flex-wrap px-4 py-2.5" style={{ backgroundColor: accentColor, color: onAccent }}>
                <span className="text-xs md:text-sm font-black uppercase tracking-[0.14em]">{sec.title || sec.content || 'OFERTA POR TIEMPO LIMITADO'}</span>
                {page.activeUntil && <CompactCountdown activeUntil={page.activeUntil} color={onAccent} />}
              </div>
            );
          }

          case 'marquee': {
            const marqueeItems = (sec.bullets?.length ? sec.bullets : (sec.content || '').split(/[•·|,;]/).map((s: string) => s.trim()).filter(Boolean));
            if (!marqueeItems.length) return null;
            const marqueeText = contrastTextOn(accentColor);
            const loop = [...marqueeItems, ...marqueeItems];
            if (isFlashSale) {
              return (
                <section key={sec.id} className="relative overflow-hidden select-none border-y-[3px]" aria-hidden style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--fg)' }}>
                  <div className="od-marquee-track flex whitespace-nowrap w-max py-3.5" style={{ animation: 'od-marquee 22s linear infinite' }}>
                    {loop.map((item: string, i: number) => (
                      <span key={i} className="mx-5 font-headline font-black uppercase text-lg tracking-[.02em]" style={{ color: 'var(--fg)' }}>
                        {item}<span className="mx-3 opacity-40">•</span>
                      </span>
                    ))}
                  </div>
                </section>
              );
            }
            return (
              <section key={sec.id} className="relative overflow-hidden py-3 select-none" aria-hidden style={{ backgroundColor: accentColor }}>
                <div className="od-marquee-track flex whitespace-nowrap w-max" style={{ animation: 'od-marquee 24s linear infinite' }}>
                  {loop.map((item: string, i: number) => (
                    <span key={i} className="mx-5 text-xs md:text-sm font-black uppercase tracking-[0.14em]" style={{ color: marqueeText }}>
                      {item}<span className="mx-3 opacity-50">•</span>
                    </span>
                  ))}
                </div>
              </section>
            );
          }

          case 'stats': {
            const statItems = (sec.bullets?.length ? sec.bullets : (sec.content || '').split(/\n|;|·/).map((s: string) => s.trim()).filter(Boolean));
            if (isFlashSale) {
              return (
                <section key={sec.id} className="py-16 md:py-24 px-6" style={{ background: 'var(--bg)' }}>
                  <div className="max-w-6xl mx-auto">
                    {sec.title && <h2 className="od-fs-heading text-3xl md:text-5xl text-center mb-12">{sec.title}</h2>}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                      {statItems.slice(0, 4).map((item: string, i: number) => {
                        const { num, label } = parseStat(item);
                        return (
                          <div key={i} className="od-fs-card px-4 py-6 md:py-8">
                            <div className="text-4xl md:text-[56px] font-black leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>{num}</div>
                            {label && <div className="mt-2 font-mono text-xs md:text-sm uppercase tracking-[.08em]" style={{ color: 'var(--muted)' }}>{label}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            }
            return (
              <section key={sec.id} className="py-[var(--section-padding)] px-6">
                <div className="max-w-6xl mx-auto">
                  {sec.title && <h2 className="text-3xl md:text-5xl font-black font-headline mb-12 text-center" style={{ color: pageFg }}>{sec.title}</h2>}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-[var(--content-gap)] text-center">
                    {statItems.slice(0, 4).map((item: string, i: number) => {
                      const { num, label } = parseStat(item);
                      return (
                        <div key={i} className="space-y-2">
                          <div className="font-mono text-4xl md:text-6xl font-black tracking-tight" style={{ color: accentColor }}>{num}</div>
                          {label && <div className="text-xs md:text-sm font-bold uppercase tracking-[0.1em] opacity-70">{label}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          }

          case 'guarantee':
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

          case 'countdownTimer':
            // Removed strict return null so Oportunidad Reservada can show its content/image even without a date
            if (styleDefinition?.id === 'flash-sale') {
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
                          <img src={sec.imageUrl} alt={sec.title || "Oferta"} className={cn("w-full h-full object-cover", grayscale && "grayscale")} />
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
                    <img src={sec.imageUrl} className="w-full h-full object-cover" alt="Oferta" />
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

          default:
            return (
              <section key={sec.id} className="py-20 px-6 text-center">
                <div className="max-w-3xl mx-auto space-y-6">
                  {sec.title && <h2 className="text-3xl md:text-5xl font-black font-headline mb-8" style={{ color: pageFg }}>{sec.title}</h2>}
                  <div className="whitespace-pre-wrap">{sec.content}</div>
                  {sec.ctaText && (
                    <Button
                      onClick={onPurchase}
                      className="mt-8 h-14 px-8 text-lg font-bold rounded-[var(--component-radius)]"
                      style={{ backgroundColor: btnBg, color: btnText }}
                    >
                      {sec.ctaText}
                    </Button>
                  )}
                </div>
              </section>
            );
        }
      })}

      {/* Footer V2 - Igual al V1 con redes del mentor */}
      {(() => {
        const socials = mentorProfile?.profile?.socials || {};
        const mentorName = mentorProfile?.displayName || page.branding?.name || '';
        const hasCustomFooter = footerSection && footerSection.isVisible !== false;
        const fs = isFlashSale;
        const footerCls = fs
          ? "py-16 px-6 text-center border-t-[3px]"
          : "py-16 px-6 text-center border-t";
        const footerStyle = fs ? { background: 'var(--fg)', color: 'var(--on-dark)' } : { background: footerBg, color: footerText };
        const borderCls = fs ? "border-b-[3px]" : "border-b";
        const borderStyle = fs ? { borderColor: 'rgba(255,255,255,0.16)' } : { borderColor: hexToRgba(footerText, 0.18) };
        const titleCls = fs ? "text-lg font-bold" : "text-lg font-bold";
        const bodyCls = fs ? "text-sm opacity-80 whitespace-pre-wrap max-w-xl mx-auto leading-relaxed" : "text-sm opacity-70 whitespace-pre-wrap max-w-xl mx-auto leading-relaxed";
        const chipCls = fs ? "text-sm font-semibold px-4 py-2 rounded-full border" : "text-sm font-semibold px-4 py-2 rounded-full border";
        const chipStyle = fs ? { borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)' } : { borderColor: hexToRgba(footerText, 0.28), background: hexToRgba(footerText, 0.08) };
        const iconCls = fs ? "h-6 w-6" : "h-6 w-6";
        const legalCls = fs ? "space-y-3 pt-4 border-t text-[11px] opacity-70 leading-relaxed font-mono" : "space-y-3 pt-4 border-t text-[11px] opacity-70 leading-relaxed font-mono";
        const legalStyle = fs ? { borderColor: 'rgba(255,255,255,0.16)' } : { borderColor: hexToRgba(footerText, 0.18) };
        const safeCls = fs ? "text-[10px] font-black uppercase tracking-[0.2em] opacity-70" : "text-[10px] font-black uppercase tracking-[0.2em] opacity-70";
        const copyCls = fs ? "text-xs font-medium opacity-70" : "text-xs font-medium opacity-70";

        return (
          <footer className={footerCls} style={footerStyle}>
            <div className="max-w-4xl mx-auto space-y-10">
              
              {/* Sección editable del tutor */}
              {hasCustomFooter && (
                <div className={`space-y-6 pb-8 ${borderCls}`} style={borderStyle}>
                  {footerSection.title && <h3 className={titleCls}>{footerSection.title}</h3>}
                  {footerSection.content && (
                    <p className={bodyCls}>{footerSection.content}</p>
                  )}
                  {footerSection.bullets && footerSection.bullets.filter(Boolean).length > 0 && (
                    <div className="flex flex-wrap justify-center gap-4">
                      {footerSection.bullets.filter(Boolean).map((b: string, i: number) => (
                        <span key={i} className={chipCls} style={chipStyle}>
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Íconos de redes sociales del mentor (igual que V1) */}
              {Object.values(socials).some(Boolean) && (
                <div className="flex items-center justify-center gap-6">
                  {socials.linkedin && <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Linkedin className={`${iconCls} hover:text-[#0077B5]`} /></a>}
                  {socials.instagram && <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Instagram className={`${iconCls} hover:text-[#E4405F]`} /></a>}
                  {socials.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><XIcon className={`${iconCls} hover:opacity-60`} /></a>}
                  {socials.youtube && <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Youtube className={`${iconCls} hover:text-[#FF0000]`} /></a>}
                  {socials.tiktok && <a href={socials.tiktok} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><TikTokIcon className={`${iconCls} hover:opacity-60`} /></a>}
                  {socials.whatsapp && <a href={`https://wa.me/${socials.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><MessageCircle className={`${iconCls} hover:text-[#25D366]`} /></a>}
                  {socials.website && <a href={socials.website} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Globe className={`${iconCls} hover:opacity-60`} /></a>}
                  {socials.phone && <a href={`tel:${socials.phone}`} className="hover:scale-110 transition-transform"><Phone className={iconCls} /></a>}
                </div>
              )}

              {/* Seguridad y copyright */}
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <span className={safeCls}>Entorno de Aprendizaje Seguro</span>
              </div>
              {mentorName && (
                <p className={copyCls}>© {new Date().getFullYear()} {mentorName}. Todos los derechos reservados.</p>
              )}

              {/* Disclaimer legal de plataforma */}
              <div className={legalCls} style={legalStyle}>
                <p>Este sitio no es parte del sitio web de Meta, Facebook o Facebook Inc. FACEBOOK es una marca comercial de FACEBOOK, Inc.</p>
                <p>Los resultados expuestos no son una promesa ni garantía de ganancias futuras. El éxito requiere esfuerzo, tiempo y dedicación.</p>
              </div>
            </div>
          </footer>
        );
      })()}
    </div>
  );
}

function contrastTextOn(hex?: string): string {
  if (!hex) return '#FFFFFF';
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c: string) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.35 ? '#0E0E0F' : '#FFFFFF';
}

function darkenHex(hex?: string, amt = 0.2): string {
  if (!hex) return '#000000';
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c: string) => c + c).join('');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amt));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amt));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amt));
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgba(hex?: string, alpha = 0.06): string {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c: string) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function parseStat(item: string): { num: string; label: string } {
  const m = item.match(/^(\$?\s*[\d.,]+\s*[%+kKmM]*)\s*(.*)$/);
  if (m && m[1]) {
    return { num: m[1].trim(), label: (m[2] || '').replace(/^[-—–:]+\s*/, '').trim() };
  }
  return { num: item.trim(), label: '' };
}

function useCountdown(activeUntil: any) {
  const [timeLeft, setTimeLeft] = React.useState({ d: 0, h: 0, m: 0, s: 0 });

  React.useEffect(() => {
    if (!activeUntil) return;
    const end = activeUntil.toDate ? activeUntil.toDate() : new Date(activeUntil);
    end.setHours(23, 59, 59, 999);

    const tick = () => {
      const diff = end.getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeUntil]);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return { ...timeLeft, pad };
}

function CompactCountdown({ activeUntil, color }: { activeUntil: any; color?: string }) {
  const { d, h, m, s, pad } = useCountdown(activeUntil);
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs md:text-sm font-bold whitespace-nowrap" style={{ color: color || 'inherit' }}>
      <span>{pad(d)}</span><span>:</span><span>{pad(h)}</span><span>:</span><span>{pad(m)}</span><span>:</span><span>{pad(s)}</span>
    </span>
  );
}

// Countdown estilo demo flash-sale: cajas `.cd-box` (fondo --fg, num display, lab accent)
function FlashCountdown({ activeUntil, shadowColor, boxBg, boxText, boxBorder, labelColor }: { activeUntil: any; shadowColor?: string; boxBg?: string; boxText?: string; boxBorder?: string; labelColor?: string }) {
  const { d, h, m, s, pad } = useCountdown(activeUntil);
  const boxes = [
    { v: pad(d), l: 'Días' },
    { v: pad(h), l: 'Horas' },
    { v: pad(m), l: 'Min' },
    { v: pad(s), l: 'Seg' },
  ];
  return (
    <div className="flex justify-center gap-3 flex-wrap">
      {boxes.map((b, i) => (
        <div
          key={i}
          className="min-w-[84px] px-3 py-4 text-center rounded-[14px] border-[3px]"
          style={{ background: boxBg || 'var(--fg)', color: boxText || 'var(--on-dark)', borderColor: boxBorder || 'var(--fg)', boxShadow: `6px 6px 0 ${shadowColor || 'var(--accent)'}` }}
        >
          <div className="text-3xl md:text-[44px] font-black leading-none" style={{ fontFamily: 'var(--font-display)' }}>{b.v}</div>
          <div className="text-[11px] mt-1 uppercase tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)', color: labelColor || 'var(--accent)' }}>{b.l}</div>
        </div>
      ))}
    </div>
  );
}

function CountdownTimer({ activeUntil }: { activeUntil: any }) {
  const { d, h, m, s, pad } = useCountdown(activeUntil);

  return (
    <div className="flex items-center gap-1 mt-2 justify-center w-full">
      <div className="flex flex-col items-center flex-1">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-[var(--component-radius)] flex items-center justify-center font-bold text-lg md:text-xl shadow-inner border border-white/20 text-white font-mono">{pad(d)}</div>
        <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider mt-1.5 opacity-80 text-white">Días</span>
      </div>
      <div className="text-lg font-bold text-white/40 -mt-5">:</div>
      <div className="flex flex-col items-center flex-1">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-[var(--component-radius)] flex items-center justify-center font-bold text-lg md:text-xl shadow-inner border border-white/20 text-white font-mono">{pad(h)}</div>
        <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider mt-1.5 opacity-80 text-white">Hrs</span>
      </div>
      <div className="text-lg font-bold text-white/40 -mt-5">:</div>
      <div className="flex flex-col items-center flex-1">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-[var(--component-radius)] flex items-center justify-center font-bold text-lg md:text-xl shadow-inner border border-white/20 text-white font-mono">{pad(m)}</div>
        <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider mt-1.5 opacity-80 text-white">Min</span>
      </div>
      <div className="text-lg font-bold text-white/40 -mt-5">:</div>
      <div className="flex flex-col items-center flex-1">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-[var(--component-radius)] flex items-center justify-center font-bold text-lg md:text-xl shadow-inner border border-white/20 text-white font-mono text-danger/30">{pad(s)}</div>
        <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider mt-1.5 opacity-80 text-white">Seg</span>
      </div>
    </div>
  );
}

function SecureVideoPlayer({ videoUrl }: { videoUrl: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const getSecureVideoUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://www.youtube-nocookie.com/embed/${videoId}?controls=0&disablekb=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&enablejsapi=1`;
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      // En Vimeo usar controls=0 para que no salgan los controles, dnt para privacidad
      return `https://player.vimeo.com/video/${videoId}?controls=0&dnt=1`;
    }
    return url;
  };

  const togglePlayback = () => {
    if (!iframeRef.current || !videoUrl) return;

    const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
    const isVimeo = videoUrl.includes('vimeo.com');

    if (isYouTube) {
      const command = isPlaying ? 'pauseVideo' : 'playVideo';
      iframeRef.current.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: command, args: '' }), '*');
    } else if (isVimeo) {
      const command = isPlaying ? 'pause' : 'play';
      iframeRef.current.contentWindow?.postMessage(JSON.stringify({ method: command }), '*');
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div
      className="aspect-video rounded-[var(--component-radius)] overflow-hidden bg-black relative group/video-container select-none" style={{ border: 'var(--component-border)' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        ref={iframeRef}
        className="w-full h-full"
        src={getSecureVideoUrl(videoUrl)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />

      {/* MÁSCARA DE SEGURIDAD TOTAL */}
      <div
        className="absolute inset-0 z-30 bg-transparent cursor-pointer"
        onClick={togglePlayback}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Ocultamiento Superior */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/20 to-transparent pointer-events-auto" />

        {/* Bloqueo Inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-auto cursor-not-allowed" style={{ backgroundImage: 'var(--hero-overlay)' }} />

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 transition-colors">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 transition-transform hover:scale-110">
              <Play className="h-8 w-8 text-white fill-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Marca de Agua */}
      <div className="absolute top-6 left-6 z-40 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-[var(--component-radius)] border border-white/10 opacity-0 group-hover/video-container:opacity-100 transition-opacity">
        <ShieldCheck className="h-3 w-3 text-success" />
        <span className="text-[8px] font-black uppercase text-white tracking-widest">Contenido Protegido • Evolución Académica</span>
      </div>
    </div>
  );
}
