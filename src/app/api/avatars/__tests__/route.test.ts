import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/mentor-auth', () => ({
  authenticateCaller: vi.fn(),
}));

const mockRepo = {
  listByUser: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  getById: vi.fn(),
  getDefault: vi.fn(),
};

vi.mock('@/data/firestore/avatar-repo', () => {
  return {
    FirestoreAvatarRepository: class {
      listByUser = (...args: any[]) => mockRepo.listByUser(...args);
      save = (...args: any[]) => mockRepo.save(...args);
      delete = (...args: any[]) => mockRepo.delete(...args);
      getById = (...args: any[]) => mockRepo.getById(...args);
      getDefault = (...args: any[]) => mockRepo.getDefault(...args);
    },
  };
});

describe('API Route /api/avatars', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET devuelve 401 si el usuario no está autenticado', async () => {
    const { authenticateCaller } = await import('@/lib/api/mentor-auth');
    (authenticateCaller as any).mockResolvedValue(null);

    const { GET } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/avatars');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('GET devuelve 200 con la lista de avatares del usuario autenticado', async () => {
    const { authenticateCaller } = await import('@/lib/api/mentor-auth');
    (authenticateCaller as any).mockResolvedValue({ uid: 'user-123', isAdmin: false });

    mockRepo.listByUser.mockResolvedValue([
      { id: 'avatar-1', name: 'Tomás', gender: 'male', voiceId: 'es-AR-TomasNeural', isDefault: true },
    ]);

    const { GET } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/avatars');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(1);
    expect(mockRepo.listByUser).toHaveBeenCalledWith('user-123');
  });

  it('POST crea un nuevo avatar con validación de esquema', async () => {
    const { authenticateCaller } = await import('@/lib/api/mentor-auth');
    (authenticateCaller as any).mockResolvedValue({ uid: 'user-123', isAdmin: false });

    mockRepo.save.mockImplementation(async (_uid: string, avatar: any) => avatar);

    const { POST } = await import('../route');
    const newAvatarPayload = {
      name: 'Elena',
      role: 'Educadora',
      gender: 'female',
      language: 'es',
      accent: 'AR',
      voiceProvider: 'edge-tts',
      voiceId: 'es-AR-ElenaNeural',
      imageUrl: '/avatars/avatar_chroma_female.jpg',
      imageSource: 'ai-generated',
      isDefault: false,
    };

    const req = new NextRequest('http://localhost:9002/api/avatars', {
      method: 'POST',
      body: JSON.stringify(newAvatarPayload),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Elena');
    expect(json.data.userId).toBe('user-123');
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('PUT actualiza avatar existente y retorna 200', async () => {
    const { authenticateCaller } = await import('@/lib/api/mentor-auth');
    (authenticateCaller as any).mockResolvedValue({ uid: 'user-123', isAdmin: false });

    mockRepo.save.mockImplementation(async (_uid: string, avatar: any) => avatar);

    const { PUT } = await import('../route');
    const updatePayload = {
      id: 'avatar-1',
      name: 'Tomás Actualizado',
      gender: 'male',
      language: 'es',
      accent: 'AR',
      voiceProvider: 'edge-tts',
      voiceId: 'es-AR-TomasNeural',
      imageUrl: '/avatars/avatar_chroma_male.jpg',
      imageSource: 'ai-generated',
      isDefault: true,
    };

    const req = new NextRequest('http://localhost:9002/api/avatars', {
      method: 'PUT',
      body: JSON.stringify(updatePayload),
    });
    const res = await PUT(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Tomás Actualizado');
  });

  it('DELETE elimina avatar y retorna 200', async () => {
    const { authenticateCaller } = await import('@/lib/api/mentor-auth');
    (authenticateCaller as any).mockResolvedValue({ uid: 'user-123', isAdmin: false });

    mockRepo.delete.mockResolvedValue({ deleted: true, newDefaultId: 'avatar-2' });

    const { DELETE } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/avatars?id=avatar-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.deleted).toBe(true);
    expect(mockRepo.delete).toHaveBeenCalledWith('user-123', 'avatar-1');
  });
});
