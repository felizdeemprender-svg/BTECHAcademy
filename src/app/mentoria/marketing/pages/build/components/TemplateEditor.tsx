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
  Instagram,
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
  Trash2,
  FileEdit,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageEditor } from '@/components/courses/ImageEditor';
import { SocialLivePreview } from './SocialLivePreview';
import { PlatformIcon } from './PlatformIcon';
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

interface TemplateEditorProps {
  generatedAssets: any;
  blueprintData: any;
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
  updateAsset: (channel: 'emails' | 'socials' | 'ads', variantIdx: number, field: string, value: any, subIndex?: number) => void;
  loading: boolean;
  onSave: (overrideAssets?: any, silentAutoSave?: boolean) => void;
  templateDirectives?: string;
  campaignMission?: string;
  adns?: Record<string, any>;
  availableLandings?: any[] | null;
}

const OptimizedValidationReport = ({ generatedAssets }: { generatedAssets: any }) => {
  const [showDetails, setShowDetails] = useState(false);
  const allErrors: any[] = [];
  const allWarnings: any[] = [];

  ['socials', 'emails', 'ads'].forEach(channel => {
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
      <div className="flex items-center justify-between p-4 bg-success/10 border border-success/20 rounded-xl">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <span className="font-bold text-success">✅ Todo compatible con APIs</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)} className="text-success hover:bg-success/15">
          {showDetails ? 'Ocultar' : 'Ver'} detalles
        </Button>
      </div>
    );
  }

  if (allErrors.length > 0) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-5 w-5 text-danger" />
            <span className="font-bold text-danger">❌ {allErrors.length} errores críticos no corregibles</span>
          </div>
          <div className="text-sm text-danger">Estos errores deben ser corregidos manualmente para asegurar compatibilidad.</div>
        </div>
        <Button variant="outline" onClick={() => setShowDetails(!showDetails)} className="w-full">
          {showDetails ? 'Ocultar' : 'Ver'} reporte completo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-warn/10 border border-warn/20 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-5 w-5 text-warn" />
          <span className="font-bold text-warn">⚠️ {allWarnings.length} advertencias (corregidas automáticamente)</span>
        </div>
        <div className="text-sm text-warn">El sistema aplicó las adaptaciones necesarias para mantener la compatibilidad.</div>
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
  availableLandings = [],
}: TemplateEditorProps) {
  // ADNs cargados desde el componente padre (page.tsx) para evitar ReferenceError
  const dynamicAdns = adns;

  const [isGeneratingBreakdown, setIsGeneratingBreakdown] = useState<string | null>(null);

  // Estado para el asistente de creación de nueva pieza
  const [newPieceConfig, setNewPieceConfig] = useState({
    name: '',
    platform: 'instagram',
    type: 'story',
    adnId: '01_CINEMA',
    videoEngine: 'ffmpeg'
  });
  const [isRenderingVideo, setIsRenderingVideo] = useState<string | null>(null);
  const [showSocialConfigurator, setShowSocialConfigurator] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);
  const [renderedVideos, setRenderedVideos] = useState<Record<number, string | null>>({});
  const [jobProgress, setJobProgress] = useState<Record<number, { progress: number; stage: string }>>({});
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const [landingSelectorState, setLandingSelectorState] = useState<{ open: boolean, variant: any, index: number, channel: any } | null>(null);
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
      console.warn("[Auth] No se pudo renovar token de Google Drive:", error.message || error);
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error("Proceso cancelado. Se necesita acceso a Drive para guardar el video.");
      }
      throw new Error("No se pudo conectar con tu Google Drive de tutor.");
    }
  };

  const handleDownloadVideo = async (videoUrl: string | undefined | null, fileName: string, explicitDriveIds?: string | null) => {
    try {
      let idsToDownload: string[] = [];

      if (explicitDriveIds) {
        idsToDownload = explicitDriveIds.split(',').map(i => i.trim()).filter(Boolean);
      } else if (videoUrl) {
        const driveIdMatch = videoUrl.match(/\/d\/(.+?)\//) || videoUrl.match(/id=(.+?)(&|$)/);
        if (driveIdMatch) idsToDownload.push(driveIdMatch[1]);
      }

      if (idsToDownload.length === 0) {
        // Fallback: Si no tiene ID de drive pero es URL http directa
        if (videoUrl?.startsWith('http') && !videoUrl.includes('drive.google.com')) {
          const urls = videoUrl.split(',').map(u => u.trim());
          urls.forEach((url, i) => {
            setTimeout(() => window.open(url, '_blank'), i * 800);
          });
          return;
        }
        alert("El link del video no es válido o el ID de Google Drive no está disponible.");
        return;
      }

      const freshToken = await ensureGoogleToken();
      if (!freshToken || freshToken === 'null') {
        alert("No se pudo obtener el acceso a Google Drive. Por favor, intenta de nuevo.");
        return;
      }

      if (idsToDownload.length > 1) {
        toast({ title: "Descarga Múltiple", description: `Iniciando descarga de ${idsToDownload.length} videos. Por favor permite las ventanas emergentes si tu navegador las bloquea.` });
      }

      idsToDownload.forEach((id, index) => {
        const isMulti = idsToDownload.length > 1;
        const partSuffix = isMulti ? `_parte_${index + 1}` : '';
        const nameWithoutExt = fileName.replace('.mp4', '');
        const finalName = `${nameWithoutExt}${partSuffix}.mp4`;

        setTimeout(() => {
          const proxyUrl = `/api/video/download?id=${id}&name=${encodeURIComponent(finalName)}&token=${freshToken}`;
          window.open(proxyUrl, '_blank');
        }, index * 800);
      });

    } catch (err: any) {
      alert("Error al intentar descargar: " + err.message);
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
    if (slides.length === 0) {
      toast({ variant: 'destructive', title: 'Sin contenido', description: 'Primero genera el desglose de escenas antes de renderizar.' });
      return;
    }

    setIsRenderingVideo(`${sIdx}`);
    setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'Iniciando...' } }));

    try {
      const accessToken = await ensureGoogleToken();
      if (!accessToken) throw new Error('Se requiere acceso a Drive para generar videos.');

      // Limpiar videos previos de Drive antes de regenerar
      const oldDriveId = s.production_notes?.video_drive_id;
      if (oldDriveId) {
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
              throw new Error('Sesión de Google expirada. Por favor, pulsa Regenerar de nuevo.');
            }
          } catch (e: any) {
            if (e.message.includes('Sesión')) throw e;
          }
        }
      }

      // Resolver imágenes base64 → Firebase Storage
      const { initializeFirebase } = await import('@/firebase');
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = initializeFirebase();
      const resolvedScenes = await Promise.all(slides.map(async (sl: any, i: number) => {
        let imageUrl = sl.imageUrl || '';
        if (imageUrl.startsWith('data:')) {
          const blob = await fetch(imageUrl).then(r => r.blob());
          const snap = await uploadBytes(ref(storage, `campaigns/${selectedCourseId}/assets/slide_${sIdx}_${i}_${Date.now()}.jpg`), blob);
          imageUrl = await getDownloadURL(snap.ref);
        }
        return {
          imageUrl,
          text: sl.text || '',
          subtitle: sl.subtitle || '',
          watermark: sl.watermark || '',
          voiceover: sl.voiceover || '',
          segment_label: sl.segment || 'VALOR',
          duration: Math.max(Number(sl.duration) || 10, 10)
        };
      }));

      const pNotes = s.production_notes || {};
      const jobId = `job_${selectedCourseId}_${sIdx}_${Date.now()}`;

      // ── ENCOLAR el job (responde en ~100ms) ──────────────────────────────
      const res = await fetch('/api/video/render-v2', {
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
          enable_tts: pNotes.enable_tts !== false,
          voice_id: pNotes.voice_id || 'mateo',
          voiceover: (s.slides?.some((sl: any) => sl.voiceover)) ? '' : (pNotes.voiceover || s.voiceover || ''),
          audioEffect: pNotes.audio_effect || 'auto',
          adnId: pNotes.adnId || '01_CINEMA',
          isCarousel: s.type === 'carousel',
          marketingName: s.marketingName
        })
      });

      const enqueueData = await res.json();
      if (!res.ok || !enqueueData.success) {
        throw new Error(enqueueData.error || 'No se pudo encolar el renderizado.');
      }

      toast({ title: 'Video en Cola', description: 'El renderizado inició en segundo plano. Puedes seguir trabajando.' });

      // ── POLLING: consultar /api/video/job-status cada 4 segundos ─────────
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/video/job-status?id=${jobId}`);
          const statusData = await statusRes.json();

          if (!statusData.success) return;

          setJobProgress(prev => ({
            ...prev,
            [sIdx]: { progress: statusData.progress || 0, stage: statusData.stage || '...' }
          }));

          if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            const result = statusData.result || {};

            setRenderedVideos(prev => ({ ...prev, [sIdx]: result.webViewLink }));

            const newSocials = [...generatedAssets.socials];
            newSocials[sIdx] = {
              ...newSocials[sIdx],
              production_notes: {
                ...pNotes,
                video_url: result.webViewLink,
                video_drive_id: result.driveId,
                video_download_url: result.downloadUrl
              },
              slides: resolvedScenes
            };
            await onSave({ ...generatedAssets, socials: newSocials }, true);
            toast({ title: 'Video Listo ✅', description: 'El video ya está disponible en tu panel.' });
            setIsRenderingVideo(null);
            setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 100, stage: 'Completado' } }));

          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            toast({ variant: 'destructive', title: 'Error de Renderizado', description: statusData.error || 'El proceso falló.' });
            setIsRenderingVideo(null);
            setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'Error' } }));
          }
        } catch (pollErr) {
          console.error('[Poll] Error consultando estado:', pollErr);
        }
      }, 4000);

      // Seguro: si la pestaña se cierra, el intervalo se auto-limpia
      setTimeout(() => clearInterval(pollInterval), 20 * 60 * 1000); // TTL máximo 20 minutos

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
      setIsRenderingVideo(null);
      setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'Error' } }));
    }
  };

  const handleGenerateVideoIA = async (s: any, sIdx: number) => {
    if (!s) return;
    if (!selectedCourseId) {
      toast({ variant: 'destructive', title: 'Sin curso', description: 'Selecciona un curso antes de generar el video IA.' });
      return;
    }

    setIsRenderingVideo(`${sIdx}`);
    setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'En cola...' } }));

    try {
      const accessToken = await ensureGoogleToken();
      if (!accessToken) throw new Error('Se requiere acceso a Drive para guardar el video.');

      const typeToFormat: Record<string, string> = {
        story: '9:16',
        short_video: '9:16',
        portrait_post: '4:5',
        single_post: '1:1',
        carousel: '4:5'
      };
      const formato = typeToFormat[s.type] || '9:16';
      const pNotes = s.production_notes || {};

      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoId: selectedCourseId,
          formato,
          avatar: 'no',
          engine: 'gemini-omni',
          adnId: pNotes.adnId || '01_CINEMA',
          marketingName: s.marketingName,
          googleToken: accessToken,
          isSmokeTest: false,
          audioUrl: pNotes.audio_url,
          scenes: s.slides || [],
          enable_tts: pNotes.enable_tts !== false,
          voiceId: pNotes.voice_id || 'mateo'
        })
      });

      const enqueueData = await res.json();
      if (!res.ok || !enqueueData.success) {
        throw new Error(enqueueData.error || 'No se pudo encolar el video IA.');
      }
      const jobId: string = enqueueData.jobId;

      toast({ title: 'Video IA en Cola', description: 'Gemini Omni está generando el clip (máx 10s). Puedes seguir trabajando.' });

      // ── POLLING: consultar /api/video/job-status cada 4 segundos ─────────
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/video/job-status?id=${jobId}`);
          const statusData = await statusRes.json();
          if (!statusData.success) return;

          setJobProgress(prev => ({
            ...prev,
            [sIdx]: { progress: statusData.progress || 0, stage: statusData.stage || '...' }
          }));

          if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            const result = statusData.result || {};

            if (result.webViewLink) {
              setRenderedVideos(prev => ({ ...prev, [sIdx]: result.webViewLink }));
            }

            const newSocials = [...generatedAssets.socials];
            newSocials[sIdx] = {
              ...newSocials[sIdx],
              production_notes: {
                ...pNotes,
                ...(result.webViewLink && {
                  video_url: result.webViewLink,
                  video_drive_id: result.driveId,
                  video_download_url: result.downloadUrl
                }),
                ...(result.prompt && { video_prompt: result.prompt }),
                ...(result.perScene && { video_prompt_per_scene: result.perScene })
              }
            };
            await onSave({ ...generatedAssets, socials: newSocials }, true);
            toast({ title: 'Video IA Listo ✅', description: 'El clip generado con IA ya está disponible.' });
            setIsRenderingVideo(null);
            setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 100, stage: 'Completado' } }));

          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            toast({ variant: 'destructive', title: 'Error de Video IA', description: statusData.error || 'El proceso falló.' });
            setIsRenderingVideo(null);
            setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'Error' } }));
          }
        } catch (pollErr) {
          console.error('[Poll IA] Error consultando estado:', pollErr);
        }
      }, 4000);

      setTimeout(() => clearInterval(pollInterval), 20 * 60 * 1000);

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
      setIsRenderingVideo(null);
      setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'Error' } }));
    }
  };

  // Generar video largo (AI Video API long-video, 4–180s en un solo request)
  const handleGenerateLongVideo = async (s: any, sIdx: number) => {
    if (!s) return;
    if (!selectedCourseId) {
      toast({ variant: 'destructive', title: 'Sin curso', description: 'Selecciona un curso antes de generar el video largo.' });
      return;
    }

    setIsRenderingVideo(`${sIdx}`);
    setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'En cola...' } }));

    try {
      const accessToken = await ensureGoogleToken();
      if (!accessToken) throw new Error('Se requiere acceso a Drive para guardar el video.');

      const formato = mapAssetTypeToFormato(s.type);
      const pNotes = s.production_notes || {};
      const slides = s.slides || s.scenes || [];

      // Escenas reales tal como las editó el usuario (multi-escena)
      const scenes = slides.map((sl: any) => ({
        segment: sl.segment || sl.segment_label || 'VALOR',
        text: sl.text || '',
        subtitle: sl.subtitle || '',
        voiceover: sl.voiceover || '',
        watermark: sl.watermark || '',
        imageUrl: sl.imageUrl || '',
        duration: Math.max(Number(sl.duration) || 10, 10)
      }));

      const totalSceneSeconds = scenes.reduce((acc: number, sl: any) => acc + sl.duration, 0);

      // ── ENCOLAR el job en el circuito (responde ~100ms) ──────────────────
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoId: selectedCourseId,
          formato,
          avatar: 'no',
          engine: 'long',
          adnId: pNotes.adnId || '01_CINEMA',
          marketingName: s.marketingName,
          googleToken: accessToken,
          scenes,
          persona: { enabled: pNotes.persona_enabled ?? false, description: pNotes.persona_description || '' },
          subtitles: pNotes.subtitles_enabled ?? true,
          enable_tts: pNotes.enable_tts !== false,
          voiceId: pNotes.voice_id || 'mateo',
          longDuration: Math.max(totalSceneSeconds, 10),
          isSmokeTest: false
        })
      });

      const enqueueData = await res.json();
      if (!res.ok || !enqueueData.success) {
        throw new Error(enqueueData.error || 'No se pudo encolar el video largo.');
      }
      const jobId: string = enqueueData.jobId;

      toast({ title: 'Video Largo en Cola', description: 'AI Video API está generando el video (4–180s). Puedes seguir trabajando.' });

      // ── POLLING: consultar /api/video/job-status cada 4 segundos ─────────
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/video/job-status?id=${jobId}`);
          const statusData = await statusRes.json();
          if (!statusData.success) return;

          setJobProgress(prev => ({
            ...prev,
            [sIdx]: { progress: statusData.progress || 0, stage: statusData.stage || '...' }
          }));

          if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            const result = statusData.result || {};

            setRenderedVideos(prev => ({ ...prev, [sIdx]: result.webViewLink }));

            const newSocials = [...generatedAssets.socials];
            newSocials[sIdx] = {
              ...newSocials[sIdx],
              production_notes: {
                ...pNotes,
                video_url: result.webViewLink,
                video_drive_id: result.driveId,
                video_download_url: result.downloadUrl
              }
            };
            await onSave({ ...generatedAssets, socials: newSocials }, true);
            toast({ title: 'Video Largo Listo ✅', description: `El video de ${result.durationSeconds || ''}s ya está disponible.` });
            setIsRenderingVideo(null);
            setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 100, stage: 'Completado' } }));

          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            toast({ variant: 'destructive', title: 'Error de Video Largo', description: statusData.error || 'El proceso falló.' });
            setIsRenderingVideo(null);
            setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'Error' } }));
          }
        } catch (pollErr) {
          console.error('[Poll Long] Error consultando estado:', pollErr);
        }
      }, 4000);

      setTimeout(() => clearInterval(pollInterval), 20 * 60 * 1000);

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
      setIsRenderingVideo(null);
      setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'Error' } }));
    }
  };

  // Generar prompt afinado por ADN + escenas reales para editores externos (Seedance, Veo, Runway, Pika, Wan)
  const handleGeneratePrompt = async (s: any, sIdx: number) => {
    if (!s) return;
    if (!selectedCourseId) {
      toast({ variant: 'destructive', title: 'Sin curso', description: 'Selecciona un curso antes de generar el prompt.' });
      return;
    }

    setIsRenderingVideo(`${sIdx}`);
    setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'Redactando prompt especializado...' } }));

    try {
      const formato = mapAssetTypeToFormato(s.type);
      const pNotes = s.production_notes || {};
      const exportEngine = pNotes.export_engine || 'seedance';
      const slides = s.slides || s.scenes || [];

      // Escenas reales tal como las editó el usuario (multi-escena)
      const scenes = slides.map((sl: any) => ({
        segment: sl.segment || sl.segment_label || 'VALOR',
        text: sl.text || '',
        subtitle: sl.subtitle || '',
        voiceover: sl.voiceover || '',
        watermark: sl.watermark || '',
        imageUrl: sl.imageUrl || '',
        duration: Math.max(Number(sl.duration) || 10, 10)
      }));

      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoId: selectedCourseId,
          formato,
          avatar: 'no',
          engine: 'export',
          exportEngine,
          adnId: pNotes.adnId || '01_CINEMA',
          marketingName: s.marketingName,
          scenes,
          persona: { enabled: pNotes.persona_enabled ?? false, description: pNotes.persona_description || '' },
          subtitles: pNotes.subtitles_enabled ?? true,
          voiceId: pNotes.voice_id || 'mateo',
          isSmokeTest: false
        })
      });

      const enqueueData = await res.json();
      if (!res.ok || !enqueueData.success) {
        throw new Error(enqueueData.error || 'No se pudo encolar la generación del prompt.');
      }
      const jobId: string = enqueueData.jobId;

      toast({ title: 'Prompt en Redacción', description: `Afínando guion con el ADN para ${exportEngine.toUpperCase()}.` });

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/video/job-status?id=${jobId}`);
          const statusData = await statusRes.json();
          if (!statusData.success) return;

          setJobProgress(prev => ({
            ...prev,
            [sIdx]: { progress: statusData.progress || 0, stage: statusData.stage || '...' }
          }));

          if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            const result = statusData.result || {};
            const prompt = result.prompt || '';
            const perScene = Array.isArray(result.perScene) ? result.perScene : [];

            updateAsset('socials', sIdx, 'production_notes', {
              ...pNotes,
              video_prompt: prompt,
              video_prompt_scenes: perScene,
              video_prompt_engine: exportEngine
            });

            toast({ title: 'Prompt Listo ✅', description: `${perScene.length > 1 ? `${perScene.length} escenas listas. ` : ''}Copialo en ${exportEngine.toUpperCase()} (o el editor que uses).` });
            setIsRenderingVideo(null);
            setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 100, stage: 'Prompt generado' } }));
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            toast({ variant: 'destructive', title: 'Error generando prompt', description: statusData.error || 'El proceso falló.' });
            setIsRenderingVideo(null);
            setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'Error' } }));
          }
        } catch (pollErr) {
          console.error('[Poll Prompt] Error consultando estado:', pollErr);
        }
      }, 4000);

      setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
      setIsRenderingVideo(null);
      setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'Error' } }));
    }
  };

  // Mapear tipo de asset → formato del circuito (/api/video/generate)
  const mapAssetTypeToFormato = (type: string): string => {
    switch (type) {
      case 'story':
      case 'short_video':
        return '9:16';
      case 'portrait_post':
        return '4:5';
      case 'single_post':
        return '1:1';
      case 'carousel':
        return '4:5';
      default:
        return '9:16';
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
          designTokens: s.designTokens || blueprintData?.designTokens,
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

  const normalizeWatermark = (value?: string) => {
    if (!value) {
      return '';
    }

    const cleaned = cleanSocialHandle(value);
    if (!cleaned) {
      return '';
    }

    return cleaned.startsWith('@') ? cleaned : `@${cleaned}`;
  };

  const isPlaceholderWatermark = (value?: string) => {
    const normalized = normalizeWatermark(value);
    return normalized.toLowerCase() === '@usuario';
  };

  const resolveWatermarkHandle = (platform?: string, fallbackHandle?: string, currentWatermark?: string) => {
    const socials = profile?.profile?.socials || {};
    const normalizedPlatform = String(platform || '').toLowerCase();
    const platformKey = normalizedPlatform === 'x' ? 'twitter' : normalizedPlatform;
    const rawProfileHandle = socials?.[platformKey];
    const profileHandle = normalizeWatermark(rawProfileHandle);

    if (profileHandle) {
      return profileHandle;
    }

    const normalizedFallback = normalizeWatermark(fallbackHandle);
    if (normalizedFallback && !isPlaceholderWatermark(normalizedFallback)) {
      return normalizedFallback;
    }

    const normalizedCurrent = normalizeWatermark(currentWatermark);
    if (normalizedCurrent && !isPlaceholderWatermark(normalizedCurrent)) {
      return normalizedCurrent;
    }

    return '';
  };

  const handleGenerateBreakdown = async (variant: any, index: number, channel: 'emails' | 'socials' | 'ads', selectedLandingIndex: number = -1) => {
    // Si hay más de una landing y no hemos elegido, abrimos el selector.
    if ((channel === 'socials' || channel === 'ads' || channel === 'emails') && generatedAssets?.landings && generatedAssets.landings.length > 1 && selectedLandingIndex === -1) {
      setLandingSelectorState({ open: true, variant, index, channel });
      return;
    }

    setIsGeneratingBreakdown(`${channel}-${index}`);
    try {
      const selectedCourse = courses?.find(c => c.id === selectedCourseId);
      const realDirectives = templateDirectives || `Campana para "${selectedCourse?.title}".`;
      
      const realIndex = selectedLandingIndex === -1 ? 0 : selectedLandingIndex;
      const primaryLanding = generatedAssets?.landings?.[realIndex];
      const landingContext = primaryLanding 
        ? `\n\n== CONTEXTO DE LA LANDING PAGE DE VENTA ==\nTítulo de la Landing: "${primaryLanding.headline}"\nSubtítulo: "${primaryLanding.subheadline}"\nLlamado a la acción (CTA) de la Landing: "${primaryLanding.ctaText}"\nBeneficios / FAQs: ${primaryLanding.faqs?.map((f:any) => f.question).join(', ') || 'N/A'}`
        : '';
        
      const breakdown = await (await import('@/ai/flows/generate-variant-content')).generateVariantContent(
        variant, 
        realDirectives, 
        selectedCourse?.title || '', 
        selectedCourse?.description || '', 
        selectedCourse?.targetAudience || '', 
        (campaignMission as any) || 'venta',
        landingContext
      );
      if (channel === 'socials') {
        const sourceArray = (breakdown.scenes && breakdown.scenes.length > 0) ? breakdown.scenes : (breakdown.slides || []);
        const currentPlatform = generatedAssets?.socials?.[index]?.platform || variant.platform;
        const mappedScenes = sourceArray.map((s: any, i: number) => ({
          segment: s.segment_label || 'VALOR',
          title: s.title || '',
          text: s.text || '',
          subtitle: s.subtitle || '',
          watermark: resolveWatermarkHandle(currentPlatform, variant.handle, s.watermark),
          voiceover: s.voiceover || '',
          description: s.description || s.imageUrl || '',
          duration: Math.max(Number(s.duration) || 10, 10),
          imageUrl: variant.slides?.[i]?.imageUrl || (s.imageUrl?.startsWith('http') ? s.imageUrl : ''),
          subject_action: s.subject_action || '',
          camera_movement: s.camera_movement || '',
          framing: s.framing || '',
          lighting: s.lighting || ''
        }));
        const newSocials = [...generatedAssets.socials];
        newSocials[index] = { ...newSocials[index], slides: mappedScenes, hook: breakdown.hook, caption: breakdown.caption };
        const newAssets = { ...generatedAssets, socials: newSocials };
        onSave(newAssets, true);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de Generación',
        description: error.message || 'Error al generar desglose.'
      });
    } finally { setIsGeneratingBreakdown(null); }
  };

  const handleGenerateEmail = async (email: any, eIdx: number) => {
    setIsGeneratingBreakdown(`emails-${eIdx}`);
    try {
      const selectedCourse = courses?.find(c => c.id === selectedCourseId);
      const realDirectives = templateDirectives || `Campaña para "${selectedCourse?.title}".`;
      const { generateEmailContent } = await import('@/ai/flows/generate-email-content');
      const result = await generateEmailContent({
        variant: email,
        directives: realDirectives,
        courseTitle: selectedCourse?.title || '',
        courseDescription: selectedCourse?.description || '',
        targetAudience: selectedCourse?.targetAudience || '',
        mentorName: profile?.profile?.fullName || profile?.profile?.firstName || profile?.displayName || 'Mentor Experto',
        mentorBio: profile?.profile?.bio,
        mentorSocials: profile?.profile?.socials,
        mission: (campaignMission as any) || 'venta'
      });
      const newEmails = [...(generatedAssets?.emails || [])];
      newEmails[eIdx] = {
        ...newEmails[eIdx],
        marketingName: result.marketingName || email.marketingName,
        subject: result.subject,
        preheader: result.preheader,
        body: result.body
      };
      const newAssets = { ...generatedAssets, emails: newEmails };
      onSave(newAssets, true);
      toast({ title: 'Correo Generado', description: 'Asunto, preheader y cuerpo redactados.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de Generación',
        description: error.message || 'Error al generar el correo.'
      });
    } finally { setIsGeneratingBreakdown(null); }
  };

  const handleGenerateAds = async (ad: any, aIdx: number) => {
    setIsGeneratingBreakdown(`ads-${aIdx}`);
    try {
      const selectedCourse = courses?.find(c => c.id === selectedCourseId);
      const realDirectives = templateDirectives || `Campaña para "${selectedCourse?.title}".`;
      const { generateAdsContent } = await import('@/ai/flows/generate-ads-content');
      const result = await generateAdsContent({
        variant: ad,
        directives: realDirectives,
        courseTitle: selectedCourse?.title || '',
        courseDescription: selectedCourse?.description || '',
        targetAudience: selectedCourse?.targetAudience || '',
        mentorName: profile?.profile?.fullName || profile?.profile?.firstName || profile?.displayName || 'Mentor Experto',
        mission: (campaignMission as any) || 'venta'
      });
      const newAds = [...(generatedAssets?.ads || [])];
      newAds[aIdx] = {
        ...newAds[aIdx],
        marketingName: result.marketingName || ad.marketingName,
        headlines: result.headlines,
        descriptions: result.descriptions,
        keywords: result.keywords
      };
      const newAssets = { ...generatedAssets, ads: newAds };
      onSave(newAssets, true);
      toast({ title: 'Anuncio Generado', description: 'Titulares, descripciones y keywords redactados.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de Generación',
        description: error.message || 'Error al generar el anuncio.'
      });
    } finally { setIsGeneratingBreakdown(null); }
  };

  if (!generatedAssets) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 bg-muted rounded-lg border-2 border-dashed border-border">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <div className="text-center">
          <h3 className="text-xl font-bold text-foreground">Cargando contenidos del Pack...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-success text-white flex items-center justify-center shadow-lg">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Edición Final del Contenido</h2>
            <p className="text-muted-foreground">Ajusta los detalles de las 3 rutas propuestas.</p>
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
            className="h-16 px-8 rounded-2xl font-bold border-danger/20 text-danger hover:bg-danger/10 transition-all"
          >
            Eliminar Pack
          </Button>
          <Button onClick={() => onSave()} disabled={loading} className="h-16 px-12 rounded-2xl font-bold text-xl bg-primary gap-3">
            {loading ? <Loader2 className="animate-spin" /> : <Save className="h-6 w-6" />} Guardar Pack
          </Button>
        </div>
      </header>

      <Tabs defaultValue="social" className="w-full">
        <TabsList className="bg-muted/40 p-1.5 h-14 w-full justify-start gap-2 px-6 rounded-2xl border border-border mb-8">
          <TabsTrigger value="social" className="rounded-xl gap-2 font-black px-8 h-11 text-[11px] uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground hover:text-foreground transition-all"><Instagram className="h-4 w-4" /> Redes Sociales</TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Tabs value={activeEmailIdx.toString()} onValueChange={v => setActiveEmailIdx(parseInt(v))}>
            <TabsList className="bg-muted/40 p-1.5 h-12 justify-start gap-1 rounded-xl mb-8 border border-border w-fit">
              {generatedAssets?.emails?.map((e: any, i: number) => (
                <TabsTrigger key={i} value={i.toString()} className="px-6 h-9 font-black text-[10px] tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground hover:text-foreground">
                  {e.marketingName || `Email ${i + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>
            {generatedAssets?.emails?.map((e: any, eIdx: number) => (
              <TabsContent key={eIdx} value={eIdx.toString()} className="space-y-8 max-w-4xl mx-auto">
                <Card className="p-12 rounded-lg bg-white border border-border space-y-10">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-black text-xl text-foreground uppercase tracking-tighter">Correo {eIdx + 1}</h3>
                      <p className="text-xs text-muted-foreground font-medium">Generá el contenido individualmente con IA según el tipo de correo.</p>
                    </div>
                    <Button
                      onClick={() => handleGenerateEmail(e, eIdx)}
                      disabled={isGeneratingBreakdown === `emails-${eIdx}`}
                      className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold gap-2"
                    >
                      {isGeneratingBreakdown === `emails-${eIdx}` ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redactando...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2" /> Generar con IA</>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-4 tracking-[0.2em]">Asunto del Correo</Label>
                    <Input value={e.subject} onChange={v => updateAsset('emails', eIdx, 'subject', v.target.value)} className="h-16 rounded-3xl border-border bg-white px-8 font-black text-2xl text-foreground focus-visible:ring-primary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-4 tracking-[0.2em]">Preheader (Texto de Vista Previa)</Label>
                    <Input value={e.preheader || ''} onChange={v => updateAsset('emails', eIdx, 'preheader', v.target.value)} className="h-14 rounded-3xl border-border bg-white px-8 font-bold text-lg text-foreground focus-visible:ring-primary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-4 tracking-[0.2em]">Cuerpo Narrativo</Label>
                    <Textarea value={e.body} onChange={v => updateAsset('emails', eIdx, 'body', v.target.value)} className="min-h-[500px] border-border bg-white p-12 leading-relaxed text-lg font-medium text-foreground focus-visible:ring-primary/50" />
                  </div>

                  <div className="pt-6 border-t border-border">
                    <Label className="text-[10px] font-black uppercase text-primary ml-4 tracking-widest mb-4 block">Destino del CTA (Botón)</Label>
                    <Select
                      value={e.landingId || 'mentor'}
                      onValueChange={(val) => updateAsset('emails', eIdx, 'landingId', val)}
                    >
                      <SelectTrigger size="xl" className="bg-white border-border text-xs font-bold text-foreground px-8">
                        <div className="flex items-center gap-3">
                          <Link2 className="h-4 w-4 text-primary" />
                          <span>Vincular con: <SelectValue placeholder="Seleccionar Landing" /></span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border text-foreground">
                        <SelectItem value="mentor" className="text-[10px] uppercase font-bold hover:bg-muted/40">URL del Mentor</SelectItem>
                        {availableLandings?.map((pack: any) => (
                          pack.aiContent?.landings?.map((l: any, vIdx: number) => (
                            <SelectItem key={`${pack.id}-${vIdx}`} value={`${pack.id}-${vIdx}`} className="text-[10px] uppercase font-bold hover:bg-muted/40">
                              🎯 {pack.title || 'Pack'}: {l.marketingName || `Variante ${vIdx + 1}`}
                            </SelectItem>
                          ))
                        ))}
                      </SelectContent>
                    </Select>
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
            if (rawSocials.length === 0 || showSocialConfigurator) {
              return (
                <div className="flex flex-col items-center justify-center p-12 space-y-8 bg-white border-2 border-dashed border-border rounded-[4rem] max-w-4xl mx-auto relative">
                  {rawSocials.length > 0 && (
                    <Button onClick={() => setShowSocialConfigurator(false)} variant="ghost" className="absolute top-6 right-6 text-muted-foreground hover:text-foreground">
                      Cancelar
                    </Button>
                  )}
                  <div className="w-20 h-20 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Video className="h-10 w-10" />
                  </div>

                  <div className="text-center space-y-2">
                    <h3 className="text-3xl font-black text-foreground uppercase tracking-tighter">Configurador de Video On-Demand</h3>
                    <p className="text-muted-foreground text-sm font-medium">Define el formato y estilo antes de empezar la producción.</p>
                  </div>

                  <div className="w-full max-w-3xl space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Nombre Interno de la Pieza (Opcional)</Label>
                      <Input
                        placeholder="Ej. Reel Venta Navidad"
                        value={newPieceConfig.name}
                        onChange={(e) => setNewPieceConfig(prev => ({ ...prev, name: e.target.value }))}
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
                            setNewPieceConfig(prev => ({ ...prev, platform: v, type: defaultType }));
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
                        <Select value={newPieceConfig.type} onValueChange={(v) => setNewPieceConfig(prev => ({ ...prev, type: v }))}>
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
                        <Select value={newPieceConfig.adnId} onValueChange={(v) => setNewPieceConfig(prev => ({ ...prev, adnId: v }))}>
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
                      <Select value={newPieceConfig.videoEngine} onValueChange={(v) => setNewPieceConfig(prev => ({ ...prev, videoEngine: v }))}>
                        <SelectTrigger size="xl" className="bg-white border-border text-xs font-bold text-foreground px-6">
                          <SelectValue placeholder="Generador" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-border text-foreground">
                          <SelectItem value="ffmpeg" className="text-[10px] uppercase font-bold">FFmpeg (Motor Propio)</SelectItem>
                          {/* <SelectItem value="long" className="text-[10px] uppercase font-bold">Video Largo (Formato Extendido)</SelectItem> */}
                          <SelectItem value="omni" className="text-[10px] uppercase font-bold">Omni (Gemini)</SelectItem>
                          <SelectItem value="prompt" className="text-[10px] uppercase font-bold">Solo Prompt (Externos: Seedance, Veo...)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] font-bold text-muted-foreground ml-2 italic">FFmpeg arma el video con tus placas · Largo unifica voz y video · Omni genera con IA · Prompt exporta guion para externos.</p>
                    </div>
                  </div>

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
                        duration: Math.max(Number(s.duration) || 10, 10),
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
                      setNewPieceConfig(prev => ({ ...prev, name: '' })); // Limpiar el campo
                      setShowSocialConfigurator(false);
                      toast({ title: "Pieza Creada", description: `Cargadas ${initialSlides.length} placas desde el ADN.` });
                    }}
                    className="h-16 px-16 rounded-lg bg-card text-foreground hover:bg-success/10 font-black text-lg gap-3 transition-all hover:scale-105 active:scale-95 mt-4 border border-border"
                  >
                    <Plus className="h-6 w-6" /> {rawSocials.length === 0 ? 'Crear Primera Pieza' : 'Crear Nueva Pieza'}
                  </Button>
                </div>
              );
            }

            return (
              <Tabs defaultValue={platforms[0]}>
                <div className="flex items-center justify-between mb-10 w-full gap-4 flex-wrap">
                  <TabsList className="bg-muted/40 p-1.5 h-12 justify-start gap-1 rounded-xl border border-border w-fit">
                    {platforms.map(p => (
                      <TabsTrigger key={p} value={p} className="capitalize gap-2 font-black text-[10px] px-6 h-9 tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground hover:text-foreground">
                        <PlatformIcon platform={p} className="h-4 w-4" /> {p}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <Button onClick={() => setShowSocialConfigurator(true)} variant="outline" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 h-12 px-6 rounded-xl font-bold tracking-widest text-[10px] uppercase">
                    <Plus className="h-4 w-4 mr-2" /> Nueva Pieza ADN
                  </Button>
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
                                <Card className="p-6 md:p-8 rounded-lg bg-muted/40 border border-success/20 space-y-6">
                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div className="flex items-center gap-4 md:gap-6">
                                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-success/20 text-success flex items-center justify-center text-xl md:text-2xl font-black">{globalIdx + 1}</div>
                                      <div>
                                        <h3 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-widest">{s.marketingName || `${getPlatformLabels(s.type).badge} ${globalIdx + 1}`}</h3>
                                        <Badge className="bg-success hover:bg-success text-white border-none mt-1 md:mt-2 text-[10px] md:text-xs">Publicación Lista</Badge>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        title="Descargar Video"
                                        onClick={() => handleDownloadVideo(s.production_notes?.video_url || renderedVideos[globalIdx] || s.exportUrls?.socialExportUrl, `${s.marketingName || 'Video_Sellado'}.mp4`, s.production_notes?.video_drive_id)}
                                        className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-success/10 border-success/20 hover:bg-success hover:text-white text-success"
                                      >
                                        <Download className="h-5 w-5" />
                                      </Button>

                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="secondary" size="icon" title="Editar Textos" className="bg-card text-foreground hover:bg-primary/10 h-10 w-10 md:h-12 md:w-12 rounded-xl border border-border">
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
                                    <div className="flex items-center gap-4 md:gap-6">
                                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted/40 text-muted-foreground flex items-center justify-center text-xl md:text-2xl font-black">{globalIdx + 1}</div>
                                      <div>
                                        <h3 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-widest">{s.marketingName || `${getPlatformLabels(s.type).badge} ${globalIdx + 1}`}</h3>
                                        <Badge variant="secondary" className="mt-1 md:mt-2 text-muted-foreground bg-muted/40 hover:bg-muted/60 border-none text-[10px] md:text-xs">Borrador / Producción</Badge>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
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
                                          <Button variant="secondary" size="icon" title="Abrir Editor" className="bg-card text-foreground hover:bg-success/10 h-10 w-10 md:h-12 md:w-12 rounded-xl border border-border">
                                            <FileEdit className="h-5 w-5" />
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
                                                          value={s.production_notes?.adnId || '01'}
                                                          onValueChange={(val) => {
                                                            const selectedAdn = dynamicAdns[val];
                                                            updateAsset('socials', globalIdx, 'production_notes', {
                                                              ...(s.production_notes || {}),
                                                              adnId: val
                                                            });
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
                                                                🎬 {adn.name}
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

                                                      <div className="flex-1 max-w-[120px]">
                                                        <Select
                                                          value={s.landingId || 'mentor'}
                                                          onValueChange={(val) => updateAsset('socials', globalIdx, 'landingId', val)}
                                                        >
                                                          <SelectTrigger className="h-11 bg-white border-border text-[9px] font-black uppercase text-foreground tracking-widest">
                                                            <div className="flex items-center gap-2">
                                                              <Link2 className="h-3.5 w-3.5" />
                                                              <span>URL <SelectValue placeholder="Destino" /></span>
                                                            </div>
                                                          </SelectTrigger>
                                                          <SelectContent className="bg-white border-border text-foreground">
                                                            <SelectItem value="mentor" className="text-[10px] uppercase font-bold hover:bg-muted/40">URL del Mentor</SelectItem>
                                                            {availableLandings?.map((pack: any) => (
                                                              pack.aiContent?.landings?.map((l: any, vIdx: number) => (
                                                                <SelectItem key={`${pack.id}-${vIdx}`} value={`${pack.id}-${vIdx}`} className="text-[10px] uppercase font-bold hover:bg-muted/40">
                                                                  🎯 {pack.title || 'Pack'}: {l.marketingName || `Variante ${vIdx + 1}`}
                                                                </SelectItem>
                                                              ))
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
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
                                                    />
                                                  )}
                                                </div>
                                                <div className="lg:col-span-5 p-6 md:p-8 bg-muted/20 border-t lg:border-t-0 lg:border-l border-border">
                                                  <div className="sticky top-0">
                                                    <SocialLivePreview social={s} tokens={blueprintData?.assets?.socials?.[globalIdx]?.designTokens || s.designTokens} adn={dynamicAdns[s.production_notes?.adn || '01'] || dynamicAdns['01']} />
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

                                                    // 2. Limpieza de estado
                                                    updateAsset('socials', globalIdx, 'production_notes', {
                                                      ...(s.production_notes || {}),
                                                      audio_url: null,
                                                      audio_filename: null,
                                                      audio_duration: null,
                                                      isLocked: true
                                                    });

                                                    // 3. Vaciar el desglose para que quede sellado
                                                    updateAsset('socials', globalIdx, 'slides', []);

                                                    toast({ title: 'Pieza Sellada', description: 'Archivos temporales purgados. Pieza lista para publicar.' });
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
          })()}
        </TabsContent>

        <TabsContent value="ads">
          <Tabs value={activeAdsIdx.toString()} onValueChange={v => setActiveAdsIdx(parseInt(v))}>
            <TabsList className="bg-muted/40 p-1.5 h-12 justify-start gap-1 rounded-xl mb-10 border border-border w-fit">
              {generatedAssets?.ads?.map((a: any, i: number) => (
                <TabsTrigger key={i} value={i.toString()} className="px-8 h-9 font-black text-[10px] tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground hover:text-foreground">
                  {a.marketingName || `Ads ${i + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>
            {generatedAssets?.ads?.map((a: any, aIdx: number) => (
              <TabsContent key={aIdx} value={aIdx.toString()} className="grid lg:grid-cols-2 gap-12">
                <div className="flex flex-wrap items-center justify-between gap-4 lg:col-span-2">
                  <div>
                    <h3 className="font-black text-2xl text-foreground uppercase tracking-tighter">Anuncio {aIdx + 1}</h3>
                    <p className="text-xs text-muted-foreground font-medium">Generá los titulares, descripciones y keywords individualmente con IA.</p>
                  </div>
                  <Button
                    onClick={() => handleGenerateAds(a, aIdx)}
                    disabled={isGeneratingBreakdown === `ads-${aIdx}`}
                    className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold gap-2"
                  >
                    {isGeneratingBreakdown === `ads-${aIdx}` ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redactando...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> Generar con IA</>
                    )}
                  </Button>
                </div>
                <Card className="p-12 rounded-lg bg-white border border-border space-y-10">
                  <h3 className="font-black text-2xl text-foreground uppercase tracking-tighter">Títulos</h3>
                  <div className="space-y-6">
                    {a.headlines?.map((h: string, i: number) => (
                      <Input key={i} value={h} onChange={e => updateAsset('ads', aIdx, 'headlines', e.target.value, i)} className="font-bold h-16 bg-white border-border text-foreground px-8" />
                    ))}
                  </div>
                </Card>
                <Card className="p-12 rounded-lg bg-white border border-border space-y-10">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-2xl text-foreground uppercase tracking-tighter">Descripciones</h3>
                    <div className="w-64">
                      <Select
                        value={a.landingId || 'mentor'}
                        onValueChange={(val) => updateAsset('ads', aIdx, 'landingId', val)}
                      >
                        <SelectTrigger className="h-10 bg-white border-border text-[9px] font-black uppercase text-foreground tracking-widest">
                          <div className="flex items-center gap-2">
                            <Link2 className="h-3.5 w-3.5" />
                            <span>Link: <SelectValue placeholder="Destino" /></span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white border-border text-foreground">
                          <SelectItem value="mentor" className="text-[10px] uppercase font-bold hover:bg-muted/40">URL del Mentor</SelectItem>
                          {availableLandings?.map((pack: any) => (
                            pack.aiContent?.landings?.map((l: any, vIdx: number) => (
                              <SelectItem key={`${pack.id}-${vIdx}`} value={`${pack.id}-${vIdx}`} className="text-[10px] uppercase font-bold hover:bg-muted/40">
                                🎯 {pack.title || 'Pack'}: {l.marketingName || `Variante ${vIdx + 1}`}
                              </SelectItem>
                            ))
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-8">
                    {a.descriptions?.map((d: string, i: number) => (
                      <Textarea key={i} value={d} onChange={e => updateAsset('ads', aIdx, 'descriptions', e.target.value, i)} className="min-h-[140px] bg-white border-border text-foreground p-8" />
                    ))}
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>
      {/* Selector de Landing Base */}
      <Dialog open={landingSelectorState?.open || false} onOpenChange={(val) => { if (!val) setLandingSelectorState(null); }}>
        <DialogContent className="max-w-md w-full p-6 bg-white border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground uppercase tracking-widest">Elegir Base de Venta</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Tienes varias Landings generadas. Selecciona de cuál de ellas quieres extraer la lógica de ventas (títulos, beneficios) para guiar la IA al generar este contenido.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            {generatedAssets?.landings?.map((l: any, i: number) => (
              <Button
                key={i}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-1 justify-start border-border text-left hover:bg-muted/50 transition-colors"
                onClick={() => {
                  const state = landingSelectorState;
                  setLandingSelectorState(null);
                  if (state) {
                    handleGenerateBreakdown(state.variant, state.index, state.channel, i);
                  }
                }}
              >
                <span className="font-bold text-foreground text-sm uppercase tracking-wider">{l.marketingName || `Variante ${i + 1}`}</span>
                <span className="text-xs text-muted-foreground line-clamp-1 italic">{l.headline}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
