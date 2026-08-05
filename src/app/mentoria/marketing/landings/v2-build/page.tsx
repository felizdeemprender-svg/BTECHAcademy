'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, getDoc, updateDoc, Timestamp, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Layout, 
  Loader2, 
  Rocket, 
  DollarSign,
  CheckCircle2,
  Target,
  Zap,
  UserCheck,
  CalendarDays,
  UserPlus,
  AlertTriangle,
  Palette,
  UserCog,
  Wand2
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { generateLandingV2 } from '@/ai/flows/generate-landing-v2';
import { generateBuyerPersonas } from '@/ai/flows/generate-buyer-personas';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { LandingStyle, LandingStyleSection, StyleGroup, STYLE_GROUP_LABELS, STYLE_GROUP_COLORS, StyleBrand } from '@/lib/landing-styles';
import { uploadPendingImagesInObject } from '@/lib/upload-base64';

const STRATEGIC_SEGMENTS = [
  { id: 'technical', label: 'Perfiles Técnicos (Hard Skills)', desc: 'Enfoque en dominio de herramientas, código, ingeniería o implementación precisa.' },
  { id: 'health', label: 'Área Salud y Bienestar', desc: 'Enfoque en autoridad profesional, evidencia científica y ética del cuidado.' },
  { id: 'corporate', label: 'Sector Corporativo / B2B', desc: 'Enfoque en eficiencia operativa, liderazgo de equipos, ROI y reporte de resultados.' },
  { id: 'entrepreneurs', label: 'Solopreneurs & Freelancers', desc: 'Enfoque en escala de marca personal, optimización del tiempo y libertad operativa.' },
  { id: 'career_pivot', label: 'Reconversión Profesional', desc: 'Enfoque en seguridad ante la automatización y adquisición rápida de nuevas competencias.' },
  { id: 'academic', label: 'Estudiantes / Académicos', desc: 'Enfoque en profundidad teórica, certificaciones y especialización de alto nivel.' }
];

export default function V2LandingBuilderPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <V2LandingBuilderContent />
    </Suspense>
  );
}

function V2LandingBuilderContent() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { storage } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPersonas, setIsGeneratingPersonas] = useState(false);
  const [aiPersonas, setAiPersonas] = useState<any[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [basePrice, setBasePrice] = useState<number>(49900);
  const [anchorPrice, setAnchorPrice] = useState<number>(0);
  const [priceMercadoPago, setPriceMercadoPago] = useState<number>(49900);
  const [priceTransfer, setPriceTransfer] = useState<number>(49900);
  const [title, setTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [templateDirectives, setTemplateDirectives] = useState('');
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [colorPaletteName, setColorPaletteName] = useState('');
  const [typographyVariantName, setTypographyVariantName] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<StyleBrand | null>(null);
  
  // Lista de secciones solicitadas a la IA
  const [requestedSections, setRequestedSections] = useState<{id: string; title: string; required: boolean}[]>([]);

  // Campos de Vigencia y Referido
  const [activeFrom, setActiveFrom] = useState('');
  const [activeUntil, setActiveUntil] = useState('');
  const [referidoId, setReferidoId] = useState<string>('');
  const [referidos, setReferidos] = useState<{ id: string; displayName: string; email: string }[]>([]);
  const [allowedPaymentMethods, setAllowedPaymentMethods] = useState<string[]>(['mercadopago', 'transfer']);

  const isMercadoPagoActive = !!profile?.profile?.mercadopago?.accessToken || !!profile?.mercadopago?.accessToken;
  const isTransferActive = !!profile?.profile?.bankDetails?.cbu || !!profile?.profile?.bankDetails?.alias || !!profile?.bankDetails?.cbu || !!profile?.bankDetails?.alias;

  const cleanUndefined = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(v => v === undefined ? null : cleanUndefined(v));
    if (obj !== null && typeof obj === 'object') {
      if (typeof obj.toDate === 'function' || obj._methodName === 'serverTimestamp' || obj.isEqual) {
        return obj;
      }
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, cleanUndefined(v)])
      );
    }
    return obj;
  };

  // Cargar referidos
  useEffect(() => {
    if (!db || !profile?.uid) return;
    const loadReferidos = async () => {
      try {
        const snap = await getDocs(collection(db, 'mentorInfluencers', profile.uid, 'referidos'));
        setReferidos(snap.docs.map(d => ({ 
          id: d.id, 
          displayName: d.data().displayName || d.data().email, 
          email: d.data().email 
        })));
      } catch (e) {
        console.warn('[Builder] No se pudieron cargar los referidos:', e);
      }
    };
    loadReferidos();
  }, [db, profile?.uid]);

  const coursesQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'courses'), where('mentorId', '==', profile.uid));
  }, [db, profile?.uid]);
  const { data: courses } = useCollection(coursesQuery);

  const stylesQuery = useMemoFirebase(() => query(collection(db, 'landingStyles')), [db]);
  const { data: styles } = useCollection<LandingStyle>(stylesQuery);

  const selectedStyle = useMemo(() => styles?.find(s => s.id === selectedStyleId), [styles, selectedStyleId]);

  const styleBrands = useMemo(() => selectedStyle?.brands || [], [selectedStyle]);

  const extraPalettes = useMemo(() => {
    const taken = new Set(styleBrands.map(b => b.palette.name));
    return (selectedStyle?.colorProposals || []).filter(c => !taken.has(c.name));
  }, [selectedStyle, styleBrands]);

  const extraTypography = useMemo(() => {
    const taken = new Set(styleBrands.map(b => b.typography.name));
    return (selectedStyle?.typography || []).filter(t => !taken.has(t.name));
  }, [selectedStyle, styleBrands]);

  const myLandingsQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'salesPages'), where('mentorId', '==', profile.uid));
  }, [db, profile?.uid]);
  const { data: myLandings } = useCollection(myLandingsQuery);

  const tagsQuery = useMemoFirebase(() => query(collection(db, 'tags')), [db]);
  const { data: rawTags } = useCollection(tagsQuery);

  const selectedCourse = useMemo(() => courses?.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);

  const dynamicProfiles = useMemo(() => {
    if (aiPersonas.length > 0) return aiPersonas;
    
    if (!selectedCourse || !rawTags) return STRATEGIC_SEGMENTS;
    const courseTags = (selectedCourse.tagIds || []).map((tid: string) => {
      const tag = rawTags.find(t => t.id === tid);
      return tag ? { id: tag.id, label: `Especialista en ${tag.name}`, desc: `Perfil enfocado en la maestría de ${tag.name}.` } : null;
    }).filter(Boolean);
    return [...courseTags, ...STRATEGIC_SEGMENTS];
  }, [selectedCourse, rawTags, aiPersonas]);

  const handleGeneratePersonas = async () => {
    if (!selectedCourse) return;
    setIsGeneratingPersonas(true);
    try {
      const result = await generateBuyerPersonas({
        courseTitle: selectedCourse.title,
        courseDescription: selectedCourse.description || ''
      });
      setAiPersonas(result.personas);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsGeneratingPersonas(false);
    }
  };

  const handleNextStep = () => {
    setStep(2);
  };

  const handleGenerate = async () => {
    if (!profile?.uid || !selectedCourseId || !selectedStyleId) return;
    setIsGenerating(true);
    try {
      const course = courses?.find(c => c.id === selectedCourseId);
      if (!course) throw new Error('Curso no encontrado');

      // 1. Llamar a Genkit para generar el texto base
      const result = await generateLandingV2({
        courseTitle: course.title,
        courseDescription: course.description || '',
        mentorName: profile?.displayName || 'Mentor Experto',
        price: basePrice,
        targetAudience: targetAudience,
        styleId: selectedStyleId,
        directives: templateDirectives,
        colorPaletteName,
        typographyVariantName,
        requestedSections: requestedSections,
      });

      // 2. Consultar módulos reales del curso para inyectar en el syllabus
      const modulesSnap = await getDocs(query(collection(db, 'courses', selectedCourseId, 'modules'), orderBy('order', 'asc')));
      const realModules = modulesSnap.docs.map(d => {
        const data = d.data();
        return `**${data.title}**: ${data.description || 'Sin descripción.'}`;
      });

      // 3. Reemplazar el contenido del temario (syllabus) con los módulos reales
      const finalSections = result.sections.map((section: any) => {
        if (section.id.startsWith('syllabus')) {
          return {
            ...section,
            bullets: realModules.length > 0 ? realModules : ['(Aún no has agregado módulos a tu curso)']
          };
        }
        return section;
      });

      const finalData = {
        ...result,
        sections: finalSections,
        designTokens: {
          ...((result as any).designTokens || {}),
          styleTokens: selectedBrand?.tokens ? { ...selectedBrand.tokens } : (selectedStyle?.tokens ? { ...selectedStyle.tokens } : undefined),
          typography: selectedBrand?.typography || (result as any).designTokens?.typography,
          primary: selectedBrand?.palette?.primary || (result as any).designTokens?.primary,
          secondary: selectedBrand?.palette?.secondary || (result as any).designTokens?.secondary,
          accent: selectedBrand?.palette?.accent || (result as any).designTokens?.accent,
          brandApplied: selectedBrand?.name
        }
      };

      // 4. Armar el payload para guardar directamente en salesPages
      const payload = {
        mentorId: profile.uid,
        courseId: selectedCourseId,
        styleId: selectedStyleId,
        landingType: basePrice > 0 && allowedPaymentMethods.length > 0 ? (activeUntil ? 'promocion' : 'general') : 'general',
        title: title || result.marketingName || 'Nueva Landing',
        price: basePrice,
        oldPrice: anchorPrice > 0 ? anchorPrice : null,
        priceMercadoPago: isMercadoPagoActive ? priceMercadoPago : null,
        priceTransfer: isTransferActive ? priceTransfer : null,
        allowedPaymentMethods,
        targetAudience,
        activeFrom: activeFrom || null,
        activeUntil: activeUntil || null,
        referidoId: referidoId || null,
        content: finalData, // Estructura atómica inyectada
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'published',
        isActive: true
      };

      // 5. Guardar y redirigir
      const safePayload = cleanUndefined(payload);
      if (editId) {
        await updateDoc(doc(db, 'salesPages', editId), safePayload);
        toast({ title: 'Éxito', description: 'Landing page actualizada correctamente.' });
        router.push(`/mentoria/marketing/landings/v2-edit/${editId}`);
      } else {
        const docRef = await addDoc(collection(db, 'salesPages'), safePayload);
        toast({ title: 'Éxito', description: 'Landing page creada correctamente.' });
        router.push(`/mentoria/marketing/landings/v2-edit/${docRef.id}`);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCourseSelect = (id: string) => {
    if (selectedCourseId !== id) {
      setSelectedCourseId(id);
      setTitle('');
    }
  };

  const handleStyleSelect = (style: LandingStyle) => {
    setSelectedStyleId(style.id);
    setSelectedBrand(null); // Reset brand when style changes
    setColorPaletteName(style.colorProposals?.[0]?.name || '');
    setTypographyVariantName(style.typography?.[0]?.name || '');
    
    // Inicializar secciones basadas en la configuración por defecto del estilo
    const initialSections = style.availableSections
      .filter((sec: LandingStyleSection) => style.defaultVisibility?.[sec.id] || sec.required)
      .map((sec: LandingStyleSection) => ({ id: sec.id, title: sec.name, required: sec.required }));
    setRequestedSections(initialSections);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-10 pb-20">
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Asistente Atómico V2</h1>
            <p className="text-sm text-muted-foreground font-medium">Paso {step} de 2.</p>
          </div>
        </header>

        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
            <Card className="p-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">1. Programa Académico</Label>
                <ScrollArea className="h-64 rounded-2xl border p-2 bg-muted">
                  <div className="space-y-2">
                    {courses?.map(c => (
                      <div key={c.id} onClick={() => handleCourseSelect(c.id)} className={cn("p-4 rounded-xl border-2 transition-all cursor-pointer font-bold text-sm", selectedCourseId === c.id ? "bg-white border-primary shadow-sm text-primary" : "bg-white border-transparent text-foreground hover:border-primary/20")}>
                        {c.title}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">2. Estilo Visual Atómico</Label>
                <ScrollArea className="h-64 rounded-2xl border p-2 bg-muted">
                  <div className="space-y-2">
                    {styles?.map(s => (
                      <div key={s.id} onClick={() => handleStyleSelect(s)} className={cn("flex gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer", selectedStyleId === s.id ? "bg-white border-accent shadow-sm" : "bg-white border-transparent hover:border-accent/20")}>
                        <div className="w-16 h-16 rounded-lg bg-muted shrink-0 overflow-hidden">
                          {s.thumbnail ? (
                            <img src={s.thumbnail} alt={s.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-border"><Palette /></div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={cn("font-bold", selectedStyleId === s.id ? "text-accent" : "text-foreground")}>{s.name}</p>
                            <Badge variant="outline" className={`text-[8px] uppercase font-bold px-1.5 py-0 h-4 ${STYLE_GROUP_COLORS[s.group as StyleGroup] || ''}`}>
                              {STYLE_GROUP_LABELS[s.group as StyleGroup] || s.group}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              <Button disabled={!selectedCourseId || !selectedStyleId} onClick={handleNextStep} className="w-full h-14 rounded-2xl font-bold">Continuar al Enfoque <ArrowRight className="ml-2 h-5 w-5" /></Button>
            </Card>
            
            <div className="bg-muted rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
              {selectedStyleId ? (
                  <div className="max-w-sm space-y-6 z-10">
                    <div className="w-24 h-24 mx-auto bg-white rounded-3xl p-2 border-4 border-muted overflow-hidden relative">
                      {selectedStyle?.thumbnail ? (
                        <img src={selectedStyle.thumbnail} alt={selectedStyle.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-border"><Layout className="h-10 w-10" /></div>
                      )}
                    </div>
                    <div>
                      <Badge className="mb-3 bg-accent text-white">{selectedStyle?.name}</Badge>
                      <h3 className="text-2xl font-black text-foreground mb-3">ADN del Estilo</h3>
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                        {selectedStyle?.description || 'Estilo enfocado en alta conversión, guiando al usuario desde el problema hasta la solución.'}
                      </p>
                    </div>

                    <div className="bg-primary/5 p-4 rounded-2xl text-left border border-primary/10">
                      <p className="text-[10px] font-black uppercase text-primary mb-1">Cerebro de la IA para este estilo</p>
                      <p className="text-xs text-foreground font-medium">
                        {selectedStyle?.aiWriterPersona || 'Tono directo, persuasivo y enfocado en la conversión.'}
                      </p>
                    </div>
                    
                    {/* Brand Selector */}
                    {selectedStyle?.brands && selectedStyle.brands.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-border">
                        <p className="text-[10px] font-black uppercase text-muted-foreground">Brand Visual</p>
                        <p className="text-xs text-muted-foreground">Elige el pack completo (tokens + tipografía + paleta)</p>
                        <div className="grid gap-2">
                          {selectedStyle.brands.map((brand: StyleBrand, i: number) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSelectedBrand(brand)}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                                selectedBrand?.name === brand.name ? "border-primary bg-primary/5 shadow-sm" : "border-muted bg-white hover:border-primary/20"
                              )}
                            >
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: brand.palette.primary }}>
                                <Palette className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn("font-bold text-sm", selectedBrand?.name === brand.name ? "text-primary" : "text-foreground")}>{brand.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{brand.description}</p>
                                <div className="flex gap-1 mt-1 text-[9px]">
                                  <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: brand.palette.primary }} title="Primary" />
                                  <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: brand.palette.secondary }} title="Secondary" />
                                  <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: brand.palette.accent }} title="Accent" />
                                </div>
                              </div>
                              <Badge variant={selectedBrand?.name === brand.name ? "default" : "outline"} className="text-[9px] font-bold">
                                {selectedBrand?.name === brand.name ? 'Activo' : 'Aplicar'}
                              </Badge>
                            </button>
                          ))}
                        </div>
                        {selectedBrand && (
                          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                            <p className="text-[10px] font-bold uppercase text-primary mb-1">Brand Activo: {selectedBrand.name}</p>
                            <p className="text-[10px] text-muted-foreground">Tokens: {selectedBrand.tokens.themeMode} · {selectedBrand.tokens.componentRadius} · {selectedBrand.typography.name} · Paleta: {selectedBrand.palette.name}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="pt-4 border-t border-border">
                      <Button variant="outline" className="w-full rounded-2xl font-bold border-2" onClick={() => window.open(`/preview-style/${selectedStyleId}`, '_blank')}>
                        <Layout className="mr-2 h-4 w-4" /> Ver Demo del Diseño
                      </Button>
                    </div>
                  </div>
                ) : (
                <div className="max-w-xs space-y-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary"><Rocket className="h-10 w-10" /></div>
                  <h3 className="text-2xl font-black text-foreground">Motor Atómico V2</h3>
                  <p className="text-sm text-muted-foreground font-medium">Selecciona un Estilo Visual a la izquierda para ver su ADN estratégico y previsualizar su diseño.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <Card className="rounded-lg bg-white overflow-hidden max-w-4xl mx-auto animate-in slide-in-from-right-8">
            <CardHeader className="bg-primary/5 p-10">
              <CardTitle className="text-2xl font-bold">Configuración Estratégica (Paso 2)</CardTitle>
              <CardDescription>Define la estrategia para guiar la pluma del Copywriter AI.</CardDescription>
            </CardHeader>
            <CardContent className="p-10">
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Título de la Página</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary/10 border-none px-6 font-bold"  size="xl" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-black uppercase text-accent">Precio Base (Referencia para Copy AI)</Label>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent" />
                    <Input 
                      type="number" 
                      value={basePrice} 
                      onChange={e => {
                        const val = Number(e.target.value);
                        setBasePrice(val);
                        // Sincronizar automáticamente si el usuario no los había modificado
                        if (priceMercadoPago === basePrice) setPriceMercadoPago(val);
                        if (priceTransfer === basePrice) setPriceTransfer(val);
                      }} 
                      className="bg-accent/5 border-none pl-12 font-black text-xl text-accent" 
                     size="xl" />
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent/40" />
                    <Input 
                      type="number" 
                      value={anchorPrice || ''} 
                      placeholder="Precio anterior (tachado) — vacío = automático (precio × 2.94)"
                      onChange={e => setAnchorPrice(e.target.value === '' ? 0 : Number(e.target.value))} 
                      className="bg-accent/5 border-none pl-12 font-semibold text-muted-foreground" 
                     size="xl" />
                  </div>
                  <p className="text-[9px] text-muted-foreground font-medium">Este precio se usará para redactar los textos. Abajo puedes desglosar el precio real por método de pago.</p>
                </div>
              </div>

              {/* MEDIOS DE PAGO PERMITIDOS Y PRECIOS ESPECÍFICOS */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Medios de Pago y Precios Finales</Label>
                  <Badge variant="outline" className="text-[8px] font-bold text-accent border-accent/20 h-5 px-2">Checkout</Badge>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {isMercadoPagoActive && (
                    <div className={cn("p-4 rounded-2xl border-2 transition-all", allowedPaymentMethods.includes('mercadopago') ? 'bg-primary/10 border-primary shadow-sm' : 'bg-white border-border')}>
                      <div className="flex items-center gap-3 mb-4">
                        <button
                          onClick={() => setAllowedPaymentMethods(prev => prev.includes('mercadopago') ? prev.filter(m => m !== 'mercadopago') : [...prev, 'mercadopago'])}
                          className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors", allowedPaymentMethods.includes('mercadopago') ? 'bg-primary text-white hover:bg-primary' : 'bg-muted text-muted-foreground hover:bg-border')}
                        >
                          💳
                        </button>
                        <div>
                          <p className={cn("font-black text-sm", allowedPaymentMethods.includes('mercadopago') ? 'text-foreground' : 'text-muted-foreground')}>Mercado Pago</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Tarjetas, saldo, cuotas.</p>
                        </div>
                      </div>
                      
                      {allowedPaymentMethods.includes('mercadopago') && (
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-primary uppercase">Precio Cobro MP</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input 
                              type="number" 
                              value={priceMercadoPago} 
                              onChange={e => setPriceMercadoPago(Number(e.target.value))} 
                              className="h-10 rounded-xl bg-white border-primary/20 pl-9 font-bold text-foreground focus-visible:ring-primary" 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isTransferActive && (
                    <div className={cn("p-4 rounded-2xl border-2 transition-all", allowedPaymentMethods.includes('transfer') ? 'bg-primary/10 border-primary shadow-sm' : 'bg-white border-border')}>
                      <div className="flex items-center gap-3 mb-4">
                        <button
                          onClick={() => setAllowedPaymentMethods(prev => prev.includes('transfer') ? prev.filter(m => m !== 'transfer') : [...prev, 'transfer'])}
                          className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors", allowedPaymentMethods.includes('transfer') ? 'bg-primary text-white hover:bg-primary' : 'bg-muted text-muted-foreground hover:bg-border')}
                        >
                          🏦
                        </button>
                        <div>
                          <p className={cn("font-black text-sm", allowedPaymentMethods.includes('transfer') ? 'text-foreground' : 'text-muted-foreground')}>Transferencia</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Aprobación manual</p>
                        </div>
                      </div>

                      {allowedPaymentMethods.includes('transfer') && (
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-primary uppercase">Precio Transferencia</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input 
                              type="number" 
                              value={priceTransfer} 
                              onChange={e => setPriceTransfer(Number(e.target.value))} 
                              className="h-10 rounded-xl bg-white border-primary/20 pl-9 font-bold text-foreground focus-visible:ring-primary" 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
                {(!isMercadoPagoActive && !isTransferActive) && (
                  <p className="text-xs text-danger font-bold mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> No tienes métodos de cobro configurados. Configúralos en tu Perfil de Mentor.
                  </p>
                )}
                {allowedPaymentMethods.length === 0 && (
                  <p className="text-xs text-danger font-bold mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Debes seleccionar al menos un medio de pago (si el precio es mayor a 0).
                  </p>
                )}

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Segmentación Estratégica (Buyer Persona)</Label>
                    <p className="text-xs text-muted-foreground">Describe a quién va dirigida esta landing, o elige un perfil.</p>
                  </div>
                  <Button onClick={handleGeneratePersonas} disabled={isGeneratingPersonas} variant="outline" size="sm" className="h-9 rounded-xl font-bold bg-primary/5 border-primary/20 text-primary hover:bg-primary/10">
                    {isGeneratingPersonas ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                    Personas con IA
                  </Button>
                </div>
                
                <Textarea value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Ej: Médicos interesados en optimizar su consulta..." className="min-h-[80px] bg-secondary/10 border-none p-4 text-sm font-medium" />
                
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dynamicProfiles.map((seg: any) => {
                    const isSelected = targetAudience.includes(seg.label);
                    
                    const handleToggle = () => {
                      if (isSelected) {
                        setTargetAudience(prev => prev.replace(new RegExp(`\\n?-? ?${seg.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: [^\\n]+`), '').trim());
                      } else {
                        setTargetAudience(prev => {
                          const p = prev.trim();
                          return p ? `${p}\n- ${seg.label}: ${seg.desc}` : `- ${seg.label}: ${seg.desc}`;
                        });
                      }
                    };

                    return (
                      <button 
                        key={seg.id} 
                        onClick={handleToggle} 
                        className={cn(
                          "relative p-4 rounded-2xl border-2 transition-all text-left group overflow-hidden", 
                          isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-muted bg-white hover:border-primary/20 hover:bg-muted"
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className={cn("font-bold text-xs pr-6", isSelected ? "text-primary" : "text-foreground group-hover:text-primary")}>{seg.label}</p>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-primary absolute top-4 right-4" />}
                        </div>
                        <p className="text-[9px] text-muted-foreground line-clamp-3 pr-4">{seg.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Directivas Extras de Copy (Opcional)</Label>
                  <Badge variant="outline" className="text-[8px] font-bold text-primary border-primary/20 h-5 px-2">Cerebro de Marketing</Badge>
                </div>
                <Textarea value={templateDirectives} onChange={e => setTemplateDirectives(e.target.value)} placeholder="Ej: Usa un tono muy técnico, enfócate en el ROI..." size="lg" className="bg-secondary/10 border-none p-6 text-sm font-medium" />
              </div>

              {/* ─── VIGENCIA DE LA LANDING ─── */}
              <div className="space-y-4 pt-6 border-t border-muted animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase text-primary tracking-widest block">Vigencia de la Promoción (Opcional)</Label>
                    <p className="text-[9px] text-muted-foreground font-medium">La landing se bloqueará automáticamente fuera de este rango.</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Inicio (Desde)</Label>
                    <Input
                      type="datetime-local"
                      value={activeFrom}
                      onChange={e => setActiveFrom(e.target.value)}
                      className="bg-primary/10/50 border-none px-6 font-bold text-foreground"
                     size="xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Fin (Hasta)</Label>
                    <Input
                      type="datetime-local"
                      value={activeUntil}
                      onChange={e => setActiveUntil(e.target.value)}
                      className="bg-danger/10/50 border-none px-6 font-bold text-foreground"
                     size="xl" />
                  </div>
                </div>
              </div>

              {/* ─── ASIGNACIÓN DE REFERIDO ─── */}
              <div className="space-y-4 pt-6 border-t border-muted">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase text-success tracking-widest block">Asignar a un Referido (Embajador)</Label>
                    <p className="text-[9px] text-muted-foreground font-medium">Opcional. Todos los leads de esta landing se atribuirán a este referido.</p>
                  </div>
                </div>

                {referidos.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-muted border border-dashed border-border text-center">
                    <p className="text-xs text-muted-foreground font-medium">No hay usuarios con rol <span className="font-black text-muted-foreground">'referido'</span> en el sistema aún.</p>
                    <p className="text-[9px] text-muted-foreground mt-1">Puedes asignar el rol 'referido' a cualquier usuario desde el panel de administración.</p>
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                    {/* Opción sin referido */}
                    <button
                      onClick={() => setReferidoId('')}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                        !referidoId ? 'bg-muted border-muted-foreground' : 'bg-white border-muted hover:border-border'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-border flex items-center justify-center text-muted-foreground text-xs font-black">—</div>
                      <span className="text-xs font-bold text-muted-foreground">Sin referido (landing general)</span>
                    </button>
                    {referidos.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setReferidoId(r.id)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                          referidoId === r.id ? 'bg-success/10 border-success shadow-sm' : 'bg-white border-muted hover:border-success/20'
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center text-success text-xs font-black">
                          {(r.displayName || r.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-foreground truncate">{r.displayName}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{r.email}</p>
                        </div>
                        {referidoId === r.id && <CheckCircle2 className="h-4 w-4 text-success ml-auto shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* ─── ESTÉTICA VISUAL (Movido del Paso 3 al Paso 2) ─── */}
              <div className="space-y-6 pt-6 border-t border-muted">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Estética Visual</Label>
                  <p className="text-xs text-muted-foreground">Elige la personalidad visual que se usará para el renderizado.</p>
                </div>

                {styleBrands.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Packs por Brand</label>
                      <p className="text-xs text-muted-foreground">Cada brand agrupa su paleta de colores y su tipografía. Al elegirlo se aplica el pack completo (tokens + tipografía + paleta).</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {styleBrands.map((brand: StyleBrand) => {
                          const isActive = selectedBrand?.name === brand.name;
                          const paletteIsActive = isActive || (!selectedBrand && colorPaletteName === brand.palette.name);
                          const typoIsActive = isActive || (!selectedBrand && typographyVariantName === brand.typography.name);
                          return (
                            <button
                              key={brand.name}
                              type="button"
                              onClick={() => {
                                setSelectedBrand(brand);
                                setColorPaletteName(brand.palette.name);
                                setTypographyVariantName(brand.typography.name);
                              }}
                              className={cn(
                                "text-left p-4 rounded-2xl border-2 transition-all",
                                isActive ? "border-primary bg-primary/5 shadow-sm" : "border-muted bg-white hover:border-border"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="w-full h-8 rounded-lg flex overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                                    <div className="flex-1" style={{ backgroundColor: brand.palette.primary }}></div>
                                    <div className="flex-1" style={{ backgroundColor: brand.palette.secondary }}></div>
                                    <div className="flex-1" style={{ backgroundColor: brand.palette.accent }}></div>
                                  </div>
                                  <p className={cn("mt-2 text-[10px] font-bold leading-tight truncate", paletteIsActive ? "text-primary" : "text-muted-foreground")}>
                                    Paleta: {brand.palette.name}
                                  </p>
                                </div>
                                <div className="w-20 shrink-0">
                                  <div className={cn("flex flex-col items-center justify-center text-center p-2 rounded-xl border-2", typoIsActive ? "border-primary bg-primary/5" : "border-muted bg-white")}>
                                    <span className="text-lg font-black text-foreground leading-none mb-1" style={{ fontFamily: brand.typography.headingFont }}>Aa</span>
                                    <span className={cn("text-[8px] font-bold leading-tight text-center line-clamp-2", typoIsActive ? "text-primary" : "text-muted-foreground")}>{brand.typography.name}</span>
                                  </div>
                                </div>
                              </div>
                              <p className={cn("mt-2 font-bold text-sm", isActive ? "text-primary" : "text-foreground")}>{brand.name}</p>
                              {brand.description && <p className="text-[10px] text-muted-foreground mt-0.5">{brand.description}</p>}
                              <p className="text-[9px] text-muted-foreground mt-1.5 font-medium">Tokens: {brand.tokens.themeMode} · {brand.tokens.componentRadius} · Sombra: {brand.tokens.componentShadow}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(extraPalettes.length > 0 || extraTypography.length > 0) && (
                      <div className="space-y-4 pt-4 border-t border-muted">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Otras opciones</label>
                        <div className="grid md:grid-cols-2 gap-8">
                          {extraPalettes.length > 0 && (
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Paleta de Colores</label>
                              <div className="grid grid-cols-4 gap-2">
                                {extraPalettes.map((color: any) => {
                                  const isActive = colorPaletteName === color.name;
                                  return (
                                    <button
                                      key={color.name}
                                      type="button"
                                      onClick={() => { setColorPaletteName(color.name); setSelectedBrand(null); }}
                                      className={cn(
                                        "flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all group",
                                        isActive ? "border-primary bg-primary/5 shadow-sm" : "border-muted bg-white hover:border-border"
                                      )}
                                    >
                                      <div className="w-full h-8 rounded-lg flex overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                                        <div className="flex-1" style={{ backgroundColor: color.primary }}></div>
                                        <div className="flex-1" style={{ backgroundColor: color.secondary }}></div>
                                        <div className="flex-1" style={{ backgroundColor: color.accent }}></div>
                                      </div>
                                      <span className={cn("text-[9px] font-bold text-center leading-tight line-clamp-2", isActive ? "text-primary" : "text-muted-foreground")}>
                                        {color.name}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {extraTypography.length > 0 && (
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tipografías</label>
                              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                {extraTypography.map((typo: any) => {
                                  const isActive = typographyVariantName === typo.name;
                                  return (
                                    <button
                                      key={typo.name}
                                      type="button"
                                      onClick={() => { setTypographyVariantName(typo.name); setSelectedBrand(null); }}
                                      className={cn(
                                        "flex flex-col items-center justify-center text-center p-3 rounded-xl border-2 transition-all",
                                        isActive ? "border-primary bg-primary/5 shadow-sm" : "border-muted bg-white hover:border-border"
                                      )}
                                    >
                                      <span className="text-lg font-black text-foreground leading-none mb-1" style={{ fontFamily: typo.headingFont }}>Aa</span>
                                      <span className={cn("text-[9px] font-bold leading-tight", isActive ? "text-primary" : "text-muted-foreground")}>{typo.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Paleta de Colores</label>
                      <div className="grid grid-cols-5 gap-2">
                        {selectedStyle?.colorProposals?.map((color: any, idx: number) => {
                          const isActive = colorPaletteName === color.name || (!colorPaletteName && idx === 0);
                          return (
                            <button
                              key={color.name}
                              type="button"
                              onClick={() => setColorPaletteName(color.name)}
                              className={cn(
                                "flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all group",
                                isActive ? "border-primary bg-primary/5 shadow-sm" : "border-muted bg-white hover:border-border"
                              )}
                            >
                              <div className="w-full h-8 rounded-lg flex overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                                <div className="flex-1" style={{ backgroundColor: color.primary }}></div>
                                <div className="flex-1" style={{ backgroundColor: color.secondary }}></div>
                                <div className="flex-1" style={{ backgroundColor: color.accent }}></div>
                              </div>
                              <span className={cn("text-[9px] font-bold text-center leading-tight line-clamp-2", isActive ? "text-primary" : "text-muted-foreground")}>
                                {color.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tipografías</label>
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                        {selectedStyle?.typography?.map((typo: any, idx: number) => {
                          const isActive = typographyVariantName === typo.name || (!typographyVariantName && idx === 0);
                          return (
                            <button
                              key={typo.name}
                              type="button"
                              onClick={() => setTypographyVariantName(typo.name)}
                              className={cn(
                                "flex flex-col items-center justify-center text-center p-3 rounded-xl border-2 transition-all",
                                isActive ? "border-primary bg-primary/5 shadow-sm" : "border-muted bg-white hover:border-border"
                              )}
                            >
                              <span className="text-lg font-black text-foreground leading-none mb-1" style={{ fontFamily: typo.headingFont }}>Aa</span>
                              <span className={cn("text-[9px] font-bold leading-tight", isActive ? "text-primary" : "text-muted-foreground")}>{typo.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── ESTRUCTURA DE LA LANDING ─── */}
              <div className="space-y-6 pt-6 border-t border-muted">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Estructura de la Landing (Secciones)</Label>
                  <p className="text-xs text-muted-foreground">Configura los bloques que quieres que la IA escriba. Lo que no actives aquí, no será generado.</p>
                </div>
                
                <div className="grid gap-3">
                  {selectedStyle?.availableSections.map((sec: LandingStyleSection) => {
                    const instances = requestedSections.filter((rs: any) => rs.id === sec.id);
                    const isActive = instances.length > 0;
                    
                    return (
                      <div key={sec.id} className={cn("flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border-2 transition-all gap-4", isActive ? "border-primary/30 bg-white shadow-sm" : "border-muted bg-muted/50")}>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className={cn("font-bold text-sm", isActive ? "text-foreground" : "text-muted-foreground")}>{sec.name}</p>
                            {sec.required && <Badge variant="secondary" className="text-[8px] uppercase tracking-widest bg-warn/15 text-warn">Obligatoria</Badge>}
                            {sec.isRepeatable && <Badge variant="outline" className="text-[8px] uppercase tracking-widest text-muted-foreground">Multi-Instancia</Badge>}
                            {(sec.contentType === 'mixed' || sec.contentType === 'image') && <Badge variant="outline" className="text-[8px] uppercase tracking-widest text-blue-600 bg-blue-50 border-blue-200">Genera Imagen</Badge>}
                            {sec.contentType === 'text' && <Badge variant="outline" className="text-[8px] uppercase tracking-widest text-muted-foreground">Solo Texto</Badge>}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">{sec.description}</p>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          {sec.isRepeatable && isActive && (
                            <div className="flex items-center gap-2 mr-4 bg-muted p-1 rounded-lg">
                              <button 
                                onClick={() => {
                                  // Remove one instance
                                  const index = requestedSections.findLastIndex(rs => rs.id === sec.id);
                                  if (index !== -1 && instances.length > 1) {
                                    const newReqs = [...requestedSections];
                                    newReqs.splice(index, 1);
                                    setRequestedSections(newReqs);
                                  }
                                }}
                                disabled={instances.length <= 1}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white text-muted-foreground disabled:opacity-50 shadow-sm"
                              >-</button>
                              <span className="text-xs font-bold text-foreground w-4 text-center">{instances.length}</span>
                              <button 
                                onClick={() => setRequestedSections([...requestedSections, { id: sec.id, title: sec.name, required: sec.required }])}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white text-muted-foreground shadow-sm"
                              >+</button>
                            </div>
                          )}
                          
                          <button
                            onClick={() => {
                              if (sec.required) return;
                              if (isActive) {
                                setRequestedSections(requestedSections.filter(rs => rs.id !== sec.id));
                              } else {
                                setRequestedSections([...requestedSections, { id: sec.id, title: sec.name, required: sec.required }]);
                              }
                            }}
                            className={cn(
                              "w-12 h-6 rounded-full transition-colors relative flex items-center px-1",
                              isActive ? (sec.required ? "bg-primary/50 cursor-not-allowed" : "bg-primary") : "bg-border",
                            )}
                          >
                            <div className={cn("w-4 h-4 rounded-full bg-white transition-transform", isActive ? "translate-x-6" : "translate-x-0")} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="pt-6">
                <Button onClick={handleGenerate} disabled={isGenerating || !targetAudience || (basePrice > 0 && allowedPaymentMethods.length === 0)} className="w-full h-24 rounded-lg font-bold text-2xl bg-foreground group transition-all">
                {isGenerating ? <Loader2 className="animate-spin mr-3 h-10 w-10" /> : <Wand2 className="mr-3 h-10 w-10 text-accent group-hover:rotate-12 transition-transform" />}
                {isGenerating ? "Generando y Guardando..." : "Autogenerar Landing y Guardar"}
              </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
