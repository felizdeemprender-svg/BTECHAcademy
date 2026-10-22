import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/mentor-auth', () => ({
  authenticateCaller: vi.fn(),
}));

const mockRepo = {
  findById: vi.fn(),
  findBySlug: vi.fn(),
  findByOwnerId: vi.fn(),
  save: vi.fn(),
  listTutors: vi.fn(),
  getTutorBinding: vi.fn(),
  saveTutorBinding: vi.fn(),
  removeTutorBinding: vi.fn(),
  updateUsage: vi.fn(),
};

vi.mock('@/data/firestore/company-repo', () => {
  return {
    FirestoreCompanyRepository: class {
      findById = (...args: any[]) => mockRepo.findById(...args);
      findBySlug = (...args: any[]) => mockRepo.findBySlug(...args);
      findByOwnerId = (...args: any[]) => mockRepo.findByOwnerId(...args);
      save = (...args: any[]) => mockRepo.save(...args);
      listTutors = (...args: any[]) => mockRepo.listTutors(...args);
      getTutorBinding = (...args: any[]) => mockRepo.getTutorBinding(...args);
      saveTutorBinding = (...args: any[]) => mockRepo.saveTutorBinding(...args);
      removeTutorBinding = (...args: any[]) => mockRepo.removeTutorBinding(...args);
      updateUsage = (...args: any[]) => mockRepo.updateUsage(...args);
    },
  };
});

const mockWhereQuery = {
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
};

vi.mock('@/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      ...mockWhereQuery,
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
        set: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      })),
    })),
    collectionGroup: vi.fn(() => mockWhereQuery),
  },
}));

describe('API Route /api/company', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleCompany = {
    id: 'comp_1',
    name: 'BTECH Corp',
    slug: 'btech-corp',
    ownerId: 'owner_123',
    subscription: {
      planId: 'plan_corp',
      status: 'active',
      limits: { maxTutors: 5, maxStudents: 100 },
      currentUsage: { tutorsCount: 1, studentsCount: 20 },
    },
  };

  it('GET devuelve 401 si no está autenticado', async () => {
    const { authenticateCaller } = await import('@/lib/api/mentor-auth');
    (authenticateCaller as any).mockResolvedValue(null);

    const { GET } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/company');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('GET devuelve 200 con la empresa del owner', async () => {
    const { authenticateCaller } = await import('@/lib/api/mentor-auth');
    (authenticateCaller as any).mockResolvedValue({ uid: 'owner_123', isAdmin: false });

    mockRepo.findByOwnerId.mockResolvedValue(sampleCompany);

    const { GET } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/company');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('BTECH Corp');
  });

  it('POST crea una nueva empresa y devuelve 201', async () => {
    const { authenticateCaller } = await import('@/lib/api/mentor-auth');
    (authenticateCaller as any).mockResolvedValue({ uid: 'owner_new', isAdmin: false });

    mockRepo.findBySlug.mockResolvedValue(null);
    mockRepo.findByOwnerId.mockResolvedValue(null);
    mockRepo.save.mockImplementation(async (c) => c);

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/company', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Nueva Academia',
        slug: 'nueva-academia',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.slug).toBe('nueva-academia');
  });
});

describe('API Route /api/company/tutors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleCompany = {
    id: 'comp_1',
    ownerId: 'owner_123',
    subscription: {
      status: 'active',
      limits: { maxTutors: 2, maxStudents: 50 },
      currentUsage: { tutorsCount: 1, studentsCount: 10 },
    },
  };

  it('GET lista los tutores de la empresa', async () => {
    const { authenticateCaller } = await import('@/lib/api/mentor-auth');
    (authenticateCaller as any).mockResolvedValue({ uid: 'owner_123', isAdmin: false });

    mockRepo.findByOwnerId.mockResolvedValue(sampleCompany);
    mockRepo.listTutors.mockResolvedValue([
      { tutorId: 'tutor_a', displayName: 'Prof. Ana', status: 'active' },
    ]);

    const { GET } = await import('../tutors/route');
    const req = new NextRequest('http://localhost:9002/api/company/tutors');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(1);
    expect(json.data[0].displayName).toBe('Prof. Ana');
  });

  it('POST rechaza con 400 si el correo no pertenece al dominio Google (@gmail.com)', async () => {
    const { authenticateCaller } = await import('@/lib/api/mentor-auth');
    (authenticateCaller as any).mockResolvedValue({ uid: 'owner_123', isAdmin: false });

    mockRepo.findByOwnerId.mockResolvedValue(sampleCompany);
    mockRepo.findById.mockResolvedValue(sampleCompany);

    const { POST } = await import('../tutors/route');
    const req = new NextRequest('http://localhost:9002/api/company/tutors', {
      method: 'POST',
      body: JSON.stringify({
        email: 'docente@outlook.com',
        displayName: 'Docente Outlook',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('@gmail.com');
  });

  it('POST invita a un tutor y devuelve 201', async () => {
    const { authenticateCaller } = await import('@/lib/api/mentor-auth');
    (authenticateCaller as any).mockResolvedValue({ uid: 'owner_123', isAdmin: false });

    mockRepo.findByOwnerId.mockResolvedValue(sampleCompany);
    mockRepo.findById.mockResolvedValue(sampleCompany);
    mockRepo.getTutorBinding.mockResolvedValue(null);
    mockRepo.saveTutorBinding.mockImplementation(async (_cid, b) => b);

    const { POST } = await import('../tutors/route');
    const req = new NextRequest('http://localhost:9002/api/company/tutors', {
      method: 'POST',
      body: JSON.stringify({
        email: 'docente.carlos@gmail.com',
        displayName: 'Docente Carlos',
        permissions: {
          canCreateCourses: true,
          canCreatePrograms: false,
          canManageStudents: true,
          canAccessMarketing: false,
        },
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.displayName).toBe('Docente Carlos');
  });

  it('POST rechaza con 409 si el correo ya existe en el sistema', async () => {
    const { authenticateCaller } = await import('@/lib/api/mentor-auth');
    (authenticateCaller as any).mockResolvedValue({ uid: 'owner_123', isAdmin: false });

    mockRepo.findByOwnerId.mockResolvedValue(sampleCompany);
    mockRepo.findById.mockResolvedValue(sampleCompany);

    // Simular que el usuario ya existe en Firestore users
    mockWhereQuery.get.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'user_existing_id' }],
    });

    const { POST } = await import('../tutors/route');
    const req = new NextRequest('http://localhost:9002/api/company/tutors', {
      method: 'POST',
      body: JSON.stringify({
        email: 'docente.existente@gmail.com',
        displayName: 'Docente Existente',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('ya se encuentra registrado en el sistema');
  });

  it('POST rechaza con 409 si el tutor ya está vinculado a otra empresa', async () => {
    const { authenticateCaller } = await import('@/lib/api/mentor-auth');
    (authenticateCaller as any).mockResolvedValue({ uid: 'owner_123', isAdmin: false });

    mockRepo.findByOwnerId.mockResolvedValue(sampleCompany);
    mockRepo.findById.mockResolvedValue(sampleCompany);

    // users no lo tiene, pero collectionGroup('tutors') sí
    mockWhereQuery.get
      .mockResolvedValueOnce({ empty: true, docs: [] }) // users
      .mockResolvedValueOnce({ empty: false, docs: [{ id: 'tutor_in_other_comp' }] }); // collectionGroup

    const { POST } = await import('../tutors/route');
    const req = new NextRequest('http://localhost:9002/api/company/tutors', {
      method: 'POST',
      body: JSON.stringify({
        email: 'docente.otraempresa@gmail.com',
        displayName: 'Docente En Otra Empresa',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('ya pertenece o está vinculado a otra empresa');
  });
});
