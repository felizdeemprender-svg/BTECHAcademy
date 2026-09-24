
'use client';

import { cleanUndefined } from '@/lib/clean-undefined';

import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, where, orderBy, getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { validateAndPreconformTemplates, TemplateMetadata } from '@/lib/template-validator';
import { validateAndAdjustDesignForAPIs } from '@/lib/platform-protocols';
import { generateExportPacks, ExportOptions } from '@/lib/content-exporter';
import { uploadPendingImagesInObject } from '@/lib/upload-base64';
import { resolveProfileBrand } from '@/lib/landing-styles';
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
  FileEdit,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useApiSalesPages } from '@/hooks/use-api-sales-pages';
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
      <div className="h-screen flex items-center justify-center bg-muted">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    }>
      <BuilderContent />
    </Suspense>
  );
}

function BuilderContent() {
  const { profile, user, isLoading: profileLoading } = useAuth();
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
          const token = await user?.getIdToken();
          const res = await fetch(`/api/sales-pages/${editId}`, { 
            cache: 'no-store',
            headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
          });
          if (res.ok) {
            const data = await res.json();
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

  const followupsQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'followups'), where('mentorId', '==', profile.uid), where('type', '==', 'group'));
  }, [db, profile?.uid]);
  const { data: rawFollowups, isLoading: followupsLoading } = useCollection(followupsQuery);

  const courses = useMemo(() => {
    const combined: any[] = [];
    if (rawCourses) {
      combined.push(...rawCourses
        .filter(c => c.status !== 'rejected')
        .map(c => ({ ...c, productType: 'course' }))
      );
    }
    if (rawFollowups) {
      combined.push(...rawFollowups.map(f => ({ 
        ...f, 
        productType: 'followup',
        description: f.goal || 'Mentoría grupal',
        // Inyectar tag dummy para UI
        tagIds: []
      })));
    }
    return combined.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }, [rawCourses, rawFollowups]);

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

  const { data: availableLandings } = useApiSalesPages({
    type: 'landing_only',
    courseId: selectedCourseId || undefined,
    mentorId: profile?.uid,
    skip: !profile?.uid || !selectedCourseId
  });

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
    if (!selectedCourseId) return;
    setIsGenerating(true);
    try {
      const course = courses?.find(c => c.id === selectedCourseId);
      const collection = collections?.find(c => c.id === selectedCollectionId) || null;

      if (!course) throw new Error('No se pudo localizar el programa seleccionado.');

      setBlueprintData(collection);

      const assets = collection?.assets || {};

      setGenerationProgress({ current: 0, total: 1, label: 'Preparando borradores desde la campaña...' });

      const finalAssets: any = { landings: [], emails: [], socials: [], ads: [] };

      // Borradores de Redes Sociales (generación individual on-demand)
      if (Array.isArray(assets?.socials)) {
        finalAssets.socials = assets.socials.map((s: any) => ({
          platform: s.platform || 'instagram',
          type: s.type || 'story',
          marketingName: s.marketingName || s.name || `Video ${s.platform || 'instagram'}`,
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
      } else {
        // Sin blueprint: sembrar un borrador por defecto enfocado en redes
        finalAssets.socials = [{
          platform: 'instagram',
          type: 'story',
          marketingName: `Story ${course.title || 'Instagram'}`,
          caption: '',
          hook: '',
          slides: [],
          designTokens: {
            accent: '#760464',
            primary: '#760464',
            surface: '#eedaea',
            text: '#0a0a0a'
          },
          production_notes: {
            adnId: '01_CINEMA',
            isLocked: false,
            enable_tts: true,
            voice_id: 'mateo'
          }
        }];
      }

      // Borradores de Emails (generación individual on-demand)
      if (Array.isArray(assets?.emails)) {
        finalAssets.emails = assets.emails.map((e: any) => ({
          marketingName: e.marketingName || e.name || 'Email Borrador',
          type: e.type || 'direct',
          designTokens: e.designTokens || {},
          subject: '',
          preheader: '',
          body: '',
          landingId: 'mentor'
        }));
      }

      // Borradores de Anuncios (generación individual on-demand)
      if (Array.isArray(assets?.ads)) {
        finalAssets.ads = assets.ads.map((a: any) => ({
          marketingName: a.marketingName || a.name || 'Ad Borrador',
          type: a.type || 'search',
          platform: a.platform || 'facebook',
          designTokens: a.designTokens || {},
          headlines: [],
          descriptions: [],
          keywords: [],
          landingId: 'mentor'
        }));
      }

      // Validar y ajustar diseños para compatibilidad con APIs
      const validatedAssets = { ...finalAssets };

      // Validar redes sociales
      if (finalAssets.socials?.length > 0) {
        for (let i = 0; i < finalAssets.socials.length; i++) {
          const social = finalAssets.socials[i];
          const validatedDesign = await validateAndAdjustDesignForAPIs(
            assets?.socials?.[0]?.designTokens || {},
            assets?.socials?.[0]?.designTokens || {},
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
            assets?.landings?.[0]?.designTokens || {},
            assets?.landings?.[0]?.designTokens || {},
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
            assets?.emails?.[0]?.designTokens || {},
            assets?.emails?.[0]?.designTokens || {},
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
            assets?.ads?.[0]?.designTokens || {},
            assets?.ads?.[0]?.designTokens || {},
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

      setGeneratedAssets(assetsWithLinks as any);
      
      // AUTO-SAVE INITIAL: Crear el documento en Firestore instantáneamente para que exista
      // y se estabilice la URL con el ID de la campaña nueva.
      await handleFinalSave({ ...assetsWithLinks, courseId: selectedCourseId }, true);

      setStep(3);
      toast({
        title: 'Campaña Creada',
        description: 'Generá cada pieza individualmente con IA en el editor.'
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
    // Evitar que overrideAssets sea un objeto de Evento (ej: onClick={onSave})
    if (overrideAssets && overrideAssets.nativeEvent) {
      overrideAssets = undefined;
    }
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
            if (typeof obj.toDate === 'function' || obj._methodName === 'serverTimestamp' || obj.isEqual) {
              return obj;
            }
            return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, cleanUndefined(v)]));
          }
          return obj;
        };
        const pageId = currentCampaignId || editId || Math.random().toString(36).substring(2, 15);
        if (!currentCampaignId) setCurrentCampaignId(pageId);
        
        const updateData = cleanUndefined({
          title: pageTitle || 'Nueva Campaña',
          courseId: currentAssets.courseId || selectedCourseId || null,
          productId: currentAssets.courseId || selectedCourseId || null,
          campaignStatus: 'ready_to_publish',
          targetAudience: targetAudience,
          templateDirectives: templateDirectives,
          type: 'campaign_pack',
          aiContent: {
            landings: currentAssets.landings || [],
            socials: currentAssets.socials || [],
            emails: currentAssets.emails || [],
            ads: currentAssets.ads || [],
          },
        });

        const token = await user?.getIdToken();
          const res = await fetch('/api/sales-pages', {
            method: editId || currentCampaignId ? 'PUT' : 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ pageId, data: { ...updateData, courseId: currentAssets.courseId || null } })
          });
        if (!res.ok) {
          throw new Error('Auto-save failed');
        }

        // CRITICAL: Actualizar estado local para que los links aparezcan en la UI sin refrescar
        setGeneratedAssets(currentAssets);

        // Si es un pack nuevo, actualizar la URL para que los siguientes auto-guardados usen el mismo ID
        if (!editId) {
          const params = new URLSearchParams(window.location.search);
          params.set('id', pageId);
          router.replace(`${window.location.pathname}?${params.toString()}`);
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

      const pageId = currentCampaignId || editId || Math.random().toString(36).substring(2, 15);
      if (!currentCampaignId) setCurrentCampaignId(pageId);
      const pageRef = doc(db, 'salesPages', pageId);

      // --- 0. LIMPIEZA DE ACTIVOS OBSOLETOS (FIREBASE STORAGE) ---
      if (editId && !silentAutoSave) {
        try {
          const res = await fetch(`/api/sales-pages/${pageId}`);
          if (res.ok) {
            const oldData = await res.json();
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
        courseId: selectedCourseId, // Retenido por retrocompatibilidad
        productId: selectedCourseId,
        productType: course?.productType || 'course',
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
        branding: {
          primaryColor: resolveProfileBrand(profile.profile)?.palette?.primary || course?.brandingOverride?.primaryColor || profile.profile?.branding?.primaryColor || '#8B5CF6',
          logoUrl: course?.brandingOverride?.logoUrl || profile.profile?.branding?.logoUrl || '',
        },
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
        const token = await user?.getIdToken();
        if (editId) {
          const { createdAt, updatedAt, id, ...updateData } = finalData;
          const res = await fetch('/api/sales-pages', {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ pageId, data: updateData })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } else {
          const res = await fetch('/api/sales-pages', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ pageId, data: finalData })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        }
      } catch (firestoreErr: any) {
        console.error("Firestore Error:", firestoreErr);
        throw new Error(`Error al guardar en base de datos: ${firestoreErr.message}`);
      }

      if (!silentAutoSave) {
        toast({ title: 'Pack Multimedia Guardado', description: 'Tus 3 rutas de lanzamiento están activas.' });
        router.push('/marketing/pages');
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
        {step === 3 && (
          <header className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/marketing/pages')} className="rounded-full">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-headline font-bold text-primary">
                {editId ? 'Gestor de Contenido ADN' : 'Productor de Campañas'}
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                {editId 
                  ? 'Administra las piezas multimedia de esta campaña.' 
                  : 'Ajusta y genera las piezas de tu nueva campaña.'}
              </p>
            </div>
          </header>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Cargando Pack...</p>
          </div>
        )}

        {!loading && step <= 2 && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white border border-border rounded-3xl shadow-2xl p-8 relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 rounded-full"
                onClick={() => router.push('/marketing/pages')}
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="flex flex-col items-center justify-center space-y-4 mb-8">
                <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Megaphone className="h-8 w-8" />
                </div>
                <div className="text-center space-y-1">
                  <h2 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tighter">Crear Nueva Campaña</h2>
                  <p className="text-muted-foreground text-sm font-medium">Selecciona el producto y define el objetivo principal.</p>
                </div>
              </div>
              
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
            </div>
          </div>
        )}

        {!loading && step === 3 && (
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

