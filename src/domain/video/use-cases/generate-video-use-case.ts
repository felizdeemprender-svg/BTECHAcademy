import { VideoJobRecord } from '../../../data/firestore/video-job-repo';
import { loadAdnConfig } from '@/lib/adn-utils';
import { buildVideoPrompt, buildSceneExportPrompt } from '@/lib/ai/video-prompt';
import { generateLongVideo, downloadLongVideo } from '@/lib/ai/long-video';
import { generateAvatarVideo } from '@/lib/ai/avatar';
import { uploadToDrive, getOrCreateFolder } from '@/lib/drive-utils';
import { adminDb } from '@/firebase/admin';

export type Engine = 'auto' | 'ffmpeg' | 'gemini-omni' | 'seedance' | 'avatar' | 'export' | 'long';
export type Branch = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface GenerateVideoRequest {
  cursoId: string;
  formato: string;
  avatar: boolean | 'si' | 'no';
  engine?: Engine;
  adnId?: string;
  marketingName?: string;
  googleToken?: string;
  salesPageId?: string;
  avatarProvider?: 'heygen' | 'synthesia' | 'tavus';
  exportEngine?: 'seedance' | 'veo' | 'runway' | 'pika' | 'wan';
  scenes?: Array<{
    segment?: string;
    text?: string;
    subtitle?: string;
    voiceover?: string;
    watermark?: string;
    imageUrl?: string;
    duration?: number;
  }>;
  persona?: { enabled?: boolean; description?: string };
  subtitles?: boolean;
  enable_tts?: boolean;
  voiceId?: string;
  longDuration?: number;
  isSmokeTest?: boolean;
  audioUrl?: string; // from branch B
}

const RESOLUTIONS: Record<string, string> = {
  '9:16': '1080x1920',
  '1:1': '1080x1080',
  '16:9': '1920x1080',
  '4:5': '1080x1350'
};

export interface IVideoJobRepository {
  createJob(job: VideoJobRecord): Promise<void>;
  updateJob(jobId: string, data: Partial<VideoJobRecord>): Promise<void>;
  getJob(jobId: string): Promise<VideoJobRecord | null>;
}

export class GenerateVideoUseCase {
  constructor(private readonly videoJobRepo: IVideoJobRepository) {}

  public async execute(req: GenerateVideoRequest, uid: string, role: string) {
    const avatar = req.avatar === 'si' || req.avatar === true;
    const branch = this.decideBranch(avatar, req.engine || 'auto');
    const jobId = `gen_${branch}_${Date.now()}`;

    // 1. Create Job immediately
    await this.videoJobRepo.createJob({
      jobId,
      uid,
      role,
      status: 'pending',
      progress: 0,
      stage: 'En cola...',
      engine: req.engine || 'auto',
      branch,
      format: req.formato,
      adnId: req.adnId || '01_CINEMA',
      cursoId: req.cursoId,
      marketingName: req.marketingName || 'Video',
      sceneCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 2. Fire and Forget the worker
    this.runGenerateJob(jobId, req, uid, role, branch).catch(e => {
      console.error(`[GenerateVideoUseCase] Uncaught error en job ${jobId}:`, e);
    });

    return { jobId, branch, status: 'pending' };
  }

  private decideBranch(avatar: boolean, engine: Engine): Branch {
    if (engine === 'export') return 'D';
    if (engine === 'seedance') return 'E';
    if (engine === 'long') return 'F';
    if (avatar) return 'C';
    if (engine === 'gemini-omni') return 'B';
    return 'A'; 
  }

  // Refactored async worker
  private async runGenerateJob(jobId: string, body: GenerateVideoRequest, uid: string, role: string, branch: Branch) {
    try {
      const adn = await loadAdnConfig(body.adnId || '01_CINEMA');
      const landing = await this.loadLandingData(body.cursoId, body.salesPageId);

      console.log(`[Generate] Job ${jobId}: branch ${branch} | adn ${body.adnId || '01_CINEMA'} | formato ${body.formato}`);

      switch (branch) {
        case 'A':
          await this.runBranchA(jobId, body, adn, uid, role);
          break;
        case 'B':
          await this.runBranchB(jobId, body, adn, landing, uid, role);
          break;
        case 'C':
          await this.runBranchC(jobId, body, adn, landing);
          break;
        case 'D':
          await this.runBranchD(jobId, body, adn, landing);
          break;
        case 'E':
          await this.runBranchE(jobId, body, adn, landing);
          break;
        case 'F':
          await this.runBranchF(jobId, body, adn, landing, uid, role);
          break;
      }
    } catch (err: any) {
      console.error(`[Generate] Job ${jobId} falló:`, err.message);
      await this.videoJobRepo.updateJob(jobId, { status: 'failed', stage: 'Error', error: err.message });
    }
  }

  // --- BRANCHES --- //

  private buildScenesFromAdn(adn: any, width: number, height: number) {
    return (adn.slices || []).map((s: any) => ({
      imageUrl: s.imageUrl || `https://placehold.co/${width}x${height}/1e293b/ffffff.jpg?text=Escena`,
      text: s.text || '',
      subtitle: s.subtitle || '',
      watermark: s.watermark || '',
      voiceover: s.voiceover || s.text || '',
      segment_label: s.segment_label || 'VALOR',
      duration: Number(s.duration) || 5
    }));
  }

  private async runBranchA(jobId: string, body: GenerateVideoRequest, adn: any, uid: string, role: string) {
    await this.videoJobRepo.updateJob(jobId, { status: 'processing', progress: 5, stage: 'Cargando configuración ADN...', branch: 'A' });

    const [width, height] = (RESOLUTIONS[body.formato] || '1080x1920').split('x').map(Number);
    
    // Si la request trae scenes generadas (ej. por AI), usarlas en vez de las hardcodeadas del ADN
    let scenes;
    if (body.scenes && body.scenes.length > 0) {
      scenes = body.scenes.map((s: any) => ({
        imageUrl: s.imageUrl || `https://placehold.co/${width}x${height}/1e293b/ffffff.jpg?text=Escena`,
        text: s.text || '',
        subtitle: s.subtitle || '',
        watermark: s.watermark || '',
        voiceover: s.voiceover || s.text || '',
        segment_label: s.segment_label || 'VALOR',
        duration: Number(s.duration) || 5
      }));
    } else {
      scenes = this.buildScenesFromAdn(adn, width, height);
    }

    const renderPayload = {
      jobId,
      scenes,
      resolution: RESOLUTIONS[body.formato] || '1080x1920',
      adnId: body.adnId || '01_CINEMA',
      audioUrl: body.audioUrl || adn.background_music_url,
      enable_tts: body.enable_tts !== false,
      voice_id: body.voiceId || adn.audio_engine?.voice_id || 'mateo',
      audioEffect: 'auto',
      marketingName: body.marketingName || 'EvoAssetV2',
        campaignTitle: (body as any).campaignTitle,
      googleToken: body.googleToken,
      isSmokeTest: body.isSmokeTest,
      isCarousel: false,
      salesPageId: body.salesPageId || body.cursoId,
      uid,
      role
    };

    console.log(`[GenerateVideoUseCase] Encolando FFmpeg. googleToken presente?`, !!body.googleToken);

    const origin = process.env.APP_URL || `http://127.0.0.1:9002`;
    const res = await fetch(`${origin}/api/video/render-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(renderPayload),
      signal: AbortSignal.timeout(3600000) // 1 hora de timeout para evitar UND_ERR_HEADERS_TIMEOUT
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Error al encolar render FFmpeg.');
  }

  private async runBranchB(jobId: string, body: GenerateVideoRequest, adn: any, landing: any, uid: string, role: string) {
    const { generateVideoFlow } = await import('@/ai/flows/generate-video-flow');
    try {
      await generateVideoFlow({
        jobId,
        uid,
        role,
        adn,
        scenes: body.scenes,
        formato: body.formato || '9:16',
        marketingName: body.marketingName,
        audioUrl: body.audioUrl,
        enable_tts: body.enable_tts !== false,
        isSmokeTest: body.isSmokeTest,
        googleToken: body.googleToken
      });
    } catch (err: any) {
      console.error('[Branch B Genkit] Error crítico:', err);
      await this.videoJobRepo.updateJob(jobId, { status: 'failed', progress: 0, stage: 'Error en flujo Genkit', error: err.message });
    }
  }

  private async runBranchC(jobId: string, body: GenerateVideoRequest, adn: any, landing: any) {
    await this.videoJobRepo.updateJob(jobId, { status: 'processing', progress: 5, stage: 'Preparando guion del avatar...', branch: 'C' });
    const result = await generateAvatarVideo({
      adn,
      landing,
      provider: body.avatarProvider,
      format: body.formato || '9:16'
    });
    if (result.sent) {
      await this.videoJobRepo.updateJob(jobId, { progress: 90, stage: 'Avatar generado por el proveedor...' });
    } else {
      await this.videoJobRepo.updateJob(jobId, { progress: 90, stage: 'Script-to-presenter listo (copiar/pegar en el proveedor)...' });
    }
    await this.videoJobRepo.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      stage: 'Completado',
      result: {
        script: result.script,
        provider: result.provider,
        sent: result.sent,
        videoUri: result.videoUri || null
      }
    });
  }

  private async runBranchD(jobId: string, body: GenerateVideoRequest, adn: any, landing: any) {
    await this.videoJobRepo.updateJob(jobId, { status: 'processing', progress: 30, stage: 'Redactando prompt especializado...', branch: 'D' });
    const engine = body.exportEngine || 'seedance';

    if (body.scenes && body.scenes.length > 0) {
      const result = buildSceneExportPrompt({
        adn, landing, format: body.formato || '9:16', engine, scenes: body.scenes,
        persona: body.persona, subtitles: body.subtitles, voiceId: body.voiceId, marketingName: body.marketingName
      });
      await this.videoJobRepo.updateJob(jobId, {
        status: 'completed', progress: 100, stage: 'Completado',
        result: { prompt: result.prompt, perScene: result.perScene, engine, formato: body.formato || '9:16', sceneCount: result.perScene.length }
      });
      return;
    }

    const { prompt } = await buildVideoPrompt({
      adnId: body.adnId || '01_CINEMA', landing, format: body.formato || '9:16', engine, avatar: body.avatar === 'si' || body.avatar === true
    });
    await this.videoJobRepo.updateJob(jobId, {
      status: 'completed', progress: 100, stage: 'Completado', result: { prompt, engine, formato: body.formato || '9:16' }
    });
  }

  private async runBranchE(jobId: string, body: GenerateVideoRequest, adn: any, landing: any) {
    await this.videoJobRepo.updateJob(jobId, { status: 'processing', progress: 30, stage: 'Generando prompt Seedance 2.0...', branch: 'E' });

    if (body.scenes && body.scenes.length > 0) {
      const result = buildSceneExportPrompt({
        adn, landing, format: body.formato || '9:16', engine: 'seedance', scenes: body.scenes,
        persona: body.persona, subtitles: body.subtitles, voiceId: body.voiceId, marketingName: body.marketingName
      });
      await this.videoJobRepo.updateJob(jobId, {
        status: 'completed', progress: 100, stage: 'Completado',
        result: { prompt: result.prompt, perScene: result.perScene, engine: 'seedance', formato: body.formato || '9:16', sceneCount: result.perScene.length }
      });
      return;
    }

    const { prompt } = await buildVideoPrompt({
      adnId: body.adnId || '01_CINEMA', landing, format: body.formato || '9:16', engine: 'seedance', avatar: body.avatar === 'si' || body.avatar === true
    });
    await this.videoJobRepo.updateJob(jobId, {
      status: 'completed', progress: 100, stage: 'Completado', result: { prompt, engine: 'seedance', formato: body.formato || '9:16' }
    });
  }

  private async runBranchF(jobId: string, body: GenerateVideoRequest, adn: any, landing: any, uid: string, role: string) {
    await this.videoJobRepo.updateJob(jobId, { status: 'processing', progress: 5, stage: 'Redactando prompt de video largo...', branch: 'F' });

    const scenes = (body.scenes && body.scenes.length > 0)
      ? body.scenes
      : (adn.slices || []).map((s: any) => ({
          segment: s.segment_label || 'VALOR', text: s.text || '', subtitle: s.subtitle || '',
          voiceover: s.voiceover || s.text || '', watermark: s.watermark || '', imageUrl: s.imageUrl || '', duration: Number(s.duration) || 5
        }));

    const built = buildSceneExportPrompt({
      adn, landing, format: body.formato || '9:16', engine: 'seedance', scenes,
      persona: body.persona, subtitles: body.subtitles, voiceId: body.voiceId, marketingName: body.marketingName
    });

    const totalSceneSeconds = built.totalDuration;
    const requested = body.longDuration && body.longDuration >= 4 ? body.longDuration : totalSceneSeconds;
    const durationSeconds = Math.min(Math.max(Math.round(requested), 4), 180);

    await this.videoJobRepo.updateJob(jobId, { progress: 15, stage: `Generando video largo (${durationSeconds}s, consistencia Seedance)...` });

    const result = await generateLongVideo({
      prompt: built.prompt, duration: durationSeconds, provider: 'seedance',
      resolution: body.formato === '16:9' ? '1080p' : '720p',
      aspectRatio: body.formato === '1:1' ? '1:1' : body.formato === '4:5' || body.formato === '4:3' ? '4:3' : body.formato === '16:9' ? '16:9' : '9:16',
      continuityMode: 'consistent', style: adn.description || undefined,
      imageUrls: scenes.map((s: any) => s.imageUrl).filter((u: string) => !!u && u.startsWith('http')).slice(0, 5),
      nativeAudioContinuity: true
    });

    let videoPath: string | undefined;
    if (result.videoUri) {
      videoPath = await downloadLongVideo(result.videoUri, jobId);
    }
    if (!videoPath) throw new Error('[Branch F] No se pudo obtener el video largo.');

    await this.videoJobRepo.updateJob(jobId, { progress: 80, stage: 'Subiendo video a Google Drive...' });

    const safeBaseName = (body.marketingName || 'EvoAssetV2').replace(/[^a-zA-Z0-9]/g, '_');
    let resultPayload: Record<string, any> = {};
    if (body.googleToken) {
      const rootFolderId = await getOrCreateFolder(body.googleToken, 'Fastoria');
      const campaignFolderId = await getOrCreateFolder(body.googleToken, `Pack_${safeBaseName}`, rootFolderId);
      const mainFile = await uploadToDrive(videoPath, body.googleToken, `${safeBaseName}_long_${Date.now()}.mp4`, 'video/mp4', campaignFolderId);
      resultPayload = { webViewLink: mainFile.webViewLink, driveId: mainFile.id, downloadUrl: mainFile.webContentLink };
    } else {
      resultPayload = { videoPath };
    }

    try {
      const { calculateVideoCost, deductCredits } = await import('@/lib/payments/credits');
      const isAdmin = role === 'admin';
      if (uid && !body.isSmokeTest && !isAdmin) {
        const cost = await calculateVideoCost(durationSeconds, 'omni');
        await deductCredits(uid, cost, 'video_long', role || 'alumno');
      }
    } catch (e) {
      console.error('[Branch F] Error al procesar cobro:', e);
    }

    await this.videoJobRepo.updateJob(jobId, { status: 'completed', progress: 100, stage: 'Completado', result: { ...resultPayload, durationSeconds, engine: 'long', sceneCount: scenes.length } });
  }

  // Still hits adminDb, ideally this would be injected as LandingDataRepository
  // I will refactor it to use adminDb here temporarily, or better yet, inject a DataFetcher
  private async loadLandingData(cursoId: string, salesPageId?: string) {
    const landing: Record<string, any> = { courseTitle: '' };
    try {
      if (salesPageId) {
        const sp = await adminDb.collection('salesPages').doc(salesPageId).get();
        if (sp.exists) {
          const d = sp.data()!;
          landing.courseTitle = d.title || '';
          landing.price = typeof d.price === 'number' ? d.price : undefined;
          landing.oldPrice = typeof d.oldPrice === 'number' ? d.oldPrice : undefined;
          landing.ctaText = d.ctaText || d.cta || '';
          const until = d.activeUntil;
          landing.activeUntil = until?.toDate ? until.toDate().toISOString().slice(0, 10) : (typeof until === 'string' ? until : undefined);
        }
      } else {
        const snap = await adminDb.collection('salesPages').where('courseId', '==', cursoId).where('isActive', '==', true).limit(1).get();
        if (!snap.empty) {
          const d = snap.docs[0].data();
          landing.courseTitle = d.title || '';
          landing.price = typeof d.price === 'number' ? d.price : undefined;
          landing.oldPrice = typeof d.oldPrice === 'number' ? d.oldPrice : undefined;
          landing.ctaText = d.ctaText || d.cta || '';
          const until = d.activeUntil;
          landing.activeUntil = until?.toDate ? until.toDate().toISOString().slice(0, 10) : (typeof until === 'string' ? until : undefined);
        }
      }
    } catch (e) {
      console.warn('[Generate] No se pudo leer salesPages:', e);
    }
    if (!landing.courseTitle) {
      try {
        const c = await adminDb.collection('courses').doc(cursoId).get();
        if (c.exists) landing.courseTitle = c.data()?.title || landing.courseTitle || cursoId;
      } catch {}
    }
    if (!landing.courseTitle) landing.courseTitle = cursoId;
    return landing;
  }
}



