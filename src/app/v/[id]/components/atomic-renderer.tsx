'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { getLandingStyle } from '@/lib/landing-styles';
import {
  SectionRenderContext,
  contrastTextOn,
  darkenHex,
  hexToRgba,
  TikTokIcon,
  XIcon,
  parseStat,
  useCountdown,
  CompactCountdown,
  FlashCountdown,
  CountdownTimer,
  SecureVideoPlayer,
} from './atomic/shared';

// Modular section components with next/dynamic code splitting
export const HeroVideoSection = dynamic(
  () => import('./atomic/sections/hero-video').then((m) => m.HeroVideoSection),
  { ssr: true }
);
export const NarrativeSection = dynamic(
  () => import('./atomic/sections/narrative').then((m) => m.NarrativeSection),
  { ssr: true }
);
export const SyllabusSection = dynamic(
  () => import('./atomic/sections/syllabus').then((m) => m.SyllabusSection),
  { ssr: true }
);
export const BundleGridSection = dynamic(
  () => import('./atomic/sections/bundle-grid').then((m) => m.BundleGridSection),
  { ssr: true }
);
export const BenefitsSection = dynamic(
  () => import('./atomic/sections/benefits').then((m) => m.BenefitsSection),
  { ssr: true }
);
export const FaqsSection = dynamic(
  () => import('./atomic/sections/faqs').then((m) => m.FaqsSection),
  { ssr: true }
);
export const MentorProfileSection = dynamic(
  () => import('./atomic/sections/mentor-profile').then((m) => m.MentorProfileSection),
  { ssr: true }
);
export const TestimonialsSection = dynamic(
  () => import('./atomic/sections/testimonials').then((m) => m.TestimonialsSection),
  { ssr: true }
);
export const BonusesSection = dynamic(
  () => import('./atomic/sections/bonuses').then((m) => m.BonusesSection),
  { ssr: true }
);
export const OfferBannerSection = dynamic(
  () => import('./atomic/sections/offer-banner').then((m) => m.OfferBannerSection),
  { ssr: true }
);
export const MarqueeSection = dynamic(
  () => import('./atomic/sections/marquee').then((m) => m.MarqueeSection),
  { ssr: true }
);
export const StatsSection = dynamic(
  () => import('./atomic/sections/stats').then((m) => m.StatsSection),
  { ssr: true }
);
export const GuaranteeSection = dynamic(
  () => import('./atomic/sections/guarantee').then((m) => m.GuaranteeSection),
  { ssr: true }
);
export const CountdownTimerSection = dynamic(
  () => import('./atomic/sections/countdown-timer').then((m) => m.CountdownTimerSection),
  { ssr: true }
);
export const FooterSection = dynamic(
  () => import('./atomic/sections/footer').then((m) => m.FooterSection),
  { ssr: true }
);

export {
  TikTokIcon,
  XIcon,
  contrastTextOn,
  darkenHex,
  hexToRgba,
  parseStat,
  useCountdown,
  CompactCountdown,
  FlashCountdown,
  CountdownTimer,
  SecureVideoPlayer,
};

export function AtomicRenderer({
  page,
  onPurchase,
  mentorProfile,
  bundleProducts,
}: {
  page: any;
  onPurchase: () => void;
  mentorProfile?: any;
  bundleProducts?: any[];
}) {
  const designTokens = page.content?.designTokens || {};
  const styleTokens = designTokens.styleTokens || {};
  const primaryColor = designTokens.primary || page.branding?.primaryColor || '#3B2D86';
  const secondaryColor = designTokens.secondary || page.branding?.secondaryColor || '#F1F5F9';
  const accentColor = designTokens.accent || '#FACC15';
  const themeMode = styleTokens.themeMode || designTokens.themeMode || 'light';
  const isDark = themeMode === 'dark';
  const isGlass = themeMode === 'glass';

  // Estilo + flags
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

  // Paleta -> semantica de pagina
  const pageBg = isDark || isGlass ? primaryColor : secondaryColor;
  const pageFg = isDark || isGlass ? secondaryColor : primaryColor;
  const surfaceMuted = hexToRgba(pageFg, isDark || isGlass ? 0.07 : 0.06);

  // Fuente de verdad de tokens
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

  // Tokens extra declarados
  const overlayOpacity = extraTokens.overlayOpacity || '0.55';
  const mutedAlpha = parseFloat(overlayOpacity);
  const fg2Color = hexToRgba(pageFg, !isNaN(mutedAlpha) ? mutedAlpha : 0.55);
  const mutedColor = hexToRgba(pageFg, !isNaN(mutedAlpha) ? mutedAlpha * 0.7 : 0.47);
  const overlayColor = hexToRgba(pageBg, !isNaN(mutedAlpha) ? mutedAlpha : 0.55);

  const hasGradientOverlay = !!extraTokens.gradientOverlay && extraTokens.gradientOverlay !== 'none';
  const heroOverlay = hasGradientOverlay ? String(extraTokens.gradientOverlay) : `linear-gradient(to top, ${overlayColor}, transparent)`;

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
  const btnBg = isDark || isGlass ? accentColor : primaryColor;
  const btnText = contrastTextOn(btnBg);
  const onAccent = contrastTextOn(accentColor);
  const onPrimary = contrastTextOn(primaryColor);

  // Extraer el footer si existe para no renderizarlo en el flujo normal
  const footerSection = allSections.find((s: any) => s.id.startsWith('footer'));
  const regularSections = allSections.filter((s: any) => !s.id.startsWith('footer') && s.isVisible !== false);

  const sections = regularSections.sort((a: any, b: any) => {
    const aBase = a.id.split('_')[0];
    const bBase = b.id.split('_')[0];
    const aIdx = styleDefinition?.availableSections?.findIndex(s => s.id === aBase) ?? 999;
    const bIdx = styleDefinition?.availableSections?.findIndex(s => s.id === bBase) ?? 999;
    return aIdx - bIdx;
  });

  if (bundleProducts && bundleProducts.length > 0) {
    const hasBundle = sections.some((s: any) => s.id.startsWith('bundleGrid'));
    if (!hasBundle) {
      sections.splice(1, 0, { id: 'bundleGrid_virtual', isVirtual: true });
    }
  }

  const ctx: SectionRenderContext = {
    page,
    onPurchase,
    mentorProfile,
    bundleProducts,
    styleDefinition,
    styleId,
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
  };

  return (
    <div
      className={cn("w-full flex flex-col font-body", isFlashSale ? "bg-[var(--bg)] text-[var(--fg)]" : "bg-[var(--page-bg)] text-[var(--page-fg)]")}
      style={{
        '--page-bg': pageBg,
        '--page-fg': pageFg,
        '--primary': primaryColor,
        '--secondary': secondaryColor,
        '--accent': accentColor,
        '--component-radius': componentRadius,
        '--component-border': componentBorder,
        '--component-shadow': componentShadow,
        '--component-bg': componentBg,
        '--section-padding': sectionPadding,
        '--content-gap': contentGap,
        '--transition-duration': transitionDuration,
        '--surface-muted': surfaceMuted,
        '--section-alt': sectionBgAlt,
        '--on-dark': onDark,
        '--cta-shadow': ctaShadow,
        '--radius-pill': buttonRadius,
        '--font-display': `${fontHeading}, system-ui, sans-serif`,
        '--font-mono': fontMono,
        '--hero-overlay': heroOverlay,
        '--hero-overlay-color': overlayColor,
        ...styleVars,
        ...(isFlashSale ? {
          '--bg': secondaryColor,
          '--surface': componentBg,
          '--fg': primaryColor,
          '--fg-2': fg2Color,
          '--muted': mutedColor,
          '--border': primaryColor,
          '--accent-text': darkenHex(accentColor, 0.22),
          '--cta-shadow': `0 10px 0 ${primaryColor}`,
          '--radius-pill': '999px',
          '--accent-muted': darkenHex(accentColor, 0.08),
        } : {})
      }}
    >
      <style>{`
        @keyframes od-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .od-marquee-track { animation: none !important; } }

        /* ===== Flash Sale (demo Ebano y Naranja) ===== */
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
        const isEven = index % 2 === 0;

        switch (baseId) {
          case 'heroVideo':
            return <HeroVideoSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          case 'narrativeSections':
          case 'narrative':
            return <NarrativeSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          case 'syllabus':
            return <SyllabusSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          case 'bundleGrid':
            return <BundleGridSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          case 'benefits':
            return <BenefitsSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          case 'faqs':
            return <FaqsSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          case 'mentorProfile':
            return <MentorProfileSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          case 'testimonials':
            return <TestimonialsSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          case 'bonuses':
            return <BonusesSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          case 'offerBanner':
            return <OfferBannerSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          case 'marquee':
            return <MarqueeSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          case 'stats':
            return <StatsSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          case 'guarantee':
            return <GuaranteeSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          case 'countdownTimer':
            return <CountdownTimerSection key={sec.id} sec={sec} ctx={ctx} index={index} isEven={isEven} />;
          default:
            return null;
        }
      })}

      {/* Footer renderizado siempre al final */}
      <FooterSection footerSection={footerSection} ctx={ctx} />
    </div>
  );
}
