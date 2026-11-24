'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Download,
  Lock,
  Palette,
  Globe
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
import { generateVariantContent } from '@/ai/flows/generate-variant-content';
import { generateEmailContent } from '@/ai/flows/generate-email-content';
import { generateAdsContent } from '@/ai/flows/generate-ads-content';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';
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
import { OptimizedValidationReport } from './editor/OptimizedValidationReport';
import { EmailChannelEditor } from './editor/EmailChannelEditor';
import { AdsChannelEditor } from './editor/AdsChannelEditor';
import { LandingSelectorDialog } from './editor/LandingSelectorDialog';
import { SocialChannelEditor } from './editor/SocialChannelEditor';
import { useGoogleDriveAuth } from './editor/useGoogleDriveAuth';

interface TemplateEditorProps {
  campaignTitle?: string;
  targetAudience?: string;
  coordinationPlan?: any;
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
  updateAsset: (channel: 'landings' | 'emails' | 'socials' | 'ads', variantIdx: number, field: string, value: any, subIndex?: number) => void;
  loading: boolean;
  onSave: (overrideAssets?: any, silentAutoSave?: boolean) => void;
  templateDirectives?: string;
  campaignMission?: string;
  adns?: Record<string, any>;
  availableLandings?: any[] | null;
}

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
  coordinationPlan,
  adns = {},
  availableLandings = [],
}: TemplateEditorProps) {
  // ADNs cargados desde el componente padre (page.tsx) para evitar ReferenceError
  const dynamicAdns = adns;

  const normalizedLandingsList: { id: string; title: string; url: string }[] = useMemo(() => {
    const list: { id: string; title: string; url: string }[] = [];
    if (Array.isArray(availableLandings)) {
      availableLandings.forEach((pack: any) => {
        if (pack.aiContent?.landings?.length) {
          pack.aiContent.landings.forEach((l: any, vIdx: number) => {
            list.push({
              id: `${pack.id}-${vIdx}`,
              title: l.marketingName || `${pack.title || 'Landing'} (Variante ${vIdx + 1})`,
              url: `/v/${pack.id}?v=${vIdx}`
            });
          });
        } else if (pack.id) {
          list.push({
            id: pack.id,
            title: pack.title || pack.slug || `Landing ${pack.id.substring(0, 8)}`,
            url: `/v/${pack.id}`
          });
        }
      });
    }
    if (list.length === 0 && selectedCourseId) {
      const courseMatch = courses?.find(c => c.id === selectedCourseId);
      list.push({
        id: selectedCourseId,
        title: courseMatch?.title || 'Landing del Asistente',
        url: `/v/${selectedCourseId}`
      });
    }
    return list;
  }, [availableLandings, selectedCourseId, courses]);

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
  const { googleToken, setGoogleToken, ensureGoogleToken } = useGoogleDriveAuth();
  const [showFullReport, setShowFullReport] = useState(false);
  const [landingSelectorState, setLandingSelectorState] = useState<{ open: boolean, variant: any, index: number, channel: any } | null>(null);
  const { toast } = useToast();

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
    const slides = (s.slides && s.slides.length > 0) ? s.slides : ((s.scenes && s.scenes.length > 0) ? s.scenes : []);
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
      const currentSocial = generatedAssets?.socials?.[sIdx] || s;
      const pNotes = currentSocial.production_notes || s.production_notes || {};
      const selectedCourse = courses?.find((c: any) => c.id === selectedCourseId);
      const effectivePalette = resolveVideoBrandPalette(
        pNotes.brandPaletteId,
        pNotes.brandColors,
        profile,
        selectedCourse
      );
      const resolvedBrandColors = effectivePalette ? {
        name: effectivePalette.name,
        primary: effectivePalette.primary,
        secondary: effectivePalette.secondary,
        accent: effectivePalette.accent,
        outline: effectivePalette.outline
      } : (pNotes.brandColors || null);
      
      const resolvedScenes = await Promise.all(slides.map(async (sl: any, i: number) => {
        let imageUrl = sl.imageUrl || '';
        if (imageUrl.startsWith('data:')) {
          const blob = await fetch(imageUrl).then(r => r.blob());
          const snap = await uploadBytes(ref(storage, `courses/${selectedCourseId}/assets/slide_${sIdx}_${i}_${Date.now()}.jpg`), blob);
          imageUrl = await getDownloadURL(snap.ref);
        }
        return {
          imageUrl,
          text: sl.text || '',
          subtitle: sl.subtitle || '',
          watermark: sl.watermark || pNotes.watermark_text || '@felizdeemprender',
          voiceover: sl.voiceover || '',
          segment_label: sl.segment || 'VALOR',
          duration: Math.max(Number(sl.duration) || 4.5, 2.5)
        };
      }));
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
          brandPaletteId: pNotes.brandPaletteId || 'adn',
          brandColors: resolvedBrandColors,
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
            toast({ title: 'Video Listo ', description: 'El video ya está disponible en tu panel.' });
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
    const courseId = selectedCourseId || 'global';
    const jobId = `job_${courseId}_${sIdx}_${Date.now()}`;

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
      const currentSocial = generatedAssets?.socials?.[sIdx] || s;
      const pNotes = currentSocial.production_notes || s.production_notes || {};
      const selectedCourse = courses?.find((c: any) => c.id === selectedCourseId);
      const effectivePalette = resolveVideoBrandPalette(
        pNotes.brandPaletteId,
        pNotes.brandColors,
        profile,
        selectedCourse
      );
      const resolvedBrandColors = effectivePalette ? {
        name: effectivePalette.name,
        primary: effectivePalette.primary,
        secondary: effectivePalette.secondary,
        accent: effectivePalette.accent,
        outline: effectivePalette.outline
      } : (pNotes.brandColors || null);

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
          scenes: (s.slides && s.slides.length > 0) ? s.slides : ((s.scenes && s.scenes.length > 0) ? s.scenes : []),
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
            toast({ title: 'Video IA Listo ', description: 'El clip generado con IA ya está disponible.' });
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

    setIsRenderingVideo(`${sIdx}`);
    setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'En cola...' } }));

    try {
      const accessToken = await ensureGoogleToken();
      if (!accessToken) throw new Error('Se requiere acceso a Drive para guardar el video.');

      const formato = mapAssetTypeToFormato(s.type);
      const currentSocial = generatedAssets?.socials?.[sIdx] || s;
      const pNotes = currentSocial.production_notes || s.production_notes || {};
      const selectedCourse = courses?.find((c: any) => c.id === selectedCourseId);
      const effectivePalette = resolveVideoBrandPalette(
        pNotes.brandPaletteId,
        pNotes.brandColors,
        profile,
        selectedCourse
      );
      const resolvedBrandColors = effectivePalette ? {
        name: effectivePalette.name,
        primary: effectivePalette.primary,
        secondary: effectivePalette.secondary,
        accent: effectivePalette.accent,
        outline: effectivePalette.outline
      } : (pNotes.brandColors || null);
      const slides = s.slides || s.scenes || [];

      // Escenas reales tal como las editó el usuario (multi-escena)
      const scenes = slides.map((sl: any) => ({
        segment: sl.segment || sl.segment_label || 'VALOR',
        text: sl.text || '',
        subtitle: sl.subtitle || '',
        voiceover: sl.voiceover || '',
        watermark: sl.watermark || '',
        imageUrl: sl.imageUrl || '',
        duration: Math.max(Number(sl.duration) || 4.5, 2.5)
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
            toast({ title: 'Video Largo Listo ', description: `El video de ${result.durationSeconds || ''}s ya está disponible.` });
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

    setIsRenderingVideo(`${sIdx}`);
    setJobProgress(prev => ({ ...prev, [sIdx]: { progress: 0, stage: 'Redactando prompt especializado...' } }));

    try {
      const formato = mapAssetTypeToFormato(s.type);
      const currentSocial = generatedAssets?.socials?.[sIdx] || s;
      const pNotes = currentSocial.production_notes || s.production_notes || {};
      const selectedCourse = courses?.find((c: any) => c.id === selectedCourseId);
      const effectivePalette = resolveVideoBrandPalette(
        pNotes.brandPaletteId,
        pNotes.brandColors,
        profile,
        selectedCourse
      );
      const resolvedBrandColors = effectivePalette ? {
        name: effectivePalette.name,
        primary: effectivePalette.primary,
        secondary: effectivePalette.secondary,
        accent: effectivePalette.accent,
        outline: effectivePalette.outline
      } : (pNotes.brandColors || null);
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
        duration: Math.max(Number(sl.duration) || 4.5, 2.5)
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

            toast({ title: 'Prompt Listo ', description: `${perScene.length > 1 ? `${perScene.length} escenas listas. ` : ''}Copialo en ${exportEngine.toUpperCase()} (o el editor que uses).` });
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
    const slides = (s.slides && s.slides.length > 0) ? s.slides : ((s.scenes && s.scenes.length > 0) ? s.scenes : []);
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
        : '\n\n== NOTA PARA LA IA ==\nATENCIÓN: No hay una Landing Page asociada. Se tomará como referencia la descripción del curso. Ten en cuenta que las landings tienen mejor definición para la generación de este contenido, por lo que debes inferir agresivamente un ángulo de ventas directo basándote en la información general del curso.';
        
      const effectiveAdnId = variant.production_notes?.adnId || variant.adnId || '01_CINEMA';
      const variantWithAdn = {
        ...variant,
        adnId: effectiveAdnId,
        production_notes: {
          ...(variant.production_notes || {}),
          adnId: effectiveAdnId
        }
      };

      const mentorUid = profile?.uid || (courses?.find((c: any) => c.id === selectedCourseId) as any)?.mentorId || '';
      const mentorRole = profile?.role || (profile?.isMentor ? 'mentor' : (profile?.isAdmin ? 'admin' : 'mentor'));
      const pieceLanguage = variant.language || coordinationPlan?.language || courses?.find((c: any) => c.id === selectedCourseId)?.language || 'es-AR';

      const breakdown = await generateVariantContent(
        variantWithAdn, 
        realDirectives, 
        selectedCourse?.title || '', 
        selectedCourse?.description || '', 
        selectedCourse?.targetAudience || '', 
        (campaignMission as any) || 'venta',
        landingContext,
        undefined,
        mentorUid,
        mentorRole,
        pieceLanguage
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
          duration: Math.max(Number(s.duration) || 4.5, 2.5),
          imageUrl: (s.imageUrl?.startsWith('http') ? s.imageUrl : '') || variant.slides?.[i]?.imageUrl || '',
          subject_action: s.subject_action || '',
          camera_movement: s.camera_movement || '',
          framing: s.framing || '',
          lighting: s.lighting || ''
        }));
        const newSocials = [...generatedAssets.socials];
        newSocials[index] = { 
          ...newSocials[index], 
          adnId: effectiveAdnId,
          language: pieceLanguage,
          production_notes: {
            ...(newSocials[index]?.production_notes || {}),
            adnId: effectiveAdnId
          },
          slides: mappedScenes, 
          scenes: mappedScenes,
          hook: breakdown.hook, 
          caption: breakdown.caption 
        };
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
      const mentorUid = profile?.uid || (courses?.find((c: any) => c.id === selectedCourseId) as any)?.mentorId || '';
      const mentorRole = profile?.role || (profile?.isMentor ? 'mentor' : (profile?.isAdmin ? 'admin' : 'mentor'));

      const emailBreakdown = await generateEmailContent({
        variant: email,
        directives: realDirectives,
        courseTitle: selectedCourse?.title || '',
        courseDescription: selectedCourse?.description || '',
        targetAudience: selectedCourse?.targetAudience || '',
        mentorName: profile?.profile?.fullName || profile?.profile?.firstName || profile?.displayName || 'Mentor Experto',
        mentorBio: profile?.profile?.bio,
        mentorSocials: profile?.profile?.socials,
        mission: (campaignMission as any) || 'venta',
        uid: mentorUid,
        role: mentorRole
      });
      const newEmails = [...(generatedAssets?.emails || [])];
      newEmails[eIdx] = {
        ...newEmails[eIdx],
        marketingName: emailBreakdown.marketingName || email.marketingName,
        subject: emailBreakdown.subject,
        preheader: emailBreakdown.preheader,
        body: emailBreakdown.body
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
      const mentorUid = profile?.uid || (courses?.find((c: any) => c.id === selectedCourseId) as any)?.mentorId || '';
      const mentorRole = profile?.role || (profile?.isMentor ? 'mentor' : (profile?.isAdmin ? 'admin' : 'mentor'));

      const adBreakdown = await generateAdsContent({
        variant: ad,
        directives: realDirectives,
        courseTitle: selectedCourse?.title || '',
        courseDescription: selectedCourse?.description || '',
        targetAudience: selectedCourse?.targetAudience || '',
        mentorName: profile?.profile?.fullName || profile?.profile?.firstName || profile?.displayName || 'Mentor Experto',
        mission: (campaignMission as any) || 'venta',
        uid: mentorUid,
        role: mentorRole
      });
      const newAds = [...(generatedAssets?.ads || [])];
      newAds[aIdx] = {
        ...newAds[aIdx],
        marketingName: adBreakdown.marketingName || ad.marketingName,
        headlines: adBreakdown.headlines,
        descriptions: adBreakdown.descriptions,
        keywords: adBreakdown.keywords
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
      <Tabs defaultValue="social" className="w-full">

        <TabsContent value="email">
          <EmailChannelEditor
            emails={generatedAssets?.emails || []}
            activeEmailIdx={activeEmailIdx}
            setActiveEmailIdx={setActiveEmailIdx}
            normalizedLandingsList={normalizedLandingsList}
            isGeneratingBreakdown={isGeneratingBreakdown}
            onGenerateEmail={handleGenerateEmail}
            updateAsset={updateAsset}
          />
        </TabsContent>

        <TabsContent value="social">
          <SocialChannelEditor
            generatedAssets={generatedAssets}
            updateAsset={updateAsset}
            onSave={onSave}
            dynamicAdns={dynamicAdns}
            newPieceConfig={newPieceConfig}
            setNewPieceConfig={setNewPieceConfig}
            showSocialConfigurator={showSocialConfigurator}
            setShowSocialConfigurator={setShowSocialConfigurator}
            handleDownloadVideo={handleDownloadVideo}
            isRenderingVideo={isRenderingVideo}
            renderedVideos={renderedVideos}
            jobProgress={jobProgress}
            isGeneratingBreakdown={isGeneratingBreakdown}
            handleGenerateBreakdown={handleGenerateBreakdown}
            handleGenerateVideo={handleGenerateVideo}
            handleGenerateVideoIA={handleGenerateVideoIA}
            handleGenerateLongVideo={handleGenerateLongVideo}
            handleGeneratePrompt={handleGeneratePrompt}
            handleDeleteVideo={handleDeleteVideo}
            handleGeneratePdf={handleGeneratePdf}
            handleDeletePdf={handleDeletePdf}
            isGeneratingPdf={isGeneratingPdf}
            selectedCourseId={selectedCourseId}
            courses={courses}
            allTags={allTags}
            coordinationPlan={coordinationPlan}
            blueprintData={blueprintData}
            googleToken={googleToken}
            ensureGoogleToken={ensureGoogleToken}
            normalizedLandingsList={normalizedLandingsList}
            profile={profile}
          />
        </TabsContent>

        <TabsContent value="ads">
          <AdsChannelEditor
            ads={generatedAssets?.ads || []}
            activeAdsIdx={activeAdsIdx}
            setActiveAdsIdx={setActiveAdsIdx}
            normalizedLandingsList={normalizedLandingsList}
            isGeneratingBreakdown={isGeneratingBreakdown}
            onGenerateAds={handleGenerateAds}
            updateAsset={updateAsset}
          />
        </TabsContent>
      </Tabs>
      {/* Selector de Landing Base */}
      <LandingSelectorDialog
        state={landingSelectorState}
        landings={generatedAssets?.landings || []}
        onClose={() => setLandingSelectorState(null)}
        onSelect={(variant, index, channel, landingIdx) => {
          setLandingSelectorState(null);
          handleGenerateBreakdown(variant, index, channel, landingIdx);
        }}
      />
    </div>
  );
}
