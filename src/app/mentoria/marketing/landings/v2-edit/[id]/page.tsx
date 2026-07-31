'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Loader2, Video, ImageIcon, FileText, Settings, Eye, ArrowLeft, Sparkles } from 'lucide-react';
import { ImageEditor } from '@/components/courses/ImageEditor';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { regenerateSectionV2 } from '@/ai/flows/generate-landing-v2';
import { useAuth } from '@/components/auth-context';
import { buildSectionPrompt, buildContextHint, getSectionsNeedingImages } from '@/lib/landing-images';
import { getLandingStyle, TOKEN_LABELS, TOKEN_DESCRIPTIONS, StyleTokens, StyleBrand } from '@/lib/landing-styles';
import { BrandVisual } from '@/components/landing/brand-visual';

export default function V2LandingEditorPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { storage } = useFirebase();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState('');
  const [landingData, setLandingData] = useState<any>(null);
  const [styleData, setStyleData] = useState<any>(null);
  const [courseData, setCourseData] = useState<any>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !id) return;
    const loadLandingAndStyle = async () => {
      try {
        const snap = await getDoc(doc(db, 'salesPages', id));
        if (snap.exists()) {
          const data = snap.data();
          setLandingData(data);
          
          const currentStyleId = data.styleId || 'classic'; // Fallback a classic
          let loadedStyle: any = null;
          if (currentStyleId) {
            // Firestore es la fuente de verdad (los admins editan estilos ahí).
            // Si no existe en Firestore, se usa el estático como fallback.
            const styleSnap = await getDoc(doc(db, 'landingStyles', currentStyleId));
            if (styleSnap.exists()) {
              loadedStyle = styleSnap.data();
              setStyleData(loadedStyle);
            } else {
              const staticStyle = getLandingStyle(currentStyleId);
              if (staticStyle) {
                loadedStyle = staticStyle;
                setStyleData(staticStyle);
              }
            }
          }

          // Si la landing no tiene styleTokens propios, copiar los del estilo
          if (loadedStyle?.tokens && !data.content?.designTokens?.styleTokens) {
            setLandingData((prev: any) => ({
              ...prev,
              content: {
                ...(prev.content || {}),
                designTokens: {
                  ...(prev.content?.designTokens || {}),
                  styleTokens: { ...loadedStyle.tokens }
                }
              }
            }));
          }

          if (data.courseId) {
            const courseSnap = await getDoc(doc(db, 'courses', data.courseId));
            if (courseSnap.exists()) {
              setCourseData(courseSnap.data());
            }
          }

          if (data.content?.sections?.length > 0) {
            setActiveSectionId(data.content.sections[0].id);
          }
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Landing no encontrada' });
          router.push('/mentoria/marketing/landings');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadLandingAndStyle();
  }, [db, id, router, toast]);

  const handleSave = async () => {
    if (!db || !id || !landingData) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'salesPages', id), {
        content: landingData.content,
        isActive: true,
        updatedAt: new Date(),
      });
      toast({ title: 'Éxito', description: 'Cambios guardados correctamente.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateSection = async () => {
    if (!activeSectionId || !landingData || !courseData) return;
    
    setIsRegenerating(true);
    try {
      const baseId = activeSectionId.split('_')[0];
      const styleSec = styleData?.availableSections?.find((s: any) => s.id === baseId);

      const result = await regenerateSectionV2({
        courseTitle: courseData.title,
        courseDescription: courseData.description || '',
        mentorName: profile?.displayName || 'Tutor',
        targetAudience: landingData.targetAudience || 'Estudiantes',
        styleId: landingData.styleId || 'classic',
        sectionId: activeSectionId,
        sectionName: styleSec?.name || 'Sección',
        sectionDescription: styleSec?.description
      });

      // Maintain existing image and video URLs so they are not lost
      const currentSection = landingData.content.sections.find((s: any) => s.id === activeSectionId);
      
      const newSections = landingData.content.sections.map((s: any) => 
        s.id === activeSectionId ? { 
          ...s, 
          ...result,
          imageUrl: result.imageUrl || currentSection?.imageUrl,
          videoUrl: result.videoUrl || currentSection?.videoUrl
        } : s
      );
      
      setLandingData({
        ...landingData,
        content: { ...landingData.content, sections: newSections }
      });
      toast({ title: 'Éxito', description: 'Sección regenerada con IA.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleGenerateAllImages = async () => {
    if (!landingData?.content?.sections || !courseData || !storage) return;
    setIsGeneratingImages(true);
    try {
      const pendingSections = getSectionsNeedingImages(landingData.content.sections, styleData);
      if (pendingSections.length === 0) {
        toast({ title: 'Sin imágenes pendientes', description: 'Todas las secciones ya tienen imagen.' });
        return;
      }

      const ctx = {
        styleName: styleData?.name || 'Classic',
        styleDescription: styleData?.description || '',
        palette: {
          primary: landingData.content.designTokens?.primary || '#3B2D86',
          accent: landingData.content.designTokens?.accent || '#FACC15',
          secondary: landingData.content.designTokens?.secondary || '#F8FAFC',
        },
        courseTitle: courseData.title,
      };

      const updatedSections = [...landingData.content.sections];

      for (let i = 0; i < pendingSections.length; i++) {
        const sec = pendingSections[i];
        setImageGenProgress(`${i + 1}/${pendingSections.length}: ${sec.baseType}`);

        const prompt = buildSectionPrompt(sec, ctx);
        const contextHint = buildContextHint(sec, ctx);
        const keywords = sec.title || sec.content || sec.baseType;

        const res = await fetch('/api/ai/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: '',
            keywords,
            courseTitle: ctx.courseTitle,
            contextHint,
            engine: 'free',
            channel: 'landing',
          }),
        });

        if (!res.ok) {
          console.warn(`[Images] Failed section ${sec.id}: ${res.status}`);
          continue;
        }

        const data = await res.json();
        if (!data.imageDataUrl) {
          console.warn(`[Images] No image data for ${sec.id}`);
          continue;
        }

        const storagePath = `campaigns/${landingData.courseId}/landing/ai_${sec.id}_${Date.now()}.jpg`;
        const sRef = ref(storage, storagePath);
        await uploadString(sRef, data.imageDataUrl, 'data_url');
        const downloadUrl = await getDownloadURL(sRef);

        const idx = updatedSections.findIndex((s: any) => s.id === sec.id);
        if (idx >= 0) {
          updatedSections[idx] = { ...updatedSections[idx], imageUrl: downloadUrl };
        }
      }

      setLandingData({
        ...landingData,
        content: { ...landingData.content, sections: updatedSections },
      });

      toast({ title: 'Imágenes generadas', description: `Se procesaron ${pendingSections.length} secciones.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsGeneratingImages(false);
      setImageGenProgress('');
    }
  };

  const updateActiveSection = (updates: any) => {
    if (!landingData || !activeSectionId) return;
    const sections = [...(landingData.content?.sections || [])];
    const idx = sections.findIndex((s: any) => s.id === activeSectionId);
    if (idx >= 0) {
      sections[idx] = { ...sections[idx], ...updates };
    } else {
      sections.push({ id: activeSectionId, ...updates });
    }
    setLandingData({
      ...landingData,
      content: {
        ...landingData.content,
        sections
      }
    });
  };

  const updateDesignTokens = (tokens: any) => {
    setLandingData((prev: any) => ({
      ...prev,
      content: {
        ...prev.content,
        designTokens: {
          ...(prev.content?.designTokens || {}),
          ...tokens
        }
      }
    }));
  };

  const applyBrand = (brand: StyleBrand) => {
    updateDesignTokens({
      styleTokens: { ...brand.tokens },
      typography: brand.typography,
      primary: brand.palette.primary,
      secondary: brand.palette.secondary,
      accent: brand.palette.accent,
      brandApplied: brand.name
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-[80vh] flex items-center justify-center">
          <Loader2 className="animate-spin text-primary w-10 h-10" />
        </div>
      </DashboardLayout>
    );
  }

  const activeSection = landingData?.content?.sections?.find((s: any) => s.id === activeSectionId) || (activeSectionId === 'footer_0' ? { id: 'footer_0', title: 'Sígueme en mis Redes', content: '', bullets: [] } : undefined);

  const brands = styleData?.brands || [];
  const appliedBrandName = landingData?.content?.designTokens?.brandApplied;
  const activeBrand: StyleBrand | undefined =
    (appliedBrandName && brands.find((b: StyleBrand) => b.name === appliedBrandName)) ||
    brands.find((b: StyleBrand) => b.palette?.primary === landingData?.content?.designTokens?.primary && b.typography?.name === landingData?.content?.designTokens?.typography?.name) ||
    undefined;

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto pb-20 space-y-6">
        <header className="flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md z-10 py-4 border-b border-border/50">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/mentoria/marketing/landings')} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-headline font-bold text-slate-800">Editor V2: {landingData?.title}</h1>
              <p className="text-xs text-muted-foreground">Modifica los contenidos de cada sección en tiempo real.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerateAllImages}
              disabled={isGeneratingImages}
              variant="outline"
              className="rounded-full font-bold border-violet-300 text-violet-600 hover:bg-violet-50"
            >
              {isGeneratingImages ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
              {isGeneratingImages ? imageGenProgress || 'Generando...' : 'Generar Imágenes'}
            </Button>
            <Button variant="outline" onClick={() => window.open(`/v/${id}`, '_blank')} className="rounded-full font-bold">
              <Eye className="w-4 h-4 mr-2" />
              Previsualizar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-full font-bold bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Cambios
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start h-[calc(100vh-140px)]">
          {/* Panel Izquierdo: Lista de Secciones */}
          <Card className="shadow-none border-border/50 bg-white/50 h-full overflow-hidden flex flex-col rounded-2xl">
            <div className="p-4 border-b border-border/50 bg-slate-50/50">
              <h3 className="font-bold text-sm text-slate-700">Diseño y Configuración</h3>
            </div>
            <div className="p-3">
              <button
                onClick={() => setActiveSectionId('global_settings')}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors",
                  activeSectionId === 'global_settings' 
                    ? "bg-violet-600 text-white shadow-sm"
                    : "hover:bg-slate-100 text-slate-600 bg-slate-50 border border-slate-200"
                )}
              >
                🎨 Paleta y Tipografía
              </button>
              <button
                onClick={() => setActiveSectionId('footer_0')}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors mt-2",
                  activeSectionId === 'footer_0' 
                    ? "bg-slate-800 text-white shadow-sm"
                    : "hover:bg-slate-100 text-slate-600 bg-slate-50 border border-slate-200"
                )}
              >
                🔗 Pie de Página (Links)
              </button>
            </div>
            <div className="p-4 border-y border-border/50 bg-slate-50/50">
              <h3 className="font-bold text-sm text-slate-700">Estructura de la Página</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {[...(landingData?.content?.sections || [])].sort((a: any, b: any) => {
                  const aBase = a.id.split('_')[0];
                  const bBase = b.id.split('_')[0];
                  const aIdx = styleData?.availableSections?.findIndex((s: any) => s.id === aBase) ?? 999;
                  const bIdx = styleData?.availableSections?.findIndex((s: any) => s.id === bBase) ?? 999;
                  return aIdx - bIdx;
                }).map((sec: any) => {
                  const baseId = sec.id.split('_')[0];
                  const styleSec = styleData?.availableSections?.find((s: any) => s.id === baseId);
                  const displayTitle = styleSec?.name || sec.name || sec.id;
                  
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSectionId(sec.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors",
                        activeSectionId === sec.id 
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-slate-100 text-slate-600"
                      )}
                    >
                      {displayTitle}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>

          {/* Panel Derecho: Editor de la Sección Activa */}
          {activeSection || activeSectionId === 'global_settings' ? (
            <Card className="shadow-sm border-border/50 h-full overflow-hidden flex flex-col rounded-2xl bg-white">
              <div className="p-6 border-b border-border/50 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800">
                  {activeSectionId === 'global_settings' ? 'Configuración Visual Global' : `Editando: ${(() => {
                    const baseId = activeSection.id?.split('_')[0];
                    const styleSec = styleData?.availableSections?.find((s: any) => s.id === baseId);
                    return styleSec?.name || activeSection?.name || activeSection?.id;
                  })()}`}
                </h2>
                {activeSectionId !== 'global_settings' && activeSectionId !== 'footer' && (
                  <Button 
                    onClick={handleRegenerateSection} 
                    disabled={isRegenerating}
                    size="sm" 
                    variant="outline" 
                    className="ml-auto font-bold text-violet-600 border-violet-200 bg-violet-50 hover:bg-violet-100"
                  >
                    {isRegenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Re-escribir con IA
                  </Button>
                )}
              </div>
              <ScrollArea className="flex-1 p-6">
                <div className="max-w-2xl space-y-6">
                  {activeSectionId === 'global_settings' ? (
                    <div className="space-y-8">
                      {/* BRANDS */}
                      <div className="space-y-4">
                        <Label className="text-lg font-bold text-slate-800">Brand Visual</Label>
                        <p className="text-sm text-muted-foreground">Pack completo: tokens + tipografía + paleta. El brand activo es el que aplica la landing; seleccioná uno para ver su gama completa.</p>
                        <BrandVisual
                          brands={brands}
                          activeName={activeBrand?.name}
                          onSelect={applyBrand}
                        />
                      </div>

                      {/* TOKENS CSS */}
                      <div className="space-y-4 pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-bold text-slate-800">Tokens CSS</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-slate-400 hover:text-slate-600"
                            onClick={() => {
                              const updated = { ...landingData };
                              if (activeBrand) {
                                updated.content.designTokens.styleTokens = { ...activeBrand.tokens };
                              } else if (updated.content?.designTokens?.styleTokens) {
                                delete updated.content.designTokens.styleTokens;
                              }
                              setLandingData(updated);
                            }}
                          >
                            Restaurar valores del estilo
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">Valores del brand activo. Se aplican al renderizar la landing; para cambiarlos, seleccioná otro brand arriba.</p>
                        <div className="grid grid-cols-2 gap-3">
                          {styleData?.tokens && Object.entries(TOKEN_LABELS).map(([key, label]) => {
                            const tokenKey = key as keyof StyleTokens;
                            const styleVal = styleData.tokens[tokenKey];
                            const overrideVal = landingData?.content?.designTokens?.styleTokens?.[tokenKey];
                            const currentVal = overrideVal ?? styleVal;
                            return (
                              <div key={key} className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">{label}</label>
                                <div
                                  className="flex h-8 w-full items-center rounded-md border border-input bg-slate-50 px-3 py-1 text-xs font-mono text-slate-700"
                                  title={TOKEN_DESCRIPTIONS[tokenKey]}
                                >
                                  {currentVal}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : activeSectionId === 'footer_0' ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 leading-relaxed">
                        <p className="font-bold mb-1">📌 Pie de Página automático</p>
                        <p>Los íconos de redes sociales (Instagram, TikTok, YouTube, etc.) se muestran automáticamente desde tu <strong>perfil de tutor</strong>. No necesitas configurarlos aquí.</p>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                        <div>
                          <Label className="font-bold text-slate-700 text-base">Mostrar Pie de Página</Label>
                          <p className="text-sm text-slate-500">Muestra u oculta las redes sociales y el copyright en la landing.</p>
                        </div>
                        <Switch 
                          checked={activeSection.isVisible !== false} 
                          onCheckedChange={(checked) => updateActiveSection({ isVisible: checked })}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                  {/* Visibilidad de la Sección */}
                  {(() => {
                    const baseId = activeSection.id.split('_')[0];
                    const activeSectionStyle = styleData?.availableSections?.find((s: any) => s.id === baseId);
                    
                    if (!activeSectionStyle) return null;

                    return (
                      <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                        <div>
                          <Label className="font-bold text-slate-700 text-base">Sección Visible</Label>
                          <p className="text-sm text-slate-500">
                            {activeSectionStyle.required 
                              ? "Esta sección es obligatoria para este diseño." 
                              : "Muestra u oculta esta sección en la landing page."}
                          </p>
                        </div>
                        <Switch 
                          checked={activeSectionStyle.required ? true : (activeSection.isVisible !== false)} 
                          disabled={activeSectionStyle.required}
                          onCheckedChange={(checked) => updateActiveSection({ isVisible: checked })}
                        />
                      </div>
                    );
                  })()}

                  {/* Inputs de Texto Generales */}
                  {activeSection.title !== undefined && (
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">Título Principal</Label>
                      <Input 
                        value={activeSection.title}
                        onChange={(e) => updateActiveSection({ title: e.target.value })}
                        className="font-bold text-lg"
                       size="lg" />
                    </div>
                  )}
                  {activeSection.subtitle !== undefined && (
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">Subtítulo</Label>
                      <Textarea 
                        value={activeSection.subtitle}
                        onChange={(e) => updateActiveSection({ subtitle: e.target.value })}
                        className="min-h-[100px] resize-none"
                      />
                    </div>
                  )}
                  {(activeSection.content !== undefined || activeSection.body !== undefined) && (
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">Cuerpo de Texto</Label>
                      <Textarea 
                        value={activeSection.content || activeSection.body || ''}
                        onChange={(e) => updateActiveSection({ content: e.target.value })}
                        className="min-h-[150px]"
                      />
                    </div>
                  )}
                  {activeSection.id.startsWith('syllabus') ? (
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <Label className="font-bold text-slate-700">Módulos del Temario</Label>
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                        Los módulos de esta sección se sincronizan automáticamente con el contenido de tu curso. Solo puedes editar el título y la descripción principal.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <Label className="font-bold text-slate-700 flex items-center justify-between">
                        Viñetas / Puntos Clave
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs text-primary"
                          onClick={() => updateActiveSection({ bullets: [...(activeSection.bullets || []), ''] })}
                        >
                          + Añadir Viñeta
                        </Button>
                      </Label>
                      {(activeSection.bullets || []).map((b: string, i: number) => (
                        <div key={i} className="flex gap-2">
                          <Textarea
                            value={b}
                            onChange={(e) => {
                              const newB = [...(activeSection.bullets || [])];
                              newB[i] = e.target.value;
                              updateActiveSection({ bullets: newB });
                            }}
                            className="min-h-[60px] flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => {
                              const newB = [...(activeSection.bullets || [])];
                              newB.splice(i, 1);
                              updateActiveSection({ bullets: newB });
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inputs Multimedia */}
                  {(() => {
                    const baseId = activeSection.id.split('_')[0];
                    const activeSectionStyle = styleData?.availableSections?.find((s: any) => s.id === baseId);
                    const acceptsVideo = activeSectionStyle?.contentType === 'video' || activeSectionStyle?.contentType === 'mixed';
                    const acceptsImage = activeSectionStyle?.contentType === 'mixed' || 
                                         activeSectionStyle?.contentType === 'image' || 
                                         activeSection.id.startsWith('narrativeSections') ||
                                         activeSection.id.startsWith('mentorProfile') ||
                                         activeSection.id.startsWith('bonuses') ||
                                         activeSection.id.startsWith('countdownTimer') ||
                                         activeSection.id.startsWith('testimonials');

                    return (
                      <>
                        {acceptsVideo && (
                          <div className="space-y-2 pt-4 border-t border-slate-100">
                            <Label className="flex items-center gap-2 font-bold text-slate-700">
                              <Video className="w-4 h-4 text-violet-500" />
                              URL del Video (Vimeo, YouTube)
                            </Label>
                            <Input 
                              value={activeSection.videoUrl || ''}
                              onChange={(e) => updateActiveSection({ videoUrl: e.target.value })}
                              placeholder="https://..."
                            />
                          </div>
                        )}
                        {acceptsImage && (
                          <div className="space-y-4 pt-4 border-t border-slate-100">
                            <Label className="flex items-center gap-2 font-bold text-slate-700">
                              <ImageIcon className="w-4 h-4 text-blue-500" />
                              Imagen de la Sección
                            </Label>
                            <ImageEditor 
                              label={`Imagen de ${activeSectionStyle?.name || 'la sección'}`}
                              url={activeSection.imageUrl || ''}
                              onUpdate={(u) => updateActiveSection({ imageUrl: u })}
                              courseId={landingData?.courseId || ''}
                              channel="landing"
                              courseTitle={landingData?.content?.marketingName || landingData?.marketingName || ''}
                              keywords={activeSection.title || ''}
                              description={activeSection.content || activeSection.body || ''}
                              aiPromptHint={`Estilo visual de la landing: ${styleData?.name || 'Moderno'} (${styleData?.description || 'Diseño corporativo'}). Tipo de sección: ${activeSectionStyle?.name || 'Sección'}. Objetivo de la sección: ${activeSectionStyle?.description || 'Mostrar contenido'}. Instrucción: Crea una imagen altamente profesional que conceptualice este texto, usando este estilo. NO copies el texto literalmente en la imagen.`}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* CTA para toda sección (Opcional) */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <Label className="font-bold text-slate-700">Botón de Compra al final de la sección</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs text-muted-foreground">Texto del botón (Deja vacío si no quieres botón en esta sección)</Label>
                        <Input 
                          value={activeSection.ctaText || ''}
                          onChange={(e) => updateActiveSection({ ctaText: e.target.value })}
                          placeholder="Ej: Inscribirme Ahora"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </Card>
      ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground bg-slate-50 rounded-2xl border border-dashed border-border/50">
              Selecciona una sección a la izquierda para editarla
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
