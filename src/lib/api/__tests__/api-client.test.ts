/**
 * Tests del cliente API (fetch mockeado) y del flag.
 * Los hooks no se renderizan aquí (sin RTL): son wrappers finos
 * sobre `mentoring-client`, ya cubierto.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';

import { ApiError, apiGet, apiSend } from '../client';
import {
  deleteCampaign,
  fetchCampaignDetail,
  fetchMentorCampaigns,
  fetchMentorPrograms,
  patchCampaign,
} from '../mentoring-client';
import { FEATURE_FLAGS, isNewMentoringApiEnabled } from '@/lib/feature-flags';

function mockFetchOnce(response: { ok: boolean; status: number; body: unknown }) {
  const fetchMock = vi.fn(async () => ({
    ok: response.ok,
    status: response.status,
    json: async () => response.body,
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiGet', () => {
  it('devuelve data en 200 con Bearer token', async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: { data: [1, 2] } });
    const data = await apiGet<number[]>('/api/x', 'tok123');
    expect(data).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledWith('/api/x', {
      headers: { Authorization: 'Bearer tok123' },
    });
  });

  it('lanza ApiError con status y mensaje del servidor', async () => {
    mockFetchOnce({ ok: false, status: 403, body: { error: 'Sin permiso' } });
    const err: unknown = await apiGet('/api/x', 'tok').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(403);
    expect((err as ApiError).message).toBe('Sin permiso');
  });

  it('mensaje genérico si el cuerpo no trae error', async () => {
    mockFetchOnce({ ok: false, status: 500, body: {} });
    let err: ApiError | null = null;
    try {
      await apiGet('/api/x', 'tok');
    } catch (e) {
      err = e as ApiError;
    }
    expect(err?.message).toBe('HTTP 500');
  });
});

describe('mentoring-client', () => {
  it('construye las URLs con encodeURIComponent', async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: { data: [] } });
    await fetchMentorCampaigns('m 1', 't');
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns?mentorId=m%201', expect.anything());

    await fetchCampaignDetail('c/1', 't');
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c%2F1', expect.anything());

    await fetchMentorPrograms('m 1', 't');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/mentoring/programs?mentorId=m%201',
      expect.anything(),
    );
  });
});

describe('apiSend', () => {
  it('PATCH envía método, body JSON y Bearer', async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: { data: null } });
    await apiSend('PATCH', '/api/campaigns/c1', 'tok', { autoPilot: false });
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoPilot: false }),
    });
  });

  it('DELETE sin body y error → ApiError', async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: {} });
    await apiSend('DELETE', '/api/campaigns/c1', 'tok');
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: undefined,
    });

    mockFetchOnce({ ok: false, status: 404, body: { error: 'No existe' } });
    let err: ApiError | null = null;
    try {
      await apiSend('DELETE', '/api/campaigns/x', 'tok');
    } catch (e) {
      err = e as ApiError;
    }
    expect(err?.status).toBe(404);
  });
});

describe('write-client', () => {
  it('patchCampaign y deleteCampaign apuntan a /api/campaigns/[id]', async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: {} });
    await patchCampaign('c 1', 't', { autoPilot: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/campaigns/c%201',
      expect.objectContaining({ method: 'PATCH' }),
    );
    await deleteCampaign('c 1', 't');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/campaigns/c%201',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('flag NEW_MENTORING_API', () => {
  it('el helper refleja el flag (admins/alumnos usan forks legacy)', () => {
    expect(isNewMentoringApiEnabled()).toBe(FEATURE_FLAGS.NEW_MENTORING_API);
  });
});
