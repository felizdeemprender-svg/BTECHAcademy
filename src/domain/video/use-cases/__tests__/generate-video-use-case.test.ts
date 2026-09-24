import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateVideoUseCase, IVideoJobRepository } from '../generate-video-use-case';

// Mocks
const mockRepo: IVideoJobRepository = {
  createJob: vi.fn(),
  updateJob: vi.fn(),
  getJob: vi.fn()
};

// Evitamos que intente leer adn-utils y ai libs en el test
vi.mock('@/lib/adn-utils', () => ({
  loadAdnConfig: vi.fn().mockResolvedValue({ slices: [] })
}));

vi.mock('@/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false })
      }),
      where: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ empty: true })
          })
        })
      })
    })
  }
}));

describe('GenerateVideoUseCase', () => {
  let useCase: GenerateVideoUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new GenerateVideoUseCase(mockRepo);
    // Espiamos el worker para no ejecutar dependencias pesadas
    vi.spyOn(useCase as any, 'runGenerateJob').mockResolvedValue(undefined);
  });

  it('debe encolar correctamente un job FFmpeg (Branch A)', async () => {
    const req = {
      cursoId: 'curso_1',
      formato: '9:16',
      avatar: 'no' as const,
      engine: 'ffmpeg' as const
    };

    const result = await useCase.execute(req, 'uid_1', 'tutor');
    
    expect(result.branch).toBe('A');
    expect(result.status).toBe('pending');
    expect(result.jobId).toContain('gen_A_');
    
    expect(mockRepo.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'uid_1',
        role: 'tutor',
        branch: 'A',
        engine: 'ffmpeg'
      })
    );
  });

  it('debe encolar correctamente un job Omni (Branch B)', async () => {
    const req = {
      cursoId: 'curso_1',
      formato: '9:16',
      avatar: false,
      engine: 'gemini-omni' as const
    };

    const result = await useCase.execute(req, 'uid_2', 'alumno');
    
    expect(result.branch).toBe('B');
    
    expect(mockRepo.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'uid_2',
        role: 'alumno',
        branch: 'B'
      })
    );
  });

  it('debe priorizar Avatar si viene en la request (Branch C)', async () => {
    const req = {
      cursoId: 'curso_1',
      formato: '9:16',
      avatar: true,
      engine: 'gemini-omni' as const
    };

    const result = await useCase.execute(req, 'uid_1', 'admin');
    
    // Si avatar es true, debe saltar a branch C aunque se pase engine omni
    expect(result.branch).toBe('C');
  });

  it('debe ir a Branch F si engine es long', async () => {
    const req = {
      cursoId: 'curso_1',
      formato: '16:9',
      avatar: false,
      engine: 'long' as const,
      longDuration: 60
    };

    const result = await useCase.execute(req, 'uid_1', 'admin');
    
    expect(result.branch).toBe('F');
  });
});
