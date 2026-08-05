'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Scroll, 
  Clapperboard, 
  Volume2, 
  MonitorPlay, 
  Loader2, 
  Trash2,
  Download,
  Type,
  Mic2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AudioUploader } from './AudioUploader';

interface VideoProductionPanelProps {
  asset: any;
  sIdx: number;
  pageId: string;
  isRenderingVideo: string | null;
  renderedVideos: Record<number, string | null>;
  updateAsset: (channel: 'landings' | 'emails' | 'socials' | 'ads', variantIdx: number, field: string, value: any, subIndex?: number) => void;
  onGenerateVideo: (s: any, sIdx: number) => void;
  onGenerateVideoIA: (s: any, sIdx: number) => void;
  onDeleteVideo: (sIdx: number) => void;
  googleToken?: string | null;
  onRefreshGoogleToken?: () => Promise<string | null>;
  adns?: Record<string, any>;
  jobProgress?: { progress: number; stage: string } | null;
}

/**
 * Componente modular para el manejo de la producción de video:
 * Guion Maestro, Locutor IA y controles de Renderizado.
 */
export function VideoProductionPanel({
  asset: s,
  sIdx,
  pageId,
  isRenderingVideo,
  renderedVideos,
  updateAsset,
  onGenerateVideo,
  onGenerateVideoIA,
  onDeleteVideo,
  googleToken,
  onRefreshGoogleToken,
  adns = {},
  jobProgress
}: VideoProductionPanelProps) {
  
  const [showConfirm, setShowConfirm] = useState(false);
  const isCurrentlyRendering = isRenderingVideo === `${sIdx}`;
  const videoUrl = renderedVideos[sIdx] || s.production_notes?.video_url;

  // Handler robusto para descarga con refresco de token
  const handleDownload = async (id: string, fileName: string) => {
    try {
      let finalId = id;

      // Si el ID viene vacío, intentar extraerlo de la URL del video como emergencia
      if (!finalId && videoUrl) {
        const driveIdMatch = videoUrl.match(/\/d\/(.+?)\//) || videoUrl.match(/id=(.+?)(&|$)/);
        if (driveIdMatch) finalId = driveIdMatch[1];
      }

      if (!finalId) {
        alert("El ID del video aún no se ha registrado. Por favor, espera un segundo a que se guarde o regenera el video.");
        return;
      }

      const freshToken = onRefreshGoogleToken ? await onRefreshGoogleToken() : (googleToken || localStorage.getItem('evo_google_token'));
      if (!freshToken || freshToken === 'null') {
        alert("No se pudo obtener el acceso a Google Drive. Por favor, intenta de nuevo.");
        return;
      }

      const proxyUrl = `/api/video/download?id=${finalId}&name=${encodeURIComponent(fileName)}&token=${freshToken}`;
      window.open(proxyUrl, '_blank');
    } catch (err: any) {
      alert("Error de autenticación: " + err.message);
    }
  };

  // Detectar si es un archivo ZIP
  const isZip = videoUrl?.toLowerCase().includes('.zip');

  return (
    <div className="p-6 rounded-3xl border-2 border-dashed space-y-6 bg-foreground/50 backdrop-blur-sm" style={{ borderColor: isCurrentlyRendering ? '#8b5cf6' : 'rgba(255,255,255,0.05)' }}>

      {/* Configuración Global de Video */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
          <Clapperboard className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-black text-white uppercase tracking-tighter">Motor de Producción de Video</h4>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Configura el ADN y la Post-Producción</p>
        </div>
        <div className="ml-auto">
          <Select
            value={s.production_notes?.adnId || '01'}
            onValueChange={(val) => {
              updateAsset('socials', sIdx, 'production_notes', {
                ...(s.production_notes || {}),
                adnId: val
              });
            }}
          >
            <SelectTrigger className="h-9 bg-success border-none text-[9px] font-black uppercase text-white px-4 shadow-lg">
              <SelectValue placeholder="ADN" />
            </SelectTrigger>
            <SelectContent className="bg-foreground border-white/10 text-white">
              {Object.values(adns).map((adn: any) => (
                <SelectItem key={adn.id} value={adn.id} className="text-[10px] uppercase font-bold">
                  🎬 {adn.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Subida de MP3 (Música de fondo) */}
      <AudioUploader 
        pageId={pageId} 
        currentAudioUrl={s.production_notes?.audio_url}
        onUploadComplete={(data) => {
           updateAsset('socials', sIdx, 'production_notes', {
             ...(s.production_notes || {}),
             audio_url: data.url,
             audio_filename: data.filename,
             audio_duration: data.duration
           });
        }}
      />

      {/* Selector de Locutor IA y Calidad */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center gap-4 bg-white/5 p-4 rounded-[1.5rem] border border-white/10 group transition-all hover:bg-white/[0.07]">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 group-hover:scale-110 transition-transform">
            <Clapperboard className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5 text-primary/30" />
              <span className="text-[10px] font-black uppercase text-white/90 tracking-widest">Configuración de Voz</span>
            </div>
            <p className="text-[9px] font-bold text-white/40 italic">IA Neural Avanzada</p>
          </div>
          <Select
            value={s.production_notes?.enable_tts ? (s.production_notes?.voice_id || 'mateo') : 'off'}
            onValueChange={(val) => {
              updateAsset('socials', sIdx, 'production_notes', {
                ...(s.production_notes || {}),
                enable_tts: val !== 'off',
                voice_id: val === 'off' ? (s.production_notes?.voice_id || 'mateo') : val
              });
            }}
          >
            <SelectTrigger className="w-[140px] h-10 bg-foreground border-white/10 text-white text-[10px] font-black focus:ring-primary/50">
              <SelectValue placeholder="Elegir Voz" />
            </SelectTrigger>
            <SelectContent className="bg-foreground border-white/10 text-white">
              <SelectItem value="off" className="text-xs hover:bg-white/10 focus:bg-white/10">Desactivada</SelectItem>
              <SelectItem value="dalia" className="text-xs hover:bg-white/10 focus:bg-white/10">Dalia (Soft ES)</SelectItem>
              <SelectItem value="jorge" className="text-xs hover:bg-white/10 focus:bg-white/10">Jorge (Pro ES)</SelectItem>
              <SelectItem value="mateo" className="text-xs hover:bg-white/10 focus:bg-white/10">Alvaro (Mateo)</SelectItem>
              <SelectItem value="elena" className="text-xs hover:bg-white/10 focus:bg-white/10">Elena (Soft MX)</SelectItem>
              <SelectItem value="gerardo" className="text-xs hover:bg-white/10 focus:bg-white/10">Gerardo (Pro MX)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-[200px] flex items-center gap-3 bg-white/5 p-4 rounded-[1.5rem] border border-white/10">
          <div className="flex-1">
            <p className="text-[8px] font-black uppercase text-primary/30 tracking-widest">Calidad de Audio</p>
            <p className="text-[10px] font-bold text-white/90">Estudio Pro</p>
          </div>
          <Select
            value={s.production_notes?.audio_effect || 'auto'}
            onValueChange={(val) => {
              updateAsset('socials', sIdx, 'production_notes', {
                ...(s.production_notes || {}),
                audio_effect: val
              });
            }}
          >
            <SelectTrigger className="w-[100px] h-9 bg-primary border-none text-white text-[9px] font-black shadow-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-foreground border-white/10 text-white">
              <SelectItem value="auto" className="text-xs font-bold text-primary/30">AUTO (ADN)</SelectItem>
              <SelectItem value="studio" className="text-xs">FORZAR ON ✨</SelectItem>
              <SelectItem value="none" className="text-xs">FORZAR OFF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Botón Generar / Reemplazar */}
      {!(videoUrl) ? (
        <>
          <div className="flex flex-col gap-2">
            <Button 
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
              onClick={() => onGenerateVideo(s, sIdx)}
              disabled={isCurrentlyRendering}
            >
              {isCurrentlyRendering ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Encolando render...</>
              ) : (
                <><MonitorPlay className="h-5 w-5" /> Generar Pack Multimedia</>
              )}
            </Button>
            <Button 
              className="w-full h-12 rounded-2xl bg-fuchsia-600/90 hover:bg-fuchsia-500 text-white font-black uppercase tracking-widest text-[10px] gap-3 shadow-lg shadow-fuchsia-600/20 transition-all active:scale-95 disabled:opacity-50"
              onClick={() => onGenerateVideoIA(s, sIdx)}
              disabled={isCurrentlyRendering}
            >
              <Sparkles className="h-4 w-4" /> Video IA (Gemini Omni)
            </Button>
          </div>
          {isCurrentlyRendering && jobProgress && (
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">{jobProgress.stage}</span>
                <span className="text-[10px] font-black text-white">{jobProgress.progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-all duration-700"
                  style={{ width: `${jobProgress.progress}%` }}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
             {s.type === 'carousel' && videoUrl.includes(',') ? (
               <div className="grid grid-cols-2 gap-2">
                 {videoUrl.split(',').map((url: string, uIdx: number) => {
                   const ids = (s.production_notes?.video_drive_id || '').split(',');
                   const id = ids[uIdx]?.trim();
                   return (
                     <Button 
                        key={uIdx}
                        variant="outline"
                        className="h-12 rounded-xl bg-primary/20 hover:bg-primary text-white border-white/10 text-[9px] font-black uppercase transition-all shadow-lg"
                        onClick={() => {
                          const fileName = `Placa_${uIdx + 1}_${s.marketingName || 'Asset'}.mp4`;
                          handleDownload(id, fileName);
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" /> Placa {uIdx + 1}
                      </Button>
                   );
                 })}
               </div>
             ) : (
               <Button 
                  variant="outline"
                  className="w-full h-14 rounded-2xl border-white/10 bg-primary hover:bg-primary text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg transition-all active:scale-95"
                  onClick={() => {
                    const ids = (s.production_notes?.video_drive_id || '').split(',');
                    const id = ids[0]?.trim();
                    const fileName = `${s.marketingName || 'Video'}.mp4`;
                    handleDownload(id, fileName);
                  }}
                >
                  <Download className="h-5 w-5" /> Descargar MP4 Final
                </Button>
             )}
          </div>
          <div className="flex gap-2">
            <Button 
               className="flex-1 h-14 rounded-2xl bg-success hover:bg-success text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-success/15 transition-all active:scale-95 disabled:opacity-50"
               onClick={() => {
                 setShowConfirm(false);
                 onGenerateVideo(s, sIdx);
               }}
               disabled={isCurrentlyRendering}
            >
              {isCurrentlyRendering ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Actualizando...</>
              ) : (
                <><MonitorPlay className="h-5 w-5" /> Regenerar Todo</>
              )}
            </Button>
            <Button 
              variant="outline"
              className={cn(
                "w-14 h-14 rounded-2xl border-2 transition-all active:scale-95",
                showConfirm 
                  ? "bg-danger border-danger text-white hover:bg-danger" 
                  : "border-danger/20 text-danger hover:bg-danger/10 hover:text-danger"
              )}
              onClick={() => {
                if (showConfirm) {
                  onDeleteVideo(sIdx);
                  setShowConfirm(false);
                } else {
                  setShowConfirm(true);
                  setTimeout(() => setShowConfirm(false), 3000);
                }
              }}
              disabled={isCurrentlyRendering}
            >
              {showConfirm ? <Trash2 className="h-5 w-5 animate-pulse" /> : <Trash2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
