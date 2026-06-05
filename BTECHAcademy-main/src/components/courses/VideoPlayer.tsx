
'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, ShieldCheck, Loader2, Maximize, Minimize, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface VideoPlayerProps {
  url?: string;
  title?: string;
  primaryColor?: string;
}

export function VideoPlayer({ url, title, primaryColor = '#3B2D86' }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const getSecureUrl = (rawUrl?: string) => {
    if (!rawUrl) return undefined;
    let videoId = '';
    
    if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
      if (rawUrl.includes('v=')) videoId = rawUrl.split('v=')[1].split('&')[0];
      else if (rawUrl.includes('youtu.be/')) videoId = rawUrl.split('youtu.be/')[1].split('?')[0];
      else if (rawUrl.includes('embed/')) videoId = rawUrl.split('embed/')[1].split('?')[0];
      else if (rawUrl.includes('/shorts/')) videoId = rawUrl.split('/shorts/')[1].split('?')[0];
      
      return `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&iv_load_policy=3&controls=1&hl=es&enablejsapi=1`;
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
    if (!iframeRef.current || !url) return;

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

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(0);
      playerRef.current.playVideo();
      setShowEndScreen(false);
      setIsPlaying(true);
    } else {
      // Fallback si la API no está lista
      window.location.reload();
    }
  };

  // Inicializar YouTube API
  useEffect(() => {
    if (!url) return;
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    if (!isYouTube) return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (window.YT && window.YT.Player && iframeRef.current && !playerRef.current) {
        playerRef.current = new window.YT.Player(iframeRef.current, {
          events: {
            'onStateChange': (event: any) => {
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              if (event.data === 1) {
                setIsPlaying(true);
                setShowEndScreen(false);
                setHasStarted(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                setShowEndScreen(true);
                setIsPlaying(false);
              }
            }
          }
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }
  }, [isLoading, url]);

  // Monitor de tiempo para los 3 segundos finales
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && playerRef.current && playerRef.current.getCurrentTime) {
      interval = setInterval(() => {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();
          if (duration > 0 && (duration - currentTime) <= 3) {
            setShowEndScreen(true);
            clearInterval(interval);
          }
        } catch (e) {
          console.error("Error tracking time:", e);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
      const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handleFsChange);
      return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
      setIsPlaying(false);
      setIsLoading(!!url);
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

      {getSecureUrl(url) ? (
        <iframe
          ref={iframeRef}
          src={getSecureUrl(url)}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10 text-slate-500">
          <Play className="h-12 w-12 opacity-20 mb-4" />
          <p className="text-sm font-bold">Video no disponible aún</p>
        </div>
      )}

      {/* Security Overlay & Custom Play Button */}
      {!isLoading && getSecureUrl(url) && (
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

      {/* End Screen Overlay */}
      {showEndScreen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="text-center p-8 max-w-md">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Play className="h-8 w-8 text-white fill-white ml-1 opacity-50" />
              </div>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
              ¡Gracias por ver!
            </h3>
            <p className="text-slate-300 text-sm md:text-base mb-8">
              Esperamos que este contenido sea de gran utilidad para ti.
            </p>
            <button
              onClick={handleReplay}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-950 font-bold rounded-2xl hover:scale-105 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              <RotateCcw className="h-5 w-5 group-hover:rotate-[-45deg] transition-transform" />
              Ver de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
