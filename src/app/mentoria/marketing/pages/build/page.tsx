
'use client';

import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, orderBy, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { validateAndPreconformTemplates, TemplateMetadata } from '@/lib/template-validator';
import { validateAndAdjustDesignForAPIs } from '@/lib/platform-protocols';
import { generateExportPacks, ExportOptions } from '@/lib/content-exporter';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Layout, 
  BookOpen, 
  Loader2, 
  BrainCircuit, 
  Target,
  CheckCircle2,
  Rocket,
  Zap,
  Mail,
  Instagram,
  Megaphone,
  Save,
  Pencil,
  ImageIcon,
  Video,
  Play,
  RefreshCw,
  Upload,
  Trash2,
  Type,
  Palette,
  FileText,
  DollarSign,
  Link2,
  UserCheck,
  Lightbulb,
  Tags,
  Twitter,
  Linkedin,
  Circle,
  FileEdit
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { generateCampaignAssets, GenerateCampaignOutput } from '@/ai/flows/generate-campaign-assets';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { ImageEditor } from '@/components/courses/ImageEditor';
import { SocialLivePreview } from './components/SocialLivePreview';
import { PlatformIcon } from './components/PlatformIcon';
import { CampaignGenerator } from './components/CampaignGenerator';
import { TemplateEditor } from './components/TemplateEditor';

const STRATEGIC_SEGMENTS = [
  { id: 'technical', label: 'Perfiles Técnicos (Hard Skills)', desc: 'Enfoque en dominio de herramientas, código, ingeniería o implementación precisa.' },
  { id: 'health', label: 'Área Salud y Bienestar', desc: 'Enfoque en autoridad profesional, evidencia científica y ética del cuidado.' },
  { id: 'corporate', label: 'Sector Corporativo / B2B', desc: 'Enfoque en eficiencia operativa, liderazgo de equipos, ROI y reporte de resultados.' },
  { id: 'entrepreneurs', label: 'Solopreneurs & Freelancers', desc: 'Enfoque en escala de marca personal, optimización del tiempo y libertad operativa.' },
  { id: 'career_pivot', label: 'Reconversión Profesional', desc: 'Enfoque en seguridad ante la automatización y adquisición rápida de nuevas competencias.' },
  { id: 'academic', label: 'Estudiantes / Académicos', desc: 'Enfoque en profundidad teórica, certificaciones y especialización de alto nivel.' }
];

export default function ContentBuilderMatchPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    }>
      <BuilderContent />
    </Suspense>
  );
}

function BuilderContent() {
  const { profile } = useAuth();
  const { storage } = useFirebase();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number, total: number, label: string } | null>(null);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  
  const [pageTitle, setPageTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [price, setPrice] = useState<number>(49990);
  const [generatedAssets, setGeneratedAssets] = useState<GenerateCampaignOutput | null>(null);
  const [blueprintData, setBlueprintData] = useState<any>(null);

  const [activeLandingIdx, setActiveLandingIdx] = useState(0);
  const [activeEmailIdx, setActiveEmailIdx] = useState(0);
  const [activeSocialIdx, setActiveSocialIdx] = useState(0);
  const [activeAdsIdx, setActiveAdsIdx] = useState(0);

  // Load existing page for editing
  useEffect(() => {
    if (editId && db) {
      const loadPage = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, 'salesPages', editId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setSelectedCourseId(data.courseId);
            setSelectedCollectionId(data.templateCollectionId);
            setPageTitle(data.title);
            setPrice(data.price);
            setTargetAudience(data.targetAudience || '');
            setGeneratedAssets(data.aiContent);
            setStep(3); // Jump directly to editing
          }
        } catch (err) {
          console.error(err);
          toast({ variant: 'destructive', title: 'Error al cargar el pack para editar' });
        } finally {
          setLoading(false);
        }
      };
      loadPage();
    }
  }, [editId, db]);

  // Load blueprint data when collection is selected or loaded
  useEffect(() => {
    if (selectedCollectionId && db) {
      getDoc(doc(db, 'templateCollections', selectedCollectionId)).then(snap => {
        if (snap.exists()) setBlueprintData(snap.data());
      });
    }
  }, [selectedCollectionId, db]);

  const coursesQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'courses'), where('mentorId', '==', profile.uid));
  }, [db, profile?.uid]);
  const { data: rawCourses, isLoading: coursesLoading } = useCollection(coursesQuery);

  const courses = useMemo(() => {
    if (!rawCourses) return null;
    // Permitimos draft y pending para que puedan adelantar el marketing 
    // mientras se termina el contenido o auditoría.
    return rawCourses
      .filter(c => c.status !== 'rejected')
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }, [rawCourses]);

  const collectionsQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'templateCollections'), where('ownerId', '==', profile.uid));
  }, [db, profile?.uid]);
  const { data: rawCollections, isLoading: collectionsLoading } = useCollection(collectionsQuery);

  const collections = useMemo(() => {
    if (!rawCollections) return null;
    return [...rawCollections].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [rawCollections]);

  const tagsQuery = useMemoFirebase(() => query(collection(db, 'tags')), [db]);
  const { data: rawTags } = useCollection(tagsQuery);

  const allTags = useMemo(() => {
    if (!rawTags) return null;
    return [...rawTags].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [rawTags]);

  const selectedCourse = useMemo(() => {
    return courses?.find(c => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  const dynamicProfiles = useMemo(() => {
    if (!selectedCourse || !allTags) return STRATEGIC_SEGMENTS;
    
    const courseTags = (selectedCourse.tagIds || []).map((tid: string) => {
      const tag = allTags.find(t => t.id === tid);
      if (!tag) return null;
      return {
        id: tag.id,
        label: `Especialista en ${tag.name}`,
        desc: `Perfil enfocado en la maestría de ${tag.name}. Busca profundidad técnica y aplicación práctica institucional.`
      };
    }).filter(Boolean);

    return courseTags.length > 0 ? courseTags : STRATEGIC_SEGMENTS;
  }, [selectedCourse, allTags]);

  const handleMatchAndGenerate = async () => {
    if (!selectedCourseId || !selectedCollectionId) return;
    setIsGenerating(true);
    try {
      const course = courses?.find(c => c.id === selectedCourseId);
      const collection = collections?.find(c => c.id === selectedCollectionId);
      
      if (!course || !collection) throw new Error('No se pudo localizar el programa o la colección seleccionada.');

      setBlueprintData(collection);

      const tasks: { channel: string, label: string, payload: any }[] = [];
      const { assets } = collection;
      
      const chunkArray = (arr: any[], size: number) => 
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

      if (assets?.landings?.length) {
        chunkArray(assets.landings, 2).forEach((chunk, i) => 
          tasks.push({ channel: 'landings', label: `Landings ${i>0?`(${i+1})`:''}...`, payload: { landings: chunk } })
        );
      }
      if (assets?.emails?.length) {
        chunkArray(assets.emails, 3).forEach((chunk, i) => 
          tasks.push({ channel: 'emails', label: `Emails ${i>0?`(${i+1})`:''}...`, payload: { emails: chunk } })
        );
      }
      if (assets?.ads?.length) {
        chunkArray(assets.ads, 2).forEach((chunk, i) => 
          tasks.push({ channel: 'ads', label: `Anuncios ${i>0?`(${i+1})`:''}...`, payload: { ads: chunk } })
        );
      }
      if (assets?.socials?.length) {
        const platforms = ['instagram', 'tiktok', 'linkedin', 'twitter'];
        platforms.forEach(plat => {
          const platSocials = assets.socials.filter((s: any) => s.platform === plat);
          if (platSocials.length > 0) {
            chunkArray(platSocials, 2).forEach((chunk, i) => 
              tasks.push({ 
                channel: 'socials', 
                label: `Creando ${plat.charAt(0).toUpperCase() + plat.slice(1)} ${platSocials.length > 2 ? `(${i+1})` : ''}...`, 
                payload: { socials: chunk } 
              })
            );
          }
        });
        
        const otherSocials = assets.socials.filter((s: any) => !platforms.includes(s.platform));
        if (otherSocials.length > 0) {
          chunkArray(otherSocials, 2).forEach((chunk, i) => 
            tasks.push({ channel: 'socials', label: `Otros Posts ${i>0?`(${i+1})`:''}...`, payload: { socials: chunk } })
          );
        }
      }

      setGenerationProgress({ current: 0, total: tasks.length || 1, label: 'Iniciando conexión interactiva...' });

      let finalAssets: any = {};

      // Sanitize keywords for loremflickr: remove accents, special chars, spaces > dashes, max 5 words
      const sanitizeKeywords = (raw: string): string => {
        return raw
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
          .replace(/[^a-zA-Z0-9,\s-]/g, '')                // remove special chars
          .replace(/\s+/g, '-')                             // spaces → dashes
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 2)
          .slice(0, 5)
          .join(',');
      };

      // Recursive function to replace invalid image URLs with loremflickr placeholders (keyword-aware)
      const ensureValidUrls = (obj: any, baseSeed: number) => {
        const course = courses?.find(c => c.id === selectedCourseId);
        const courseTags = allTags?.filter(t => course?.tagIds?.includes(t.id)).map(t => t.name) || [];
        
        const globalKeywords = sanitizeKeywords([
          ...courseTags.slice(0, 3),
          course?.title?.split(' ').slice(0, 3).join('-') || ''
        ].filter(Boolean).join(','));

        let counter = 0;
        const walk = (o: any, path: string = '') => {
          if (typeof o !== 'object' || o === null) return;
          for (const key in o) {
            if (key === 'imageUrl' && typeof o[key] === 'string' && o[key]) {
              const val = o[key].toLowerCase();
              const isInvalid = !val.startsWith('http');
              
              if (isInvalid) {
                const uniqueSeed = baseSeed + counter + Math.floor(Math.random() * 1000);

                if (path.includes('aboutMentor') || val.includes('mentor') || val.includes('tutor') || val.includes('expert')) {
                  o[key] = profile?.photoURL || `https://loremflickr.com/800/800/professional,speaker,expert?lock=${uniqueSeed}`;
                } else if (val.includes('logo')) {
                  o[key] = course?.logo || `https://loremflickr.com/800/800/logo,brand?lock=${uniqueSeed}`;
                } else if (counter === 0 && course?.thumbnail && !path.includes('social')) {
                  o[key] = course.thumbnail;
                } else {
                  // Use sanitized global keywords
                  const kw = globalKeywords || 'business,strategy,growth';
                  o[key] = `https://loremflickr.com/800/800/${kw}?lock=${uniqueSeed}`;
                }
              }
              counter++;
            } else if (typeof o[key] === 'object') {
              walk(o[key], `${path}.${key}`);
            }
          }
        };
        walk(obj);
        return obj;
      };

      for (let i = 0; i < tasks.length; i++) {
        setGenerationProgress({ current: i, total: tasks.length, label: tasks[i].label });
        const courseTags = allTags?.filter(t => course?.tagIds?.includes(t.id)).map(t => t.name) || [];
        
        const rawResult = await generateCampaignAssets({
          courseTitle: course.title,
          courseDescription: course.description || '',
          mentorName: profile?.displayName || 'Mentor Experto',
          mentorBio: profile?.profile?.bio,
          mentorSocials: profile?.profile?.socials,
          templateDirectives: collection.directives,
          templateStructure: tasks[i].payload,
          targetAudience: targetAudience,
          courseTags: courseTags
        });
        
        const result = ensureValidUrls(rawResult, i * 100);

        if (result.landings?.length) finalAssets.landings = [...(finalAssets.landings || []), ...result.landings];
        if (result.emails?.length) finalAssets.emails = [...(finalAssets.emails || []), ...result.emails];
        if (result.socials?.length) finalAssets.socials = [...(finalAssets.socials || []), ...result.socials];
        if (result.ads?.length) finalAssets.ads = [...(finalAssets.ads || []), ...result.ads];
      }

      setGenerationProgress({ current: tasks.length, total: tasks.length, label: 'Validando Compatibilidad con APIs...' });

      // Validar y ajustar diseños para compatibilidad con APIs
      const validatedAssets = { ...finalAssets };
      
      // Validar redes sociales
      if (finalAssets.socials?.length > 0) {
        for (let i = 0; i < finalAssets.socials.length; i++) {
          const social = finalAssets.socials[i];
          const validatedDesign = await validateAndAdjustDesignForAPIs(
            blueprintData?.assets?.socials?.[0]?.designTokens || {},
            blueprintData?.assets?.socials?.[0]?.designTokens || {},
            { landings: false, emails: false, socials: true, ads: false }
          );
          
          validatedAssets.socials[i] = {
            ...social,
            validationResults: validatedDesign,
            platformAdaptations: validatedDesign.platformAdaptations
          };
        }
      }
      
      // Validar landings
      if (finalAssets.landings?.length > 0) {
        for (let i = 0; i < finalAssets.landings.length; i++) {
          const landing = finalAssets.landings[i];
          const validatedDesign = await validateAndAdjustDesignForAPIs(
            blueprintData?.assets?.landings?.[0]?.designTokens || {},
            blueprintData?.assets?.landings?.[0]?.designTokens || {},
            { landings: true, emails: false, socials: false, ads: false }
          );
          
          validatedAssets.landings[i] = {
            ...landing,
            validationResults: validatedDesign,
            platformAdaptations: validatedDesign.platformAdaptations
          };
        }
      }
      
      // Validar emails
      if (finalAssets.emails?.length > 0) {
        for (let i = 0; i < finalAssets.emails.length; i++) {
          const email = finalAssets.emails[i];
          const validatedDesign = await validateAndAdjustDesignForAPIs(
            blueprintData?.assets?.emails?.[0]?.designTokens || {},
            blueprintData?.assets?.emails?.[0]?.designTokens || {},
            { landings: false, emails: true, socials: false, ads: false }
          );
          
          validatedAssets.emails[i] = {
            ...email,
            validationResults: validatedDesign,
            platformAdaptations: validatedDesign.platformAdaptations
          };
        }
      }
      
      // Validar ads
      if (finalAssets.ads?.length > 0) {
        for (let i = 0; i < finalAssets.ads.length; i++) {
          const ad = finalAssets.ads[i];
          const validatedDesign = await validateAndAdjustDesignForAPIs(
            blueprintData?.assets?.ads?.[0]?.designTokens || {},
            blueprintData?.assets?.ads?.[0]?.designTokens || {},
            { landings: false, emails: false, socials: false, ads: true }
          );
          
          validatedAssets.ads[i] = {
            ...ad,
            validationResults: validatedDesign,
            platformAdaptations: validatedDesign.platformAdaptations
          };
        }
      }

      if (!validatedAssets.emails && !validatedAssets.landings && !validatedAssets.socials) {
        throw new Error('La IA no devolvió un formato de activos válido.');
      }

      const assetsWithLinks = {
        ...validatedAssets,
        emails: (validatedAssets.emails || []).map((e: any, idx: number) => ({ ...e, targetLandingIdx: idx }))
      };

      setGeneratedAssets(assetsWithLinks as any);
      setStep(3);
      toast({ title: 'Activos Generados', description: 'Revisa las 3 variantes estratégicas antes de guardar.' });
    } catch (e: any) {
      console.error("[Fusion Error]", e);
      toast({ 
        variant: 'destructive', 
        title: 'Error de Fusión', 
        description: e.message || 'No se pudo sincronizar el contenido con el blueprint.' 
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const updateAsset = (channel: 'landings' | 'emails' | 'socials' | 'ads', variantIdx: number, field: string, value: any, subIndex?: number) => {
    if (!generatedAssets) return;
    const newAssets = { ...generatedAssets };
    const variant = newAssets[channel][variantIdx];
    
    if (subIndex !== undefined && Array.isArray((variant as any)[field])) {
      if (typeof (variant as any)[field][subIndex] === 'object') {
        (variant as any)[field][subIndex] = { ...(variant as any)[field][subIndex], ...value };
      } else {
        (variant as any)[field][subIndex] = value;
      }
    } else {
      (variant as any)[field] = value;
    }
    setGeneratedAssets(newAssets);
  };

  const allFonts = useMemo(() => {
    const fonts = new Set(['Inter', 'Outfit']);
    if (blueprintData?.assets) {
      Object.values(blueprintData.assets).forEach((group: any) => {
        if (Array.isArray(group)) {
          group.forEach(asset => {
            if (asset.designTokens?.fontHeading) fonts.add(asset.designTokens.fontHeading);
            if (asset.designTokens?.fontBody) fonts.add(asset.designTokens.fontBody);
          });
        }
      });
    }
    return Array.from(fonts);
  }, [blueprintData]);

  const handleFinalSave = async () => {
    if (!profile?.uid || !generatedAssets) return;
    setLoading(true);
    
    try {
      const pageId = editId || Math.random().toString(36).substring(2, 15);
      const pageRef = doc(db, 'salesPages', pageId);
      const course = courses?.find(c => c.id === selectedCourseId);
      
      // Definir variables necesarias
      const courseTags = allTags?.filter(t => course?.tagIds?.includes(t.id)).map(t => 
        t.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      ).filter(Boolean) || [];
      
      console.log('🚀 Iniciando pre-conformación con protocolos de APIs...');
      
      // Usar los nuevos módulos especializados para validación y pre-conformación
      const validatedLandings = await validateAndPreconformTemplates(
        [generatedAssets.landings || []],
        [blueprintData?.assets?.landings?.[0]?.designTokens || {}],
        ['landing']
      );
      
      const validatedSocials = await validateAndPreconformTemplates(
        [generatedAssets.socials || []],
        [blueprintData?.assets?.socials?.[0]?.designTokens || {}],
        ['social']
      );
      
      const validatedEmails = await validateAndPreconformTemplates(
        [generatedAssets.emails || []],
        [blueprintData?.assets?.emails?.[0]?.designTokens || {}],
        ['email']
      );
      
      const validatedAds = await validateAndPreconformTemplates(
        [generatedAssets.ads || []],
        [blueprintData?.assets?.ads?.[0]?.designTokens || {}],
        ['ads']
      );
      
      console.log('🎯 Pre-conformación completada. Templates listos para guardar.');
      
      // Generar packs de exportación usando el módulo especializado
      const exportOptions: ExportOptions = {
        includeValidationResults: true,
        includeTimestamps: true,
        includeProtocolDetails: true
      };
      
      const packs = generateExportPacks(
        validatedEmails.email || [],
        validatedSocials.social || [],
        validatedAds.ads || [],
        exportOptions
      );
      
      // Subir archivos de exportación a Firebase Storage
      const exportUrls: Record<string, string> = {};
      try {
        for (const pack of packs) {
          const sRef = ref(storage, `sales_pages/${pageId}/exports/${pack.name}_pack.txt`);
          await uploadBytes(sRef, new Blob([pack.content], { type: 'text/plain' }));
          exportUrls[`${pack.name}ExportUrl`] = await getDownloadURL(sRef);
        }
      } catch (storageErr: any) {
        console.error("Storage Error:", storageErr);
        throw new Error(`Error al generar archivos de exportación: ${storageErr.message}`);
      }
      
      // Guardar en Firestore con metadatos de pre-conformación
      const pageData: any = {
        id: pageId,
        mentorId: profile.uid,
        title: pageTitle || `Lanzamiento: ${course?.title}`,
        courseId: selectedCourseId,
        campaignStatus: 'ready_to_publish',
        courseKeywords: courseTags.slice(0, 5).join(',') || 'education,business,professional',
        engineMeta: {
          generationEngine: 'Antigravity-AI-Command',
          blueprintId: selectedCollectionId,
          sourceApp: 'BTECHAcademy'
        },
        price: price,
        targetAudience: targetAudience,
        templateCollectionId: selectedCollectionId,
        aiContent: {
          landings: validatedLandings.landing || [],
          socials: validatedSocials.social || [],
          emails: validatedEmails.email || [],
          ads: validatedAds.ads || []
        },
        exportUrls: exportUrls,
        slug: (pageTitle || course?.title || 'lanzamiento').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
        branding: course?.brandingOverride || profile.profile?.branding || {},
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (!editId) {
        pageData.createdAt = serverTimestamp();
      }

      try {
        if (editId) {
          const { createdAt, ...updateData } = pageData;
          await updateDoc(pageRef, updateData);
        } else {
          await setDoc(pageRef, pageData);
        }
      } catch (firestoreErr: any) {
        console.error("Firestore Error:", firestoreErr);
        throw new Error(`Error al guardar en base de datos: ${firestoreErr.message}`);
      }

      toast({ title: 'Pack Multimedia Guardado', description: 'Tus 3 rutas de lanzamiento están activas.' });
      router.push('/mentoria/marketing/pages');
    } catch (e: any) {
      console.error("[Final Save Error]", e);
      toast({ 
        variant: 'destructive', 
        title: 'Error al guardar el Pack', 
        description: e.message || 'Ocurrió un error inesperado al procesar el guardado.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-10 pb-20">
        <style jsx global>{`
          ${allFonts.map(f => `@import url('https://fonts.googleapis.com/css2?family=${f.replace(/\s+/g, '+')}&display=swap');`).join('\n')}
        `}</style>
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Generador Multimedia x3</h1>
            <p className="text-sm text-muted-foreground font-medium">Fusión estratégica avanzada. Paso {step} de 3.</p>
          </div>
        </header>

        <CampaignGenerator
          step={step}
          selectedCourseId={selectedCourseId}
          setSelectedCourseId={setSelectedCourseId}
          selectedCollectionId={selectedCollectionId}
          setSelectedCollectionId={setSelectedCollectionId}
          pageTitle={pageTitle}
          setPageTitle={setPageTitle}
          targetAudience={targetAudience}
          setTargetAudience={setTargetAudience}
          price={price}
          setPrice={setPrice}
          courses={courses}
          collections={collections}
          allTags={allTags}
          selectedCourse={selectedCourse}
          dynamicProfiles={dynamicProfiles}
          isGenerating={isGenerating}
          generationProgress={generationProgress}
          onGenerate={handleMatchAndGenerate}
          onStepChange={setStep}
        />

        <TemplateEditor
          generatedAssets={generatedAssets}
          blueprintData={blueprintData}
          activeLandingIdx={activeLandingIdx}
          setActiveLandingIdx={setActiveLandingIdx}
          activeEmailIdx={activeEmailIdx}
          setActiveEmailIdx={setActiveEmailIdx}
          activeSocialIdx={activeSocialIdx}
          setActiveSocialIdx={setActiveSocialIdx}
          activeAdsIdx={activeAdsIdx}
          setActiveAdsIdx={setActiveAdsIdx}
          selectedCourseId={selectedCourseId}
          courses={courses}
          allTags={allTags}
          profile={profile}
          updateAsset={updateAsset}
          loading={loading}
          onSave={handleFinalSave}
        />
      </div>
    </DashboardLayout>
  );
}
