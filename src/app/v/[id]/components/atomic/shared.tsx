'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Play, ShieldCheck } from 'lucide-react';

export interface SectionRenderContext {
  page: any;
  onPurchase: () => void;
  mentorProfile?: any;
  bundleProducts?: any[];
  styleDefinition: any;
  styleId: string;
  isClassic: boolean;
  isFlashSale: boolean;
  isCorporate: boolean;
  isTechB2b: boolean;
  isExecutiveDark: boolean;
  isLuxurySerif: boolean;
  isEditorial: boolean;
  isModernClean: boolean;
  isLaunchCountdown: boolean;
  isDark: boolean;
  isGlass: boolean;
  pageBg: string;
  pageFg: string;
  surfaceMuted: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  btnBg: string;
  btnText: string;
  onPrimary: string;
  onAccent: string;
  onDark: string;
  cardStyle: React.CSSProperties;
  componentRadius: string;
  componentBorder: string;
  componentShadow: string;
  componentBg: string;
  sectionPadding: string;
  contentGap: string;
  transitionDuration: string;
  extraTokens: Record<string, any>;
  ctaShadow: string;
  buttonRadius: string;
  buttonStyle: any;
  headingWeight: any;
  headingTracking: any;
  sectionBgAlt: string;
  fontHeading: string;
  fontMono: string;
  overlayOpacity: string;
  fg2Color: string;
  mutedColor: string;
  overlayColor: string;
  heroOverlay: string;
}

export interface SectionProps {
  sec: any;
  ctx: SectionRenderContext;
  index?: number;
  isEven?: boolean;
}

// TikTok icon inline (not in lucide)
export const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

// Twitter/X icon inline
export const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export function contrastTextOn(hex?: string): string {
  if (!hex) return '#FFFFFF';
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c: string) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.35 ? '#0E0E0F' : '#FFFFFF';
}

export function darkenHex(hex?: string, amt = 0.2): string {
  if (!hex) return '#000000';
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c: string) => c + c).join('');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amt));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amt));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amt));
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgba(hex?: string, alpha = 0.06): string {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c: string) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function parseStat(item: string): { num: string; label: string } {
  const m = item.match(/^([+$~]?\s*[\d.,]+\s*[%+kKmM]*)\s*(.*)$/);
  if (m && m[1]) {
    return { num: m[1].trim(), label: (m[2] || '').replace(/^[-—–:]+\s*/, '').trim() };
  }
  return { num: item.trim(), label: '' };
}

export function useCountdown(activeUntil: any) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
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

export function CompactCountdown({ activeUntil, color }: { activeUntil: any; color?: string }) {
  const { d, h, m, s, pad } = useCountdown(activeUntil);
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs md:text-sm font-bold whitespace-nowrap" style={{ color: color || 'inherit' }}>
      <span>{pad(d)}</span><span>:</span><span>{pad(h)}</span><span>:</span><span>{pad(m)}</span><span>:</span><span>{pad(s)}</span>
    </span>
  );
}

export function FlashCountdown({ activeUntil, shadowColor, boxBg, boxText, boxBorder, labelColor }: { activeUntil: any; shadowColor?: string; boxBg?: string; boxText?: string; boxBorder?: string; labelColor?: string }) {
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

export function CountdownTimer({ activeUntil }: { activeUntil: any }) {
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

export function SecureVideoPlayer({ videoUrl }: { videoUrl: string }) {
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

      <div
        className="absolute inset-0 z-30 bg-transparent cursor-pointer"
        onClick={togglePlayback}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/20 to-transparent pointer-events-auto" />
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-auto cursor-not-allowed" style={{ backgroundImage: 'var(--hero-overlay)' }} />

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 transition-colors">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 transition-transform hover:scale-110">
              <Play className="h-8 w-8 text-white fill-white ml-1" />
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-6 left-6 z-40 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-[var(--component-radius)] border border-white/10 opacity-0 group-hover/video-container:opacity-100 transition-opacity">
        <ShieldCheck className="h-3 w-3 text-success" />
        <span className="text-[8px] font-black uppercase text-white tracking-widest">Contenido Protegido • Evolución Académica</span>
      </div>
    </div>
  );
}
