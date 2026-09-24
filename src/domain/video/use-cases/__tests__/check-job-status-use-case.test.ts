import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CheckJobStatusUseCase } from '../check-job-status-use-case';
import { IVideoJobRepository } from '../generate-video-use-case';

const mockRepo: IVideoJobRepository = {
  createJob: vi.fn(),
  updateJob: vi.fn(),
  getJob: vi.fn()
};

describe('CheckJobStatusUseCase', () => {
  let useCase: CheckJobStatusUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useCase = new CheckJobStatusUseCase(mockRepo);
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debe devolver null si el job no existe', async () => {
    vi.mocked(mockRepo.getJob).mockResolvedValueOnce(null);

    const result = await useCase.execute('job_inexistente');
    expect(result).toBeNull();
  });

  it('debe devolver el estado sin demora si está completado', async () => {
    vi.mocked(mockRepo.getJob).mockResolvedValueOnce({
      jobId: 'job_1',
      uid: 'user_1',
      role: 'alumno',
      status: 'completed',
      progress: 100,
      stage: 'Listo',
      engine: 'omni',
      branch: 'B',
      format: '16:9',
      adnId: '01',
      cursoId: 'curso_1',
      marketingName: 'video',
      sceneCount: 1,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    });

    const promise = useCase.execute('job_1');
    const result = await promise;

    expect(result?.status).toBe('completed');
  });
  
  it('debe retrasar la respuesta 3 segundos si está procesando (HACK Firebase App Hosting)', async () => {
    vi.mocked(mockRepo.getJob).mockResolvedValueOnce({
      jobId: 'job_1',
      uid: 'user_1',
      role: 'alumno',
      status: 'processing',
      progress: 10,
      stage: 'Procesando',
      engine: 'omni',
      branch: 'B',
      format: '16:9',
      adnId: '01',
      cursoId: 'curso_1',
      marketingName: 'video',
      sceneCount: 1,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    });

    const promise = useCase.execute('job_1');
    
    // Resolvemos las promesas pendientes y luego avanzamos el tiempo
    await Promise.resolve();
    vi.advanceTimersByTime(3000);
    
    const result = await promise;
    expect(result?.status).toBe('processing');
  });
});
