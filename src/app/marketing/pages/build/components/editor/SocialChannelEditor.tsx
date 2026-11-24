'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Layout,
  Link2,
  Save,
  Video,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Flame,
  Sparkles,
  Clapperboard,
  Scroll,
  Volume2,
  Music,
  Plus,
  Trash2,
  FileEdit,
  Download,
  Lock,
  Palette,
  Globe,
  Loader2
} from 'lucide-react';
import { ImageEditor } from '@/components/courses/ImageEditor';
import { SocialLivePreview } from '../SocialLivePreview';
import { PlatformIcon } from '../PlatformIcon';
import { AudioUploader } from '../AudioUploader';
import { VideoProductionPanel } from '../VideoProductionPanel';
import { PdfProductionPanel } from '../PdfProductionPanel';
import { SceneNarrativeEditor } from '../SceneNarrativeEditor';
import { getSocialResolution, cleanSocialHandle, getPlatformLabels } from '../../utils/marketingUtils';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getSystemVideoPalettes,
  resolveVideoBrandPalette
} from '@/lib/video/brand-palettes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

interface SocialChannelEditorProps {
  generatedAssets: any;
  updateAsset: (channel: 'landings' | 'emails' | 'socials' | 'ads', variantIdx: number, field: string, value: any, subIndex?: number) => void;
  onSave: (assets?: any, showToast?: boolean) => void | Promise<void>;
  dynamicAdns: Record<string, any>;
  newPieceConfig: any;
  setNewPieceConfig: React.Dispatch<React.SetStateAction<any>>;
  showSocialConfigurator: boolean;
  setShowSocialConfigurator: (val: boolean) => void;
  handleDownloadVideo: (videoUrl: string | undefined | null, fileName: string, explicitDriveIds?: string | null) => Promise<void>;
  isRenderingVideo: string | null;
  renderedVideos: Record<number, string | null>;
  jobProgress: Record<number, { progress: number; stage: string }>;
  isGeneratingBreakdown: string | null;
  handleGenerateBreakdown: (variant: any, index: number, channel: 'emails' | 'socials' | 'ads', selectedLandingIndex?: number) => Promise<void>;
  handleGenerateVideo: (s: any, sIdx: number) => Promise<void>;
  handleGenerateVideoIA: (s: any, sIdx: number) => Promise<void>;
  handleGenerateLongVideo: (s: any, sIdx: number) => Promise<void>;
  handleGeneratePrompt: (s: any, sIdx: number) => Promise<void>;
  handleDeleteVideo: (sIdx: number) => Promise<void>;
  handleGeneratePdf: (s: any, sIdx: number) => Promise<void>;
  handleDeletePdf: (sIdx: number) => Promise<void>;
  isGeneratingPdf: string | null;
  selectedCourseId: string | null;
  courses: any[] | null;
  allTags: any[] | null;
  coordinationPlan?: any;
  blueprintData?: any;
  googleToken?: string | null;
  ensureGoogleToken: () => Promise<string | null>;
  normalizedLandingsList: { id: string; title: string; url: string }[];
  profile?: any;
}

export function SocialChannelEditor({
  generatedAssets,
  updateAsset,
  onSave,
  dynamicAdns,
  newPieceConfig,
  setNewPieceConfig,
  showSocialConfigurator,
  setShowSocialConfigurator,
  handleDownloadVideo,
  isRenderingVideo,
  renderedVideos,
  jobProgress,
  isGeneratingBreakdown,
  handleGenerateBreakdown,
  handleGenerateVideo,
  handleGenerateVideoIA,
  handleGenerateLongVideo,
  handleGeneratePrompt,
  handleDeleteVideo,
  handleGeneratePdf,
  handleDeletePdf,
  isGeneratingPdf,
  selectedCourseId,
  courses,
  allTags,
  coordinationPlan,
  blueprintData,
  googleToken,
  ensureGoogleToken,
  normalizedLandingsList,
  profile
}: SocialChannelEditorProps) {
  const { toast } = useToast();

  const rawSocials = generatedAssets?.socials || [];
  const platforms = Array.from(new Set(rawSocials.map((s: any) => s.platform).filter(Boolean)))
    .filter(p => p !== 'linkedin') as string[];

  return (
<Tabs key={platforms.join('-')} defaultValue={platforms[0]}>
                <div className="flex items-center justify-between mb-10 w-full gap-4 flex-wrap">
                  {platforms.length > 0 ? (
                    <TabsList className="bg-muted/40 p-1.5 h-12 justify-start gap-1 rounded-xl border border-border w-fit">
                      {platforms.map(p => (
                        <TabsTrigger key={p} value={p} className="capitalize gap-2 font-black text-[10px] px-6 h-9 tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground hover:text-foreground">
                          <PlatformIcon platform={p} className="h-4 w-4" /> {p}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  ) : (
                    <div className="text-sm font-medium text-muted-foreground">
                      No hay videos generados todavía.
                    </div>
                  )}

                  <Dialog open={showSocialConfigurator} onOpenChange={setShowSocialConfigurator}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 h-12 px-6 rounded-xl font-bold tracking-widest text-[10px] uppercase">
                        <Plus className="h-4 w-4 mr-2" /> Nueva Pieza ADN
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl w-full p-8 bg-white border-border rounded-3xl">
                      <DialogHeader className="flex flex-col items-center justify-center space-y-4 mb-6">
                        <div className="w-20 h-20 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Video className="h-10 w-10" />
                        </div>
                        <div className="text-center space-y-2">
                          <DialogTitle className="text-3xl font-black text-foreground uppercase tracking-tighter">Generador Multimedia</DialogTitle>
                          <DialogDescription className="text-muted-foreground text-sm font-medium">Define el formato y estilo antes de empezar la producción.</DialogDescription>
                        </div>
                      </DialogHeader>

                      <div className="w-full space-y-6">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Nombre Interno de la Pieza (Opcional)</Label>
                          <Input
                            placeholder="Ej. Reel Venta Navidad"
                            value={newPieceConfig.name}
                            onChange={(e) => setNewPieceConfig((prev: any) => ({ ...prev, name: e.target.value }))}
                            className="bg-white border-border text-sm font-bold text-foreground px-6"
                            size="xl" />
                        </div>
                        <div className="grid md:grid-cols-3 gap-6 w-full">
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">1. Red Social</Label>
                            <Select
                              value={newPieceConfig.platform}
                              onValueChange={(v) => {
                                let defaultType = 'story';
                                if (v === 'tiktok') defaultType = 'story';
                                else if (v === 'twitter') defaultType = 'video_16_9';
                                setNewPieceConfig((prev: any) => ({ ...prev, platform: v, type: defaultType }));
                              }}
                            >
                              <SelectTrigger size="xl" className="bg-white border-border text-xs font-bold text-foreground px-6">
                                <SelectValue placeholder="Plataforma" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-border text-foreground">
                                <SelectItem value="instagram">Instagram</SelectItem>
                                <SelectItem value="tiktok">TikTok</SelectItem>
                                <SelectItem value="twitter">Twitter / X</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">2. Formato</Label>
                            <Select value={newPieceConfig.type} onValueChange={(v) => setNewPieceConfig((prev: any) => ({ ...prev, type: v }))}>
                              <SelectTrigger size="xl" className="bg-white border-border text-xs font-bold text-foreground px-6">
                                <SelectValue placeholder="Tipo" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-border text-foreground">
                                {newPieceConfig.platform === 'instagram' && (
                                  <>
                                    <SelectItem value="story">Story / Reel (9:16)</SelectItem>
                                    <SelectItem value="portrait_post">Post Vertical (4:5)</SelectItem>
                                    <SelectItem value="carousel">Carrusel (4:5)</SelectItem>
                                    <SelectItem value="single_post">Post Cuadrado (1:1)</SelectItem>
                                  </>
                                )}
                                {newPieceConfig.platform === 'tiktok' && (
                                  <>
                                    <SelectItem value="story">TikTok Video (9:16)</SelectItem>
                                    <SelectItem value="carousel">Carrusel (9:16)</SelectItem>
                                  </>
                                )}
                                {newPieceConfig.platform === 'twitter' && (
                                  <>
                                    <SelectItem value="video_16_9">Video Paisaje (16:9)</SelectItem>
                                    <SelectItem value="single_post">Post Cuadrado (1:1)</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">3. ADN Maestro</Label>
                            <Select value={newPieceConfig.adnId} onValueChange={(v) => setNewPieceConfig((prev: any) => ({ ...prev, adnId: v }))}>
                              <SelectTrigger size="xl" className="bg-primary border-none text-xs font-black uppercase text-white px-6">
                                <SelectValue placeholder="Estilo ADN" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-border text-foreground">
                                {Object.values(dynamicAdns).map((adn: any) => (
                                  <SelectItem key={adn.id} value={adn.id} className="text-[10px] uppercase font-bold">ADN: {adn.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">4. Motor de Video</Label>
                          <Select value={newPieceConfig.videoEngine} onValueChange={(v) => setNewPieceConfig((prev: any) => ({ ...prev, videoEngine: v }))}>
                            <SelectTrigger size="xl" className="bg-white border-border text-xs font-bold text-foreground px-6">
                              <SelectValue placeholder="Generador" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-border text-foreground">
                              <SelectItem value="ffmpeg" className="text-[10px] uppercase font-bold">FFmpeg (Motor Propio)</SelectItem>
                              <SelectItem value="omni" className="text-[10px] uppercase font-bold">Omni (Gemini)</SelectItem>
                              <SelectItem value="prompt" className="text-[10px] uppercase font-bold">Solo Prompt (Externos: Seedance, Veo...)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] font-bold text-muted-foreground ml-2 italic">FFmpeg arma el video con tus placas · Largo unifica voz y video · Omni genera con IA · Prompt exporta guion para externos.</p>
                        </div>
                      </div>

                      <DialogFooter className="mt-8 justify-center sm:justify-center">
                        <Button
                          onClick={() => {
                            const selectedAdn = dynamicAdns[newPieceConfig.adnId];
                            const initialSlides = (selectedAdn?.defaultSlices || []).map((s: any) => ({
                              segment: s.segment_label || 'VALOR',
                              title: s.text || '',
                              text: s.text || '',
                              subtitle: s.subtitle || '',
                              watermark: s.watermark || '',
                              voiceover: s.voiceover || '',
                              duration: Math.max(Number(s.duration) || 4.5, 2.5),
                              imageUrl: s.imageUrl || ''
                            }));

                            const newSocial = {
                              platform: newPieceConfig.platform,
                              type: newPieceConfig.type,
                              marketingName: newPieceConfig.name || `NUEVA PIEZA ${newPieceConfig.platform.toUpperCase()}`,
                              hook: selectedAdn?.defaultSlices?.[0]?.text || '',
                              caption: '',
                              slides: initialSlides,
                              production_notes: {
                                adnId: newPieceConfig.adnId,
                                voice_id: 'jorge',
                                enable_tts: true,
                                video_engine: newPieceConfig.videoEngine,
                                concatenate_slices: newPieceConfig.type !== 'carousel'
                              }
                            };
                            updateAsset('socials', rawSocials.length, 'new', newSocial);
                            setNewPieceConfig((prev: any) => ({ ...prev, name: '' })); // Limpiar el campo
                            setShowSocialConfigurator(false);
                            toast({ title: "Pieza Creada", description: `Cargadas ${initialSlides.length} placas desde el ADN.` });
                          }}
                          className="h-16 px-16 rounded-lg bg-card text-foreground hover:bg-success/10 font-black text-lg gap-3 transition-all hover:scale-105 active:scale-95 border border-border"
                        >
                          <Plus className="h-6 w-6" /> {rawSocials.length === 0 ? 'Crear Primera Pieza' : 'Crear Nueva Pieza'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {platforms.map(p => {
                  const platformSocials = rawSocials.filter((s: any) => s.platform === p);
                  return (
                    <TabsContent key={p} value={p} className="space-y-10 animate-in fade-in slide-in-from-left-4">
                      <div className="flex flex-col gap-16">
                        {rawSocials.map((s: any, globalIdx: number) => {
                          if (s.platform !== p) return null;
                          const isLocked = s.production_notes?.isLocked;
                          return (
                            <div key={globalIdx} className="space-y-4 animate-in zoom-in-95 duration-500">
                              {isLocked ? (
                                <Card className="p-6 md:p-8 rounded-lg bg-emerald-50/50 border-2 border-emerald-300 shadow-md shadow-emerald-100 space-y-6">
                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div className="flex items-center gap-4 md:gap-6">
                                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl md:text-2xl font-black shadow-lg shadow-emerald-200">{globalIdx + 1}</div>
                                      <div>
                                        <h3 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-widest">{s.marketingName || `${getPlatformLabels(s.type).badge} ${globalIdx + 1}`}</h3>
                                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-none mt-2 text-xs font-bold uppercase tracking-widest px-3 py-1 shadow-sm shadow-emerald-300">
                                          <Lock className="h-3.5 w-3.5 mr-1.5 inline -translate-y-[1px]" /> Pieza Sellada
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Button
                                        size="icon"
                                        title="Descargar Video"
                                        onClick={() => handleDownloadVideo(s.production_notes?.video_url || renderedVideos[globalIdx] || s.exportUrls?.socialExportUrl, `${s.marketingName || 'Video_Sellado'}.mp4`, s.production_notes?.video_drive_id)}
                                        className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all hover:scale-105"
                                      >
                                        <Download className="h-5 w-5" />
                                      </Button>

                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="icon" title="Editar Textos" className="bg-white text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 h-10 w-10 md:h-12 md:w-12 rounded-xl border-2 border-emerald-200 shadow-sm transition-all hover:scale-105">
                                            <FileEdit className="h-5 w-5" />
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="mw-xl w-full">
                                          <DialogHeader>
                                            <DialogTitle className="text-xl md:text-2xl font-black text-foreground uppercase tracking-widest">Editar Textos de Publicación</DialogTitle>
                                            <DialogDescription className="text-muted-foreground">Edita el gancho y la descripción de la pieza.</DialogDescription>
                                          </DialogHeader>

                                          <div className="space-y-6 mt-4">
                                            <div className="space-y-2">
                                              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Gancho (Hook)</Label>
                                              <Input value={s.hook} onChange={e => updateAsset('socials', globalIdx, 'hook', e.target.value)} className="bg-white border-border text-foreground text-sm font-bold italic px-4" size="lg" />
                                            </div>
                                            <div className="space-y-2">
                                              <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Cuerpo (Caption)</Label>
                                              <Textarea value={s.caption} onChange={e => updateAsset('socials', globalIdx, 'caption', e.target.value)} size="lg" className="border-border bg-white p-4 text-sm font-medium text-foreground" />
                                            </div>
                                          </div>

                                          <DialogFooter className="mt-6">
                                            <DialogClose asChild>
                                              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl">
                                                <CheckCircle2 className="h-5 w-5 mr-2" /> Listo
                                              </Button>
                                            </DialogClose>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>

                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Eliminar Pieza"
                                        className="h-10 w-10 md:h-12 md:w-12 rounded-xl text-danger hover:text-danger hover:bg-danger/10"
                                        onClick={() => {
                                          const confirmDelete = window.confirm('¿Seguro que deseas eliminar esta pieza?');
                                          if (confirmDelete) {
                                            const newSocials = [...rawSocials];
                                            newSocials.splice(globalIdx, 1);
                                            updateAsset('socials', 0, 'replace_all', newSocials);
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-5 w-5" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ) : (
                                <Card className="p-6 md:p-8 rounded-lg bg-white border border-border space-y-6">
                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                                      {(() => {
                                        const firstThumb = s.slides?.[0]?.imageUrl || s.scenes?.[0]?.imageUrl;
                                        return firstThumb ? (
                                          <div className="relative w-16 h-20 md:w-20 md:h-24 rounded-xl overflow-hidden border border-border bg-muted/40 shrink-0 shadow-sm">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={firstThumb} alt="Miniatura" className="w-full h-full object-cover" />
                                            <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                                              #{globalIdx + 1}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted/40 text-muted-foreground flex items-center justify-center text-xl md:text-2xl font-black shrink-0">
                                            {globalIdx + 1}
                                          </div>
                                        );
                                      })()}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h3 className="text-lg md:text-xl font-black text-foreground uppercase tracking-wide truncate">
                                            {s.marketingName || `${getPlatformLabels(s.type).badge} ${globalIdx + 1}`}
                                          </h3>
                                          {s.isGenerated ? (
                                            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px] font-bold">
                                              {s.slides?.length || s.scenes?.length || 0} escenas listas
                                            </Badge>
                                          ) : (
                                            <Badge variant="secondary" className="text-amber-800 bg-amber-50 border-amber-200 text-[10px] animate-pulse">
                                              <Loader2 className="h-3 w-3 mr-1 animate-spin inline" /> Generando con IA...
                                            </Badge>
                                          )}
                                        </div>
                                        {s.hook && (
                                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic font-medium">
                                            "{s.hook}"
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        title="Descargar Video Temporal"
                                        onClick={() => handleDownloadVideo(s.production_notes?.video_url || renderedVideos[globalIdx] || s.exportUrls?.socialExportUrl, `${s.marketingName || 'Video_Temporal'}.mp4`, s.production_notes?.video_drive_id)}
                                        className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-success/10 border-success/20 hover:bg-success hover:text-white text-success"
                                      >
                                        <Download className="h-5 w-5" />
                                      </Button>

                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="secondary" className="bg-card text-foreground hover:bg-success/10 h-10 md:h-12 px-4 rounded-xl border border-border font-bold text-xs gap-2">
                                            <FileEdit className="h-4 w-4" />
                                            <span>Editar Guion y Escenas</span>
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] grid grid-rows-[auto_1fr_auto] gap-0 overflow-hidden p-0">
                                          <div className="shrink-0 bg-white border-b border-border px-6 md:px-10 py-5">
                                            <DialogHeader className="text-left">
                                              <DialogTitle className="text-2xl md:text-3xl font-black text-primary uppercase tracking-widest">{s.marketingName || 'Editor de Pieza'}</DialogTitle>
                                              <DialogDescription className="text-muted-foreground">Edita los textos, escenas y produce el video de tu pieza on-demand.</DialogDescription>
                                            </DialogHeader>
                                          </div>

                                          <div className="min-h-0 overflow-y-auto custom-scrollbar bg-background">
                                            <Card className="m-4 md:m-6 overflow-hidden rounded-2xl bg-white border border-border">
                                              <div className="grid lg:grid-cols-12 gap-0">
                                                <div className="lg:col-span-7 p-6 md:p-8 space-y-8 z-10">
                                                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-muted/40 p-5 rounded-lg border border-border mb-2">
                                                    <div className="flex flex-wrap md:flex-nowrap items-center gap-4 flex-1">
                                                      <div className="flex-1 max-w-[180px]">
                                                        <Select
                                                          value={s.production_notes?.adnId || s.adnId || '01_CINEMA'}
                                                          onValueChange={(val) => {
                                                            const selectedAdn = dynamicAdns[val];
                                                            updateAsset('socials', globalIdx, 'adnId', val);
                                                            updateAsset('socials', globalIdx, 'production_notes', {
                                                              ...(s.production_notes || {}),
                                                              adnId: val
                                                            });
                                                            if (generatedAssets?.socials) {
                                                              const updatedSocials = [...generatedAssets.socials];
                                                              updatedSocials[globalIdx] = {
                                                                ...updatedSocials[globalIdx],
                                                                adnId: val,
                                                                production_notes: {
                                                                  ...(updatedSocials[globalIdx]?.production_notes || {}),
                                                                  adnId: val
                                                                }
                                                              };
                                                              onSave({ ...generatedAssets, socials: updatedSocials }, true);
                                                            }
                                                            toast({ title: `ADN ${selectedAdn?.name || val} Seleccionado`, description: "Pulsa 'Re-generar' para ajustar el guion a este estilo." });
                                                          }}
                                                        >
                                                          <SelectTrigger className="h-11 bg-white border-border text-[9px] font-black uppercase text-foreground tracking-widest">
                                                            <div className="flex items-center gap-2">
                                                              <Clapperboard className="h-3.5 w-3.5" />
                                                              <span>ESTILO: <SelectValue placeholder="ADN" /></span>
                                                            </div>
                                                          </SelectTrigger>
                                                          <SelectContent className="bg-white border-border text-foreground">
                                                            {Object.values(dynamicAdns).map((adn: any) => (
                                                              <SelectItem key={adn.id} value={adn.id} className="text-[10px] uppercase font-bold hover:bg-muted/40">
                                                                {adn.name}
                                                              </SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                      </div>

                                                      <div className="flex-1 max-w-[150px]">
                                                        <Select
                                                          value={s.type || 'story'}
                                                          onValueChange={(val) => {
                                                            const isCarousel = val === 'carousel';
                                                            updateAsset('socials', globalIdx, 'type', val);
                                                            updateAsset('socials', globalIdx, 'production_notes', {
                                                              ...(s.production_notes || {}),
                                                              concatenate_slices: !isCarousel
                                                            });
                                                            if (generatedAssets?.socials) {
                                                              const updatedSocials = [...generatedAssets.socials];
                                                              updatedSocials[globalIdx] = {
                                                                ...updatedSocials[globalIdx],
                                                                type: val,
                                                                production_notes: {
                                                                  ...(updatedSocials[globalIdx]?.production_notes || {}),
                                                                  concatenate_slices: !isCarousel
                                                                }
                                                              };
                                                              onSave({ ...generatedAssets, socials: updatedSocials }, true);
                                                            }
                                                            toast({
                                                              title: "Formato Actualizado",
                                                              description: isCarousel
                                                                ? "Modo Carrusel: Se generará un video por placa."
                                                                : "Modo Video: Se generará un único video continuo."
                                                            });
                                                          }}
                                                        >
                                                          <SelectTrigger className="h-11 bg-white border-border text-[9px] font-black uppercase text-foreground tracking-widest">
                                                            <div className="flex items-center gap-2">
                                                              <Layout className="h-3.5 w-3.5" />
                                                              <span>TIPO: <SelectValue placeholder="Formato" /></span>
                                                            </div>
                                                          </SelectTrigger>
                                                          <SelectContent className="bg-white border-border text-foreground">
                                                            <SelectItem value="story" className="text-[10px] uppercase font-bold">Story / Reel (9:16)</SelectItem>
                                                            <SelectItem value="short_video" className="text-[10px] uppercase font-bold">Short Video (9:16)</SelectItem>
                                                            <SelectItem value="portrait_post" className="text-[10px] uppercase font-bold">Post Vertical (4:5)</SelectItem>
                                                            <SelectItem value="single_post" className="text-[10px] uppercase font-bold">Post Cuadrado (1:1)</SelectItem>
                                                            <SelectItem value="carousel" className="text-[10px] uppercase font-bold">Carrusel (4:5)</SelectItem>
                                                          </SelectContent>
                                                        </Select>
                                                      </div>

                                                                                                             <div className="flex-1 max-w-[150px]">
                                                         <Select
                                                           value={s.language || coordinationPlan?.language || courses?.find((c: any) => c.id === selectedCourseId)?.language || 'es-AR'}
                                                           onValueChange={(val) => {
                                                             updateAsset('socials', globalIdx, 'language', val);
                                                             if (generatedAssets?.socials) {
                                                               const updatedSocials = [...generatedAssets.socials];
                                                               updatedSocials[globalIdx] = {
                                                                 ...updatedSocials[globalIdx],
                                                                 language: val
                                                               };
                                                               onSave({ ...generatedAssets, socials: updatedSocials }, true);
                                                             }
                                                             toast({
                                                               title: "Idioma de la Pieza Actualizado",
                                                               description: `Modismo configurado en: ${SUPPORTED_LANGUAGES.find(l => l.code === val)?.label || val}`
                                                             });
                                                           }}
                                                         >
                                                           <SelectTrigger className="h-11 bg-white border-border text-[9px] font-black uppercase text-foreground tracking-widest">
                                                             <div className="flex items-center gap-1.5 truncate">
                                                               <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                                                               <span className="truncate">IDIOMA: <SelectValue /></span>
                                                             </div>
                                                           </SelectTrigger>
                                                           <SelectContent className="bg-white border-border text-foreground">
                                                             {SUPPORTED_LANGUAGES.map((lang) => (
                                                               <SelectItem key={lang.code} value={lang.code} className="text-[10px] uppercase font-bold">
                                                                 {lang.badge} - {lang.label}
                                                               </SelectItem>
                                                             ))}
                                                           </SelectContent>
                                                         </Select>
                                                       </div>

<div className="flex-1 max-w-[170px]">
                                                        <Select
                                                          value={s.production_notes?.brandPaletteId || 'adn'}
                                                          onValueChange={(val) => {
                                                            const selectedCourse = courses?.find((c: any) => c.id === selectedCourseId);
                                                            const palette = resolveVideoBrandPalette(val, null, profile, selectedCourse);
                                                            const newColors = palette ? {
                                                              name: palette.name,
                                                              primary: palette.primary,
                                                              secondary: palette.secondary,
                                                              accent: palette.accent,
                                                              outline: palette.outline
                                                            } : null;

                                                            updateAsset('socials', globalIdx, 'production_notes', {
                                                              ...(s.production_notes || {}),
                                                              brandPaletteId: val,
                                                              brandColors: newColors
                                                            });

                                                            if (generatedAssets?.socials) {
                                                              const updatedSocials = [...generatedAssets.socials];
                                                              updatedSocials[globalIdx] = {
                                                                ...updatedSocials[globalIdx],
                                                                production_notes: {
                                                                  ...(updatedSocials[globalIdx]?.production_notes || {}),
                                                                  brandPaletteId: val,
                                                                  brandColors: newColors
                                                                }
                                                              };
                                                              onSave({ ...generatedAssets, socials: updatedSocials }, true);
                                                            }

                                                            toast({
                                                              title: "Paleta de Color Actualizada",
                                                              description: `Subtítulos configurados con: ${palette?.name || 'ADN Original'}`
                                                            });
                                                          }}
                                                        >
                                                          <SelectTrigger className="h-11 bg-white border-border text-[9px] font-black uppercase text-foreground tracking-widest">
                                                            <div className="flex items-center gap-2 truncate">
                                                              <Palette className="h-3.5 w-3.5 text-primary shrink-0" />
                                                              <span className="truncate">COLOR: <SelectValue placeholder="Paleta" /></span>
                                                            </div>
                                                          </SelectTrigger>
                                                          <SelectContent className="bg-white border-border text-foreground max-h-72">
                                                            {getSystemVideoPalettes(profile, courses?.find((c: any) => c.id === selectedCourseId)).map((palette) => (
                                                              <SelectItem key={palette.id} value={palette.id} className="text-[10px] uppercase font-bold">
                                                                <div className="flex items-center gap-2">
                                                                  {palette.primary ? (
                                                                    <span
                                                                      className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                                                      style={{ backgroundColor: palette.primary }}
                                                                    />
                                                                  ) : (
                                                                    <span className="text-[10px]"></span>
                                                                  )}
                                                                  <span>{palette.name}</span>
                                                                </div>
                                                              </SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                      </div>

                                                      <div className="flex-1 max-w-[170px]">
                                                        <Popover>
                                                          <PopoverTrigger asChild>
                                                            <Button
                                                              variant="outline"
                                                              className="h-11 w-full bg-white border-border text-[9px] font-black uppercase text-foreground tracking-widest px-3 flex items-center justify-between gap-1 hover:bg-muted/40"
                                                            >
                                                              <div className="flex items-center gap-1.5 truncate">
                                                                <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                                                <span className="truncate">
                                                                  URL: {
                                                                    ((s.includeMentorUrl ?? (s.landingId === 'mentor')) && (s.includeLandingUrl ?? (s.landingId !== 'mentor')))
                                                                      ? 'MENTOR + LANDING'
                                                                      : (s.includeMentorUrl ?? (s.landingId === 'mentor'))
                                                                      ? 'SOLO MENTOR'
                                                                      : (s.includeLandingUrl ?? (s.landingId !== 'mentor'))
                                                                      ? 'SOLO LANDING'
                                                                      : 'SIN URL'
                                                                  }
                                                                </span>
                                                              </div>
                                                            </Button>
                                                          </PopoverTrigger>
                                                          <PopoverContent className="w-80 p-4 bg-white border-border shadow-xl space-y-3" align="start">
                                                            <div className="border-b border-border pb-2">
                                                              <p className="text-[10px] font-black uppercase tracking-wider text-foreground">Destinos en la Publicación</p>
                                                              <p className="text-[9px] text-muted-foreground">Tilda las URLs que deseas incorporar al contenido.</p>
                                                            </div>

                                                            {/* Checkbox 1: URL del Mentor */}
                                                            <label className="flex items-start gap-3 p-2.5 rounded-xl border border-border/60 hover:bg-muted/30 cursor-pointer transition-colors">
                                                              <Checkbox
                                                                checked={s.includeMentorUrl ?? (s.landingId === 'mentor')}
                                                                onCheckedChange={(checked) => {
                                                                  updateAsset('socials', globalIdx, 'includeMentorUrl', !!checked);
                                                                }}
                                                                className="mt-0.5"
                                                              />
                                                              <div className="flex-1 space-y-0.5">
                                                                <span className="text-[10px] font-bold uppercase text-foreground tracking-wide">URL del Mentor</span>
                                                                <p className="text-[9px] text-muted-foreground">Enlace a biografía o perfil del mentor.</p>
                                                              </div>
                                                            </label>

                                                            {/* Checkbox 2: URL de la Landing */}
                                                            {(() => {
                                                              const defaultInheritedLanding = normalizedLandingsList.find(l => l.id === s.landingId)
                                                                || normalizedLandingsList[0]
                                                                || (selectedCourseId ? { id: selectedCourseId, title: 'Landing del Asistente', url: `/v/${selectedCourseId}` } : null);

                                                              return (
                                                                <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                                                                  <label className="flex items-start gap-3 cursor-pointer">
                                                                    <Checkbox
                                                                      checked={s.includeLandingUrl ?? (s.landingId !== 'mentor')}
                                                                      onCheckedChange={(checked) => {
                                                                        const isChecked = !!checked;
                                                                        updateAsset('socials', globalIdx, 'includeLandingUrl', isChecked);
                                                                        if (isChecked && (!s.landingId || s.landingId === 'mentor') && defaultInheritedLanding) {
                                                                          updateAsset('socials', globalIdx, 'landingId', defaultInheritedLanding.id);
                                                                        }
                                                                      }}
                                                                      className="mt-0.5"
                                                                    />
                                                                    <div className="flex-1 space-y-0.5">
                                                                      <span className="text-[10px] font-bold uppercase text-foreground tracking-wide">URL de la Landing</span>
                                                                      <p className="text-[9px] text-muted-foreground">Página de venta / oferta activa.</p>
                                                                    </div>
                                                                  </label>

                                                                  {(s.includeLandingUrl ?? (s.landingId !== 'mentor')) && (
                                                                    <div className="pt-1.5 pl-6">
                                                                      {normalizedLandingsList.length <= 1 ? (
                                                                        <div className="flex items-center justify-between text-[10px] bg-white p-2 rounded-lg border border-border">
                                                                          <div className="flex items-center gap-1.5 truncate mr-2">
                                                                            <span className="text-muted-foreground font-medium">Heredada:</span>
                                                                            <span className="font-bold text-foreground truncate">
                                                                              {defaultInheritedLanding?.title || 'Landing del Asistente'}
                                                                            </span>
                                                                          </div>
                                                                          {defaultInheritedLanding && (
                                                                            <span className="font-mono text-[9px] text-primary shrink-0 font-bold">
                                                                              {defaultInheritedLanding.url}
                                                                            </span>
                                                                          )}
                                                                        </div>
                                                                      ) : (
                                                                        <Select
                                                                          value={s.landingId && s.landingId !== 'mentor' ? s.landingId : (defaultInheritedLanding?.id || '')}
                                                                          onValueChange={(val) => {
                                                                            updateAsset('socials', globalIdx, 'landingId', val);
                                                                            updateAsset('socials', globalIdx, 'includeLandingUrl', true);
                                                                          }}
                                                                        >
                                                                          <SelectTrigger className="h-8 bg-white border-border text-[9px] font-bold">
                                                                            <SelectValue placeholder="Seleccionar Landing" />
                                                                          </SelectTrigger>
                                                                          <SelectContent className="bg-white border-border text-foreground">
                                                                            {normalizedLandingsList.map((landing) => (
                                                                              <SelectItem key={landing.id} value={landing.id} className="text-[10px] uppercase font-bold">
                                                                                {landing.title} ({landing.url})
                                                                              </SelectItem>
                                                                            ))}
                                                                          </SelectContent>
                                                                        </Select>
                                                                      )}
                                                                    </div>
                                                                  )}
                                                                </div>
                                                              );
                                                            })()}
                                                          </PopoverContent>
                                                        </Popover>
                                                      </div>

                                                      </div>
                                                    <Button
                                                      variant="outline"
                                                      onClick={() => handleGenerateBreakdown(s, globalIdx, 'socials')}
                                                      disabled={isGeneratingBreakdown === `socials-${globalIdx}`}
                                                      className="h-11 shrink-0 rounded-xl bg-foreground hover:bg-foreground/90 text-white border-2 border-foreground font-black text-[9px] uppercase tracking-widest gap-2 px-4 transition-all"
                                                    >
                                                      {isGeneratingBreakdown === `socials-${globalIdx}` ? (
                                                        <><Loader2 className="h-4 w-4 animate-spin" /> Esquematizando...</>
                                                      ) : (
                                                        <><Sparkles className="h-4 w-4" /> RE-GENERAR CONTENIDO</>
                                                      )}
                                                    </Button>
                                                  </div>

                                                  <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Nombre de la Pieza</Label>
                                                    <Input value={s.marketingName} onChange={e => updateAsset('socials', globalIdx, 'marketingName', e.target.value)} className="font-bold border-border bg-white h-14 px-6 text-xl text-foreground" />
                                                  </div>

                                                  <div className="space-y-4 bg-muted/30 p-5 rounded-2xl border border-border">
                                                    <div className="space-y-2">
                                                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Gancho (Hook)</Label>
                                                      <Input value={s.hook} onChange={e => updateAsset('socials', globalIdx, 'hook', e.target.value)} className="bg-white border-border text-foreground text-sm font-bold italic h-11 px-4" />
                                                    </div>
                                                    <div className="space-y-2">
                                                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Cuerpo (Caption)</Label>
                                                      <Textarea value={s.caption} onChange={e => updateAsset('socials', globalIdx, 'caption', e.target.value)} className="min-h-[120px] border border-border bg-white p-4 text-sm font-medium text-foreground" />
                                                    </div>
                                                  </div>

                                                  <SceneNarrativeEditor asset={s} sIdx={globalIdx} selectedCourseId={selectedCourseId} courseTitle={courses?.find(c => c.id === selectedCourseId)?.title} updateAsset={updateAsset as any} isGeneratingBreakdown={isGeneratingBreakdown} onGenerateBreakdown={handleGenerateBreakdown} />

                                                  {getPlatformLabels(s.type).isDocument && s.platform === 'linkedin' ? (
                                                    <PdfProductionPanel
                                                      asset={s}
                                                      sIdx={globalIdx}
                                                      onGeneratePdf={handleGeneratePdf}
                                                      onDeletePdf={handleDeletePdf}
                                                      isGenerating={isGeneratingPdf === `${globalIdx}`}
                                                    />
                                                  ) : (
                                                    <VideoProductionPanel
                                                      asset={s}
                                                      sIdx={globalIdx}
                                                      pageId={blueprintData?.id || 'draft'}
                                                      isRenderingVideo={isRenderingVideo}
                                                      updateAsset={updateAsset as any}
                                                      onGenerateVideo={handleGenerateVideo}
                                                      onGenerateVideoIA={handleGenerateVideoIA}
                                                      onGenerateLongVideo={handleGenerateLongVideo}
                                                      onGeneratePrompt={handleGeneratePrompt}
                                                      onDeleteVideo={handleDeleteVideo}
                                                      renderedVideos={renderedVideos}
                                                      googleToken={googleToken}
                                                      onRefreshGoogleToken={ensureGoogleToken}
                                                      adns={dynamicAdns}
                                                      jobProgress={jobProgress[globalIdx]}
                                                      profile={profile}
                                                      onSave={onSave}
                                                      allAssets={generatedAssets}
                                                    />
                                                  )}
                                                </div>
                                                <div className="lg:col-span-5 p-6 md:p-8 bg-muted/20 border-t lg:border-t-0 lg:border-l border-border">
                                                  <div className="sticky top-0">
                                                    <SocialLivePreview social={s} tokens={blueprintData?.assets?.socials?.[globalIdx]?.designTokens || s.designTokens} adn={dynamicAdns[s.production_notes?.adnId || s.adnId || s.production_notes?.adn || '01_CINEMA'] || dynamicAdns['01_CINEMA'] || Object.values(dynamicAdns)[0]} />
                                                  </div>
                                                </div>
                                              </div>
                                            </Card>
                                          </div>

                                          <div className="shrink-0 bg-white border-t border-border px-6 md:px-10 py-5">

                                            <div className="flex flex-col md:flex-row gap-4">
                                              <DialogClose asChild>
                                                <Button
                                                  variant="outline"
                                                  onClick={() => onSave(generatedAssets, true)}
                                                  className="border-border hover:bg-muted/40 text-foreground font-bold h-16 px-10 rounded-2xl w-full md:w-1/2"
                                                >
                                                  Cerrar Editor (Guardar Cambios)
                                                </Button>
                                              </DialogClose>
                                              <Button
                                                disabled={getPlatformLabels(s.type).isDocument && s.platform === 'linkedin' ? !s.production_notes?.pdf_url : !(s.production_notes?.video_url || renderedVideos[globalIdx])}
                                                onClick={async () => {
                                                  const confirmLock = window.confirm('Al sellar la pieza se marcará como lista para publicación. Los archivos temporales se purgarán de la base de datos para ahorrar espacio. ¿Confirmar?');
                                                  if (confirmLock) {
                                                    try {
                                                      // 1. Borrado físico de Storage (opcional/silencioso)
                                                      const { initializeFirebase } = await import('@/firebase');
                                                      const { ref: storageRef, deleteObject } = await import('firebase/storage');
                                                      const { storage } = initializeFirebase();

                                                      if (s.production_notes?.audio_url) {
                                                        try { await deleteObject(storageRef(storage, s.production_notes.audio_url)); } catch (e) { console.warn(e); }
                                                      }
                                                      for (const sl of (s.slides || [])) {
                                                        if (sl.imageUrl && sl.imageUrl.includes('firebasestorage')) {
                                                          try { await deleteObject(storageRef(storage, sl.imageUrl)); } catch (e) { console.warn(e); }
                                                        }
                                                      }
                                                    } catch (e) { console.warn("Error en limpieza física:", e); }

                                                    // 2. Construir copia local para forzar guardado síncrono
                                                    const updatedSocials = [...generatedAssets.socials];
                                                    updatedSocials[globalIdx] = {
                                                      ...s,
                                                      production_notes: {
                                                        ...(s.production_notes || {}),
                                                        audio_url: null,
                                                        audio_filename: null,
                                                        audio_duration: null,
                                                        isLocked: true
                                                      },
                                                      slides: []
                                                    };
                                                    const newOverrideAssets = { ...generatedAssets, socials: updatedSocials };

                                                    // 3. Limpieza de estado visual para UI React
                                                    updateAsset('socials', globalIdx, 'production_notes', newOverrideAssets.socials[globalIdx].production_notes);
                                                    updateAsset('socials', globalIdx, 'slides', []);

                                                    // 4. Forzar auto-save a Firestore para persistir el "sello"
                                                    onSave(newOverrideAssets, true);

                                                    toast({ title: 'Pieza Sellada', description: 'Archivos temporales purgados y base de datos actualizada. Pieza lista para publicar.' });
                                                  }
                                                }}
                                                className="bg-primary hover:bg-primary/90 text-white font-black h-16 px-10 rounded-2xl text-sm md:text-lg w-full md:w-1/2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title={getPlatformLabels(s.type).isDocument && s.platform === 'linkedin' ? (!s.production_notes?.pdf_url ? 'Debes generar el PDF primero' : '') : (!(s.production_notes?.video_url || renderedVideos[globalIdx]) ? 'Debes generar el video primero' : '')}
                                              >
                                                <Save className="mr-3 h-6 w-6" /> SELLAR PIEZA (Finalizar)
                                              </Button>
                                            </div>
                                          </div>
                                        </DialogContent>
                                      </Dialog>

                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Eliminar Pieza"
                                        className="h-10 w-10 md:h-12 md:w-12 rounded-xl text-danger hover:text-danger hover:bg-danger/10"
                                        onClick={() => {
                                          const confirmDelete = window.confirm('¿Seguro que deseas eliminar esta pieza?');
                                          if (confirmDelete) {
                                            const newSocials = [...rawSocials];
                                            newSocials.splice(globalIdx, 1);
                                            updateAsset('socials', 0, 'replace_all', newSocials);
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-5 w-5" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
  );
}
