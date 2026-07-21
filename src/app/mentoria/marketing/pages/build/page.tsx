
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
import { uploadPendingImagesInObject } from '@/lib/upload-base64';
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
import { generateVariantContent } from '@/ai/flows/generate-variant-content';
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

  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(editId);

  // Sincronizar ID de edición si cambia en la URL
  useEffect(() => {
    if (editId) {
      setCurrentCampaignId(editId);
    }
  }, [editId]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number, total: number, label: string } | null>(null);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const [pageTitle, setPageTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [campaignMission, setCampaignMission] = useState<'venta' | 'autoridad' | 'lanzamiento' | 'leads'>('venta');
  const [templateDirectives, setTemplateDirectives] = useState('');
  const [generatedAssets, setGeneratedAssets] = useState<any | null>(null);
  const [blueprintData, setBlueprintData] = useState<any>(null);

  const [activeLandingIdx, setActiveLandingIdx] = useState(0);
  const [activeEmailIdx, setActiveEmailIdx] = useState(0);
  const [activeSocialIdx, setActiveSocialIdx] = useState(0);
  const [activeAdsIdx, setActiveAdsIdx] = useState(0);
  const [masterAdns, setMasterAdns] = useState<Record<string, any>>({});

  // Carga centralizada de ADNs (Fuente de verdad dinámica)
  useEffect(() => {
    const fetchAdns = async () => {
      try {
        const res = await fetch('/api/adns');
        const data = await res.json();
        if (data.success) {
          const map: Record<string, any> = {};
          data.adns.forEach((a: any) => map[a.id] = a);
          setMasterAdns(map);
        }
      } catch (e) {
        console.error("Error loading master ADNs:", e);
      }
    };
    fetchAdns();
  }, []);

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
            setTargetAudience(data.targetAudience || '');
            setCampaignMission(data.engineMeta?.mission || 'venta');

            // Normalizar contenido (Soportar plural/singular heredado)
            const content = data.aiContent || {};
            const normalizedAssets = {
              emails: content.emails || content.email || [],
              socials: content.socials || content.social || [],
              ads: content.ads || content.ad || content.adsSet || []
            };
            setGeneratedAssets(normalizedAssets);


            setTemplateDirectives(data.templateDirectives || '');
            setStep(3); // Saltar directamente a la edición
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
        if (snap.exists()) {
          const data = snap.data();
          setBlueprintData(data);
          // Si es una página nueva (no editId), inicializamos las directivas desde la colección
          if (!editId) setTemplateDirectives(data.directives || '');
        }
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
    return query(collection(db, 'templateCollections'));
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

  const availableLandingsQuery = useMemoFirebase(() => {
    if (!profile?.uid || !selectedCourseId) return null;
    return query(
      collection(db, 'salesPages'),
      where('mentorId', '==', profile.uid),
      where('courseId', '==', selectedCourseId),
      where('type', '==', 'landing_only'),
      where('isActive', '==', true)
    );
  }, [db, profile?.uid, selectedCourseId]);
  const { data: availableLandings } = useCollection(availableLandingsQuery);

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

  // Auto-completar contexto del curso cuando se selecciona
  useEffect(() => {
    if (selectedCourse && !editId) {
      if (!pageTitle) setPageTitle(`Campaña ${selectedCourse.title}`);
      if (!targetAudience) setTargetAudience(`Público interesado en aprender ${selectedCourse.title}. ${selectedCourse.description || ''}`);
    }
  }, [selectedCourse, editId]);

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

      if (assets?.emails?.length) {
        chunkArray(assets.emails, 3).forEach((chunk, i) =>
          tasks.push({ channel: 'emails', label: `Emails ${i > 0 ? `(${i + 1})` : ''}...`, payload: { emails: chunk } })
        );
      }
      if (assets?.ads?.length) {
        chunkArray(assets.ads, 2).forEach((chunk, i) =>
          tasks.push({ channel: 'ads', label: `Anuncios ${i > 0 ? `(${i + 1})` : ''}...`, payload: { ads: chunk } })
        );
      }
      /* 
        // DESACTIVADO: La generación de sociales ahora es a demanda
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
      */

      if (tasks.length === 0) {
        setGenerationProgress({ current: 0, total: 1, label: 'Preparando borradores...' });
      } else {
        setGenerationProgress({ current: 0, total: tasks.length, label: 'Iniciando conexión interactiva...' });
      }

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
                  o[key] = profile?.photoURL || `https://image.pollinations.ai/prompt/${encodeURIComponent('professional corporate portrait, close up, warm lighting')}?width=800&height=800&model=flux&nologo=true&seed=${uniqueSeed}`;
                } else if (val.includes('logo')) {
                  o[key] = course?.logo || `https://image.pollinations.ai/prompt/${encodeURIComponent('minimalist modern tech brand logo isolated on white')}?width=800&height=800&model=flux&nologo=true&seed=${uniqueSeed}`;
                } else if (counter === 0 && course?.thumbnail && !path.includes('social')) {
                  o[key] = course.thumbnail;
                } else {
                  // Use sanitized global keywords, feed to IA
                  const promptText = `modern corporate illustration or photography about ${globalKeywords || 'business'}`;
                  o[key] = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=800&height=600&model=flux&nologo=true&seed=${uniqueSeed}`;
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
          mentorName: profile?.profile?.fullName || profile?.profile?.firstName || profile?.displayName || 'Mentor Experto',
          mission: campaignMission,
          mentorBio: profile?.profile?.bio,
          mentorSocials: profile?.profile?.socials,
          templateDirectives: collection.directives,
          templateStructure: tasks[i].payload,
          targetAudience: targetAudience,
          courseTags: courseTags,
          masterAdns: masterAdns // Inyectar ADNs cargados dinámicamente
        });

        const result = ensureValidUrls(rawResult, i * 100);

        if (result.landings?.length) finalAssets.landings = [...(finalAssets.landings || []), ...result.landings];
        if (result.emails?.length) finalAssets.emails = [...(finalAssets.emails || []), ...result.emails];
        if (result.socials?.length) finalAssets.socials = [...(finalAssets.socials || []), ...result.socials];
        if (result.ads?.length) finalAssets.ads = [...(finalAssets.ads || []), ...result.ads];
      }

      // Inicializar colecciones de finalAssets si no existen
      if (!finalAssets.socials) finalAssets.socials = [];
      if (!finalAssets.emails) finalAssets.emails = [];
      if (!finalAssets.ads) finalAssets.ads = [];
      if (!finalAssets.landings) finalAssets.landings = [];

      // Pre-poblar borradores de Redes Sociales si no se generaron inicialmente (ya que son a demanda)
      if (finalAssets.socials.length === 0 && Array.isArray(collection.assets?.socials)) {
        finalAssets.socials = collection.assets.socials.map((s: any) => ({
          platform: s.platform,
          type: s.type || 'story',
          marketingName: s.marketingName || s.name || `Video ${s.platform}`,
          caption: '',
          hook: '',
          slides: [],
          designTokens: s.designTokens || {},
          production_notes: {
            adnId: s.adnId || '01_CINEMA',
            isLocked: false,
            enable_tts: true,
            voice_id: 'mateo'
          }
        }));
      }

      // Pre-poblar borradores de Emails si no se generaron inicialmente
      if (finalAssets.emails.length === 0 && Array.isArray(collection.assets?.emails)) {
        finalAssets.emails = collection.assets.emails.map((e: any) => ({
          marketingName: e.marketingName || e.name || 'Email Borrador',
          subject: '',
          body: '',
          landingId: 'mentor'
        }));
      }

      // Pre-poblar borradores de Anuncios si no se generaron inicialmente
      if (finalAssets.ads.length === 0 && Array.isArray(collection.assets?.ads)) {
        finalAssets.ads = collection.assets.ads.map((a: any) => ({
          marketingName: a.marketingName || a.name || 'Ad Borrador',
          headline: '',
          primaryText: '',
          platform: a.platform || 'facebook',
          designTokens: a.designTokens || {},
        }));
      }

      setGenerationProgress({ current: tasks.length || 1, total: tasks.length || 1, label: 'Validando Compatibilidad con APIs...' });

      // Validar y ajustar diseños para compatibilidad con APIs
      const validatedAssets = { ...finalAssets };

      // Validar redes sociales
      if (finalAssets.socials?.length > 0) {
        for (let i = 0; i < finalAssets.socials.length; i++) {
          const social = finalAssets.socials[i];
          const validatedDesign = await validateAndAdjustDesignForAPIs(
            collection.assets?.socials?.[0]?.designTokens || {},
            collection.assets?.socials?.[0]?.designTokens || {},
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
            collection.assets?.landings?.[0]?.designTokens || {},
            collection.assets?.landings?.[0]?.designTokens || {},
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
            collection.assets?.emails?.[0]?.designTokens || {},
            collection.assets?.emails?.[0]?.designTokens || {},
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
            collection.assets?.ads?.[0]?.designTokens || {},
            collection.assets?.ads?.[0]?.designTokens || {},
            { landings: false, emails: false, socials: false, ads: true }
          );

          validatedAssets.ads[i] = {
            ...ad,
            validationResults: validatedDesign,
            platformAdaptations: validatedDesign.platformAdaptations
          };
        }
      }

      // Colección lista para procesamiento dinámico a demanda
      console.log('[Fusion:Debug] Inicialización de finalAssets completada. Arreglos listos:', {
        emails: validatedAssets.emails?.length || 0,
        ads: validatedAssets.ads?.length || 0,
        socials: validatedAssets.socials?.length || 0,
        landings: validatedAssets.landings?.length || 0
      });

      const assetsWithLinks = {
        ...validatedAssets,
        emails: (validatedAssets.emails || []).map((e: any, idx: number) => ({ ...e, targetLandingIdx: idx }))
      };

      // --- INICIO DE PRODUCCIÓN PROFUNDA (AUTOMATIZACIÓN TOTAL) ---
      console.log("🚀 Iniciando Producción Profunda Automatizada...");

      const totalProductionSteps = (assetsWithLinks.socials?.length || 0) +
        (assetsWithLinks.landings?.length || 0) * 3 +
        (assetsWithLinks.socials?.reduce((acc: number, s: any) => acc + (s.slides?.length || 5), 0) || 0) || 1;

      let completedSteps = 0;
      const updateProdProgress = (label: string) => {
        completedSteps++;
        setGenerationProgress({
          current: tasks.length + completedSteps,
          total: tasks.length + totalProductionSteps,
          label
        });
      };

      // 1. Automatización de Guiones Sociales (DESACTIVADO: Ahora es a demanda)
      /*
      if (assetsWithLinks.socials?.length > 0) {
        for (let i = 0; i < assetsWithLinks.socials.length; i++) {
          const social = assetsWithLinks.socials[i];
          updateProdProgress(`Produciendo Guion Maestro: ${social.platform} [${i+1}/${assetsWithLinks.socials.length}]...`);
          
          try {
            const breakdown = await generateVariantContent(
              social, 
              templateDirectives,
              course.title,
              course.description,
              targetAudience,
              campaignMission
            );
            if (breakdown.production_notes) {
              social.production_notes = {
                ...breakdown.production_notes,
                voiceover: breakdown.voiceover || '' // Capturar Guion Maestro
              };
            }
            
            if (breakdown.slides?.length > 0) {
              social.slides = breakdown.slides.map((s: any) => ({
                segment: s.segment_label || 'VALOR',
                text: s.text || '',
                voiceover: s.voiceover || '',
                duration: s.duration || 5,
                imageUrl: '',
                aiDescription: s.text
              }));
            } else if (breakdown.scenes?.length > 0) {
              social.slides = breakdown.scenes.map((s: any) => ({
                segment: s.segment_label || 'VALOR',
                title: s.title || '',
                text: s.text || '',
                voiceover: s.voiceover || '',
                duration: s.duration || 5,
                imageUrl: '',
                aiDescription: s.description || s.text
              }));
            }
          } catch (err) {
            console.error(`Error en Guion Social ${i}:`, err);
          }
        }
      }
      */

      // 2. Automatización de Imágenes (Landings + Socials)
      const generateImage = async (keywords: string, context: string, label: string) => {
        try {
          const res = await fetch('/api/ai/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: '', keywords, contextHint: context, engine: 'free' }),
          });
          const data = await res.json();
          return data?.imageDataUrl || '';
        } catch (e) {
          console.error(`Error generating image for ${label}:`, e);
          return '';
        }
      };

      // Imágenes de Landings
      if (assetsWithLinks.landings?.length > 0) {
        for (let lIdx = 0; lIdx < assetsWithLinks.landings.length; lIdx++) {
          const landing = assetsWithLinks.landings[lIdx];
          for (let sIdx = 0; sIdx < (landing.sections?.length || 0); sIdx++) {
            const section = landing.sections[sIdx];
            updateProdProgress(`Fotografía IA: Landing [${lIdx + 1}] - Sec [${sIdx + 1}]...`);
            section.imageUrl = await generateImage(
              section.title,
              `Course: ${selectedCourse?.title}. Section: ${section.paragraph}`,
              `Landing ${lIdx} Sec ${sIdx}`
            );
          }
        }
      }

      // Imágenes de Socials (DESACTIVADO: Ahora es a demanda)
      /*
      if (assetsWithLinks.socials?.length > 0) {
        for (let sIdx = 0; sIdx < assetsWithLinks.socials.length; sIdx++) {
          const social = assetsWithLinks.socials[sIdx];
          for (let slIdx = 0; slIdx < (social.slides?.length || 0); slIdx++) {
            const slide = social.slides[slIdx];
            updateProdProgress(`Fotografía IA: ${social.platform} - Placa [${slIdx+1}]...`);
            slide.imageUrl = await generateImage(
              social.marketingName || '', 
              slide.aiDescription || slide.text,
              `${social.platform} Slide ${slIdx}`
            );
          }
        }
      }
      */
      // --- FIN DE PRODUCCIÓN PROFUNDA ---

      setGeneratedAssets(assetsWithLinks as any);
      setStep(3);
      toast({ 
        title: tasks.length > 0 ? 'Pack de Producción Completo' : 'Estudio de Videos On-Demand Listo', 
        description: tasks.length > 0 
          ? 'Todos los guiones e imágenes han sido generados por la IA.' 
          : 'Módulo de producción de video dinámica inicializado con éxito.' 
      });
    } catch (e: any) {
      console.warn("[Fusion Error]", e);
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

    setGeneratedAssets((prev: any) => {
      if (!prev) return prev;

      const channelData = [...(prev[channel] || [])];

      // SOPORTE PARA NUEVOS ACTIVOS (ON-DEMAND)
      if (field === 'new') {
        channelData.push(value);
        return { ...prev, [channel]: channelData };
      }

      // SOPORTE PARA REEMPLAZAR TODA LA LISTA (EJ. AL BORRAR)
      if (field === 'replace_all') {
        return { ...prev, [channel]: value };
      }

      const variant = { ...channelData[variantIdx] };

      if (subIndex !== undefined && Array.isArray((variant as any)[field])) {
        const fieldArray = [...(variant as any)[field]];
        if (typeof fieldArray[subIndex] === 'object' && fieldArray[subIndex] !== null) {
          fieldArray[subIndex] = { ...fieldArray[subIndex], ...value };
        } else {
          fieldArray[subIndex] = value;
        }
        (variant as any)[field] = fieldArray;
      } else {
        (variant as any)[field] = value;
      }

      channelData[variantIdx] = variant as any;
      return { ...prev, [channel]: channelData };
    });
  };

  const allFonts = useMemo(() => {
    const fonts = new Set(['Inter', 'Outfit']);
    if (blueprintData?.assets && typeof blueprintData.assets === 'object') {
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

  const handleFinalSave = async (overrideAssets?: any, silentAutoSave = false) => {
    const currentAssets = overrideAssets || generatedAssets;
    if (!profile?.uid || !currentAssets) return;
    if (!silentAutoSave) setLoading(true);

    // AUTO-SAVE RÁPIDO: Para guardados automáticos (video, PDF), 
    // guarda directamente sin pipeline de validación para no corromper datos.
    if (silentAutoSave) {
      try {
        const cleanUndefined = (obj: any): any => {
          if (Array.isArray(obj)) return obj.map(v => v === undefined ? null : cleanUndefined(v));
          if (obj !== null && typeof obj === 'object') {
            return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, cleanUndefined(v)]));
          }
          return obj;
        };
        const pageId = currentCampaignId || editId || Math.random().toString(36).substring(2, 15);
        if (!currentCampaignId) setCurrentCampaignId(pageId);
        const pageRef = doc(db, 'salesPages', pageId);
        
        // setDoc con merge es 100% robusto si el documento aún no existe en base de datos
        const { setDoc } = await import('firebase/firestore');
        await setDoc(pageRef, cleanUndefined({
          aiContent: {
            landings: currentAssets.landings || [],
            socials: currentAssets.socials || [],
            emails: currentAssets.emails || [],
            ads: currentAssets.ads || [],
          },
          updatedAt: serverTimestamp(),
        }), { merge: true });

        // CRITICAL: Actualizar estado local para que los links aparezcan en la UI sin refrescar
        setGeneratedAssets(currentAssets);

        // Si es un pack nuevo, actualizar la URL para que los siguientes auto-guardados usen el mismo ID
        if (!editId) {
          const params = new URLSearchParams(window.location.search);
          params.set('id', pageId);
          window.history.replaceState(null, '', `?${params.toString()}`);
        }

        console.log('✅ Auto-guardado directo completado, estado sincronizado e ID estabilizado:', pageId);
      } catch (e) {
        console.error('[AutoSave Error]', e);
      }
      return;
    }

    try {
      // Función utilitaria para limpiar undefined antes de Firestore
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

      const pageId = currentCampaignId || editId || Math.random().toString(36).substring(2, 15);
      if (!currentCampaignId) setCurrentCampaignId(pageId);
      const pageRef = doc(db, 'salesPages', pageId);

      // --- 0. LIMPIEZA DE ACTIVOS OBSOLETOS (FIREBASE STORAGE) ---
      if (editId && !silentAutoSave) {
        try {
          const { getDoc } = await import('firebase/firestore');
          const { ref, deleteObject } = await import('firebase/storage');
          const oldSnap = await getDoc(pageRef);

          if (oldSnap.exists()) {
            const oldData = oldSnap.data();
            const getAllUrls = (obj: any): string[] => {
              const urls: string[] = [];
              const scan = (item: any) => {
                if (!item) return;
                if (typeof item === 'string' && item.includes('firebasestorage.googleapis.com')) urls.push(item);
                else if (Array.isArray(item)) item.forEach(scan);
                else if (typeof item === 'object') Object.values(item).forEach(scan);
              };
              scan(obj);
              return Array.from(new Set(urls));
            };

            const oldUrls = getAllUrls(oldData.aiContent || {});
            const newUrls = getAllUrls(currentAssets);
            const abandonedUrls = oldUrls.filter(url => !newUrls.includes(url));

            if (abandonedUrls.length > 0) {
              console.log(`[StorageCleanup] Eliminando ${abandonedUrls.length} activos huérfanos...`);
              for (const url of abandonedUrls) {
                try {
                  const storageRef = ref(storage, url);
                  await deleteObject(storageRef);
                } catch (e) { console.warn("Error borrando objeto:", url, e); }
              }
            }
          }
        } catch (e) { console.error("Error en Storage Cleanup:", e); }
      }

      const course = courses?.find(c => c.id === selectedCourseId);

      // Definir variables necesarias
      const courseTags = allTags?.filter(t => course?.tagIds?.includes(t.id)).map(t =>
        t.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      ).filter(Boolean) || [];

      console.log('🚀 Iniciando pre-conformación con protocolos de APIs...');

      // Usar los nuevos módulos especializados para validación y pre-conformación
      const tokens = blueprintData?.assets || {};

      const validatedLandings = await validateAndPreconformTemplates(
        [currentAssets.landings || []],
        [tokens.landings?.[0]?.designTokens || {}],
        ['landing']
      );

      const validatedSocials = await validateAndPreconformTemplates(
        [currentAssets.socials || []],
        [tokens.socials?.[0]?.designTokens || {}],
        ['social']
      );

      const validatedEmails = await validateAndPreconformTemplates(
        [currentAssets.emails || []],
        [tokens.emails?.[0]?.designTokens || {}],
        ['email']
      );

      const validatedAds = await validateAndPreconformTemplates(
        [currentAssets.ads || []],
        [tokens.ads?.[0]?.designTokens || {}],
        ['ads']
      );

      console.log('🎯 Pre-conformación completada. Templates listos para guardar.');

      // Generar packs de exportación usando el módulo especializado
      const exportOptions: ExportOptions = {
        includeValidationResults: true,
        includeTimestamps: true,
        includeProtocolDetails: true,
        baseUrl: window.location.origin
      };

      const packs = generateExportPacks(
        validatedEmails.email || [],
        validatedSocials.social || [],
        validatedAds.ads || [],
        exportOptions
      );

      // Subir archivos de exportación a Firebase Storage
      const exportUrls: Record<string, string> = {};
      if (storage) {
        try {
          for (const pack of packs) {
            const sRef = ref(storage, `campaigns/${pageId}/exports/${pack.name}_pack.txt`);
            await uploadBytes(sRef, new Blob([pack.content], { type: 'text/plain' }));
            exportUrls[`${pack.name}ExportUrl`] = await getDownloadURL(sRef);
          }
        } catch (storageErr: any) {
          console.warn("Storage Error (bypassed):", storageErr);
          // En lugar de romper todo el guardado si fallan las reglas de storage, solo informamos
          toast({ title: 'Aviso', description: 'Los archivos de texto de exportación no pudieron guardarse en la nube, pero tus datos principales están a salvo.', variant: 'destructive' });
        }
      } else {
        console.warn("Storage no está disponible. Saltando exportación.");
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
          sourceApp: 'FastoriaAcademy',
          mission: campaignMission
        },
        type: 'campaign_pack',
        targetAudience: targetAudience,
        templateDirectives: templateDirectives,
        templateCollectionId: selectedCollectionId,
        aiContent: {
          socials: validatedSocials.social || [],
          emails: validatedEmails.email || [],
          ads: validatedAds.ads || []
        },
        exportUrls: exportUrls,
        slug: (pageTitle || course?.title || 'lanzamiento').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
        branding: course?.brandingOverride || profile.profile?.branding || { primary: '#8B5CF6' },
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      // == RECOLECTOR DE IMÁGENES EFÍMERAS (LAZY UPLOAD) ==
      console.log('☁️ Ejecutando Lazy Upload de imágenes seleccionadas en pack multimedia...');
      let finalData = pageData;
      if (storage) {
        finalData = await uploadPendingImagesInObject(pageData, storage, `campaigns/${pageId}/assets`);
      } else {
        console.warn("Storage no disponible. Las imágenes base64 no se subirán.");
      }

      // LIMPIEZA FINAL: Firestore no permite 'undefined'
      finalData = cleanUndefined(finalData);

      if (!editId) {
        finalData.createdAt = serverTimestamp();
      }

      try {
        if (editId) {
          const { createdAt, ...updateData } = finalData;
          await updateDoc(pageRef, updateData);
        } else {
          await setDoc(pageRef, finalData);
        }
      } catch (firestoreErr: any) {
        console.error("Firestore Error:", firestoreErr);
        throw new Error(`Error al guardar en base de datos: ${firestoreErr.message}`);
      }

      if (!silentAutoSave) {
        toast({ title: 'Pack Multimedia Guardado', description: 'Tus 3 rutas de lanzamiento están activas.' });
        router.push('/mentoria/marketing/pages');
      } else {
        console.log('✅ Auto-guardado silencioso completado.');
      }
    } catch (e: any) {
      console.error("[Final Save Error]", e);
      if (!silentAutoSave) {
        toast({
          variant: 'destructive',
          title: 'Error al guardar el Pack',
          description: e.message || 'Ocurrió un error inesperado al procesar el guardado.'
        });
      }
    } finally {
      if (!silentAutoSave) setLoading(false);
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

        {step <= 2 && (
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
            campaignMission={campaignMission}
            setCampaignMission={setCampaignMission}
            courses={courses}
            collections={collections}
            allTags={allTags}
            selectedCourse={selectedCourse}
            dynamicProfiles={dynamicProfiles}
            templateDirectives={templateDirectives}
            setTemplateDirectives={setTemplateDirectives}
            isGenerating={isGenerating}
            generationProgress={generationProgress}
            onGenerate={handleMatchAndGenerate}
            onStepChange={setStep}
          />
        )}

        {step === 3 && (
          <TemplateEditor
            generatedAssets={generatedAssets}
            blueprintData={blueprintData}
            activeEmailIdx={activeEmailIdx}
            setActiveEmailIdx={setActiveEmailIdx}
            activeSocialIdx={activeSocialIdx}
            setActiveSocialIdx={setActiveSocialIdx}
            activeAdsIdx={activeAdsIdx}
            setActiveAdsIdx={setActiveAdsIdx}
            selectedCourseId={selectedCourseId}
            templateDirectives={templateDirectives}
            courses={courses}
            allTags={allTags}
            profile={profile}
            updateAsset={updateAsset}
            loading={loading}
            onSave={handleFinalSave}
            campaignMission={campaignMission}
            adns={masterAdns}
            availableLandings={availableLandings}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
