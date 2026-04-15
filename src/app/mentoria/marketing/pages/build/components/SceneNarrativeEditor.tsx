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
  Volume2 
} from 'lucide-react';
import { ImageEditor } from '@/components/courses/ImageEditor';

interface SceneNarrativeEditorProps {
  asset: any;
  sIdx: number;
  selectedCourseId: string | null;
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
  updateAsset,
  isGeneratingBreakdown,
  onGenerateBreakdown
}: SceneNarrativeEditorProps) {
  
  const items = s.slides || s.scenes || [];
  const isGeneratingThis = isGeneratingBreakdown === `socials-${sIdx}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 mb-2">
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-md italic">
          * Cada placa visual representa un segmento de tu video o carrusel.
        </p>
      </div>

      <div className="grid gap-12">
        {items.map((sl: any, i: number) => (
          <div key={i} className="group relative grid md:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. SECCIÓN VISUAL (PANTALLA) */}
            <div className="md:col-span-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <Label className="text-xs font-black uppercase text-white/90 tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-white/10 flex items-center justify-center text-[10px] text-white/60">{i + 1}</span>
                  Escena Visual
                </Label>
                {items.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
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
              
              <div className="aspect-[4/5] rounded-[2rem] overflow-hidden bg-slate-800 border-2 border-white/5 shadow-2xl group-hover:scale-[1.01] transition-all duration-500">
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
                  keywords={sl.text}
                  description={sl.voiceover}
                />
              </div>
            </div>

            {/* 2. SECCIÓN NARRATIVA (GUION) */}
            <div className="md:col-span-8 space-y-4 pt-2">
              <div className={`grid ${s.type === 'carousel' ? 'md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                {/* Solo mostrar Voiceover Individual en Carruseles. En Single/Story manda el Maestro. */}
                {s.type === 'carousel' && (
                   <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-violet-300 flex items-center gap-2 mb-1">
                      <Mic2 className="h-3 w-3" /> Guion Narrativo (Voz de IA)
                    </Label>
                    <Textarea 
                      value={sl.voiceover || ''}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[i] = { ...newItems[i], voiceover: e.target.value };
                        updateAsset('socials', sIdx, 'slides', newItems);
                      }}
                      placeholder="Escribe lo que la voz de IA dirá en esta escena..."
                      className="bg-white/5 border border-white/10 text-white placeholder:text-white/20 min-h-[100px] text-sm font-medium focus-visible:ring-1 focus-visible:ring-violet-500/50 rounded-2xl p-4"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-cyan-300 flex items-center gap-2 mb-1">
                    <Volume2 className="h-3 w-3" /> Texto de Impacto (Pantalla)
                  </Label>
                  <Textarea 
                    value={sl.text || ''}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[i] = { ...newItems[i], text: e.target.value };
                      updateAsset('socials', sIdx, 'slides', newItems);
                    }}
                    placeholder="Frase corta para resaltar en video..."
                    className="bg-white/5 border border-white/10 text-white placeholder:text-white/20 min-h-[100px] text-sm font-medium focus-visible:ring-1 focus-visible:ring-cyan-500/50 rounded-2xl p-4"
                  />
                </div>
              </div>

              {/* Ajustes tácticos rápidos */}
               <div className="flex items-center gap-6 px-6 py-4 bg-white/5 rounded-[1.5rem] border border-white/5 mt-auto">
                 <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Duración (seg)</span>
                    <Input 
                       type="number"
                       step="0.1"
                       value={sl.duration || 4.5}
                       onChange={(e) => {
                          const newItems = [...items];
                          newItems[i] = { ...newItems[i], duration: e.target.value };
                          updateAsset('socials', sIdx, 'slides', newItems);
                       }}
                       className="w-20 h-8 bg-slate-900 text-xs font-black border-white/10 text-white rounded-xl shadow-lg"
                    />
                 </div>
                 <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Segmento Narrativo</span>
                    <Badge variant="secondary" className="text-[9px] h-8 px-4 bg-violet-500/20 border border-violet-500/30 text-violet-300 font-bold uppercase">
                      {sl.segment || 'CONTENIDO'}
                    </Badge>
                 </div>
              </div>
            </div>

            {/* Decoración lateral de línea de tiempo */}
            {i < items.length - 1 && (
              <div className="hidden md:block absolute left-[16.6%] bottom-[-48px] w-0.5 h-12 bg-gradient-to-b from-slate-100 to-transparent" />
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <Button 
          variant="outline" 
          className="w-full h-14 rounded-2xl border-dashed border-2 text-white/40 hover:text-white" 
          onClick={() => updateAsset('socials', sIdx, 'slides', [{ text: '', imageUrl: '' }])}
        >
          + Agregar Placa Visual
        </Button>
      )}
    </div>
  );
}
