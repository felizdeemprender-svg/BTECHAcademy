
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

  const [step, setStep] = useState(3); // Iniciar directamente en el editor manual
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number, total: number, label: string } | null>(null);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const [pageTitle, setPageTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [campaignMission, setCampaignMission] = useState<'venta' | 'autoridad' | 'lanzamiento' | 'leads'>('venta');
  const [templateDirectives, setTemplateDirectives] = useState('');
  const [videosPerPlatform, setVideosPerPlatform] = useState<Record<string, number>>({ instagram: 3, tiktok: 3, linkedin: 0, youtube: 1, twitter: 0 });
  const [generatedAssets, setGeneratedAssets] = useState<any | null>({ socials: [], emails: [], ads: [] });
  const [blueprintData, setBlueprintData] = useState<any>(null);

  const [activeLandingIdx, setActiveLandingIdx] = useState(0);
  const [activeSocialIdx, setActiveSocialIdx] = useState(0);
  const [activeEmailIdx, setActiveEmailIdx] = useState(0);
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
              socials: content.socials || content.social || []
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
    
    const mode = searchParams.get('mode');
    let validGoogleToken = localStorage.getItem('evo_google_token');

    // Mover validación al principio para evitar bloqueos de popup por navegadores
    if (mode === 'auto') {
      let isTokenValid = false;
      if (validGoogleToken && validGoogleToken !== 'null') {
        try {
          // Validar token REALMENTE contra Google Drive API
          const testRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
            headers: { Authorization: `Bearer ${validGoogleToken}` }
          });
          if (testRes.ok) isTokenValid = true;
        } catch (e) {
          console.warn("[Auth] No se pudo comprobar el token, se forzará renovación.");
        }
      }

      if (!isTokenValid) {
        try {
          const { initializeFirebase } = await import('@/firebase');
          const { auth } = initializeFirebase();
          const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');

          const provider = new GoogleAuthProvider();
          provider.addScope('https://www.googleapis.com/auth/drive.file');
          provider.setCustomParameters({ 
            prompt: 'consent',
            ...(auth.currentUser?.email ? { login_hint: auth.currentUser.email } : {})
          });
          const authResult = await signInWithPopup(auth, provider);
          validGoogleToken = GoogleAuthProvider.credentialFromResult(authResult)?.accessToken || null;
          console.log("[Auto-Generate] Token obtenido del popup:", !!validGoogleToken);
          if (validGoogleToken) {
            localStorage.setItem('evo_google_token', validGoogleToken);
            localStorage.setItem('evo_google_token_expiry', String(Date.now() + 3300000));
          }
        } catch (e: any) {
          console.warn("[Auth] No se pudo renovar token de Google Drive en Auto-Generate:", e);
          toast({ variant: 'destructive', title: 'Permiso Denegado', description: 'No se pudo conectar a Google Drive. El video se generará pero no se guardará automáticamente.' });
        }
      }
    }

    setIsGenerating(true);
    try {
      const course = courses?.find(c => c.id === selectedCourseId);
      const collection = collections?.find(c => c.id === selectedCollectionId) || null;

      if (!course) throw new Error('No se pudo localizar el programa seleccionado.');

      setBlueprintData(collection);

      const assets = collection?.assets || {};

      setGenerationProgress({ current: 0, total: 1, label: 'Preparando borradores desde la campaña...' });

      const finalAssets: any = { landings: [], socials: [] };

      // Borradores de Redes Sociales (generación individual on-demand o lote auto)
      if (mode === 'auto') {
        finalAssets.socials = [];
        const activePlatforms = Object.entries(videosPerPlatform).filter(([_, qty]) => qty > 0).map(([platform]) => platform);
        for (const platform of activePlatforms) {
          const isLandscape = platform === 'youtube';
          const isSquare = platform === 'linkedin';
          const type = isLandscape ? 'landscape' : isSquare ? 'square' : 'story';
          const framing = isLandscape ? '16:9' : isSquare ? '1:1' : '9:16';
          
          const qty = videosPerPlatform[platform] || 1;
          for (let i = 0; i < qty; i++) {
            finalAssets.socials.push({
              platform,
              type: type,
              marketingName: `Video ${platform} ${i + 1}`,
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
                voice_id: 'mateo',
                framing: framing
              }
            });
          }
        }
      } else {
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
              voice_id: 'mateo',
              framing: (s.platform === 'youtube' ? '16:9' : (s.platform === 'linkedin' ? '1:1' : '9:16'))
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
              voice_id: 'mateo',
              framing: '9:16'
            }
          }];
        }
      }
      
      // Asegurar que no existan piezas con el mismo nombre exacto
      if (finalAssets.socials?.length > 0) {
        const nameCounts: Record<string, number> = {};
        finalAssets.socials = finalAssets.socials.map((s: any) => {
          let name = s.marketingName || 'Pieza Social';
          if (nameCounts[name]) {
            const count = nameCounts[name] + 1;
            nameCounts[name] = count;
            name = `${name} #${count}`;
          } else {
            nameCounts[name] = 1;
          }
          return { ...s, marketingName: name };
        });
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

      // Colección lista para procesamiento dinámico a demanda
      console.log('[Fusion:Debug] Inicialización de finalAssets completada. Arreglos listos:', {
        socials: validatedAssets.socials?.length || 0,
        landings: validatedAssets.landings?.length || 0
      });

      const assetsWithLinks = {
        ...validatedAssets
      };

      setGeneratedAssets(assetsWithLinks as any);
      
      // AUTO-SAVE INITIAL: Crear el documento en Firestore instantáneamente para que exista
      // y se estabilice la URL con el ID de la campaña nueva.
      const generatedPageId = await handleFinalSave({ ...assetsWithLinks, courseId: selectedCourseId }, true);

      // Si estamos en Campaña Automática, encolamos el trabajo y volvemos a la tabla
      if (mode === 'auto') {
        toast({
          title: 'Campaña Automática Iniciada',
          description: 'Las piezas se están generando en segundo plano.'
        });
        
        // Disparamos el Obrero Pesado para cada pieza que requiera procesamiento
        const token = await user?.getIdToken();
        fetch('/api/campaign/auto-generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            campaignId: generatedPageId || currentCampaignId || selectedCourseId,
            assets: assetsWithLinks,
            videosPerPlatform: videosPerPlatform,
            targetAudience: targetAudience,
            campaignMission: campaignMission,
            googleToken: validGoogleToken
          })
        }).catch(err => console.error("Error trigger auto-generate:", err));

        router.push('/marketing/pages');
        return;
      }

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

    // AUTO-SAVE RÁPIDO: Para guardados automáticos (video, PDF), 
    // guarda directamente sin pipeline de validación para no corromper datos.
    if (silentAutoSave) {
      try {
        const pageId = currentCampaignId || editId || Math.random().toString(36).substring(2, 15);
        if (!currentCampaignId) setCurrentCampaignId(pageId);
        
        const mode = searchParams.get('mode');
        const updateData = cleanUndefined({
          title: pageTitle || 'Nueva Campaña',
          mentorId: profile.uid,
          courseId: currentAssets.courseId || selectedCourseId || null,
          productId: currentAssets.courseId || selectedCourseId || null,
          campaignStatus: mode === 'auto' ? 'processing' : 'ready_to_publish',
          targetAudience: targetAudience,
          templateDirectives: templateDirectives,
          type: 'campaign_pack',
          aiContent: {
            landings: currentAssets.landings || [],
            socials: currentAssets.socials || []
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
        return pageId;
      } catch (e) {
        console.error('[AutoSave Error]', e);
        return null;
      }
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

      const token = await user?.getIdToken();

      // --- 0. LIMPIEZA DE ACTIVOS OBSOLETOS (FIREBASE STORAGE) ---
      if (editId && !silentAutoSave) {
        try {
          const res = await fetch(`/api/sales-pages/${pageId}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
          });
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
      const courseTags = (allTags || [])
        .filter((t: any) => course?.tagIds?.includes(t.id))
        .map((t: any) => t?.name?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
        .filter(Boolean) || [];

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
        [],
        validatedSocials.social || [],
        [],
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
        title: pageTitle || (course?.title ? `Lanzamiento: ${course.title}` : 'Pack de Contenido Manual'),
        courseId: selectedCourseId || null, 
        productId: selectedCourseId || null,
        productType: course?.productType || 'manual_pack',
        campaignStatus: validatedSocials.social?.every((s: any) => s.isGenerated && !s.isDraft) ? 'ready_to_publish' : 'drafts_ready',
        courseKeywords: courseTags?.slice(0, 5).join(',') || 'manual,pack',
        engineMeta: {
          generationEngine: 'Manual-Builder',
          blueprintId: selectedCollectionId || 'manual',
          sourceApp: 'FastoriaAcademy',
          mission: campaignMission || 'venta'
        },
        type: 'campaign_pack',
        targetAudience: targetAudience || 'general',
        templateDirectives: templateDirectives || '',
        templateCollectionId: selectedCollectionId || 'manual',
        aiContent: {
          socials: validatedSocials.social || []
        },
        exportUrls: exportUrls,
        slug: (pageTitle || course?.title || 'pack-manual').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
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
          const resData = await res.json();
          if (resData.updatedTitle && resData.updatedTitle !== pageTitle) {
            setPageTitle(resData.updatedTitle);
          }
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
          const resData = await res.json();
          if (resData.updatedTitle && resData.updatedTitle !== pageTitle) {
            setPageTitle(resData.updatedTitle);
          }
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
      return pageId;
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
          <header className="flex flex-col md:flex-row md:items-center gap-6 justify-between bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-primary/10 shadow-sm">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/marketing/pages')} className="rounded-full bg-white hover:bg-muted border border-border/50">
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-headline font-black text-primary tracking-tight">
                  {editId ? 'Gestor de Contenido' : 'Productor Manual'}
                </h1>
                <p className="text-sm text-muted-foreground font-medium">
                  {editId 
                    ? 'Administra las piezas multimedia de este pack.' 
                    : 'Crea y edita piezas individualmente para tu campaña.'}
                </p>
              </div>
            </div>
            
            <div className="w-full md:w-96">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1 mb-1 block">Nombre del Pack / Campaña</Label>
              <Input 
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                placeholder="Ej: Lanzamiento Black Friday 2026"
                className="h-12 bg-white border-primary/20 font-medium text-foreground rounded-xl shadow-sm"
              />
            </div>
          </header>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Cargando Pack...</p>
          </div>
        )}


        {!loading && step === 3 && (
          <TemplateEditor
            generatedAssets={generatedAssets}
            blueprintData={blueprintData}
            activeSocialIdx={activeSocialIdx}
            setActiveSocialIdx={setActiveSocialIdx}
            activeEmailIdx={activeEmailIdx}
            setActiveEmailIdx={setActiveEmailIdx}
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
            campaignTitle={pageTitle || courses?.find((c: any) => c.id === selectedCourseId)?.title || 'Lanzamiento'}
            campaignMission={campaignMission}
            adns={masterAdns}
            availableLandings={availableLandings}
            targetAudience={targetAudience}
            coordinationPlan={generatedAssets?.strategy}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

