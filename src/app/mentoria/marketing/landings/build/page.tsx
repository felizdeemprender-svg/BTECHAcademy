'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
  FileText,
  Target,
  Zap,
  UserCheck,
  Lightbulb,
  Brain
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { generateLandingContent } from '@/ai/flows/generate-landing-content';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { LandingEditor } from './components/LandingEditor';
import { uploadPendingImagesInObject } from '@/lib/upload-base64';

const MISSIONS = [
  { id: 'venta', label: 'Venta Directa', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', desc: 'Urgencia, ROI y escasez.' },
  { id: 'autoridad', label: 'Autoridad / Branding', icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', desc: 'Confianza y liderazgo.' },
  { id: 'lanzamiento', label: 'Lanzamiento', icon: Rocket, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', desc: 'Hype y bonos exclusivos.' },
  { id: 'leads', label: 'Captación Leads', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: 'Valor y transformación.' },
] as const;

const STRATEGIC_SEGMENTS = [
  { id: 'technical', label: 'Perfiles Técnicos (Hard Skills)', desc: 'Enfoque en dominio de herramientas, código, ingeniería o implementación precisa.' },
  { id: 'health', label: 'Área Salud y Bienestar', desc: 'Enfoque en autoridad profesional, evidencia científica y ética del cuidado.' },
  { id: 'corporate', sector: 'Sector Corporativo / B2B', label: 'Sector Corporativo / B2B', desc: 'Enfoque en eficiencia operativa, liderazgo de equipos, ROI y reporte de resultados.' },
  { id: 'entrepreneurs', label: 'Solopreneurs & Freelancers', desc: 'Enfoque en escala de marca personal, optimización del tiempo y libertad operativa.' },
  { id: 'career_pivot', label: 'Reconversión Profesional', desc: 'Enfoque en seguridad ante la automatización y adquisición rápida de nuevas competencias.' },
  { id: 'academic', label: 'Estudiantes / Académicos', desc: 'Enfoque en profundidad teórica, certificaciones y especialización de alto nivel.' }
];

export default function LandingBuilderPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <LandingBuilderContent />
    </Suspense>
  );
}

function LandingBuilderContent() {
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

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [price, setPrice] = useState<number>(49900);
  const [title, setTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [mission, setMission] = useState<'venta' | 'autoridad' | 'lanzamiento' | 'leads'>('venta');
  const [templateDirectives, setTemplateDirectives] = useState('');
  const [generatedAssets, setGeneratedAssets] = useState<any>(null);
  const [blueprintData, setBlueprintData] = useState<any>(null);

  // Indices para el Editor
  const [activeLandingIdx, setActiveLandingIdx] = useState(0);

  // Cargar página existente para edición
  useEffect(() => {
    if (editId && db) {
      const loadPage = async () => {
        setLoading(true);
        try {
          const snap = await getDoc(doc(db, 'salesPages', editId));
          if (snap.exists()) {
            const data = snap.data();
            setSelectedCourseId(data.courseId);
            setSelectedCollectionId(data.templateCollectionId);
            setTitle(data.title);
            setPrice(data.price);
            setTargetAudience(data.targetAudience || '');
            setMission(data.engineMeta?.mission || 'venta');
            setGeneratedAssets(data.aiContent);
            setTemplateDirectives(data.templateDirectives || '');
            setStep(3); 
          }
        } catch (err) {
          toast({ variant: 'destructive', title: 'Error al cargar' });
        } finally {
          setLoading(false);
        }
      };
      loadPage();
    }
  }, [editId, db]);

  // Load blueprint data
  useEffect(() => {
    if (selectedCollectionId && db) {
      getDoc(doc(db, 'templateCollections', selectedCollectionId)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setBlueprintData(data);
          if (!editId) setTemplateDirectives(data.directives || '');
        }
      });
    }
  }, [selectedCollectionId, db, editId]);

  const coursesQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'courses'), where('mentorId', '==', profile.uid));
  }, [db, profile?.uid]);
  const { data: courses } = useCollection(coursesQuery);

  const collectionsQuery = useMemoFirebase(() => query(collection(db, 'templateCollections')), [db]);
  const { data: collections } = useCollection(collectionsQuery);

  const tagsQuery = useMemoFirebase(() => query(collection(db, 'tags')), [db]);
  const { data: rawTags } = useCollection(tagsQuery);

  const selectedCourse = useMemo(() => courses?.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);

  const dynamicProfiles = useMemo(() => {
    if (!selectedCourse || !rawTags) return STRATEGIC_SEGMENTS;
    const courseTags = (selectedCourse.tagIds || []).map((tid: string) => {
      const tag = rawTags.find(t => t.id === tid);
      return tag ? { id: tag.id, label: `Especialista en ${tag.name}`, desc: `Perfil enfocado en la maestría de ${tag.name}.` } : null;
    }).filter(Boolean);
    return [...courseTags, ...STRATEGIC_SEGMENTS];
  }, [selectedCourse, rawTags]);

  const handleGenerate = async () => {
    if (!selectedCourseId || !selectedCollectionId) return;
    setIsGenerating(true);
    try {
      const course = courses?.find(c => c.id === selectedCourseId);
      const collection = collections?.find(c => c.id === selectedCollectionId);
      if (!course || !collection) throw new Error('Curso o Colección no encontrados');

      const result = await generateLandingContent({
        courseTitle: course.title,
        courseDescription: course.description || '',
        mentorName: profile?.displayName || 'Mentor Experto',
        mentorBio: profile?.profile?.bio,
        price: price,
        mission: mission,
        templateStructure: { landings: collection.assets?.landings || [] },
        targetAudience: targetAudience,
        courseTags: course.tagIds || [],
        templateDirectives: templateDirectives
      });

      setGeneratedAssets(result);
      setStep(3);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const cleanUndefined = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(v => v === undefined ? null : cleanUndefined(v));
    if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, cleanUndefined(v)])
      );
    }
    return obj;
  };

  const handleSave = async (overrideAssets?: any, silent = false) => {
    const assets = overrideAssets || generatedAssets;
    if (!profile?.uid || !assets) return;
    setLoading(true);

    try {
      const pageId = editId || Math.random().toString(36).substring(2, 15);
      const pageRef = doc(db, 'salesPages', pageId);
      const course = courses?.find(c => c.id === selectedCourseId);

      let pageData: any = {
        id: pageId,
        mentorId: profile.uid,
        title: title || `Landing: ${course?.title}`,
        courseId: selectedCourseId,
        templateCollectionId: selectedCollectionId,
        price: price,
        targetAudience: targetAudience,
        templateDirectives: templateDirectives,
        aiContent: assets,
        type: 'landing_only',
        isActive: true,
        engineMeta: { mission },
        updatedAt: serverTimestamp(),
      };

      // == LAZY UPLOAD DE IMÁGENES (Base64 -> Storage) ==
      console.log('☁️ Subiendo imágenes pendientes a la nube...');
      pageData = await uploadPendingImagesInObject(pageData, storage, `landings/${pageId}/assets`);
      
      // Limpieza final de undefined
      pageData = cleanUndefined(pageData);

      if (!editId) pageData.createdAt = serverTimestamp();

      if (editId) {
        const { createdAt, ...updateData } = pageData;
        await updateDoc(pageRef, updateData);
      } else {
        await setDoc(pageRef, pageData);
      }

      if (!silent) {
        toast({ title: 'Landing Guardada' });
        router.push('/mentoria/marketing/landings');
      }
    } catch (e: any) {
      console.error("Save Error:", e);
      toast({ variant: 'destructive', title: 'Error al guardar', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const updateAsset = (channel: any, variantIdx: number, field: string, value: any, subIndex?: number) => {
    setGeneratedAssets((prev: any) => {
      if (!prev) return prev;
      const channelData = [...(prev[channel] || [])];
      const variant = { ...channelData[variantIdx] };
      
      if (subIndex !== undefined && Array.isArray((variant as any)[field])) {
        const arr = [...(variant as any)[field]];
        arr[subIndex] = typeof arr[subIndex] === 'object' ? { ...arr[subIndex], ...value } : value;
        (variant as any)[field] = arr;
      } else {
        (variant as any)[field] = value;
      }
      
      channelData[variantIdx] = variant as any;
      return { ...prev, [channel]: channelData };
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-10 pb-20">
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Landing de Venta</h1>
            <p className="text-sm text-muted-foreground font-medium">Paso {step} de 3.</p>
          </div>
        </header>

        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden p-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">1. Programa Académico</Label>
                <ScrollArea className="h-64 rounded-2xl border p-2">
                  <div className="space-y-2">
                    {courses?.map(c => (
                      <div key={c.id} onClick={() => setSelectedCourseId(c.id)} className={cn("p-4 rounded-xl border-2 transition-all cursor-pointer font-bold text-sm", selectedCourseId === c.id ? "bg-primary/5 border-primary shadow-sm" : "bg-white border-border/50 hover:border-primary/20")}>
                        {c.title}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">2. Blueprint de Identidad</Label>
                <ScrollArea className="h-64 rounded-2xl border p-2">
                  <div className="space-y-2">
                    {collections?.map(c => (
                      <div key={c.id} onClick={() => setSelectedCollectionId(c.id)} className={cn("p-4 rounded-xl border-2 transition-all cursor-pointer font-bold text-sm", selectedCollectionId === c.id ? "bg-accent/5 border-accent shadow-sm" : "bg-white border-border/50 hover:border-accent/20")}>
                        {c.name}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <Button disabled={!selectedCourseId || !selectedCollectionId} onClick={() => setStep(2)} className="w-full h-14 rounded-2xl font-bold">Continuar al Enfoque <ArrowRight className="ml-2 h-5 w-5" /></Button>
            </Card>
            <div className="bg-slate-50 rounded-[3rem] border-2 border-dashed flex items-center justify-center p-12 text-center">
               <div className="max-w-xs space-y-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary shadow-inner"><Layout className="h-10 w-10" /></div>
                  <h3 className="text-2xl font-black text-slate-800">Cerebro Atómico</h3>
                  <p className="text-sm text-muted-foreground font-medium">Al generar solo la Landing, la IA puede profundizar en los argumentos técnicos y el cierre de venta sin distracciones.</p>
               </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden max-w-4xl mx-auto animate-in slide-in-from-right-8">
            <CardHeader className="bg-primary/5 p-10">
              <CardTitle className="text-2xl font-bold">Configuración Estratégica de la Landing</CardTitle>
              <CardDescription>Define el alma de tu página de venta para que la IA sea precisa.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-12">
              
              {/* SELECTOR DE MISIÓN */}
              <div className="space-y-6">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Selecciona la Misión de esta Landing</Label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {MISSIONS.map((m) => {
                    const Icon = m.icon;
                    const isActive = mission === m.id;
                    return (
                      <button key={m.id} onClick={() => setMission(m.id as any)} className={cn("flex flex-col items-center text-center p-6 rounded-[2rem] border-2 transition-all duration-300 gap-3 group", isActive ? `${m.bg} ${m.border} shadow-lg scale-[1.02]` : "bg-white border-slate-100 hover:border-slate-300")}>
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-inner", isActive ? "bg-white" : "bg-slate-50 group-hover:bg-slate-100")}><Icon className={cn("h-6 w-6", m.color)} /></div>
                        <div className="space-y-1">
                          <p className={cn("font-black text-xs uppercase transition-colors", isActive ? "text-slate-900" : "text-slate-500")}>{m.label}</p>
                          <p className="text-[9px] text-muted-foreground font-medium leading-tight">{m.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Título de la Página</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} className="h-14 rounded-2xl bg-secondary/10 border-none px-6 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-accent">Precio de Venta (ARS)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent" />
                    <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="h-14 rounded-2xl bg-accent/5 border-none pl-12 font-black text-xl text-accent" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Segmentación Estratégica (Buyer Persona)</Label>
                  <Badge variant="outline" className="text-[8px] font-bold text-accent border-accent/20 h-5 px-2">Guía para la IA</Badge>
                </div>
                <Textarea value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Ej: Médicos interesados en optimizar su consulta..." className="min-h-[120px] rounded-[2rem] bg-secondary/10 border-none p-6 text-base font-medium" />
                
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dynamicProfiles.map((seg: any) => (
                    <button key={seg.id} onClick={() => setTargetAudience(seg.label + ': ' + seg.desc)} className="p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-primary/20 hover:bg-slate-50 transition-all text-left group">
                      <p className="font-bold text-xs text-primary group-hover:text-accent">{seg.label}</p>
                      <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{seg.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Directivas para la IA (Guía de Copy)</Label>
                  <Badge variant="outline" className="text-[8px] font-bold text-primary border-primary/20 h-5 px-2">Cerebro de Marketing</Badge>
                </div>
                <Textarea value={templateDirectives} onChange={e => setTemplateDirectives(e.target.value)} placeholder="Ej: Usa un tono muy técnico, enfócate en el ROI..." className="min-h-[120px] rounded-[2rem] bg-secondary/10 border-none p-6 text-sm font-medium" />
              </div>

              <Button onClick={handleGenerate} disabled={isGenerating || !targetAudience} className="w-full h-24 rounded-[2.5rem] font-bold text-2xl shadow-3xl bg-slate-900 group transition-all">
                {isGenerating ? <Loader2 className="animate-spin mr-3 h-10 w-10" /> : <Sparkles className="mr-3 h-10 w-10 text-accent group-hover:rotate-12 transition-transform" />}
                Lanzar Generación Atómica
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && generatedAssets && (
          <LandingEditor
            generatedAssets={generatedAssets}
            blueprintData={blueprintData}
            activeLandingIdx={activeLandingIdx}
            setActiveLandingIdx={setActiveLandingIdx}
            selectedCourseId={selectedCourseId}
            courseTitle={selectedCourse?.title || ''}
            courseDescription={selectedCourse?.description || ''}
            price={price}
            mission={mission}
            targetAudience={targetAudience}
            templateDirectives={templateDirectives}
            updateAsset={updateAsset}
            loading={loading}
            onSave={handleSave}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
