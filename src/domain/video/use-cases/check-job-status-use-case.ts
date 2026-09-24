import { IVideoJobRepository } from './generate-video-use-case';

export class CheckJobStatusUseCase {
  constructor(private readonly videoJobRepo: IVideoJobRepository) {}

  public async execute(jobId: string) {
    const job = await this.videoJobRepo.getJob(jobId);
    if (!job) {
      return null;
    }

    // HACK: Firebase App Hosting (Cloud Run) asfixia el CPU a 0 cuando no hay peticiones activas.
    // Como el renderizado ocurre en segundo plano (Fire & Forget), necesitamos mantener el contenedor "despierto".
    // Al hacer que este endpoint de polling demore 3 segundos en responder, le obligamos al servidor
    // a mantener el CPU asignado al 100%, permitiendo que FFmpeg trabaje a máxima velocidad.
    if (job.status === 'processing' || job.status === 'pending') {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return {
      success: true,
      jobId,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      result: job.result || null,
      error: job.error || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
