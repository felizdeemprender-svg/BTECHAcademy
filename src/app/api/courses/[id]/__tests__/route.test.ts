import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const {
  mockResolveGateway,
  mockHandleUpdateCourse,
  mockHandleDeleteCourse,
  mockHandlePublishCourse,
  mockAuthenticateCaller,
} = vi.hoisted(() => ({
  mockResolveGateway: vi.fn().mockResolvedValue({}),
  mockHandleUpdateCourse: vi.fn(),
  mockHandleDeleteCourse: vi.fn(),
  mockHandlePublishCourse: vi.fn(),
  mockAuthenticateCaller: vi.fn(),
}));

vi.mock('@/lib/api/gateway', () => ({
  resolveGateway: mockResolveGateway,
}));

vi.mock('@/lib/api/catalog-handlers', () => ({
  handleUpdateCourse: mockHandleUpdateCourse,
  handleDeleteCourse: mockHandleDeleteCourse,
  handlePublishCourse: mockHandlePublishCourse,
}));

vi.mock('@/lib/api/mentor-auth', () => ({
  authenticateCaller: mockAuthenticateCaller,
}));

vi.mock('@/firebase/admin', () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: vi.fn().mockResolvedValue({ data: () => ({ roles: ['tutor'] }) }),
      }),
    }),
  },
}));

import { PUT, DELETE } from '../route';
import { POST as PUBLISH_POST } from '../publish/route';

describe('API Routes /api/courses/[id] & /publish (Next.js 15 async params)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PUT /api/courses/[id] resuelve params como Promise y delega a handleUpdateCourse', async () => {
    mockHandleUpdateCourse.mockResolvedValueOnce(
      NextResponse.json({ ok: true, id: 'course-123' }, { status: 200 }),
    );

    const req = new NextRequest('http://localhost:9002/api/courses/course-123', {
      method: 'PUT',
      body: JSON.stringify({
        mentorId: 'mentor-1',
        title: 'Curso Actualizado',
        thumbnailPrompt: 'Prompt personalizado de portada',
      }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: 'course-123' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe('course-123');
    expect(mockHandleUpdateCourse).toHaveBeenCalledWith(
      expect.anything(),
      'course-123',
      expect.objectContaining({
        title: 'Curso Actualizado',
        thumbnailPrompt: 'Prompt personalizado de portada',
      }),
    );
  });

  it('DELETE /api/courses/[id] resuelve params como Promise y delega a handleDeleteCourse', async () => {
    mockHandleDeleteCourse.mockResolvedValueOnce(
      NextResponse.json({ deleted: true }, { status: 200 }),
    );

    const req = new NextRequest('http://localhost:9002/api/courses/course-456', {
      method: 'DELETE',
      body: JSON.stringify({ mentorId: 'mentor-1' }),
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: 'course-456' }) });
    expect(res.status).toBe(200);
    expect(mockHandleDeleteCourse).toHaveBeenCalledWith(
      expect.anything(),
      'course-456',
      expect.objectContaining({ mentorId: 'mentor-1' }),
    );
  });

  it('POST /api/courses/[id]/publish resuelve params como Promise y delega a handlePublishCourse', async () => {
    mockAuthenticateCaller.mockResolvedValueOnce({ uid: 'mentor-1', isAdmin: false });
    mockHandlePublishCourse.mockResolvedValueOnce(
      NextResponse.json({ published: true }, { status: 200 }),
    );

    const req = new NextRequest('http://localhost:9002/api/courses/course-789/publish', {
      method: 'POST',
      body: JSON.stringify({ status: 'published' }),
    });

    const res = await PUBLISH_POST(req, { params: Promise.resolve({ id: 'course-789' }) });
    expect(res.status).toBe(200);
    expect(mockHandlePublishCourse).toHaveBeenCalledWith(
      expect.anything(),
      'course-789',
      expect.objectContaining({ mentorId: 'mentor-1', status: 'published' }),
    );
  });
});

