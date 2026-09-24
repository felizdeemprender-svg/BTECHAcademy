/**
 * E2E autenticado (solo lectura): requiere E2E_ID_TOKEN (Firebase ID token
 * de un mentor de prueba) y E2E_MENTOR_ID. Se omite si faltan.
 * Solo GETs: no escribe datos ni storage.
 */
import { expect, test } from '@playwright/test';

const TOKEN = process.env.E2E_ID_TOKEN;
const MENTOR_ID = process.env.E2E_MENTOR_ID;

test.skip(!TOKEN || !MENTOR_ID, 'Sin E2E_ID_TOKEN/E2E_MENTOR_ID');

test('lista campañas propias (200 + array)', async ({ request }) => {
  const res = await request.get(`/api/campaigns?mentorId=${MENTOR_ID}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { data: unknown[] };
  expect(Array.isArray(body.data)).toBe(true);
});

test('lista programas propios (200 + array)', async ({ request }) => {
  const res = await request.get(`/api/mentoring/programs?mentorId=${MENTOR_ID}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { data: unknown[] };
  expect(Array.isArray(body.data)).toBe(true);
});

test('lista packs propios (200 + array)', async ({ request }) => {
  const res = await request.get(`/api/sales-pages?mentorId=${MENTOR_ID}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { data: unknown[] };
  expect(Array.isArray(body.data)).toBe(true);
});
