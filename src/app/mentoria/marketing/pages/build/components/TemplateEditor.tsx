'use client';

import { useState, useEffect } from 'react';
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
  AlertTriangle,
  Flame,
  Sparkles,
  Clapperboard,
  Scroll,
  Volume2,
  Music,
  Mic2,
  Hash,
  Link2,
  Plus,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageEditor } from '@/components/courses/ImageEditor';
import { SocialLivePreview } from './SocialLivePreview';
import { PlatformIcon } from './PlatformIcon';
import { ValidationReport, PlatformValidationSummary } from './ValidationReport';
import { AudioUploader } from './AudioUploader';
import { VideoProductionPanel } from './VideoProductionPanel';
import { PdfProductionPanel } from './PdfProductionPanel';
import { SceneNarrativeEditor } from './SceneNarrativeEditor';
import { getSocialResolution, cleanSocialHandle, getPlatformLabels } from '../utils/marketingUtils';
// import { adns } from '@/config/adns'; // Eliminado en favor de carga dinámica vía API
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  onSave: (overrideAssets?: any, silentAutoSave?: boolean) => void;
  templateDirectives?: string;
  campaignMission?: string;
  adns?: Record<string, any>;
}

const OptimizedValidationReport = ({ generatedAssets }: { generatedAssets: any }) => {
  const [showDetails, setShowDetails] = useState(false);
  const allErrors: any[] = [];
  const allWarnings: any[] = [];
  
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
  
  if (allErrors.length === 0 && allWarnings.length === 0) {
    return (
      <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="font-bold text-emerald-800">✅ Todo compatible con APIs</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)} className="text-emerald-600 hover:bg-emerald-100">
          {showDetails ? 'Ocultar' : 'Ver'} detalles
        </Button>
      </div>
    );
  }
  
  if (allErrors.length > 0) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="font-bold text-red-800">❌ {allErrors.length} errores críticos no corregibles</span>
          </div>
          <div className="text-sm text-red-700">Estos errores deben ser corregidos manualmente para asegurar compatibilidad.</div>
        </div>
        <Button variant="outline" onClick={() => setShowDetails(!showDetails)} className="w-full">
          {showDetails ? 'Ocultar' : 'Ver'} reporte completo
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="font-bold text-amber-800">⚠️ {allWarnings.length} advertencias (corregidas automáticamente)</span>
        </div>
        <div className="text-sm text-amber-700">El sistema aplicó las adaptaciones necesarias para mantener la compatibilidad.</div>
      </div>
      <Button variant="outline" onClick={() => setShowDetails(!showDetails)} className="w-full">
        {showDetails ? 'Ocultar' : 'Ver'} detalles de adaptación
      </Button>
    </div>
  );
};

export function TemplateEditor({
  generatedAssets,
  blueprintData,
  activeLandingIdx, setActiveLandingIdx,
  activeEmailIdx, setActiveEmailIdx,
  activeSocialIdx, setActiveSocialIdx,
  activeAdsIdx, setActiveAdsIdx,
  selectedCourseId,
  courses,
  allTags,
  profile,
  updateAsset,
  loading,
  onSave,
  templateDirectives,
  campaignMission,
  adns = {},
}: TemplateEditorProps) {
  // ADNs cargados desde el componente padre (page.tsx) para evitar ReferenceError
  const dynamicAdns = adns;


  const [isGeneratingBreakdown, setIsGeneratingBreakdown] = useState<string | null>(null);
  const [isRenderingVideo, setIsRenderingVideo] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);
  const [renderedVideos, setRenderedVideos] = useState<Record<number, string | null>>({});
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const { toast } = useToast();

  // Cargar token persistido al montar
  useEffect(() => {
    const savedToken = localStorage.getItem('evo_google_token');
    if (savedToken) setGoogleToken(savedToken);
  }, []);

  // Persistir token cuando cambie
  useEffect(() => {
    if (googleToken && googleToken !== 'null') {
      localStorage.setItem('evo_google_token', googleToken);
    }
  }, [googleToken]);

  const ensureGoogleToken = async () => {
    // 1. Validar token en memoria y su expiración
    const storedToken = localStorage.getItem('evo_google_token');
    const storedExpiry = localStorage.getItem('evo_google_token_expiry');
    
    // Los tokens de Google Drive expiran en 1 hora. Validamos con margen de seguridad.
    const isValid = storedToken && storedToken !== 'null' && storedExpiry && Date.now() < Number(storedExpiry);

    if (isValid && googleToken === storedToken) return googleToken;
    if (isValid) {
      setGoogleToken(storedToken);
      return storedToken;
    }

    // 2. Si expiró, renovarlo transparentemente
    const { initializeFirebase } = await import('@/firebase');
    const { auth } = initializeFirebase();
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    
    // MAGIA: Si el usuario ya está logueado en Firebase con Google, le pasamos su email al provider.
    // Esto evita que Google le pregunte "¿Con qué cuenta quieres entrar?", haciendo el popup invisible.
    if (auth.currentUser?.email) {
      provider.setCustomParameters({ login_hint: auth.currentUser.email });
    }

    try {
      const authResult = await signInWithPopup(auth, provider);
      const accessToken = GoogleAuthProvider.credentialFromResult(authResult)?.accessToken || null;
      
      if (accessToken) {
        setGoogleToken(accessToken);
        localStorage.setItem('evo_google_token', accessToken);
        // Guardamos expiración a los 55 minutos (3300000 ms)
        localStorage.setItem('evo_google_token_expiry', String(Date.now() + 3300000));
      }
      return accessToken;
    } catch (error: any) {
      console.error("[Auth] Error renovando token de Google Drive:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error("Proceso cancelado. Se necesita acceso a Drive para guardar el video.");
      }
      throw new Error("No se pudo conectar con tu Google Drive de tutor.");
    }
  };

  const handleDeleteVideo = async (sIdx: number) => {
    const s = generatedAssets?.socials?.[sIdx];
    if (!s) return;
    const prodNotes = s.production_notes || {};
    const driveId = prodNotes.video_drive_id;

    try {
      const accessToken = await ensureGoogleToken();
      if (!accessToken) throw new Error("Se requiere autenticación de Google para borrar archivos.");

      // 1. Limpieza Física de Drive
      if (driveId) {
        const allIds = driveId.split(',').map((id: string) => id.trim()).filter(Boolean);
        for (const id of allIds) {
          try {
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (res.status === 401) {
              localStorage.removeItem('evo_google_token');
              setGoogleToken(null);
              throw new Error("Sesión de Google expirada. Por favor, pulsa Borrar de nuevo.");
            }
          } catch (e: any) { 
            console.error(`[Render:Cleanup] Fallo borrado físico de ${id}:`, e);
            if (e.message.includes("Sesión")) throw e;
          }
        }
      }

      // 2. Limpieza de Estado e Interfaz
      setRenderedVideos(prev => ({ ...prev, [sIdx]: null }));
      
      const newSocials = [...generatedAssets.socials];
      newSocials[sIdx] = { 
        ...newSocials[sIdx], 
        production_notes: { 
          ...prodNotes, 
          video_url: null, 
          video_drive_id: null,
          video_download_url: null 
        } 
      };
      
      const newAssets = { ...generatedAssets, socials: newSocials };
      await onSave(newAssets, true);
      toast({ title: 'Video Eliminado', description: 'Registro y archivos limpiados.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo completar la limpieza.' });
    }
  };

  const handleGenerateVideo = async (s: any, sIdx: number) => {
    if (!s) return;
    const slides = s.slides || [];
    if (slides.length === 0) return;

    setIsRenderingVideo(`${sIdx}`);
    
    try {
      const accessToken = await ensureGoogleToken();
      if (!accessToken) throw new Error("Se requiere acceso a Drive para generar videos.");

      // REGENERACIÓN: Si ya existe un video, lo borramos primero de Drive para no dejar basura
      const oldDriveId = s.production_notes?.video_drive_id;
      if (oldDriveId) {
        console.log(`[Render:Cleanup] Borrando archivos previos (${oldDriveId}) antes de regenerar...`);
        const allIds = oldDriveId.split(',').map((id: string) => id.trim()).filter(Boolean);
        for (const id of allIds) {
          try {
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (res.status === 401) {
              localStorage.removeItem('evo_google_token');
              setGoogleToken(null);
              throw new Error("Sesión de Google expirada. Por favor, pulsa Regenerar de nuevo.");
            }
          } catch (e: any) { 
            console.error(`[Render:Cleanup] Error borrando ${id}:`, e);
            if (e.message.includes("Sesión")) throw e;
          }
        }
      }
      // INICIAR PROCESO DE RENDERIZADO
      const { initializeFirebase } = await import('@/firebase');
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = initializeFirebase();
      const resolvedScenes = await Promise.all(slides.map(async (sl: any, i: number) => {
        let imageUrl = sl.imageUrl || '';
        if (imageUrl.startsWith('data:')) {
          const blob = await fetch(imageUrl).then(r => r.blob());
          const snap = await uploadBytes(ref(storage, `render_tmp/${selectedCourseId}/${sIdx}_${i}.jpg`), blob);
          imageUrl = await getDownloadURL(snap.ref);
        }
        return { imageUrl, text: sl.text || '', voiceover: sl.voiceover || '', segment_label: sl.segment || 'VALOR', duration: Number(sl.duration) || 5 };
      }));
      const pNotes = s.production_notes || {};
      const jobId = `job_${selectedCourseId}_${sIdx}_${Date.now()}`;

      const res = await fetch('/api/video/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jobId,
          scenes: resolvedScenes, 
          resolution: getSocialResolution(s.platform, s.type), 
          googleToken: accessToken, 
          platform: s.platform,
          audioUrl: pNotes.audio_url,
          audioDuration: pNotes.audio_duration,
          enable_tts: pNotes.enable_tts ?? true, // Activar TTS por defecto si la IA generó guion
          voice_id: pNotes.voice_id || 'mateo',
          // Si hay locuciones en las placas, NO enviamos el guion maestro global
          // Esto fuerza al motor a concatenar los audios de cada escena (Narrativa Dual)
          voiceover: (s.slides?.some((sl: any) => sl.voiceover)) ? '' : (pNotes.voiceover || s.voiceover || ''),
          audioEffect: pNotes.audio_effect || 'auto',
          adnId: pNotes.adnId || '01',
          isCarousel: s.type === 'carousel',
          marketingName: s.marketingName
        }),
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        const errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        if (errorMsg.includes('401') || res.status === 401) {
          console.warn("[Auth] Token de Google expirado. Limpiando sesión...");
          localStorage.removeItem('evo_google_token');
          setGoogleToken(null);
          throw new Error("Tu sesión de Google ha expirado. Por favor, pulsa 'Generar' de nuevo para re-autenticarte.");
        }
        throw new Error(errorMsg || 'Fallo en el renderizado');
      }

      const updatedNotes = { 
        ...pNotes, 
        video_url: data.webViewLink, 
        video_drive_id: data.driveId,
        video_download_url: data.downloadUrl
      };

      setRenderedVideos(prev => ({ ...prev, [sIdx]: data.webViewLink }));
      const newSocials = [...generatedAssets.socials];
      newSocials[sIdx] = { 
        ...newSocials[sIdx], 
        production_notes: updatedNotes,
        slides: resolvedScenes // Persistir las imágenes subidas a Firebase en los slides originales
      };
      const newAssets = { ...generatedAssets, socials: newSocials };
      await onSave(newAssets, true);
      toast({ title: 'Procesamiento Exitoso', description: 'El video ya está disponible en tu panel.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsRenderingVideo(null);
    }
  };

  const handleGeneratePdf = async (s: any, sIdx: number) => {
    if (!s) return;
    const slides = s.slides || [];
    if (slides.length === 0) return;

    setIsGeneratingPdf(`${sIdx}`);
    
    try {
      const { initializeFirebase } = await import('@/firebase');
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = initializeFirebase();

      // 1. Resolver imágenes si son base64 (de la edición)
      const resolvedSlides = await Promise.all(slides.map(async (sl: any, i: number) => {
        let imageUrl = sl.imageUrl || '';
        if (imageUrl.startsWith('data:')) {
          const blob = await fetch(imageUrl).then(r => r.blob());
          const snap = await uploadBytes(ref(storage, `pdf_tmp/${selectedCourseId}/${sIdx}_${i}.jpg`), blob);
          imageUrl = await getDownloadURL(snap.ref);
        }
        return { ...sl, imageUrl };
      }));

      // 2. Llamar a la API de PDF
      const res = await fetch('/api/pdf/carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slides: resolvedSlides,
          marketingName: s.marketingName,
          designTokens: s.designTokens || blueprintData.designTokens,
          platform: s.platform,
          hook: s.hook,
          caption: s.caption
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Fallo en la generación del PDF');

      // 3. Guardar URL en el asset
      const newSocials = [...generatedAssets.socials];
      newSocials[sIdx] = { 
        ...newSocials[sIdx], 
        production_notes: { 
          ...(newSocials[sIdx].production_notes || {}), 
          pdf_url: data.pdfUrl 
        } 
      };
      
      const newAssets = { ...generatedAssets, socials: newSocials };
      await onSave(newAssets, true);
      toast({ title: 'PDF Generado', description: 'El documento de LinkedIn está listo.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error PDF', description: err.message });
    } finally {
      setIsGeneratingPdf(null);
    }
  };

  const handleDeletePdf = async (sIdx: number) => {
    const s = generatedAssets?.socials?.[sIdx];
    if (!s) return;
    
    const newSocials = [...generatedAssets.socials];
    newSocials[sIdx] = { 
      ...newSocials[sIdx], 
      production_notes: { 
        ...(newSocials[sIdx].production_notes || {}), 
        pdf_url: null 
      } 
    };
    
    const newAssets = { ...generatedAssets, socials: newSocials };
    await onSave(newAssets, true);
    toast({ title: 'PDF Eliminado', description: 'Referencia de archivo borrada.' });
  };

  const handleGenerateBreakdown = async (variant: any, index: number, channel: 'landings' | 'emails' | 'socials' | 'ads') => {
    setIsGeneratingBreakdown(`${channel}-${index}`);
    try {
      const selectedCourse = courses?.find(c => c.id === selectedCourseId);
      const realDirectives = templateDirectives || `Campana para "${selectedCourse?.title}".`;
      const breakdown = await (await import('@/ai/flows/generate-variant-content')).generateVariantContent(variant, realDirectives, selectedCourse?.title || '', selectedCourse?.description || '', selectedCourse?.targetAudience || '', (campaignMission as any) || 'venta');
      if (channel === 'socials') {
        const sourceArray = breakdown.scenes || breakdown.slides || [];
        const mappedScenes = sourceArray.map((s: any, i: number) => ({ 
          segment: s.segment_label || 'VALOR', 
          title: s.title || '',
          text: s.text || '', 
          voiceover: s.voiceover || '', 
          description: s.description || s.imageUrl || '',
          duration: s.duration || 5, 
          imageUrl: variant.slides?.[i]?.imageUrl || (s.imageUrl?.startsWith('http') ? s.imageUrl : '') 
        }));
        const newSocials = [...generatedAssets.socials];
        newSocials[index] = { ...newSocials[index], slides: mappedScenes, hook: breakdown.hook, caption: breakdown.caption };
        const newAssets = { ...generatedAssets, socials: newSocials };
        onSave(newAssets, true);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Error al generar desglose.' });
    } finally { setIsGeneratingBreakdown(null); }
  };

  if (!generatedAssets) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-700">Cargando contenidos del Pack...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Edición Final del Contenido</h2>
            <p className="text-slate-500">Ajusta los detalles de las 3 rutas propuestas.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={async () => {
              if (confirm('¿Estás seguro de que deseas ELIMINAR todo este pack?')) {
                onSave(null, false);
              }
            }}
            className="h-16 px-8 rounded-2xl font-bold border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
          >
            Eliminar Pack
          </Button>
          <Button onClick={() => onSave()} disabled={loading} className="h-16 px-12 rounded-2xl font-bold text-xl shadow-2xl bg-primary gap-3">
            {loading ? <Loader2 className="animate-spin" /> : <Save className="h-6 w-6" />} Guardar Pack
          </Button>
        </div>
      </header>

      <Tabs defaultValue="landing" className="w-full">
        <TabsList className="bg-slate-950 p-1.5 h-14 w-full justify-start gap-2 px-6 rounded-2xl border border-white/10 shadow-2xl mb-8">
          <TabsTrigger value="landing" className="rounded-xl gap-2 font-black px-8 h-11 text-[11px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-slate-950 text-white/40 hover:text-white/80 transition-all"><Layout className="h-4 w-4" /> Landings</TabsTrigger>
          <TabsTrigger value="email" className="rounded-xl gap-2 font-black px-8 h-11 text-[11px] uppercase tracking-wider data-[state=active]:bg-violet-600 data-[state=active]:text-white text-white/40 hover:text-white/80 transition-all"><Mail className="h-4 w-4" /> Emails</TabsTrigger>
          <TabsTrigger value="social" className="rounded-xl gap-2 font-black px-8 h-11 text-[11px] uppercase tracking-wider data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-white/40 hover:text-white/80 transition-all"><Instagram className="h-4 w-4" /> Redes Sociales</TabsTrigger>
          <TabsTrigger value="ads" className="rounded-xl gap-2 font-black px-8 h-11 text-[11px] uppercase tracking-wider data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-white/40 hover:text-white/80 transition-all"><Megaphone className="h-4 w-4" /> Ads</TabsTrigger>
        </TabsList>

        <TabsContent value="landing">
          <Tabs value={activeLandingIdx.toString()} onValueChange={v => setActiveLandingIdx(parseInt(v))}>
            <TabsList className="bg-slate-100 p-1 h-12 justify-start gap-1 rounded-xl mb-8 border border-slate-200 shadow-sm flex-wrap w-fit">
              {generatedAssets?.landings?.map((l: any, i: number) => (
                <TabsTrigger key={i} value={i.toString()} className="rounded-lg px-6 h-10 text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900 text-slate-400">{l.marketingName || `Ruta ${i + 1}`}</TabsTrigger>
              ))}
            </TabsList>
            {generatedAssets?.landings?.map((l: any, lIdx: number) => (
              <TabsContent key={lIdx} value={lIdx.toString()} className="space-y-8">
                <Card className="p-10 rounded-[2.5rem] bg-slate-900 border border-white/10 shadow-xl">
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Nombre Comercial</Label>
                       <Input value={l.marketingName} onChange={e => updateAsset('landings', lIdx, 'marketingName', e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/5 px-8 font-bold text-white focus-visible:ring-emerald-500/50" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Titular Principal (Hero)</Label>
                       <Textarea value={l.headline} onChange={e => updateAsset('landings', lIdx, 'headline', e.target.value)} className="text-3xl font-black text-white border-none bg-white/5 rounded-3xl p-8 min-h-[120px] focus-visible:ring-emerald-500/50" />
                    </div>
                  </div>
                </Card>

                {/* Nueva Sección Audiovisual (Debajo del Hero) */}
                <Card className="p-10 rounded-[2.5rem] bg-slate-900 border border-white/10 shadow-xl">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]">
                      <Video className="h-8 w-8" />
                    </div>
                    <div className="flex-1 space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Video de Venta / Introducción</Label>
                       <Input 
                        placeholder="https://www.youtube.com/watch?v=..." 
                        value={l.videoUrl || ''} 
                        onChange={e => updateAsset('landings', lIdx, 'videoUrl', e.target.value)} 
                        className="h-14 rounded-2xl bg-white/5 border-white/5 px-8 font-mono text-xs text-emerald-400 focus-visible:ring-emerald-500/50" 
                       />
                    </div>
                  </div>
                </Card>

                <div className="space-y-8">
                  {l.sections?.map((section: any, sIdx: number) => (
                    <Card key={sIdx} className="p-12 rounded-[3.5rem] bg-slate-900 border border-white/10 shadow-2xl">
                      <div className="grid lg:grid-cols-2 gap-12">
                        <div className="space-y-8">
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black text-slate-500 ml-4 tracking-[0.3em]">TÍTULO DE SECCIÓN</Label>
                            <Input value={section.title} onChange={e => { const s = [...l.sections]; s[sIdx].title = e.target.value; updateAsset('landings', lIdx, 'sections', s); }} className="font-black text-xl border-none bg-white/5 text-white rounded-2xl h-14 px-8" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black text-slate-500 ml-4 tracking-[0.3em]">CUERPO DE TEXTO</Label>
                            <Textarea value={section.paragraph} onChange={e => { const s = [...l.sections]; s[sIdx].paragraph = e.target.value; updateAsset('landings', lIdx, 'sections', s); }} className="min-h-[180px] border-none bg-white/5 text-slate-300 rounded-[2rem] p-8 text-base font-medium leading-relaxed" />
                          </div>
                        </div>
                        <ImageEditor label={`Imagen ${sIdx + 1}`} url={section.imageUrl} onUpdate={u => { const s = [...l.sections]; s[sIdx].imageUrl = u; updateAsset('landings', lIdx, 'sections', s); }} courseId={selectedCourseId || ''} channel="landing" keywords={section.title} description={section.paragraph} />
                      </div>

                      {/* Restauración de Viñetas (MicroBullets) */}
                      <div className="mt-10 pt-10 border-t border-white/5 space-y-4">
                        <div className="flex items-center gap-2 ml-4">
                          <Sparkles className="h-3 w-3 text-emerald-500" />
                          <Label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Viñetas Potentes por Sección</Label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {section.microBullets?.map((bullet: string, bIdx: number) => (
                            <div key={bIdx} className="group relative">
                              <Input 
                                value={bullet} 
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

                {/* Nuevos Campos: Beneficios Globales y Mentor */}
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
                              value={benefit} 
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
                            <Button 
                              variant="outline" 
                              onClick={() => updateAsset('landings', lIdx, 'benefits', ["Incrementa tu producción en...", "Reduce pérdidas por...", "Optimiza el proceso de..."])}
                              className="text-[10px] font-bold uppercase rounded-xl border-white/10 text-slate-400"
                            >
                              Inicializar con Placeholders
                            </Button>
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
                        placeholder="Describe la autoridad del mentor basándote en su experiencia técnica..."
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="email">
          <Tabs value={activeEmailIdx.toString()} onValueChange={v => setActiveEmailIdx(parseInt(v))}>
            <TabsList className="bg-slate-950 p-1.5 h-12 justify-start gap-1 rounded-xl mb-8 border border-white/10 w-fit">
              {generatedAssets?.emails?.map((e: any, i: number) => (
                <TabsTrigger key={i} value={i.toString()} className="px-6 h-9 font-black text-[10px] tracking-widest uppercase data-[state=active]:bg-violet-600 data-[state=active]:text-white text-white/40 hover:text-white/60">
                  {e.marketingName || `Email ${i + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>
            {generatedAssets?.emails?.map((e: any, eIdx: number) => (
              <TabsContent key={eIdx} value={eIdx.toString()} className="space-y-8 max-w-4xl mx-auto">
                <Card className="p-12 rounded-[3.5rem] bg-slate-900 border border-white/10 shadow-2xl space-y-10">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-[0.2em]">Asunto del Correo</Label>
                    <Input value={e.subject} onChange={v => updateAsset('emails', eIdx, 'subject', v.target.value)} className="h-16 rounded-3xl border-white/5 bg-white/5 px-8 font-black text-2xl text-white focus-visible:ring-violet-500/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-[0.2em]">Cuerpo Narrativo</Label>
                    <Textarea value={e.body} onChange={v => updateAsset('emails', eIdx, 'body', v.target.value)} className="min-h-[500px] rounded-[2.5rem] border-white/5 bg-white/5 p-12 leading-relaxed text-lg font-medium text-slate-200 shadow-inner focus-visible:ring-violet-500/50" />
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="social">
          {(() => {
            const rawSocials = generatedAssets?.socials || [];
            const platforms = Array.from(new Set(rawSocials.map((s: any) => s.platform).filter(Boolean)))
              .filter(p => p !== 'linkedin') as string[];
            if (rawSocials.length === 0) return <p className="text-center p-20 bg-slate-50 rounded-2xl">No hay contenido social.</p>;
            
            return (
              <Tabs defaultValue={platforms[0]}>
                <TabsList className="bg-slate-950 p-1.5 h-12 justify-start gap-1 rounded-xl mb-10 border border-white/10 w-fit">
                  {platforms.map(p => (
                    <TabsTrigger key={p} value={p} className="capitalize gap-2 font-black text-[10px] px-6 h-9 tracking-widest uppercase data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-white/40 hover:text-white/60">
                      <PlatformIcon platform={p} className="h-4 w-4" /> {p}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {platforms.map(p => {
                  const platformSocials = rawSocials.filter((s: any) => s.platform === p);
                  return (
                    <TabsContent key={p} value={p} className="space-y-10 animate-in fade-in slide-in-from-left-4">
                      <Tabs defaultValue={rawSocials.findIndex((s: any) => s.platform === p).toString()}>
                        <div className="flex items-center justify-between mb-8 bg-slate-900 p-2.5 rounded-2xl border border-white/10 shadow-lg">
                           <TabsList className="bg-transparent h-10 gap-1.5 overflow-x-auto">
                             {rawSocials.map((s: any, idx: number) => {
                               if (s.platform !== p) return null;
                               return (
                                 <TabsTrigger key={idx} value={idx.toString()} className="rounded-xl px-6 h-8 text-[11px] font-black uppercase data-[state=active]:bg-white data-[state=active]:text-slate-950 text-white/40 hover:text-white/80 shrink-0">
                                   {s.marketingName || `${getPlatformLabels(p).type} ${idx + 1}`}
                                 </TabsTrigger>
                               );
                             })}
                           </TabsList>
                        </div>

                        {rawSocials.map((s: any, globalIdx: number) => {
                          if (s.platform !== p) return null;
                          return (
                            <TabsContent key={globalIdx} value={globalIdx.toString()} className="space-y-10 animate-in zoom-in-95 duration-500">
                              <Card className="p-12 rounded-[4rem] bg-slate-950 border border-white/10 shadow-2xl grid lg:grid-cols-12 gap-12 overflow-hidden relative">
                                <div className="lg:col-span-7 space-y-10 z-10">
                                  <div className="flex items-center justify-between gap-4 bg-white/5 p-5 rounded-[2.5rem] border border-white/10 mb-2 shadow-inner">
                                    <div className="flex items-center gap-4 flex-1">
                                      <Button 
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleGenerateBreakdown(s, globalIdx, 'socials')}
                                        disabled={isGeneratingBreakdown === `socials-${globalIdx}`}
                                        className="h-11 rounded-2xl bg-white text-slate-950 hover:bg-emerald-50 text-[10px] font-black px-8 transition-all shadow-xl"
                                      >
                                        {isGeneratingBreakdown === `socials-${globalIdx}` ? (
                                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Esquematizando...</>
                                        ) : (
                                          <><Sparkles className="h-4 w-4 mr-2" /> RE-GENERAR CONTENIDO</>
                                        )}
                                      </Button>

                                      <div className="flex-1 max-w-[240px]">
                                        <Select
                                          value={(s.landingIdx ?? globalIdx % (generatedAssets?.landings?.length || 1)).toString()}
                                          onValueChange={(val) => updateAsset('socials', globalIdx, 'landingIdx', parseInt(val))}
                                        >
                                          <SelectTrigger className="h-11 rounded-2xl bg-slate-900 border-white/10 text-[9px] font-black uppercase text-emerald-400 tracking-widest shadow-2xl">
                                            <div className="flex items-center gap-2">
                                              <Link2 className="h-3.5 w-3.5" />
                                              <span>Link a: <SelectValue placeholder="Destino" /></span>
                                            </div>
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-900 border-white/10 text-white">
                                            {generatedAssets?.landings?.map((l: any, lIdx: number) => (
                                              <SelectItem key={lIdx} value={lIdx.toString()} className="text-[10px] uppercase font-bold hover:bg-white/10">
                                                🎯 {l.marketingName || `Landing Ruta ${lIdx + 1}`}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <Input value={s.marketingName} onChange={e => updateAsset('socials', globalIdx, 'marketingName', e.target.value)} className="font-bold border-white/10 bg-white/5 h-16 px-10 rounded-[2rem] text-2xl text-white uppercase" />
                                  </div>
                                  
                                  <div className="space-y-4 bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl">
                                    <div className="space-y-2">
                                      <Label className="text-[8px] font-bold text-emerald-600/60 uppercase ml-1">Gancho (Hook)</Label>
                                      <Input value={s.hook} onChange={e => updateAsset('socials', globalIdx, 'hook', e.target.value)} className="bg-emerald-500/5 border-emerald-500/10 text-emerald-400 text-xs font-black italic rounded-xl h-10 px-4" />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-[8px] font-bold text-slate-500 uppercase ml-1">Cuerpo (Caption)</Label>
                                      <Textarea value={s.caption} onChange={e => updateAsset('socials', globalIdx, 'caption', e.target.value)} className="min-h-[140px] border-none bg-white/[0.02] rounded-2xl p-4 text-sm font-medium text-slate-300" />
                                    </div>
                                  </div>

                                  <SceneNarrativeEditor asset={s} sIdx={globalIdx} selectedCourseId={selectedCourseId} updateAsset={updateAsset as any} isGeneratingBreakdown={isGeneratingBreakdown} onGenerateBreakdown={handleGenerateBreakdown} />
                                  
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
                                      onDeleteVideo={handleDeleteVideo} 
                                      renderedVideos={renderedVideos} 
                                      googleToken={googleToken}
                                      onRefreshGoogleToken={ensureGoogleToken}
                                    />
                                  )}
                                </div>
                                <div className="lg:col-span-5 relative">
                                  <div className="sticky top-0 p-4 rounded-[4.5rem] bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-2xl">
                                    <SocialLivePreview social={s} tokens={blueprintData?.assets?.socials?.[globalIdx]?.designTokens} adn={dynamicAdns[s.production_notes?.adn || '01'] || dynamicAdns['01']} />
                                  </div>
                                </div>
                              </Card>
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
            <TabsList className="bg-slate-950 p-1.5 h-12 justify-start gap-1 rounded-xl mb-10 border border-white/10 w-fit">
              {generatedAssets?.ads?.map((a: any, i: number) => (
                <TabsTrigger key={i} value={i.toString()} className="px-8 h-9 font-black text-[10px] tracking-widest uppercase data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-white/40 hover:text-white/60">
                  {a.marketingName || `Ads ${i+1}`}
                </TabsTrigger>
              ))}
            </TabsList>
            {generatedAssets?.ads?.map((a: any, aIdx: number) => (
              <TabsContent key={aIdx} value={aIdx.toString()} className="grid lg:grid-cols-2 gap-12">
                 <Card className="p-12 rounded-[3.5rem] bg-slate-900 border border-white/10 shadow-2xl space-y-10">
                    <h3 className="font-black text-2xl text-white uppercase tracking-tighter">Títulos</h3>
                    <div className="space-y-6">
                      {a.headlines?.map((h: string, i: number) => (
                        <Input key={i} value={h} onChange={e => updateAsset('ads', aIdx, 'headlines', e.target.value, i)} className="font-bold h-16 bg-white/5 border-white/5 text-white rounded-xl px-8" />
                      ))}
                    </div>
                 </Card>
                 <Card className="p-12 rounded-[3.5rem] bg-slate-900 border border-white/10 shadow-2xl space-y-10">
                    <h3 className="font-black text-2xl text-white uppercase tracking-tighter">Descripciones</h3>
                    <div className="space-y-8">
                      {a.descriptions?.map((d: string, i: number) => (
                        <Textarea key={i} value={d} onChange={e => updateAsset('ads', aIdx, 'descriptions', e.target.value, i)} className="min-h-[140px] bg-white/5 border-white/5 text-slate-200 rounded-xl p-8" />
                      ))}
                    </div>
                 </Card>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
