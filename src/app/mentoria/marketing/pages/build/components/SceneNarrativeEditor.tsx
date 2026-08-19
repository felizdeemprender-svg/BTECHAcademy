'use client';

import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, 
  Trash2, 
  Mic2, 
  Volume2,
  ImageOff
} from 'lucide-react';
import { ImageEditor } from '@/components/courses/ImageEditor';
import { Switch } from '@/components/ui/switch';

interface SceneNarrativeEditorProps {
  asset: any;
  sIdx: number;
  selectedCourseId: string | null;
  courseTitle?: string;
  updateAsset: (channel: 'socials', variantIdx: number, field: string, value: any, subIndex?: number) => void;
  isGeneratingBreakdown: string | null;
  onGenerateBreakdown: (variant: any, index: number, channel: 'socials') => void;
}

/**
 * Componente modular para la edición de la lista de escenas / placas.
 * Maneja tanto la parte visual (imagen) como la narrativa (texto en pantalla y voz).
 */
export function SceneNarrativeEditor({
  asset: s,
  sIdx,
  selectedCourseId,
  courseTitle,
  updateAsset,
  isGeneratingBreakdown,
  onGenerateBreakdown
}: SceneNarrativeEditorProps) {
  
  const items = s.slides || s.scenes || [];
  const isGeneratingThis = isGeneratingBreakdown === `socials-${sIdx}`;
  const isAiEngine = s.production_notes?.video_engine && s.production_notes.video_engine !== 'ffmpeg';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 mb-2">
        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed max-w-md italic">
          * Cada placa visual representa un segmento de tu video o carrusel.
        </p>
      </div>

      <div className="grid gap-12">
        {items.map((sl: any, i: number) => (
          <div key={i} className="group relative grid md:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. SECCIÓN VISUAL (PANTALLA) */}
            <div className="md:col-span-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <Label className="text-xs font-black uppercase text-foreground tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground">{i + 1}</span>
                  {isAiEngine ? 'Ref. Visual' : 'Escena Visual'}
                </Label>
                <div className="flex items-center gap-3">
                  {isAiEngine && (
                    <div className="flex items-center gap-2 bg-muted/30 px-2 py-1 rounded-lg border border-border">
                      <Label htmlFor={`use-visual-${i}`} className="text-[9px] font-bold text-muted-foreground cursor-pointer">
                        {sl.use_visual_reference !== false ? 'Usar Referencia' : 'Solo Texto'}
                      </Label>
                      <Switch 
                        id={`use-visual-${i}`}
                        checked={sl.use_visual_reference !== false} 
                        onCheckedChange={(checked) => {
                          const newItems = [...items];
                          newItems[i] = { 
                            ...newItems[i], 
                            use_visual_reference: checked,
                            ...(checked ? {} : { imageUrl: '' })
                          };
                          updateAsset('socials', sIdx, 'slides', newItems);
                        }} 
                      />
                    </div>
                  )}
                  {items.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-full transition-colors"
                      onClick={() => {
                        const newSlides = [...items];
                        newSlides.splice(i, 1);
                        updateAsset('socials', sIdx, 'slides', newSlides);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              
              {sl.use_visual_reference !== false ? (
                <div className="relative">
                  {!(sl.voiceover?.trim() || sl.text?.trim() || s.caption?.trim()) && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl px-4 text-center border-2 border-border">
                      <ImageOff className="h-6 w-6 mb-2 opacity-50" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deshabilitado</p>
                      <p className="text-[9px] mt-1 font-medium text-muted-foreground">Genera el guion o escribe un texto primero para poder buscar referencias.</p>
                    </div>
                  )}
                  <div className={`rounded-xl bg-muted/40 border-2 border-border transition-all duration-500 ${!(sl.voiceover?.trim() || sl.text?.trim() || s.caption?.trim()) ? 'opacity-50 pointer-events-none' : ''}`}>
                    <ImageEditor 
                      url={sl.imageUrl}
                      onUpdate={(val) => {
                        const newItems = [...items];
                        newItems[i] = { ...newItems[i], imageUrl: val };
                        updateAsset('socials', sIdx, 'slides', newItems);
                      }}
                      label={`Visual ${i + 1}`}
                      channel="social"
                      courseId={selectedCourseId || 'draft'}
                      courseTitle={courseTitle}
                      keywords={sl.voiceover || sl.text}
                      description={sl.text}
                      aiPromptHint={`Imagen para un video del curso "${courseTitle || ''}". La escena trata sobre: ${sl.voiceover || sl.text || 'contenido educativo'}`}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-muted/10 border-2 border-dashed border-border transition-all duration-500 h-[180px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
                    <ImageOff className="h-5 w-5 opacity-50" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-xs font-bold">Sin Referencia Visual</p>
                    <p className="text-[10px] mt-1 opacity-70">La IA generará la escena libremente basándose en los parámetros de cámara y acción.</p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. SECCIÓN NARRATIVA (GUION) */}
            <div className="md:col-span-8 space-y-4 pt-2">
              <div className={`grid ${s.type === 'carousel' ? 'md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                {/* Mostrar Voiceover Individual en todos los formatos para Narrativa Dual */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2 mb-1">
                    <Mic2 className="h-3 w-3" /> Guion Narrativo (Voz)
                  </Label>
                  <Textarea 
                    value={sl.voiceover || (i === 0 && !sl.voiceover ? (s.production_notes?.voiceover || s.voiceover || '') : '')}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[i] = { ...newItems[i], voiceover: e.target.value };
                      updateAsset('socials', sIdx, 'slides', newItems);
                    }}
                    placeholder="Escribe lo que la voz debe decir en esta escena..."
                    className="bg-white border border-border text-foreground placeholder:text-muted-foreground/40 min-h-[100px] text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary/50 rounded-2xl p-4"
                  />
                  {i === 0 && !sl.voiceover && (s.production_notes?.voiceover || s.voiceover) && (
                    <p className="text-[9px] text-warn/80 italic font-medium">
                      * Usando guion maestro como base.
                    </p>
                  )}
                </div>

                  <div className="grid grid-cols-1 gap-4">
                    {isAiEngine ? (
                      <div className="space-y-4 bg-primary/5 p-4 rounded-2xl border border-primary/20">
                        <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2 mb-2">
                          <Sparkles className="h-3 w-3" /> Parámetros de Cámara y Acción (IA)
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold text-muted-foreground uppercase">Sujeto / Acción</Label>
                            <Input value={sl.subject_action || ''} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], subject_action: e.target.value }; updateAsset('socials', sIdx, 'slides', n); }} placeholder="Ej: Mentor explicando a cámara..." className="text-xs font-medium h-9 bg-white" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold text-muted-foreground uppercase">Encuadre</Label>
                            <Input value={sl.framing || ''} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], framing: e.target.value }; updateAsset('socials', sIdx, 'slides', n); }} placeholder="Ej: close-up, medium shot..." className="text-xs font-medium h-9 bg-white" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold text-muted-foreground uppercase">Mov. Cámara</Label>
                            <Input value={sl.camera_movement || ''} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], camera_movement: e.target.value }; updateAsset('socials', sIdx, 'slides', n); }} placeholder="Ej: slow push-in, static..." className="text-xs font-medium h-9 bg-white" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold text-muted-foreground uppercase">Iluminación / Entorno</Label>
                            <Input value={sl.lighting || ''} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], lighting: e.target.value }; updateAsset('socials', sIdx, 'slides', n); }} placeholder="Ej: luz cálida cinemática..." className="text-xs font-medium h-9 bg-white" />
                          </div>
                        </div>
                        <div className="space-y-2 mt-4 pt-4 border-t border-primary/10">
                          <Label className="text-[9px] font-bold text-muted-foreground uppercase">Texto Superpuesto en Video (Opcional)</Label>
                          <Input value={sl.text || ''} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], text: e.target.value }; updateAsset('socials', sIdx, 'slides', n); }} placeholder="Ej: 3 CLAVES PARA EMPEZAR..." className="text-xs font-bold uppercase h-9 bg-white" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2 mb-1">
                            <Volume2 className="h-3 w-3" /> Texto de Impacto (Pantalla)
                          </Label>
                          <Textarea 
                            value={sl.text || ''}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[i] = { ...newItems[i], text: e.target.value };
                              updateAsset('socials', sIdx, 'slides', newItems);
                            }}
                            placeholder="Frase corta para resaltar en pantalla..."
                            className="bg-white border border-border text-foreground placeholder:text-muted-foreground/40 min-h-[60px] text-sm font-black focus-visible:ring-1 focus-visible:ring-primary/50 rounded-2xl p-4"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 mb-1 opacity-60">
                            <Sparkles className="h-3 w-3" /> Subtítulo / Apoyo
                          </Label>
                          <Input 
                            value={sl.subtitle || ''}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[i] = { ...newItems[i], subtitle: e.target.value };
                              updateAsset('socials', sIdx, 'slides', newItems);
                            }}
                            placeholder="Texto secundario opcional..."
                            className="bg-white border border-border text-foreground placeholder:text-muted-foreground/40 text-xs font-medium focus-visible:ring-1 focus-visible:ring-muted-foreground/50 px-4"
                           size="lg" />
                        </div>
                      </>
                    )}
                  </div>
              </div>

              {/* Ajustes tácticos rápidos */}
               <div className="flex items-center gap-6 px-6 py-4 bg-muted/40 rounded-[1.5rem] border border-border mt-auto">
                 <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Duración (seg)</span>
                    <Input 
                       type="number"
                       step="0.1"
                       value={sl.duration || 4.5}
                       onChange={(e) => {
                          const newItems = [...items];
                          newItems[i] = { ...newItems[i], duration: e.target.value };
                          updateAsset('socials', sIdx, 'slides', newItems);
                       }}
                       className="w-20 h-8 bg-white text-xs font-black border-border text-foreground rounded-xl shadow-lg"
                    />
                 </div>
                 <div className="flex flex-col gap-1.5 flex-1 max-w-[200px]">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Marca de Agua / Crédito</span>
                    <Input 
                       value={sl.watermark || ''}
                       onChange={(e) => {
                          const newItems = [...items];
                          newItems[i] = { ...newItems[i], watermark: e.target.value };
                          updateAsset('socials', sIdx, 'slides', newItems);
                       }}
                       placeholder="@cuenta"
                       className="h-8 bg-white text-xs font-bold border-border text-success rounded-xl px-3 shadow-lg"
                    />
                 </div>
                 <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Segmento</span>
                    <Badge variant="secondary" className="text-[9px] h-8 px-4 bg-primary/10 border border-primary/20 text-primary font-bold uppercase">
                      {sl.segment || 'VALOR'}
                    </Badge>
                 </div>
              </div>
            </div>

            {/* Decoración lateral de línea de tiempo */}
            {i < items.length - 1 && (
              <div className="hidden md:block absolute left-[16.6%] bottom-[-48px] w-0.5 h-12 bg-gradient-to-b from-muted to-transparent" />
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <Button 
          variant="outline" 
          className="w-full h-14 rounded-2xl border-dashed border-2 text-muted-foreground hover:text-foreground" 
          onClick={() => updateAsset('socials', sIdx, 'slides', [{ text: '', imageUrl: '' }])}
        >
          + Agregar Placa Visual
        </Button>
      )}
    </div>
  );
}
