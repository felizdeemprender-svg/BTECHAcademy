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
}

export function SocialLivePreview({ social, tokens }: SocialLivePreviewProps) {
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const isCarousel = social.type === 'carousel' || social.type === 'thread' || social.type === 'document';
  const isVertical = social.type === 'story' || social.type === 'short_video';
  const slides = social.slides?.length > 0 ? social.slides : [{ text: social.hook || '', imageUrl: '' }];
  const slide = slides[currentSlideIdx] || slides[0];
  
  // Construct the preview URL for the linked landing
  const landingUrl = social.landingUrl ? social.landingUrl : (social.landingIdx !== undefined ? `landing-${social.landingIdx + 1}.html` : 'link_en_bio');

  useEffect(() => {
    if (currentSlideIdx >= slides.length) setCurrentSlideIdx(0);
  }, [slides.length]);
  
  return (
    <div className="sticky top-10 space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border shadow-inner">
            <PlatformIcon platform={social.platform || 'Instagram'} className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-900 leading-none">{social.platform || 'Red Social'}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{social.type?.replace('_', ' ')}</p>
          </div>
        </div>
        {isCarousel && <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase h-5">{slides.length} Slots</Badge>}
      </div>

      <div className={cn(
          "relative mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-100 transition-all duration-500 group/mockup",
          isVertical ? "aspect-[9/16] w-full max-w-[340px]" : "aspect-square w-full"
        )}
      >
        {isCarousel && (
          <>
            <div className="absolute inset-0 translate-x-3 translate-y-3 bg-slate-200 rounded-[2rem] z-0 shadow-sm border border-slate-300" />
            <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-slate-300 rounded-[2rem] z-0 shadow-sm border border-slate-400" />
          </>
        )}

        <div className="absolute inset-0 z-10 flex flex-col bg-slate-800">
          {slide.imageUrl ? (
            <img 
              key={currentSlideIdx}
              src={slide.imageUrl} 
              alt="Mockup" 
              className="absolute inset-0 w-full h-full object-cover opacity-80 animate-in fade-in zoom-in-95 duration-500" 
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <div className="h-12 w-12 text-slate-300 opacity-50" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
        </div>

        <div className="absolute inset-0 z-20 p-8 flex flex-col justify-between text-white">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white/40" />
            </div>
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
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-center flex flex-col items-center justify-center min-h-[100px] shadow-lg">
              <h4 
                className="text-lg font-black leading-[1.3] text-white drop-shadow-lg animate-in slide-in-from-bottom-2 duration-500" 
                style={{ fontFamily: tokens?.fontHeading }}
              >
                {slide.text || social.hook || 'Escribe el texto visual aquí...'}
              </h4>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm shadow-sm" />
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-80 drop-shadow-md">@{social.handle || 'tu_cuenta'}</span>
              </div>
              <button className="h-7 px-3 rounded-lg text-[8px] font-black uppercase shadow-lg truncate max-w-[120px]" style={{ backgroundColor: tokens?.accent || '#10b981' }}>
                {landingUrl}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6 rounded-[2rem] bg-white border shadow-sm text-sm text-slate-600 line-clamp-4 leading-relaxed relative">
        <span className="font-bold text-slate-900 mr-2">@{social.handle || 'tu_cuenta'}</span>
        {social.caption || 'Aquí irá el cuerpo de la publicación...'}
        <div className="mt-3 text-primary font-bold text-xs">
          {social.landingIdx !== undefined && <span className="mr-2 block mb-1">🔗 Ver más: {landingUrl}</span>}
          {social.hashtags?.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')}
        </div>
      </div>
    </div>
  );
}
