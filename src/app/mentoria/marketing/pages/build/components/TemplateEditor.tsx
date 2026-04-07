'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Layout, 
  Mail, 
  Instagram, 
  Megaphone, 
  Save, 
  Loader2,
  CheckCircle2,
  FileText,
  Video,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageEditor } from '@/components/courses/ImageEditor';
import { SocialLivePreview } from './SocialLivePreview';
import { PlatformIcon } from './PlatformIcon';
import { ValidationReport, PlatformValidationSummary } from './ValidationReport';

interface TemplateEditorProps {
  generatedAssets: any;
  blueprintData: any;
  activeLandingIdx: number;
  setActiveLandingIdx: (idx: number) => void;
  activeEmailIdx: number;
  setActiveEmailIdx: (idx: number) => void;
  activeSocialIdx: number;
  setActiveSocialIdx: (idx: number) => void;
  activeAdsIdx: number;
  setActiveAdsIdx: (idx: number) => void;
  selectedCourseId: string | null;
  courses: any[] | null;
  allTags: any[] | null;
  profile: any;
  updateAsset: (channel: 'landings' | 'emails' | 'socials' | 'ads', variantIdx: number, field: string, value: any, subIndex?: number) => void;
  loading: boolean;
  onSave: () => void;
}

// Componente optimizado para mostrar solo errores críticos
const OptimizedValidationReport = ({ generatedAssets }: { generatedAssets: any }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Recolectar todos los errores y advertencias
  const allErrors: any[] = [];
  const allWarnings: any[] = [];
  
  // Revisar cada tipo de contenido
  ['socials', 'landings', 'emails', 'ads'].forEach(channel => {
    const assets = generatedAssets?.[channel] || [];
    assets.forEach((asset: any) => {
      const validation = asset?.validationResults;
      if (validation) {
        if (validation.errors) allErrors.push(...validation.errors);
        if (validation.warnings) allWarnings.push(...validation.warnings);
      }
    });
  });
  
  // Si no hay errores ni advertencias, mostrar estado saludable
  if (allErrors.length === 0 && allWarnings.length === 0) {
    return (
      <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="font-bold text-emerald-800">✅ Todo compatible con APIs</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowDetails(!showDetails)}
          className="text-emerald-600 hover:bg-emerald-100"
        >
          {showDetails ? 'Ocultar' : 'Ver'} detalles
        </Button>
      </div>
    );
  }
  
  // Si hay errores críticos, mostrarlos prominentemente
  if (allErrors.length > 0) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="font-bold text-red-800">❌ {allErrors.length} errores críticos no corregibles</span>
          </div>
          <div className="text-sm text-red-700">
            Estos errores deben ser corregidos manualmente para asegurar compatibilidad.
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowDetails(!showDetails)}
          className="w-full"
        >
          {showDetails ? 'Ocultar' : 'Ver'} reporte completo
        </Button>
      </div>
    );
  }
  
  // Si hay advertencias, mostrarlas de forma compacta
  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="font-bold text-amber-800">⚠️ {allWarnings.length} advertencias (corregidas automáticamente)</span>
        </div>
        <div className="text-sm text-amber-700">
          El sistema aplicó las adaptaciones necesarias para mantener la compatibilidad.
        </div>
      </div>
      <Button 
        variant="outline" 
        onClick={() => setShowDetails(!showDetails)}
        className="w-full"
      >
        {showDetails ? 'Ocultar' : 'Ver'} detalles de adaptación
      </Button>
    </div>
  );
};

export function TemplateEditor({
  generatedAssets,
  blueprintData,
  activeLandingIdx,
  setActiveLandingIdx,
  activeEmailIdx,
  setActiveEmailIdx,
  activeSocialIdx,
  setActiveSocialIdx,
  activeAdsIdx,
  setActiveAdsIdx,
  selectedCourseId,
  courses,
  allTags,
  profile,
  updateAsset,
  loading,
  onSave
}: TemplateEditorProps) {
  return (
    <div className="space-y-10 animate-in fade-in">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Edición Final del Contenido</h2>
            <p className="text-slate-500">Ajusta los detalles de las 3 rutas propuestas por Gemini.</p>
          </div>
        </div>
        <Button onClick={onSave} disabled={loading} className="h-16 px-12 rounded-2xl font-bold text-xl shadow-2xl bg-primary gap-3">
          {loading ? <Loader2 className="animate-spin" /> : <Save className="h-6 w-6" />} Guardar Pack Multimedia
        </Button>
      </header>

      <Tabs defaultValue="landing" className="w-full">
        <TabsList className="bg-secondary/20 p-1.5 h-16 w-full justify-start gap-2 px-8 rounded-[1.5rem] border shadow-sm mb-10">
          <TabsTrigger value="landing" className="rounded-xl gap-2 font-bold px-8 h-12">
            <Layout className="h-4 w-4" /> Landings
          </TabsTrigger>
          <TabsTrigger value="email" className="rounded-xl gap-2 font-bold px-8 h-12">
            <Mail className="h-4 w-4" /> Emails
          </TabsTrigger>
          <TabsTrigger value="social" className="rounded-xl gap-2 font-bold px-8 h-12">
            <Instagram className="h-4 w-4" /> Redes Sociales
          </TabsTrigger>
          <TabsTrigger value="ads" className="rounded-xl gap-2 font-bold px-8 h-12">
            <Megaphone className="h-4 w-4" /> Ads
          </TabsTrigger>
          <TabsTrigger value="apis" className="rounded-xl gap-2 font-bold px-8 h-12">
            <FileText className="h-4 w-4" /> APIs/Compat.
          </TabsTrigger>
        </TabsList>

        <TabsContent value="landing">
          <Tabs value={activeLandingIdx.toString()} onValueChange={v => setActiveLandingIdx(parseInt(v))}>
            <TabsList className="bg-white p-1 rounded-xl mb-8 border shadow-sm">
              {generatedAssets?.landings?.map((l: any, i: number) => (
                <TabsTrigger key={i} value={i.toString()} className="rounded-lg px-6 font-bold capitalize">
                  {l.marketingName || `Ruta ${i + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>
            {generatedAssets?.landings?.map((l: any, lIdx: number) => (
              <TabsContent key={lIdx} value={lIdx.toString()} className="space-y-10">
                <Card className="p-10 rounded-[2.5rem] bg-white shadow-xl">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-accent ml-1">Nombre Comercial de esta Ruta</Label>
                      <Input 
                        value={l.marketingName} 
                        onChange={e => updateAsset('landings', lIdx, 'marketingName', e.target.value)} 
                        className="h-12 rounded-xl bg-accent/5 border-none px-6 font-bold text-accent" 
                        placeholder="Ej: Inscripción Masterclass" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titular Principal</Label>
                      <Textarea 
                        value={l.headline} 
                        onChange={e => updateAsset('landings', lIdx, 'headline', e.target.value)} 
                        className="text-3xl font-black text-primary border-none bg-slate-50 rounded-2xl p-6" 
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Subtitular</Label>
                        <Textarea 
                          value={l.subheadline} 
                          onChange={e => updateAsset('landings', lIdx, 'subheadline', e.target.value)} 
                          className="text-lg font-bold text-slate-500 border-none bg-slate-50 rounded-2xl p-6 italic" 
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-accent ml-1 flex items-center gap-2">
                            <Video className="h-3 w-3" /> Vídeo Ventas
                          </Label>
                          <Input 
                            value={l.videoUrl || ''} 
                            onChange={e => updateAsset('landings', lIdx, 'videoUrl', e.target.value)} 
                            className="h-14 rounded-2xl border-none bg-accent/5 px-6 font-mono text-xs" 
                            placeholder="URL YouTube/Vimeo" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-blue-600 ml-1">Nombre del Botón Acceso (CTA)</Label>
                          <Input 
                            value={l.ctaText || 'Acceder ahora'} 
                            onChange={e => updateAsset('landings', lIdx, 'ctaText', e.target.value)} 
                            className="h-14 rounded-2xl border-none bg-blue-50 px-6 font-black text-blue-700" 
                            placeholder="Ej: Inscribirme al Curso" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                <div className="space-y-8">
                  {l.sections.map((section: any, sIdx: number) => (
                    <Card key={sIdx} className="p-10 rounded-[2.5rem] bg-white shadow-lg relative overflow-hidden">
                      <div className="grid lg:grid-cols-2 gap-12">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Título {sIdx + 1}</Label>
                            <Input 
                              value={section.title} 
                              onChange={e => { 
                                const newS = [...l.sections]; 
                                newS[sIdx].title = e.target.value; 
                                updateAsset('landings', lIdx, 'sections', newS); 
                              }} 
                              className="font-black text-xl border-none bg-slate-50 rounded-xl h-12" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Cuerpo de Sección</Label>
                            <Textarea 
                              value={section.paragraph} 
                              onChange={e => { 
                                const newS = [...l.sections]; 
                                newS[sIdx].paragraph = e.target.value; 
                                updateAsset('landings', lIdx, 'sections', newS); 
                              }} 
                              className="min-h-[120px] border-none bg-slate-50 rounded-2xl p-6 text-slate-600 font-medium" 
                            />
                          </div>
                          
                          {/* Edición de Viñetas (3 fijas) */}
                          <div className="space-y-3 pt-2">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Viñetas de Valor (3 máx)</Label>
                            <div className="space-y-2">
                              {[0, 1, 2].map(bIdx => (
                                <div key={bIdx} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 h-10 shadow-sm">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  <input 
                                    value={section.microBullets?.[bIdx] || ''} 
                                    onChange={e => {
                                      const newS = [...l.sections];
                                      if (!newS[sIdx].microBullets) newS[sIdx].microBullets = ['', '', ''];
                                      newS[sIdx].microBullets[bIdx] = e.target.value;
                                      updateAsset('landings', lIdx, 'sections', newS);
                                    }}
                                    placeholder={`Beneficio ${bIdx + 1}...`}
                                    className="flex-1 text-xs font-bold text-slate-700 bg-transparent border-none outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <ImageEditor 
                          label={`Imagen ${sIdx + 1}`} 
                          url={section.imageUrl} 
                          onUpdate={newUrl => { 
                            const newS = [...l.sections]; 
                            newS[sIdx].imageUrl = newUrl; 
                            updateAsset('landings', lIdx, 'sections', newS); 
                          }} 
                          courseId={selectedCourseId || ''} 
                          channel="landing" 
                          keywords={
                            [section.title, (() => {
                              const selectedCourse = courses?.find(c => c.id === selectedCourseId);
                              return [
                                ...(allTags?.filter(t => selectedCourse?.tagIds?.includes(t.id)).map(t => 
                                  t.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()
                                ) || []),
                                selectedCourse?.title?.split(' ')[0].toLowerCase()
                              ].filter(Boolean).join(',');
                            })()].filter(Boolean).join(',')
                          } 
                          description={section.paragraph}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="email">
          <Tabs value={activeEmailIdx.toString()} onValueChange={v => setActiveEmailIdx(parseInt(v))}>
            <TabsList className="bg-white p-1 rounded-xl mb-8 border shadow-sm">
              {generatedAssets?.emails?.map((e: any, i: number) => (
                <TabsTrigger key={i} value={i.toString()} className="rounded-lg px-6 font-bold">
                  {e.marketingName || `Email ${i + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>
            {generatedAssets?.emails?.map((e: any, eIdx: number) => {
              const blueprintEmail = blueprintData?.assets?.emails?.[eIdx];
              const tokens = blueprintEmail?.designTokens;
              return (
                <TabsContent key={eIdx} value={eIdx.toString()} className="space-y-8 animate-in fade-in">
                  <Card className="p-12 rounded-[3rem] bg-white border-none shadow-xl max-w-4xl mx-auto space-y-10">
                    <div className="flex flex-wrap gap-4 items-center justify-between border-b pb-6">
                      <div className="flex-1 space-y-2 min-w-[200px]">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Nombre del Email</Label>
                        <Input 
                          value={e.marketingName} 
                          onChange={val => updateAsset('emails', eIdx, 'marketingName', val.target.value)} 
                          className="h-10 rounded-xl bg-slate-50 border-none px-4 font-bold" 
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: tokens?.primary }}>
                          <Mail className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Estilo Aplicado</p>
                          <p className="text-xs font-bold" style={{ color: tokens?.primary }}>{tokens?.fontHeading}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: tokens?.primary }} />
                        <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: tokens?.secondary }} />
                        <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: tokens?.accent }} />
                      </div>
                    </div>

                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-6">
                      <div className="flex items-center gap-3 text-primary mb-2">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        <h4 className="text-xs font-black uppercase tracking-widest">Configuración de Conversión (CTA)</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">¿A qué Landing apunta este Email?</Label>
                        <RadioGroup 
                          value={(e as any).targetLandingIdx?.toString() || eIdx.toString()} 
                          onValueChange={v => updateAsset('emails', eIdx, 'targetLandingIdx', parseInt(v))}
                          className="grid grid-cols-3 gap-4"
                        >
                          {[0, 1, 2].map(idx => (
                            <div key={idx} className={cn(
                              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
                              ((e as any).targetLandingIdx ?? eIdx) === idx ? "bg-white border-primary shadow-sm" : "bg-transparent border-slate-200 hover:border-slate-300"
                            )}>
                              <RadioGroupItem value={idx.toString()} id={`landing-link-${eIdx}-${idx}`} />
                              <Label htmlFor={`landing-link-${eIdx}-${idx}`} className="text-xs font-bold cursor-pointer">Variante {idx + 1}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>

                      <div className="space-y-2 pt-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">URL de Taller / Destino Personalizado</Label>
                        <Input 
                          value={(e as any).customCtaUrl || ''} 
                          onChange={val => updateAsset('emails', eIdx, 'customCtaUrl', val.target.value)}
                          placeholder="Indica una URL externa si no deseas usar la landing..."
                          className="h-12 rounded-xl bg-white border-slate-200 text-sm font-medium px-4"
                        />
                        <p className="text-[9px] text-muted-foreground italic px-1">Si este campo tiene valor, se usará como destino prioritario en lugar de la landing page.</p>
                      </div>
                    </div>

                    <div className="space-y-4 border-2 p-8 rounded-[2rem]" style={{ borderColor: tokens?.primary ? `${tokens.primary}20` : '#f1f5f9' }}>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Asunto del Email</Label>
                        <Input 
                          value={e.subject} 
                          onChange={val => updateAsset('emails', eIdx, 'subject', val.target.value)} 
                          className="h-14 rounded-2xl border-none bg-slate-50 px-6 font-black text-xl" 
                          style={{ fontFamily: tokens?.fontHeading, color: tokens?.primary || 'inherit' }} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Contenido del Correo (Cuerpo Final)</Label>
                        <Textarea 
                          value={e.body} 
                          onChange={val => updateAsset('emails', eIdx, 'body', val.target.value)} 
                          className="min-h-[450px] rounded-[2rem] border-none bg-slate-50 p-10 leading-relaxed text-lg font-medium text-slate-700 shadow-inner" 
                          style={{ fontFamily: tokens?.fontBody }} 
                        />
                        <p className="text-[10px] text-muted-foreground italic px-4">Este es el texto final que recibirán tus alumnos. Incluye saludos y firma.</p>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        </TabsContent>

        <TabsContent value="social">
          {(() => {
            const platforms = Array.from(new Set(generatedAssets?.socials?.map((s: any) => s.platform))) as string[];
            if (!platforms.length) return <p className="text-muted-foreground font-bold p-8 text-center bg-slate-50 rounded-2xl border">No hay redes sociales generadas para este lanzamiento.</p>;
            return (
              <Tabs defaultValue={platforms[0] || ''}>
                <TabsList className="bg-white p-1 rounded-xl mb-8 border shadow-sm flex flex-wrap h-auto justify-start gap-2">
                  {platforms.map((p: string) => (
                    <TabsTrigger key={p || 'unknown'} value={p || 'unknown'} className="rounded-lg px-6 h-10 font-bold capitalize gap-2">
                      <PlatformIcon platform={p} className="h-4 w-4 opacity-50" /> {p}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {platforms.map((p: string) => {
                  const platSocials = (generatedAssets?.socials as any[])?.map((s: any, i: number) => ({ ...s, originalIndex: i })).filter((s: any) => s.platform === p);
                  return (
                    <TabsContent key={p || 'unknown'} value={p || 'unknown'} className="animate-in fade-in space-y-8">
                      <Tabs defaultValue={platSocials[0]?.originalIndex.toString()}>
                        <TabsList className="bg-secondary/10 p-1.5 rounded-xl border border-secondary/20 flex flex-wrap h-auto justify-start gap-2">
                          {platSocials.map((s: any, idx: number) => (
                            <TabsTrigger key={s.originalIndex} value={s.originalIndex.toString()} className="rounded-lg px-4 h-9 text-xs font-bold capitalize">
                              {s.marketingName || `Pack ${idx + 1}`}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {platSocials.map((s: any) => {
                          const sIdx = s.originalIndex;
                          const tokens = blueprintData?.assets?.socials?.[sIdx]?.designTokens;
                          return (
                            <TabsContent key={sIdx} value={sIdx.toString()} className="grid lg:grid-cols-12 gap-10">
                              <div className="lg:col-span-7 space-y-8">
                                <Card className="p-8 rounded-[2.5rem] bg-white border-none shadow-lg space-y-6">
                                  <div className="space-y-4 border-b pb-6">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Título del Post (Interno)</Label>
                                    <Input 
                                      value={s.marketingName} 
                                      onChange={e => updateAsset('socials', sIdx, 'marketingName', e.target.value)} 
                                      className="h-12 rounded-xl bg-slate-50 border-none px-6 font-bold" 
                                    />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Caption Final (Listo para publicar)</Label>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-[10px] font-black uppercase text-slate-400">Link a Landing:</Label>
                                      <select 
                                        value={s.landingIdx ?? ''} 
                                        onChange={e => updateAsset('socials', sIdx, 'landingIdx', e.target.value === '' ? undefined : parseInt(e.target.value))}
                                        className="text-[10px] font-bold bg-slate-50 border-none rounded-lg h-7 px-2 outline-none"
                                      >
                                        <option value="">Ninguna (Link en Bio)</option>
                                        {generatedAssets?.landings?.map((l: any, lIdx: number) => (
                                          <option key={lIdx} value={lIdx}>Landing {lIdx + 1}: {l.headline.substring(0, 20)}...</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <p className="text-sm font-bold text-emerald-600">GANCHO: {s.hook}</p>
                                    <Textarea 
                                      value={s.caption} 
                                      onChange={e => updateAsset('socials', sIdx, 'caption', e.target.value)} 
                                      className="min-h-[150px] border-none bg-slate-50 rounded-[1.5rem] p-6 text-sm font-medium leading-relaxed" 
                                    />
                                    <div className="pt-4 border-t">
                                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Hashtags:</p>
                                      <Input 
                                        value={s.hashtags.join(' ')} 
                                        onChange={e => updateAsset('socials', sIdx, 'hashtags', e.target.value.split(' '))} 
                                        className="bg-slate-50 border-none h-10 text-xs font-mono text-accent" 
                                      />
                                    </div>
                                  </div>
                                </Card>
                                <Card className="p-8 rounded-[2.5rem] bg-slate-900 text-white border-none shadow-2xl">
                                  <h3 className="font-black text-lg mb-6 border-b border-white/10 pb-4 flex items-center justify-between">
                                    <span>Edición de Placas / Slides</span>
                                    <Badge className="bg-accent text-white uppercase text-[8px] tracking-widest">{s.slides.length} SLIDES</Badge>
                                  </h3>
                                  <div className="space-y-6">
                                    {(() => {
                                      const slides = s.slides?.length > 0 ? s.slides : [{ text: '', imageUrl: '' }];
                                      return (slides as any[]).map((slide: any, i: number) => (
                                        <div key={i} className="space-y-6 p-6 bg-white/5 rounded-3xl border border-white/10">
                                          <div className="flex gap-4 items-start">
                                            <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center font-black text-xs shrink-0 shadow-lg" style={{ backgroundColor: tokens?.accent }}>
                                              {i+1}
                                            </div>
                                            <div className="space-y-4 flex-1">
                                              <Label className="text-[8px] font-black uppercase text-white/40">Texto de la Placa</Label>
                                              <Textarea 
                                                value={slide.text} 
                                                onChange={e => { 
                                                  const newS = [...slides]; 
                                                  newS[i].text = e.target.value; 
                                                  updateAsset('socials', sIdx, 'slides', newS); 
                                                }} 
                                                className="border-none bg-white/5 p-4 min-h-[60px] text-sm text-white font-medium rounded-xl" 
                                                style={{ fontFamily: tokens?.fontHeading }} 
                                              />
                                            </div>
                                          </div>
                                          <div className="pt-4 border-t border-white/5">
                                            <ImageEditor 
                                              label={s.type === 'short_video' ? 'Miniatura / Video' : `Imagen Placa ${i + 1}`} 
                                              url={slide.imageUrl} 
                                              onUpdate={newUrl => { 
                                                const newS = [...slides]; 
                                                newS[i].imageUrl = newUrl; 
                                                updateAsset('socials', sIdx, 'slides', newS); 
                                              }} 
                                              courseId={selectedCourseId || ''} 
                                              channel="social" 
                                              keywords={s.marketingName || ''}
                                              description={slide.text || s.caption || ''}
                                            />
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                    {s.slides?.length === 0 && (
                                      <Button 
                                        variant="outline" 
                                        className="w-full h-14 rounded-2xl border-dashed border-2 text-white/40 hover:text-white" 
                                        onClick={() => updateAsset('socials', sIdx, 'slides', [{ text: '', imageUrl: '' }])}
                                      >
                                        + Agregar Placa Visual
                                      </Button>
                                    )}
                                  </div>
                                </Card>
                              </div>
                              <div className="lg:col-span-5 relative">
                                {(() => {
                                  const selectedCourse = courses?.find(c => c.id === selectedCourseId);
                                  const override = selectedCourse?.brandingOverride?.socials || {};
                                  const mentorSocials = profile?.profile?.socials || {};
                                  
                                  const rawValue = override[s.platform] || mentorSocials[s.platform] || '';
                                  let finalHandle = rawValue;
                                  if (rawValue.includes('/')) {
                                    finalHandle = rawValue.split('/').filter(Boolean).pop() || '';
                                    if (finalHandle.includes('?')) finalHandle = finalHandle.split('?')[0];
                                  }
                                  finalHandle = finalHandle.replace('@', '');
                                  
                                  if (!finalHandle && profile?.displayName) {
                                    finalHandle = profile.displayName.replace(/\s+/g, '').toLowerCase();
                                  }

                                  return (
                                    <SocialLivePreview 
                                      social={{...s, handle: finalHandle || 'tu_cuenta'}} 
                                      tokens={tokens} 
                                    />
                                  );
                                })()}
                              </div>
                            </TabsContent>
                          );
                        })}
                      </Tabs>
                    </TabsContent>
                  );
                })}
              </Tabs>
            );
          })()}
        </TabsContent>

        <TabsContent value="ads">
          <Tabs value={activeAdsIdx.toString()} onValueChange={v => setActiveAdsIdx(parseInt(v))}>
            <TabsList className="bg-white p-1 rounded-xl mb-8 border shadow-sm">
              {generatedAssets?.ads?.map((ad: any, i: number) => (
                <TabsTrigger key={i} value={i.toString()} className="rounded-lg px-6 font-bold">
                  {ad?.marketingName || `Ads ${i + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>
            {generatedAssets?.ads?.map((a: any, aIdx: number) => (
              <TabsContent key={aIdx} value={aIdx.toString()} className="grid lg:grid-cols-2 gap-10">
                <div className="col-span-full bg-white p-6 rounded-[2rem] shadow-sm flex items-center gap-6">
                  <Label className="text-[10px] font-black uppercase text-slate-400 shrink-0">Nombre del Set:</Label>
                  <Input 
                    value={a?.marketingName} 
                    onChange={e => updateAsset('ads', aIdx, 'marketingName', e.target.value)} 
                    className="h-12 rounded-xl bg-slate-50 border-none px-6 font-bold" 
                  />
                </div>
                <section className="space-y-6">
                  <header className="flex items-center gap-3 px-4">
                    <Megaphone className="h-6 w-6 text-amber-500" />
                    <h3 className="font-bold text-xl">Títulos Finales Ads</h3>
                  </header>
                  <div className="space-y-4">
                    {a.headlines.map((h: string, i: number) => (
                      <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100" style={{ borderLeft: `4px solid ${blueprintData?.assets?.ads?.[aIdx]?.designTokens?.primary || '#facc15'}` }}>
                        <Input 
                          value={h} 
                          onChange={e => updateAsset('ads', aIdx, 'headlines', e.target.value, i)} 
                          className="font-black text-lg border-none bg-transparent h-auto py-0" 
                          style={{ fontFamily: blueprintData?.assets?.ads?.[aIdx]?.designTokens?.fontHeading }} 
                        />
                      </div>
                    ))}
                  </div>
                </section>
                <section className="space-y-6">
                  <header className="flex items-center gap-3 px-4">
                    <FileText className="h-6 w-6 text-blue-500" />
                    <h3 className="font-bold text-xl">Descripciones de Impacto</h3>
                  </header>
                  <div className="space-y-4">
                    {a.descriptions.map((d: string, i: number) => (
                      <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100" style={{ fontFamily: blueprintData?.assets?.ads?.[aIdx]?.designTokens?.fontBody }}>
                        <Textarea 
                          value={d} 
                          onChange={e => updateAsset('ads', aIdx, 'descriptions', e.target.value, i)} 
                          className="min-h-[100px] font-medium border-none bg-transparent italic h-auto py-0 leading-relaxed" 
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* Nueva pestaña de APIs/Compatibilidad */}
        <TabsContent value="apis" className="space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-500" />
              <h3 className="text-2xl font-bold">Validación de Compatibilidad con APIs</h3>
            </div>
            
            {/* Reporte optimizado - solo muestra errores críticos */}
            <OptimizedValidationReport generatedAssets={generatedAssets} />
            
            {/* Reporte completo en acordeón */}
            {(() => {
              const [showFullReport, setShowFullReport] = useState(false);
              
              return (
                <div className={showFullReport ? 'space-y-6' : ''}>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowFullReport(!showFullReport)}
                    className="w-full"
                  >
                    {showFullReport ? 'Ocultar' : 'Mostrar'} reporte completo de validación
                  </Button>
                  
                  {showFullReport && (
                    <div className="space-y-6">
                      <h4 className="text-lg font-bold text-slate-700">Reporte Detallado por Plataforma</h4>
                      
                      {/* Validación de Redes Sociales */}
                      {generatedAssets?.socials && generatedAssets.socials.length > 0 && (
                        <ValidationReport 
                          validationResults={
                            generatedAssets.socials[0]?.validationResults || 
                            { isValid: false, errors: [], warnings: [], platformAdaptations: {} }
                          }
                          platform="Redes Sociales"
                          showDetails={true}
                        />
                      )}
                      
                      {/* Validación de Landings */}
                      {generatedAssets?.landings && generatedAssets.landings.length > 0 && (
                        <ValidationReport 
                          validationResults={
                            generatedAssets.landings[0]?.validationResults || 
                            { isValid: true, errors: [], warnings: [], platformAdaptations: {} }
                          }
                          platform="Landing Pages"
                          showDetails={false}
                        />
                      )}
                      
                      {/* Validación de Emails */}
                      {generatedAssets?.emails && generatedAssets.emails.length > 0 && (
                        <ValidationReport 
                          validationResults={
                            generatedAssets.emails[0]?.validationResults || 
                            { isValid: true, errors: [], warnings: [], platformAdaptations: {} }
                          }
                          platform="Email Marketing"
                          showDetails={false}
                        />
                      )}
                      
                      {/* Validación de Ads */}
                      {generatedAssets?.ads && generatedAssets.ads.length > 0 && (
                        <ValidationReport 
                          validationResults={
                            generatedAssets.ads[0]?.validationResults || 
                            { isValid: true, errors: [], warnings: [], platformAdaptations: {} }
                          }
                          platform="Publicidad Digital"
                          showDetails={false}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
