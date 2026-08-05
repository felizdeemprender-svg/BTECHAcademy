'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Instagram, Twitter, Linkedin, Circle } from 'lucide-react';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const PlatformIcon = ({ platform, className }: { platform: string, className?: string }) => {
  if (platform?.toLowerCase() === 'instagram') return <Instagram className={className} />;
  if (platform?.toLowerCase() === 'twitter' || platform?.toLowerCase() === 'x') return <Twitter className={className} />;
  if (platform?.toLowerCase() === 'tiktok') return <TikTokIcon className={className} />;
  if (platform?.toLowerCase() === 'linkedin') return <Linkedin className={className} />;
  return <Circle className={className} />;
};

interface SocialLivePreviewProps {
  social: any;
  tokens?: any;
  adn?: any; // Nueva prop: Configuración del ADN seleccionado
}

export function SocialLivePreview({ social, tokens, adn }: SocialLivePreviewProps) {
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const isCarousel = social.type === 'carousel' || social.type === 'thread' || social.type === 'document';
  const isVertical = social.type === 'story' || social.type === 'short_video';
  const isPortrait = social.type === 'portrait_post' || (isCarousel && social.platform === 'instagram');
  const slides = social.slides?.length > 0 ? social.slides : [{ text: social.hook || '', imageUrl: '', segment_label: 'GANCHO' }];
  const slide = slides[currentSlideIdx] || slides[0] || { text: social.hook || '', segment_label: 'GANCHO' };
  
  // Determinar reglas del ADN para el segmento actual
  const segmentKey = slide.segment_label || (currentSlideIdx === 0 ? 'GANCHO' : currentSlideIdx === slides.length - 1 ? 'CTA' : 'VALOR');
  const adnBase = adn?.ffmpeg_rules?.default || {};
  const adnOverride = adn?.ffmpeg_rules?.[segmentKey] || {};
  const activeRules = { ...adnBase, ...adnOverride };

  // Utilidad para convertir FFmpeg color (black@0.5) a CSS rgba
  const ffColorToCss = (ffCol: string, brandColor?: string) => {
    if (!ffCol) return 'transparent';
    let base = ffCol.replace('{brandColor}', brandColor || '#8b5cf6');
    if (base.includes('@')) {
      const [col, alpha] = base.split('@');
      const rgb = col === 'white' ? '255,255,255' : col === 'black' ? '0,0,0' : hexToRgb(col);
      return `rgba(${rgb}, ${alpha})`;
    }
    return base;
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : '0,0,0';
  };

  const fontName = activeRules.fontFamily?.replace('.ttf', '') || 'Inter';
  const boxBg = ffColorToCss(activeRules.boxcolor_alpha, tokens?.primary);
  const shadow = activeRules.shadowcolor ? `${activeRules.shadowx || 2}px ${activeRules.shadowy || 2}px 8px ${ffColorToCss(activeRules.shadowcolor)}` : 'none';

  // Construct the preview URL for the linked landing
  const landingUrl = social.landingUrl ? social.landingUrl : (social.landingIdx !== undefined ? `landing-${social.landingIdx + 1}.html` : 'link_en_bio');

  useEffect(() => {
    if (currentSlideIdx >= slides.length) setCurrentSlideIdx(0);
  }, [slides.length]);
  
  return (
    <div className="sticky top-10 space-y-6">
      {/* Estilos de Animación Inyectados */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes typewriter {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes kineticIn {
          0% { transform: scale(0.5) rotate(-10deg); opacity: 0; }
          70% { transform: scale(1.1) rotate(3deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-typewriter {
          overflow: hidden;
          white-space: pre-wrap;
          animation: typewriter 1.5s steps(40, end);
        }
        .animate-kinetic {
          animation: kineticIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .animate-slide-custom {
          animation: slideIn 0.5s ease-out;
        }
      `}} />

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center border">
            <PlatformIcon platform={social.platform || 'Instagram'} className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-foreground leading-none">{social.platform || 'Red Social'}</p>
            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">{social.type?.replace('_', ' ')}</p>
          </div>
        </div>
        {isCarousel && <Badge className="bg-success text-white border-none text-[8px] font-black uppercase h-5">{slides.length} PLACAS</Badge>}
      </div>

      <div className={cn(
          "relative mx-auto rounded-lg overflow-hidden border-[12px] border-white bg-muted transition-all duration-500 group/mockup",
          isVertical ? "aspect-[9/16] w-full max-w-[320px]" : 
          isPortrait ? "aspect-[4/5] w-full max-w-[360px]" : "aspect-square w-full"
        )}
      >
        {isCarousel && (
          <>
            <div className="absolute inset-0 translate-x-3 translate-y-3 bg-border rounded-lg z-0 shadow-sm border border-border" />
            <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-border rounded-lg z-0 shadow-sm border border-muted-foreground" />
          </>
        )}

        <div className="absolute inset-0 z-10 flex flex-col bg-foreground">
          {slide.imageUrl ? (
            <div key={currentSlideIdx} className="absolute inset-0 block overflow-hidden">
               <img 
                src={slide.imageUrl} 
                alt="Mockup" 
                className={cn(
                    "absolute inset-0 w-full h-full object-cover opacity-80 transition-transform duration-[4000ms] ease-linear",
                    adn?.fx?.cameraMovement === 'zoom_in' ? "scale-125 translate-z-0" : 
                    adn?.fx?.cameraMovement === 'zoom_out' ? "scale-100" : "scale-110",
                    "group-hover/mockup:scale-125"
                )}
                style={{
                    transform: adn?.fx?.cameraMovement === 'zoom_in' ? 'scale(1.2)' : 'scale(1.0)',
                    filter: 
                      adn?.fx?.colorGrade === 'cold' ? 'contrast(1.1) saturate(0.8) hue-rotate(5deg)' :
                      adn?.fx?.colorGrade === 'vibrant' ? 'contrast(1.1) saturate(1.4)' :
                      adn?.fx?.colorGrade === 'vintage' ? 'contrast(0.9) saturate(0.8) sepia(0.2)' :
                      adn?.fx?.colorGrade === 'noir' ? 'grayscale(1) contrast(1.3)' :
                      adn?.fx?.colorGrade === 'modern' ? 'contrast(1.05) saturate(1.15)' : 'none'
                }}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-border">
              <svg className="h-12 w-12 text-border opacity-50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
          )}

          {/* FILM GRAIN FX Preview */}
          {adn?.fx?.grainIntensity && adn?.fx?.grainIntensity > 0 && (
            <div 
              className="absolute inset-0 z-12 pointer-events-none opacity-[0.08]" 
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                mixBlendMode: 'overlay'
              }}
            />
          )}

          {/* LOWER THIRD PLATE - Visual Parity (Strict check) */}
          {adn?.fx?.showLowerThird && social.handle && (
            <div className="absolute left-6 bottom-32 z-30 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10 animate-in slide-in-from-left duration-500">
               <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
               <span className="text-[10px] font-black text-white/90 tracking-tight">@{social.handle}</span>
            </div>
          )}

          {/* VIGNETTE FX Preview */}
          {adn?.fx?.vignette && (
            <div className="absolute inset-0 z-15 bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        </div>

        <div className="absolute inset-0 z-20 p-8 flex flex-col justify-between text-white">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10" />
            {isCarousel && (
              <div className="flex gap-1.5 mt-1 bg-black/40 px-3 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                {slides.map((_: any, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => setCurrentSlideIdx(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300 transform", 
                      i === currentSlideIdx ? "bg-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "bg-white/30 hover:bg-white/50"
                    )} 
                  />
                ))}
              </div>
            )}
            
            <div className="flex flex-col items-end gap-1 mt-2 pointer-events-none">
                <Badge className={cn(
                    "border-none text-[8px] font-black uppercase px-2 mb-1 shadow-lg",
                    segmentKey === 'GANCHO' ? "bg-warn text-white" : 
                    segmentKey === 'CTA' ? "bg-danger text-white" : "bg-success text-white"
                )}>
                    {segmentKey}
                </Badge>
                <div className="text-[10px] font-bold text-white/60 bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {adn?.name}
                </div>
            </div>
          </div>

          <div className="space-y-4">
            <div 
              key={`${currentSlideIdx}-${segmentKey}`}
              className={cn(
                "p-6 rounded-3xl flex flex-col items-center justify-center min-h-[140px] transition-all duration-500",
                activeRules.animation === 'typewriter' ? "animate-typewriter" : 
                activeRules.animation === 'kinetic_in' ? "animate-kinetic" :
                activeRules.animation === 'slide_in' ? "animate-slide-custom" : "animate-in fade-in duration-700"
              )}
              style={{ 
                backgroundColor: activeRules.box ? boxBg : 'transparent',
                textAlign: 'center',
                boxShadow: activeRules.box ? '0 30px 60px -12px rgba(0,0,0,0.6)' : 'none',
                padding: activeRules.boxborderw ? `${activeRules.boxborderw / 3}px` : '1.5rem',
                position: 'relative',
                transform: (() => {
                  const yVal = activeRules.y || '';
                  if (yVal.includes('h*')) {
                    const multiplier = parseFloat(yVal.split('*')[1]) || 0.5;
                    const offset = (multiplier - 0.5) * 100;
                    return `translateY(${offset}%)`;
                  }
                  if (yVal.includes('(h-text_h)/2')) return 'none';
                  return 'none';
                })()
              }}
            >
              <h4 
                className={cn(
                  "font-bold leading-[1.2] text-white",
                  activeRules.uppercase ? "uppercase" : ""
                )} 
                style={{ 
                  fontFamily: fontName,
                  fontSize: `${activeRules.fontsize / 4.4}px`,
                  textShadow: shadow,
                  color: activeRules.fontcolor === 'black' ? '#000' : '#fff'
                }}
              >
                {slide.title || slide.text || social.hook || 'Escribe el texto aquí...'}
              </h4>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm shadow-sm" />
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-80 drop-shadow-md">@{social.handle || 'tu_cuenta'}</span>
              </div>
              <button 
                className="h-9 px-5 rounded-2xl text-[10px] font-black uppercase truncate max-w-[150px] transition-transform hover:scale-105 active:scale-95" 
                style={{ 
                    backgroundColor: tokens?.accent || '#8b5cf6',
                    color: '#fff'
                }}
              >
                {landingUrl}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-8 rounded-lg bg-white border border-muted text-sm text-muted-foreground line-clamp-4 leading-relaxed relative overflow-hidden transition-all">
        <div className="absolute left-0 top-0 w-1.5 h-full bg-muted" />
        <span className="font-bold text-foreground mr-2">@{social.handle || 'tu_cuenta'}</span>
        {social.caption || 'Aquí irá el cuerpo de la publicación...'}
        <div className="mt-4 text-primary font-bold text-xs flex flex-wrap gap-3">
          {social.landingIdx !== undefined && <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-[10px] border border-primary/15">🔗 {landingUrl}</span>}
          <div className="flex gap-1.5">
            {social.hashtags?.map((h: string) => h.startsWith('#') ? h : `#${h}`).map((h: string, i: number) => (
                <span key={i} className="text-primary font-black tracking-tight">{h}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

