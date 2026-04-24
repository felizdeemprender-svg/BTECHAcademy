
'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, ShieldCheck, Loader2, Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  url: string;
  title?: string;
  primaryColor?: string;
}

export function VideoPlayer({ url, title, primaryColor = '#3B2D86' }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const getSecureUrl = (rawUrl: string) => {
    if (!rawUrl) return '';
    let videoId = '';
    
    if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
      if (rawUrl.includes('v=')) videoId = rawUrl.split('v=')[1].split('&')[0];
      else if (rawUrl.includes('youtu.be/')) videoId = rawUrl.split('youtu.be/')[1].split('?')[0];
      else if (rawUrl.includes('embed/')) videoId = rawUrl.split('embed/')[1].split('?')[0];
      else if (rawUrl.includes('/shorts/')) videoId = rawUrl.split('/shorts/')[1].split('?')[0];
      
      return `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&iv_load_policy=3&controls=1&hl=es&enablejsapi=1`;
    }

    if (rawUrl.includes('vimeo.com')) {
      const vimeoId = rawUrl.split('/').pop()?.split('?')[0];
      return `https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&title=0&byline=0&portrait=0`;
    }

    return rawUrl;
  };

  const toggleFullScreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error al activar pantalla completa: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const togglePlayback = () => {
    if (!iframeRef.current) return;

    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isVimeo = url.includes('vimeo.com');

    if (isYouTube) {
      const command = isPlaying ? 'pauseVideo' : 'playVideo';
      iframeRef.current.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: command, args: '' }), '*');
    } else if (isVimeo) {
      const command = isPlaying ? 'pause' : 'play';
      iframeRef.current.contentWindow?.postMessage(JSON.stringify({ method: command }), '*');
    }

    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
      const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handleFsChange);
      return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
      setIsPlaying(false);
      setIsLoading(true);
  }, [url]);

  return (
    <div 
      ref={containerRef}
      className="relative aspect-video bg-slate-950 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/10 group/video"
      onContextMenu={(e) => e.preventDefault()}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
          <Loader2 className="h-10 w-10 text-white/20 animate-spin" />
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={getSecureUrl(url)}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        webkitallowfullscreen="true"
        mozallowfullscreen="true"
        onLoad={() => setIsLoading(false)}
      />

      {/* Security Overlay & Custom Play Button */}
      {!isLoading && (
        <div 
            className="absolute inset-0 z-20 cursor-pointer group"
            onClick={togglePlayback}
        >
            {/* Top protection */}
            <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
            
            {/* Custom Controls (Fullscreen) */}
            <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={toggleFullScreen}
                  className="w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                >
                  {isFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </button>
            </div>

            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-white/30 bg-white/10 backdrop-blur-md shadow-2xl transition-transform group-hover:scale-110"
                        style={{ borderColor: `${primaryColor}40` }}
                    >
                        <Play className="h-8 w-8 text-white fill-white ml-1" />
                    </div>
                </div>
            )}

            {/* Branding Watermark */}
            <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span className="text-[8px] font-black uppercase text-white tracking-widest">Contenido Protegido • {title || 'BTECH'}</span>
            </div>
        </div>
      )}
    </div>
  );
}
