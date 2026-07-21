'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Layout, 
  Save, 
  Loader2,
  CheckCircle2,
  Video,
  Sparkles,
  Plus,
  Trash2,
  Mic2,
  Brain,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageEditor } from '@/components/courses/ImageEditor';
import { useToast } from '@/hooks/use-toast';
import { generateLandingVariantContent } from '@/ai/flows/generate-landing-content';

interface LandingEditorProps {
  generatedAssets: any;
  blueprintData: any;
  activeLandingIdx: number;
  setActiveLandingIdx: (idx: number) => void;
  selectedCourseId: string | null;
  courseTitle: string;
  courseDescription: string;
  price: number;
  mission: 'venta' | 'autoridad' | 'lanzamiento' | 'leads';
  targetAudience: string;
  templateDirectives: string;
  updateAsset: (channel: 'landings', variantIdx: number, field: string, value: any, subIndex?: number) => void;
  loading: boolean;
  onSave: (overrideAssets?: any, silentAutoSave?: boolean) => void;
}

export function LandingEditor({
  generatedAssets,
  activeLandingIdx, 
  setActiveLandingIdx,
  selectedCourseId,
  courseTitle,
  courseDescription,
  price,
  mission,
  targetAudience,
  templateDirectives,
  updateAsset,
  loading,
  onSave,
}: LandingEditorProps) {
  const { toast } = useToast();
  const [isRegenerating, setIsRegenerating] = useState<number | null>(null);

  const handleSaveIntercept = () => {
    // Validar que si la variante de landing tiene habilitado el video, se haya ingresado una URL de video
    for (let i = 0; i < (generatedAssets?.landings?.length || 0); i++) {
      const l = generatedAssets.landings[i];
      const hasVideo = l.showVideo !== undefined ? l.showVideo : !!l.videoUrl?.trim();
      if (hasVideo && !l.videoUrl?.trim()) {
        toast({
          variant: 'destructive',
          title: `Video Requerido`,
          description: `Has habilitado la opción de incluir video en la variante "${l.marketingName || `Ruta ${i + 1}`}", por lo que debes ingresar una URL de video de venta.`
        });
        setActiveLandingIdx(i);
        return;
      }
    }
    onSave();
  };

  const handleRegenerate = async (lIdx: number) => {
    const l = generatedAssets?.landings?.[lIdx];
    if (!l) return;
    setIsRegenerating(lIdx);
    try {
      const result = await generateLandingVariantContent(
        l,
        courseTitle,
        courseDescription,
        price,
        mission,
        targetAudience,
        templateDirectives
      );
      if (result) {
        // Actualizar todos los campos de la landing
        Object.keys(result).forEach(key => {
          updateAsset('landings', lIdx, key, (result as any)[key]);
        });
        toast({ title: 'Contenido Regenerado', description: 'La IA ha actualizado el copy de esta variante.' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo regenerar el contenido.' });
    } finally {
      setIsRegenerating(null);
    }
  };

  if (!generatedAssets) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-700">Cargando editor de landings...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg">
            <Layout className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Editor de Landings</h2>
            <p className="text-slate-500">Refina el copy de tus 3 variantes estratégicas.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSaveIntercept} disabled={loading} className="h-16 px-12 rounded-2xl font-bold text-xl shadow-2xl bg-primary gap-3">
            {loading ? <Loader2 className="animate-spin" /> : <Save className="h-6 w-6" />} Guardar Landings
          </Button>
        </div>
      </header>

      <div className="space-y-8">
        <Tabs value={activeLandingIdx.toString()} onValueChange={v => setActiveLandingIdx(parseInt(v))}>
          <TabsList className="bg-slate-100 p-1 h-12 justify-start gap-1 rounded-xl mb-8 border border-slate-200 shadow-sm flex-wrap w-fit">
            {generatedAssets?.landings?.map((l: any, i: number) => (
              <TabsTrigger key={i} value={i.toString()} className="rounded-lg px-6 h-10 text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900 text-slate-400">
                {l.marketingName || `Ruta ${i + 1}`}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {generatedAssets?.landings?.map((l: any, lIdx: number) => (
            <TabsContent key={lIdx} value={lIdx.toString()} className="space-y-8">
              <Card className="p-10 rounded-[2.5rem] bg-slate-900 border border-white/10 shadow-xl overflow-hidden relative">
                {/* Botón de IA */}
                <div className="absolute top-6 right-6 z-20">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleRegenerate(lIdx)}
                    disabled={isRegenerating === lIdx}
                    className="h-10 px-6 rounded-xl bg-white text-slate-950 font-black text-[10px] uppercase tracking-wider hover:bg-emerald-50 transition-all shadow-xl"
                  >
                    {isRegenerating === lIdx ? (
                      <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> REGENERANDO...</>
                    ) : (
                      <><Brain className="h-3 w-3 mr-2 text-emerald-600" /> RE-GENERAR CON IA</>
                    )}
                  </Button>
                </div>

                <div className="space-y-6 relative z-10 pt-8">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Nombre Comercial</Label>
                     <Input value={l.marketingName || ''} onChange={e => updateAsset('landings', lIdx, 'marketingName', e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/5 px-8 font-bold text-white focus-visible:ring-emerald-500/50" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Titular Principal (Hero)</Label>
                     <Textarea value={l.headline || ''} onChange={e => updateAsset('landings', lIdx, 'headline', e.target.value)} className="text-3xl font-black text-white border-none bg-white/5 rounded-3xl p-8 min-h-[120px] focus-visible:ring-emerald-500/50" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Subtítulo de Apoyo (Hero)</Label>
                     <Textarea value={l.subheadline || ''} onChange={e => updateAsset('landings', lIdx, 'subheadline', e.target.value)} className="text-lg font-medium text-slate-300 border-none bg-white/5 rounded-3xl p-8 min-h-[100px] focus-visible:ring-emerald-500/50" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Texto del Botón de Compra (CTA)</Label>
                     <Input value={l.ctaText || ''} onChange={e => updateAsset('landings', lIdx, 'ctaText', e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/5 px-8 font-bold text-white focus-visible:ring-emerald-500/50" />
                  </div>
                </div>
              </Card>

              <Card className="p-10 rounded-[2.5rem] bg-slate-900 border border-white/10 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <Video className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Video de Venta / Introducción</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Elige si quieres incluir un video explicativo en tu landing page.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor={`show-video-${lIdx}`} className="text-xs font-bold text-slate-300 cursor-pointer">
                      {(l.showVideo !== undefined ? l.showVideo : !!l.videoUrl?.trim()) ? "Video Habilitado" : "Sin Video"}
                    </Label>
                    <Switch
                      id={`show-video-${lIdx}`}
                      checked={l.showVideo !== undefined ? l.showVideo : !!l.videoUrl?.trim()}
                      onCheckedChange={checked => {
                        updateAsset('landings', lIdx, 'showVideo', checked);
                        if (!checked) {
                          // Opcionalmente podemos mantener o limpiar la URL
                        }
                      }}
                    />
                  </div>
                </div>

                {(l.showVideo !== undefined ? l.showVideo : !!l.videoUrl?.trim()) ? (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest flex items-center gap-2">
                      <span>URL del Video de Venta</span>
                      <span className="text-red-400 font-bold text-[9px] lowercase tracking-normal">(obligatorio)</span>
                    </Label>
                    <Input 
                      placeholder="https://www.youtube.com/watch?v=... o https://vimeo.com/..." 
                      value={l.videoUrl || ''} 
                      onChange={e => updateAsset('landings', lIdx, 'videoUrl', e.target.value)} 
                      className="h-14 rounded-2xl bg-white/5 border-white/5 px-8 font-mono text-xs text-emerald-400 focus-visible:ring-emerald-500/50" 
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/40 rounded-2xl border border-dashed border-white/5 text-center">
                    <p className="text-xs text-slate-400 italic">
                      El video está desactivado para esta variante. No se mostrará ningún video en la landing page y el campo no es obligatorio.
                    </p>
                  </div>
                )}
              </Card>

              <div className="space-y-8">
                {l.sections?.map((section: any, sIdx: number) => (
                  <Card key={sIdx} className="p-12 rounded-[3.5rem] bg-slate-900 border border-white/10 shadow-2xl">
                    <div className="grid lg:grid-cols-2 gap-12">
                      <div className="space-y-8">
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black text-slate-500 ml-4 tracking-[0.3em]">TÍTULO DE SECCIÓN</Label>
                          <Input value={section.title || ''} onChange={e => { const s = [...l.sections]; s[sIdx].title = e.target.value; updateAsset('landings', lIdx, 'sections', s); }} className="font-black text-xl border-none bg-white/5 text-white rounded-2xl h-14 px-8" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black text-slate-500 ml-4 tracking-[0.3em]">CUERPO DE TEXTO</Label>
                          <Textarea value={section.paragraph || ''} onChange={e => { const s = [...l.sections]; s[sIdx].paragraph = e.target.value; updateAsset('landings', lIdx, 'sections', s); }} className="min-h-[180px] border-none bg-white/5 text-slate-300 rounded-[2rem] p-8 text-base font-medium leading-relaxed" />
                        </div>
                      </div>
                      <ImageEditor label={`Imagen ${sIdx + 1}`} url={section.imageUrl || ''} onUpdate={u => { const s = [...l.sections]; s[sIdx].imageUrl = u; updateAsset('landings', lIdx, 'sections', s); }} courseId={selectedCourseId || ''} channel="landing" keywords={section.title} description={section.paragraph} />
                    </div>

                    <div className="mt-10 pt-10 border-t border-white/5 space-y-4">
                      <div className="flex items-center gap-2 ml-4">
                        <Sparkles className="h-3 w-3 text-emerald-500" />
                        <Label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Viñetas Potentes por Sección</Label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {section.microBullets?.map((bullet: string, bIdx: number) => (
                          <div key={bIdx} className="group relative">
                            <Input 
                              value={bullet || ''} 
                              onChange={e => { 
                                const s = [...l.sections]; 
                                s[sIdx].microBullets[bIdx] = e.target.value; 
                                updateAsset('landings', lIdx, 'sections', s); 
                              }} 
                              className="h-12 bg-white/5 border-none rounded-xl pl-6 pr-4 text-sm text-slate-300 focus-visible:ring-emerald-500/30 transition-all group-hover:bg-white/[0.07]"
                              placeholder="Escribe un beneficio clave..."
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="p-12 rounded-[4rem] bg-slate-900 border border-white/5 shadow-2xl space-y-12">
                <div className="grid lg:grid-cols-2 gap-16">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between ml-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        </div>
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Resumen de Beneficios</Label>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          const b = [...(l.benefits || [])];
                          b.push("Nuevo Beneficio Clave...");
                          updateAsset('landings', lIdx, 'benefits', b);
                        }}
                        className="h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold px-3"
                      >
                        <Plus className="h-3 w-3 mr-1" /> AGREGAR
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {l.benefits && l.benefits.length > 0 ? l.benefits.map((benefit: string, bIdx: number) => (
                        <div key={bIdx} className="group relative flex items-center gap-2">
                          <Input 
                            value={benefit || ''} 
                            onChange={e => { 
                              const b = [...(l.benefits || [])]; 
                              b[bIdx] = e.target.value; 
                              updateAsset('landings', lIdx, 'benefits', b); 
                            }} 
                            className="h-14 bg-white/5 border-white/5 rounded-2xl px-6 font-medium text-slate-300 focus-visible:ring-emerald-500/50 flex-1"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              const b = (l.benefits || []).filter((_: any, i: number) => i !== bIdx);
                              updateAsset('landings', lIdx, 'benefits', b);
                            }}
                            className="h-10 w-10 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-xl"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )) : (
                        <div className="p-8 border-2 border-dashed border-white/5 rounded-3xl text-center">
                          <p className="text-sm text-slate-500 mb-4">No se han definido beneficios específicos aún.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 ml-4">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Mic2 className="h-4 w-4 text-violet-400" />
                      </div>
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sobre el Mentor</Label>
                    </div>
                    <Textarea 
                      value={l.aboutMentor || ''} 
                      onChange={e => updateAsset('landings', lIdx, 'aboutMentor', e.target.value)} 
                      className="min-h-[200px] bg-white/5 border-white/5 rounded-[2.5rem] p-8 text-base font-medium leading-relaxed text-slate-300 focus-visible:ring-violet-500/50" 
                      placeholder="Describe la autoridad del mentor..."
                    />
                  </div>
                </div>
              </Card>

              {/* FAQs Card */}
              <Card className="p-12 rounded-[4rem] bg-slate-900 border border-white/5 shadow-2xl space-y-12 mt-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between ml-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <MessageCircle className="h-4 w-4 text-orange-400" />
                      </div>
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Preguntas Frecuentes (FAQs)</Label>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        const f = [...(l.faqs || [])];
                        f.push({ question: "Nueva pregunta...", answer: "Respuesta..." });
                        updateAsset('landings', lIdx, 'faqs', f);
                      }}
                      className="h-8 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 text-[10px] font-bold px-3"
                    >
                      <Plus className="h-3 w-3 mr-1" /> AGREGAR FAQ
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {l.faqs && l.faqs.length > 0 ? l.faqs.map((faq: any, fIdx: number) => (
                      <div key={fIdx} className="group relative space-y-3 bg-white/5 p-6 rounded-3xl border border-white/5">
                        <Input 
                          value={faq.question || ''} 
                          onChange={e => { 
                            const f = [...(l.faqs || [])]; 
                            f[fIdx].question = e.target.value; 
                            updateAsset('landings', lIdx, 'faqs', f); 
                          }} 
                          className="h-12 bg-white/5 border-none rounded-xl px-4 font-bold text-slate-200 focus-visible:ring-orange-500/50"
                          placeholder="Pregunta frecuente..."
                        />
                        <Textarea 
                          value={faq.answer || ''} 
                          onChange={e => { 
                            const f = [...(l.faqs || [])]; 
                            f[fIdx].answer = e.target.value; 
                            updateAsset('landings', lIdx, 'faqs', f); 
                          }} 
                          className="min-h-[100px] bg-white/5 border-none rounded-2xl p-4 font-medium text-slate-400 focus-visible:ring-orange-500/50"
                          placeholder="Respuesta detallada..."
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            const f = (l.faqs || []).filter((_: any, i: number) => i !== fIdx);
                            updateAsset('landings', lIdx, 'faqs', f);
                          }}
                          className="absolute -top-3 -right-3 h-8 w-8 opacity-0 group-hover:opacity-100 bg-red-500 text-white hover:bg-red-600 transition-all rounded-full shadow-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )) : (
                      <div className="col-span-1 md:col-span-2 p-8 border-2 border-dashed border-white/5 rounded-3xl text-center">
                        <p className="text-sm text-slate-500 mb-4">No hay preguntas frecuentes definidas.</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* ─── Ajustes de Blueprint ─── */}
              <Card className="p-10 rounded-[3rem] bg-gradient-to-br from-slate-900 to-slate-950 border border-indigo-500/20 shadow-2xl space-y-8 mt-8">
                <div className="flex items-center gap-4 border-b border-white/5 pb-8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Ajustes de Blueprint</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Activa o desactiva secciones visibles en tu landing page.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'showNarrative',  label: 'Secciones Narrativas',  desc: 'Bloques de texto persuasivo con viñetas.',  color: 'emerald' },
                    { key: 'showSyllabus',   label: 'Temario del Curso',     desc: 'Lista de módulos con horas de cátedra.',  color: 'sky'     },
                    { key: 'showBenefits',   label: 'Beneficios del Curso',  desc: 'Listado de beneficios clave.',            color: 'violet'  },
                    { key: 'showMentor',     label: 'Sobre el Mentor',       desc: 'Perfil y autoridad del tutor.',           color: 'rose'    },
                    { key: 'showFaqs',       label: 'Preguntas Frecuentes',  desc: 'Bloque de FAQs con respuestas.',         color: 'orange'  },
                  ].map(({ key, label, desc, color }) => {
                    const isOn = l.visibility?.[key] !== false;
                    return (
                      <div
                        key={key}
                        className={cn(
                          'flex items-center justify-between p-5 rounded-2xl border transition-all',
                          isOn
                            ? `bg-${color}-500/5 border-${color}-500/20`
                            : 'bg-white/3 border-white/5 opacity-60'
                        )}
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-white">{label}</p>
                          <p className="text-[10px] text-slate-400">{desc}</p>
                        </div>
                        <Switch
                          id={`vis-${key}-${lIdx}`}
                          checked={isOn}
                          onCheckedChange={checked => {
                            const current = l.visibility || {};
                            updateAsset('landings', lIdx, 'visibility', { ...current, [key]: checked });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
