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

export function BonusesSection({ sec, ctx, isEven, index = 0 }: SectionProps) {
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
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-10">
                      {sec.kicker && <span className="od-fs-kicker">{sec.kicker}</span>}
                      {sec.title && <h2 className="od-fs-heading text-3xl md:text-5xl">{sec.title}</h2>}
                      {sec.content && <p className="mt-3 max-w-[52ch] mx-auto leading-relaxed" style={{ color: 'var(--muted)' }}>{sec.content}</p>}
                    </div>
                    
                    <div className={cn("flex flex-col md:flex-row items-center gap-10 md:gap-12", index % 2 === 1 && "md:flex-row-reverse")}>
                      {sec.imageUrl && (
                        <div className="w-full md:w-2/5 flex-shrink-0 aspect-[4/5] overflow-hidden" style={{ borderRadius: 'var(--component-radius)', boxShadow: 'var(--component-shadow)' }}>
                          <img src={sec.imageUrl} alt={sec.title || "Bonus"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
                          <img src={sec.imageUrl} alt={sec.title || "Bonus"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
                          <img src={sec.imageUrl} alt={sec.title || "Bonus"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
                          <img src={sec.imageUrl} alt={sec.title || 'Bonus'} className={cn("w-full h-full object-cover", grayscale && "grayscale")} loading="lazy" decoding="async" />
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
                          <img src={sec.imageUrl} alt={sec.title || "Bonus"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
                        <img src={sec.imageUrl} alt={sec.title || "Bonus"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
                          <img src={sec.imageUrl} alt={sec.title || "Bonus"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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

}
