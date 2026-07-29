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
  const primaryColor = page.content?.designTokens?.primary || page.branding?.primaryColor || '#3B2D86';
  const accentColor = page.content?.designTokens?.accent || '#FACC15';
  
  // Sort sections based on the template's defined order
  const styleDefinition = getLandingStyle(page.styleId || 'classic');
  const allSections = [...(page.content?.sections || [])];
  
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
    <div className="w-full flex flex-col font-body">
      {sections.map((sec: any, index: number) => {
        const baseId = sec.id.split('_')[0];

        switch (baseId) {
          case 'heroVideo':
            return (
              <section key={sec.id} className="relative py-24 lg:py-32 overflow-hidden flex flex-col items-center text-center px-6">
                <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-black font-headline tracking-tight leading-[1.1] text-inherit">
                    {sec.title}
                  </h1>
                  {sec.subtitle && (
                    <p className="text-xl md:text-2xl text-opacity-80 max-w-2xl mx-auto font-medium">
                      {sec.subtitle}
                    </p>
                  )}
                  {sec.videoUrl && (
                    <div className="mt-12 mx-auto w-full max-w-4xl">
                      <SecureVideoPlayer videoUrl={sec.videoUrl} />
                    </div>
                  )}
                  <div className="pt-8">
                    <Button
                      onClick={onPurchase}
                      className="h-16 px-12 text-xl font-bold rounded-2xl shadow-xl hover:scale-105 transition-transform"
                      style={{ backgroundColor: primaryColor, color: '#fff' }}
                    >
                      {sec.ctaText || 'Inscribirme Ahora'}
                    </Button>
                  </div>
                </div>
              </section>
            );

          case 'narrativeSections':
            const isEven = index % 2 === 0;
            return (
              <section key={sec.id} className="py-8 md:py-16 px-6">
                {sec.imageUrl ? (
                  <div className={cn("max-w-7xl mx-auto flex flex-col gap-12 lg:gap-20 items-center", isEven ? "md:flex-row" : "md:flex-row-reverse")}>
                    <div className="w-full md:w-1/2">
                      <div className="w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl relative bg-black/5 dark:bg-white/5 border-[8px] border-white dark:border-slate-800">
                        <img src={sec.imageUrl} alt={sec.title || "Imagen narrativa"} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="w-full md:w-1/2 space-y-8">
                      {sec.title && <h2 className="text-4xl md:text-5xl font-black font-headline leading-[1.1]">{sec.title}</h2>}
                      <div className="prose prose-lg dark:prose-invert prose-p:leading-relaxed max-w-none text-opacity-90 whitespace-pre-wrap">
                        {sec.content}
                      </div>
                      
                      {/* Viñetas bajo descripción */}
                      {sec.bullets && sec.bullets.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-left">
                          {sec.bullets.slice(0, 4).map((bullet: string, i: number) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white shadow-sm mt-0.5" style={{ backgroundColor: primaryColor }}>
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
                    {sec.title && <h2 className="text-4xl md:text-5xl font-black font-headline leading-[1.1]">{sec.title}</h2>}
                    <div className="prose prose-lg dark:prose-invert prose-p:leading-relaxed max-w-none text-opacity-90 whitespace-pre-wrap">
                      {sec.content}
                    </div>
                    
                    {/* Viñetas bajo descripción */}
                    {sec.bullets && sec.bullets.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-left">
                        {sec.bullets.slice(0, 4).map((bullet: string, i: number) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white shadow-sm mt-0.5" style={{ backgroundColor: primaryColor }}>
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
                        <Button onClick={onPurchase} className="h-16 px-10 text-lg md:text-xl font-bold rounded-2xl shadow-xl transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );

          case 'syllabus':
            return (
              <section key={sec.id} className="py-24 px-6 bg-black/5 dark:bg-white/5">
                <div className="max-w-6xl mx-auto">
                  {sec.title && <h2 className="text-3xl md:text-5xl font-black font-headline mb-12 text-center">{sec.title}</h2>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {sec.bullets?.map((bullet: string, i: number) => {
                      const [bTitle, ...bDescArr] = bullet.split(':');
                      const bDesc = bDescArr.join(':');
                      return (
                        <div key={i} className="p-8 rounded-3xl bg-white dark:bg-slate-900 shadow-xl border border-black/5">
                          <h3 className="text-xl font-bold mb-3">{bTitle.replace(/\*\*/g, '')}</h3>
                          <p className="text-opacity-70 leading-relaxed">{bDesc}</p>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Botón de Acción Opcional */}
                  {sec.ctaText && (
                    <div className="flex justify-center pt-16 w-full">
                      <Button onClick={onPurchase} className="h-16 px-12 text-lg md:text-xl font-bold rounded-2xl shadow-xl transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>
                        {sec.ctaText}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            );

          case 'benefits':
            return (
              <section key={sec.id} className="py-24 px-6">
                <div className="max-w-6xl mx-auto text-center space-y-16">
                  {sec.title && <h2 className="text-3xl md:text-5xl font-black font-headline">{sec.title}</h2>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
                    {sec.bullets?.map((bullet: string, i: number) => (
                      <div key={i} className="space-y-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{ backgroundColor: primaryColor, color: '#fff' }}>
                          {i + 1}
                        </div>
                        <p className="text-lg font-medium text-opacity-90">{bullet}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Botón de Acción Opcional */}
                  {sec.ctaText && (
                    <div className="flex pt-8 mt-auto w-full">
                      <Button onClick={onPurchase} className="h-16 px-10 text-lg md:text-xl font-bold rounded-2xl shadow-xl transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>
                        {sec.ctaText}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            );

          case 'faqs':
            return (
              <section key={sec.id} className="py-24 px-6">
                <div className="max-w-4xl mx-auto">
                  {sec.title && <h2 className="text-3xl md:text-5xl font-black font-headline mb-12 text-center">{sec.title}</h2>}
                  <div className="space-y-6">
                    {sec.bullets?.map((bullet: string, i: number) => {
                      const [q, ...a] = bullet.split('?');
                      return (
                        <div key={i} className="p-6 rounded-2xl bg-black/5 dark:bg-white/5">
                          <h4 className="font-bold text-xl mb-3">{q}?</h4>
                          <p className="text-opacity-70">{a.join('?')}</p>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Botón de Acción Opcional */}
                  {sec.ctaText && (
                    <div className="flex justify-center pt-12 w-full">
                      <Button onClick={onPurchase} className="h-16 px-12 text-lg md:text-xl font-bold rounded-2xl shadow-xl transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>
                        {sec.ctaText}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            );

          case 'mentorProfile':
            return (
              <section key={sec.id} className="py-24 px-6 overflow-hidden">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                  {sec.imageUrl && (
                    <div className="w-full md:w-1/2">
                      <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/10 bg-black/5 dark:bg-white/5">
                        <img src={sec.imageUrl} alt={sec.title || "Mentor Profile"} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                  <div className={cn("w-full space-y-8", sec.imageUrl ? "md:w-1/2" : "text-center")}>
                    {sec.title && <h2 className="text-4xl md:text-6xl font-black font-headline leading-tight">{sec.title}</h2>}
                    <div className="prose prose-lg dark:prose-invert prose-p:leading-relaxed max-w-none text-opacity-80 whitespace-pre-wrap">
                      {sec.content}
                    </div>
                    
                    {/* Botón de Acción Opcional */}
                    {sec.ctaText && (
                      <div className="flex justify-center md:justify-start pt-8 mt-8 w-full">
                        <Button onClick={onPurchase} className="h-16 px-10 text-lg md:text-xl font-bold rounded-2xl shadow-xl transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>
                          {sec.ctaText}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );

          case 'testimonials':
            return (
              <section key={sec.id} className="py-24 px-6 bg-black/5 dark:bg-white/5">
                <div className="max-w-6xl mx-auto text-center space-y-16">
                  {sec.title && <h2 className="text-4xl md:text-5xl font-black font-headline">{sec.title}</h2>}
                  {sec.content && <div className="prose prose-lg dark:prose-invert mx-auto text-opacity-90">{sec.content}</div>}
                  
                  {sec.imageUrl && (
                    <div className="max-w-4xl mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl border-[8px] border-white dark:border-slate-800">
                      <img src={sec.imageUrl} alt="Testimonios" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  {sec.bullets && sec.bullets.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left mt-12">
                      {sec.bullets.map((bullet: string, i: number) => {
                        const hasColon = bullet.includes(':');
                        const [name, ...quoteArr] = hasColon ? bullet.split(':') : ['', bullet];
                        const quote = hasColon ? quoteArr.join(':') : bullet;
                        
                        return (
                          <div key={i} className="p-8 rounded-3xl bg-white dark:bg-slate-900 shadow-xl border border-black/5 flex flex-col gap-5">
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
                      <Button onClick={onPurchase} className="h-16 px-12 text-lg md:text-xl font-bold rounded-2xl shadow-xl transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>
                        {sec.ctaText}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            );

          case 'bonuses':
            return (
              <section key={sec.id} className="py-24 px-6">
                <div className="max-w-5xl mx-auto space-y-16">
                  <div className="text-center space-y-6">
                    {sec.title && <h2 className="text-4xl md:text-5xl font-black font-headline" style={{ color: accentColor }}>{sec.title}</h2>}
                    {sec.content && <div className="prose prose-lg dark:prose-invert mx-auto text-opacity-90">{sec.content}</div>}
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center gap-12 p-8 md:p-12 rounded-[3rem] bg-gradient-to-br from-black/5 to-black/10 dark:from-white/5 dark:to-white/10 shadow-2xl border border-white/20">
                    {sec.imageUrl && (
                      <div className="w-full md:w-5/12 flex-shrink-0">
                        <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-xl border-4 border-white dark:border-slate-800 transform -rotate-3 hover:rotate-0 transition-all duration-500">
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
                              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white shadow-sm mt-0.5" style={{ backgroundColor: accentColor }}>
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
                      <Button onClick={onPurchase} className="h-16 px-12 text-lg md:text-xl font-bold rounded-2xl shadow-xl transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>
                        {sec.ctaText}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            );

          case 'countdownTimer':
            if (page.landingType !== 'promocion' || !page.activeUntil) return null;
            return (
              <div 
                key={sec.id}
                onClick={onPurchase}
                className="fixed top-1/2 right-4 -translate-y-1/2 z-[100] w-64 md:w-72 rounded-[2rem] overflow-hidden shadow-2xl cursor-pointer group transition-transform hover:scale-105"
              >
                {sec.imageUrl ? (
                  <div className="absolute inset-0">
                    <img src={sec.imageUrl} className="w-full h-full object-cover" alt="Oferta" />
                    <div className="absolute inset-0 bg-black/70 group-hover:bg-black/60 transition-colors"></div>
                  </div>
                ) : (
                  <div className="absolute inset-0 opacity-95" style={{ backgroundColor: primaryColor }}></div>
                )}
                
                <div className="relative z-10 p-6 flex flex-col items-center text-center text-white border border-white/10 rounded-[2rem]">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4 animate-pulse border border-red-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <h4 className="font-black text-xl mb-2 text-white leading-tight font-headline">{sec.title || '¡Oferta por Tiempo Limitado!'}</h4>
                  {sec.content && <p className="text-sm opacity-80 mb-4">{sec.content}</p>}
                  
                  <CountdownTimer activeUntil={page.activeUntil} />
                  
                  <Button 
                    className="w-full mt-6 bg-white text-black hover:bg-slate-100 font-bold shadow-lg"
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
                  {sec.title && <h2 className="text-3xl md:text-5xl font-black font-headline mb-8">{sec.title}</h2>}
                  <div className="whitespace-pre-wrap">{sec.content}</div>
                  {sec.ctaText && (
                    <Button
                      onClick={onPurchase}
                      className="mt-8 h-14 px-8 text-lg font-bold rounded-xl"
                      style={{ backgroundColor: primaryColor, color: '#fff' }}
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
        
        return (
          <footer className="py-16 px-6 bg-slate-950 text-slate-400 text-center border-t border-slate-900">
            <div className="max-w-4xl mx-auto space-y-10">
              
              {/* Sección editable del tutor */}
              {hasCustomFooter && (
                <div className="space-y-6 pb-8 border-b border-slate-800">
                  {footerSection.title && <h3 className="text-lg font-bold text-slate-200">{footerSection.title}</h3>}
                  {footerSection.content && (
                    <p className="text-sm opacity-70 whitespace-pre-wrap max-w-xl mx-auto leading-relaxed">{footerSection.content}</p>
                  )}
                  {footerSection.bullets && footerSection.bullets.filter(Boolean).length > 0 && (
                    <div className="flex flex-wrap justify-center gap-4">
                      {footerSection.bullets.filter(Boolean).map((b: string, i: number) => (
                        <span key={i} className="text-sm text-slate-300 font-semibold bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
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
                  {socials.linkedin && <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Linkedin className="h-6 w-6 text-slate-400 hover:text-[#0077B5]" /></a>}
                  {socials.instagram && <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Instagram className="h-6 w-6 text-slate-400 hover:text-[#E4405F]" /></a>}
                  {socials.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><XIcon className="h-6 w-6 text-slate-400 hover:text-white" /></a>}
                  {socials.youtube && <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Youtube className="h-6 w-6 text-slate-400 hover:text-[#FF0000]" /></a>}
                  {socials.tiktok && <a href={socials.tiktok} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><TikTokIcon className="h-6 w-6 text-slate-400 hover:text-white" /></a>}
                  {socials.whatsapp && <a href={`https://wa.me/${socials.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><MessageCircle className="h-6 w-6 text-slate-400 hover:text-[#25D366]" /></a>}
                  {socials.website && <a href={socials.website} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Globe className="h-6 w-6 text-slate-400" /></a>}
                  {socials.phone && <a href={`tel:${socials.phone}`} className="hover:scale-110 transition-transform"><Phone className="h-6 w-6 text-slate-400" /></a>}
                </div>
              )}

              {/* Seguridad y copyright */}
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Entorno de Aprendizaje Seguro</span>
              </div>
              {mentorName && (
                <p className="text-xs font-medium text-slate-600">© {new Date().getFullYear()} {mentorName}. Todos los derechos reservados.</p>
              )}

              {/* Disclaimer legal de plataforma */}
              <div className="space-y-3 pt-4 border-t border-slate-900 text-[11px] text-slate-600 opacity-70 leading-relaxed">
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

function CountdownTimer({ activeUntil }: { activeUntil: any }) {
  const [timeLeft, setTimeLeft] = React.useState({ d: 0, h: 0, m: 0, s: 0 });

  React.useEffect(() => {
    if (!activeUntil) return;
    const end = activeUntil.toDate ? activeUntil.toDate() : new Date(activeUntil);
    end.setHours(23, 59, 59, 999); // Final del día de expiración

    const timer = setInterval(() => {
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      
      if (diff <= 0) {
        clearInterval(timer);
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60)
      });
    }, 1000);
    
    // Ejecutar inicial inmediatamente
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff > 0) {
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60)
      });
    }

    return () => clearInterval(timer);
  }, [activeUntil]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-1 mt-2 justify-center w-full">
      <div className="flex flex-col items-center flex-1">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-lg md:text-xl shadow-inner border border-white/20 text-white font-mono">{pad(timeLeft.d)}</div>
        <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider mt-1.5 opacity-80 text-white">Días</span>
      </div>
      <div className="text-lg font-bold text-white/40 -mt-5">:</div>
      <div className="flex flex-col items-center flex-1">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-lg md:text-xl shadow-inner border border-white/20 text-white font-mono">{pad(timeLeft.h)}</div>
        <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider mt-1.5 opacity-80 text-white">Hrs</span>
      </div>
      <div className="text-lg font-bold text-white/40 -mt-5">:</div>
      <div className="flex flex-col items-center flex-1">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-lg md:text-xl shadow-inner border border-white/20 text-white font-mono">{pad(timeLeft.m)}</div>
        <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider mt-1.5 opacity-80 text-white">Min</span>
      </div>
      <div className="text-lg font-bold text-white/40 -mt-5">:</div>
      <div className="flex flex-col items-center flex-1">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center font-bold text-lg md:text-xl shadow-inner border border-white/20 text-white font-mono text-red-300">{pad(timeLeft.s)}</div>
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
      className="aspect-video rounded-[3rem] overflow-hidden shadow-3xl border-[12px] border-slate-50 dark:border-slate-800 bg-black relative group/video-container select-none"
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
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-auto cursor-not-allowed" />

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 transition-colors">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/20 shadow-2xl transition-transform hover:scale-110">
              <Play className="h-8 w-8 text-white fill-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Marca de Agua */}
      <div className="absolute top-6 left-6 z-40 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 opacity-0 group-hover/video-container:opacity-100 transition-opacity">
        <ShieldCheck className="h-3 w-3 text-emerald-400" />
        <span className="text-[8px] font-black uppercase text-white tracking-widest">Contenido Protegido • Evolución Académica</span>
      </div>
    </div>
  );
}
