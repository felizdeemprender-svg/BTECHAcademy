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
  Mic2
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
  onDeleteVideo: (sIdx: number) => void;
  googleToken?: string | null;
  onRefreshGoogleToken?: () => Promise<string | null>;
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
  onDeleteVideo,
  googleToken,
  onRefreshGoogleToken
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
    <div className="p-6 rounded-3xl border-2 border-dashed space-y-6 bg-slate-800/50 backdrop-blur-sm" style={{ borderColor: isCurrentlyRendering ? '#8b5cf6' : 'rgba(255,255,255,0.05)' }}>

      {/* Configuración Global de Video */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
          <Clapperboard className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-black text-white uppercase tracking-tighter">Motor de Producción de Video</h4>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Configura el ADN y la Post-Producción</p>
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
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 border border-violet-500/20 group-hover:scale-110 transition-transform">
            <Clapperboard className="h-5 w-5 text-violet-400" />
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5 text-violet-300" />
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
            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-slate-900 border-white/10 text-white text-[10px] font-black focus:ring-violet-500/50 shadow-2xl">
              <SelectValue placeholder="Elegir Voz" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              <SelectItem value="off" className="text-xs hover:bg-white/10 focus:bg-white/10">🚫 Desactivada</SelectItem>
              <SelectItem value="sofia" className="text-xs hover:bg-white/10 focus:bg-white/10">👩‍💼 Sofía (ES)</SelectItem>
              <SelectItem value="mateo" className="text-xs hover:bg-white/10 focus:bg-white/10">👨‍💼 Mateo (ES)</SelectItem>
              <SelectItem value="ximena" className="text-xs hover:bg-white/10 focus:bg-white/10">👩‍🎨 Ximena (MX)</SelectItem>
              <SelectItem value="diego" className="text-xs hover:bg-white/10 focus:bg-white/10">👨‍🚀 Diego (MX)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-[200px] flex items-center gap-3 bg-white/5 p-4 rounded-[1.5rem] border border-white/10">
          <div className="flex-1">
            <p className="text-[8px] font-black uppercase text-violet-300 tracking-widest">Calidad de Audio</p>
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
            <SelectTrigger className="w-[100px] h-9 rounded-xl bg-violet-600 border-none text-white text-[9px] font-black shadow-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              <SelectItem value="auto" className="text-xs font-bold text-violet-300">AUTO (ADN)</SelectItem>
              <SelectItem value="studio" className="text-xs">FORZAR ON ✨</SelectItem>
              <SelectItem value="none" className="text-xs">FORZAR OFF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Botón Generar / Reemplazar */}
      {!(videoUrl) ? (
        <Button 
          className="w-full h-14 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-violet-200 transition-all active:scale-95 disabled:opacity-50"
          onClick={() => onGenerateVideo(s, sIdx)}
          disabled={isCurrentlyRendering}
        >
          {isCurrentlyRendering ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Renderizando {s.type === 'carousel' ? 'Carrusel' : 'Video'}...</>
          ) : (
            <><MonitorPlay className="h-5 w-5" /> Generar Pack Multimedia</>
          )}
        </Button>
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
                        className="h-12 rounded-xl bg-violet-600/20 hover:bg-violet-600 text-white border-white/10 text-[9px] font-black uppercase transition-all shadow-lg"
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
                  className="w-full h-14 rounded-2xl border-white/10 bg-violet-600 hover:bg-violet-700 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg transition-all active:scale-95"
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
               className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
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
                  ? "bg-red-600 border-red-500 text-white hover:bg-red-700" 
                  : "border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-500"
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
