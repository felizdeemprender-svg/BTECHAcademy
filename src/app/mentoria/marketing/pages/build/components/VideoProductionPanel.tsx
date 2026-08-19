'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Clapperboard, Sparkles, Wand2, Plus, GripVertical, Settings2, Image as ImageIcon, Volume2, Mic2, 
  Trash2, Copy, MonitorPlay, AlertTriangle, ExternalLink, Download, FileAudio, FileDown,
  Captions, User2, Loader2, PlayCircle, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AudioUploader } from './AudioUploader';
import { VideoPromptModal, EDITOR_NAMES } from './VideoPromptModal';

interface VideoProductionPanelProps {
  asset: any;
  sIdx: number;
  pageId: string;
  isRenderingVideo: string | null;
  renderedVideos: Record<number, string | null>;
  updateAsset: (channel: 'landings' | 'emails' | 'socials' | 'ads', variantIdx: number, field: string, value: any, subIndex?: number) => void;
  onGenerateVideo: (s: any, sIdx: number) => void;
  onGenerateVideoIA: (s: any, sIdx: number) => void;
  onGenerateLongVideo?: (s: any, sIdx: number) => void;
  onGeneratePrompt?: (s: any, sIdx: number) => void;
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
  onGenerateLongVideo,
  onGeneratePrompt,
  onDeleteVideo,
  googleToken,
  onRefreshGoogleToken,
  adns = {},
  jobProgress
}: VideoProductionPanelProps) {
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const isCurrentlyRendering = isRenderingVideo === `${sIdx}`;
  const videoUrl = renderedVideos[sIdx] || s.production_notes?.video_url;
  const videoEngine = s.production_notes?.video_engine || 'ffmpeg';
  const exportEngine = s.production_notes?.export_engine || 'seedance';
  const hasPrompt = !!s.production_notes?.video_prompt;

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
    <div className="p-6 rounded-3xl border-2 border-dashed space-y-6 bg-white overflow-x-auto" style={{ borderColor: isCurrentlyRendering ? '#760464' : '#d9d9d9' }}>

      {/* Configuración Global de Video */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
          <Clapperboard className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-black text-foreground uppercase tracking-tighter">Motor de Producción de Video</h4>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Configura el ADN y la Post-Producción</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={videoEngine}
            onValueChange={(val) => {
              updateAsset('socials', sIdx, 'production_notes', {
                ...(s.production_notes || {}),
                video_engine: val
              });
            }}
          >
            <SelectTrigger className="h-9 bg-white border-2 border-primary text-[9px] font-black uppercase text-primary px-3 shadow-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-border text-foreground">
              <SelectItem value="ffmpeg" className="text-[10px] font-bold uppercase">FFmpeg (Motor Propio)</SelectItem>
              <SelectItem value="long" className="text-[10px] font-bold uppercase">Seedance (AI Video)</SelectItem>
              <SelectItem value="prompt" className="text-[10px] font-bold uppercase">Solo Prompt (Externos)</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={s.production_notes?.adnId || '01'}
            onValueChange={(val) => {
              updateAsset('socials', sIdx, 'production_notes', {
                ...(s.production_notes || {}),
                adnId: val
              });
            }}
          >
            <SelectTrigger className="h-9 bg-primary border-2 border-primary text-[9px] font-black uppercase text-white px-4 shadow-lg">
              <SelectValue placeholder="ADN" />
            </SelectTrigger>
            <SelectContent className="bg-white border-border text-foreground">
              {Object.values(adns).map((adn: any) => (
                <SelectItem key={adn.id} value={adn.id} className="text-[10px] uppercase font-bold">
                  🎬 {adn.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Banner según motor elegido */}
      {videoEngine !== 'ffmpeg' && videoEngine !== 'long' && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-primary/30 bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase text-primary tracking-widest">
              {videoEngine === 'omni' ? 'Modo Omni (Gemini)' : 'Modo Prompt para Editores Externos'}
            </p>
            <p className="text-[9px] font-medium text-muted-foreground leading-relaxed">
              {videoEngine === 'omni'
                ? 'Genera el clip directamente con IA a partir del guion afinado por ADN. No se usa música MP3 ni calidad de audio manual: lo resuelve la IA.'
                : 'Escribe el prompt específico del editor (Seedance, Veo, Runway, Pika, Wan) usando tus escenas, persona y subtítulos. Copialo en la herramienta externa.'}
            </p>
          </div>
        </div>
      )}

      {/* Banner específico de Video Largo */}
      {videoEngine === 'long' && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-primary/30 bg-primary/5">
          <MonitorPlay className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase text-primary tracking-widest">Video Largo (AI Video API · Seedance)</p>
            <p className="text-[9px] font-medium text-muted-foreground leading-relaxed">
              Genera un video continuo de 4–180s en un solo request usando tus escenas editadas, con consistencia de personaje/fondo y audio nativo. Misma voz, ropa y fondo en todo el video.
            </p>
          </div>
        </div>
      )}

      {/* Subida de MP3 (Música de fondo) — SOLO FFmpeg */}
      {videoEngine === 'ffmpeg' && (
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
      )}

      {/* Selector de Locutor IA (voz para el guion/prompt) y Calidad de Audio (solo FFmpeg) */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center gap-4 bg-muted/30 p-4 rounded-[1.5rem] border border-border group transition-all hover:bg-muted/40">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 group-hover:scale-110 transition-transform">
            <Volume2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <Mic2 className="h-3.5 w-3.5 text-primary/30" />
              <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Voz del Guion</span>
            </div>
            <p className="text-[9px] font-bold text-muted-foreground italic">{videoEngine === 'ffmpeg' ? 'Locutor IA Neural' : videoEngine === 'long' ? 'Voz consistente en todo el video' : 'Define la voz que se indica en el prompt'}</p>
          </div>
          <Select
            value={s.production_notes?.enable_tts !== false ? (s.production_notes?.voice_id || 'mateo') : 'off'}
            onValueChange={(val) => {
              updateAsset('socials', sIdx, 'production_notes', {
                ...(s.production_notes || {}),
                enable_tts: val !== 'off',
                voice_id: val === 'off' ? (s.production_notes?.voice_id || 'mateo') : val
              });
            }}
          >
            <SelectTrigger className="w-[140px] h-10 bg-white border-border text-foreground text-[10px] font-black focus:ring-primary/50">
              <SelectValue placeholder="Elegir Voz" />
            </SelectTrigger>
            <SelectContent className="bg-white border-border text-foreground">
              <SelectItem value="off" className="text-xs hover:bg-muted focus:bg-muted">Desactivada</SelectItem>
              <SelectItem value="dalia" className="text-xs hover:bg-muted focus:bg-muted">Dalia (Soft ES)</SelectItem>
              <SelectItem value="jorge" className="text-xs hover:bg-muted focus:bg-muted">Jorge (Pro ES)</SelectItem>
              <SelectItem value="mateo" className="text-xs hover:bg-muted focus:bg-muted">Alvaro (Mateo)</SelectItem>
              <SelectItem value="elena" className="text-xs hover:bg-muted focus:bg-muted">Elena (Soft MX)</SelectItem>
              <SelectItem value="gerardo" className="text-xs hover:bg-muted focus:bg-muted">Gerardo (Pro MX)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {videoEngine === 'ffmpeg' && (
          <div className="w-full md:w-[200px] flex items-center gap-3 bg-muted/30 p-4 rounded-[1.5rem] border border-border">
            <div className="flex-1">
              <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Calidad de Audio</p>
              <p className="text-[10px] font-bold text-foreground">Estudio Pro</p>
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
              <SelectContent className="bg-white border-border text-foreground">
                <SelectItem value="auto" className="text-xs font-bold text-primary/40">AUTO (ADN)</SelectItem>
                <SelectItem value="studio" className="text-xs">FORZAR ON</SelectItem>
                <SelectItem value="none" className="text-xs">FORZAR OFF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Botón Generar / Reemplazar */}
      {!(videoUrl) || videoEngine === 'prompt' ? (
        <>
          {videoEngine === 'prompt' ? (
            <>
              <div className="flex flex-col md:flex-row items-center gap-4 bg-muted/30 p-4 rounded-[1.5rem] border border-border">
                <div className="flex-1 space-y-0.5">
                  <p className="text-[10px] font-black uppercase text-foreground tracking-widest">Editor Externo de Video</p>
                  <p className="text-[9px] font-bold text-muted-foreground italic">Genera el guion afinado por ADN y cópialo en tu herramienta.</p>
                </div>
                <Select
                  value={s.production_notes?.export_engine || 'seedance'}
                  onValueChange={(val) => {
                    updateAsset('socials', sIdx, 'production_notes', {
                      ...(s.production_notes || {}),
                      export_engine: val
                    });
                  }}
                >
                  <SelectTrigger className="w-[170px] h-10 bg-white border-border text-foreground text-[10px] font-black focus:ring-primary/50">
                    <SelectValue placeholder="Herramienta" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-foreground">
                    <SelectItem value="seedance" className="text-xs hover:bg-muted focus:bg-muted">Seedance</SelectItem>
                    <SelectItem value="veo" className="text-xs hover:bg-muted focus:bg-muted">Veo</SelectItem>
                    <SelectItem value="runway" className="text-xs hover:bg-muted focus:bg-muted">Runway</SelectItem>
                    <SelectItem value="pika" className="text-xs hover:bg-muted focus:bg-muted">Pika</SelectItem>
                    <SelectItem value="wan" className="text-xs hover:bg-muted focus:bg-muted">Wan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Especificaciones del prompt: persona + subtítulos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-xl border border-border">
                  <User2 className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-[9px] font-black uppercase text-foreground tracking-widest">Persona en cámara</p>
                    <p className="text-[8px] font-bold text-muted-foreground">Presentador/a o solo escenas</p>
                  </div>
                  <Select
                    value={s.production_notes?.persona_enabled ? 'si' : 'no'}
                    onValueChange={(val) => {
                      updateAsset('socials', sIdx, 'production_notes', {
                        ...(s.production_notes || {}),
                        persona_enabled: val === 'si'
                      });
                    }}
                  >
                    <SelectTrigger className="w-[80px] h-8 bg-white border-border text-foreground text-[9px] font-black focus:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-border text-foreground">
                      <SelectItem value="no" className="text-xs">NO</SelectItem>
                      <SelectItem value="si" className="text-xs">SÍ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-xl border border-border">
                  <Captions className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-[9px] font-black uppercase text-foreground tracking-widest">Subtítulos</p>
                    <p className="text-[8px] font-bold text-muted-foreground">SRT sincronizado en el prompt</p>
                  </div>
                  <Select
                    value={s.production_notes?.subtitles_enabled !== false ? 'si' : 'no'}
                    onValueChange={(val) => {
                      updateAsset('socials', sIdx, 'production_notes', {
                        ...(s.production_notes || {}),
                        subtitles_enabled: val === 'si'
                      });
                    }}
                  >
                    <SelectTrigger className="w-[80px] h-8 bg-white border-border text-foreground text-[9px] font-black focus:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-border text-foreground">
                      <SelectItem value="no" className="text-xs">NO</SelectItem>
                      <SelectItem value="si" className="text-xs">SÍ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {s.production_notes?.persona_enabled && (
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Descripción de la persona (opcional)</Label>
                  <Input
                    value={s.production_notes?.persona_description || ''}
                    onChange={(e) => {
                      updateAsset('socials', sIdx, 'production_notes', {
                        ...(s.production_notes || {}),
                        persona_description: e.target.value
                      });
                    }}
                    placeholder="Ej: mujer de 30s, vestimenta formal-casual, encuadre medio..."
                    className="bg-white border-border text-foreground text-xs font-medium h-10"
                  />
                </div>
              )}

              <Button 
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                onClick={() => onGeneratePrompt?.(s, sIdx)}
                disabled={isCurrentlyRendering}
              >
                {isCurrentlyRendering ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Redactando prompt...</>
                ) : (
                  <><Sparkles className="h-5 w-5" /> Generar Prompt Externo</>
                )}
              </Button>

              {s.production_notes?.video_prompt && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col md:flex-row items-center gap-3">
                    <div className="flex-1 space-y-0.5">
                      <p className="text-[10px] font-black uppercase text-foreground tracking-widest">
                        Prompt generado para {EDITOR_NAMES[exportEngine] || exportEngine}
                        {(s.production_notes?.video_prompt_scenes?.length ?? 0) > 1 && (
                          <span className="ml-2 text-[9px] text-primary">· {s.production_notes.video_prompt_scenes.length} escenas</span>
                        )}
                      </p>
                      <p className="text-[9px] font-bold text-muted-foreground italic">
                        Revisá el prompt y el detalle por escena en el modal específico del editor.
                      </p>
                    </div>
                    <Button
                      className="h-10 rounded-xl bg-primary hover:bg-primary text-white text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/20 shrink-0"
                      onClick={() => setPromptModalOpen(true)}
                    >
                      <Sparkles className="h-4 w-4" /> Abrir Prompt {EDITOR_NAMES[exportEngine] || exportEngine}
                    </Button>
                  </div>

                  <VideoPromptModal
                    open={promptModalOpen}
                    onOpenChange={setPromptModalOpen}
                    engine={exportEngine}
                    prompt={s.production_notes.video_prompt}
                    perScene={s.production_notes.video_prompt_scenes || []}
                    notes={s.production_notes || {}}
                    sceneCount={s.production_notes.video_prompt_scenes?.length || 0}
                    format={s.type === 'story' || s.type === 'short_video' ? '9:16' : s.type === 'portrait_post' ? '4:5' : s.type === 'single_post' ? '1:1' : '9:16'}
                    isRendering={isCurrentlyRendering}
                    onRegenerate={() => onGeneratePrompt?.(s, sIdx)}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Button 
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                onClick={() => {
                  if (videoEngine === 'omni' || videoEngine === 'long') onGenerateLongVideo?.(s, sIdx);
                  else onGenerateVideo(s, sIdx);
                }}
                disabled={isCurrentlyRendering}
              >
                {isCurrentlyRendering ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Encolando render...</>
                ) : (
                  (videoEngine === 'omni' || videoEngine === 'long')
                    ? <><Sparkles className="h-5 w-5" /> Generar con IA (Seedance)</>
                    : <><MonitorPlay className="h-5 w-5" /> Generar Pack Multimedia</>
                )}
              </Button>
              
              <Button 
                className="w-full h-12 rounded-2xl bg-foreground hover:bg-foreground/90 text-white font-black uppercase tracking-widest text-[10px] gap-3 shadow-lg shadow-foreground/10 transition-all active:scale-95 disabled:opacity-50"
                onClick={() => onGeneratePrompt?.(s, sIdx)}
                disabled={isCurrentlyRendering}
              >
                <FileText className="h-4 w-4" /> Solo Exportar Guion (Prompt)
              </Button>
              
              {videoEngine !== 'omni' && videoEngine !== 'long' && (
                <Button 
                  className="w-full h-12 rounded-2xl bg-muted text-foreground hover:bg-muted/80 font-black uppercase tracking-widest text-[10px] gap-3 shadow-lg transition-all active:scale-95 disabled:opacity-50 border border-border"
                  onClick={() => onGenerateLongVideo?.(s, sIdx)}
                  disabled={isCurrentlyRendering}
                >
                  <Sparkles className="h-4 w-4 text-primary" /> Generar con Inteligencia Artificial
                </Button>
              )}
            </div>
          )}
          {isCurrentlyRendering && jobProgress && (
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{jobProgress.stage}</span>
                <span className="text-[10px] font-black text-foreground">{jobProgress.progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-border overflow-hidden">
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
                        className="h-12 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white border-primary/20 text-[9px] font-black uppercase transition-all shadow-lg"
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
                  className="w-full h-14 rounded-2xl border-primary/20 bg-primary/10 hover:bg-primary text-primary hover:text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg transition-all active:scale-95"
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
               className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs gap-3 border-2 border-primary shadow-lg shadow-primary/15 transition-all active:scale-95 disabled:opacity-50"
               onClick={() => {
                 setShowConfirm(false);
                 if (videoEngine === 'omni') onGenerateVideoIA(s, sIdx);
                 else if (videoEngine === 'long') onGenerateLongVideo?.(s, sIdx);
                 else onGenerateVideo(s, sIdx);
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
