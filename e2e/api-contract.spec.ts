/**
 * E2E contrato API: sin token → 401 en todas las rutas nuevas.
 * Sin escrituras: solo GETs y POSTs rechazados antes de tocar datos.
 */
import { expect, test } from '@playwright/test';

const GET_ROUTES = [
  '/api/campaigns?mentorId=m1',
  '/api/campaigns/c1',
  '/api/mentoring/programs?mentorId=m1',
  '/api/sales-pages?mentorId=m1',
  '/api/mentoring/programs/f1/detail',
  '/api/mentoring/programs/f1/detail?action=sessions',
  '/api/mentoring/programs/f1/detail?action=tasks',
  // F2.2 whatsapp-bot: todas las acciones GET exigen admin (401 sin token)
  '/api/admin/whatsapp-bot?action=status',
  '/api/admin/whatsapp-bot?action=settings',
  '/api/admin/whatsapp-bot?action=conversations',
  '/api/admin/whatsapp-bot?action=messages&phone=54911',
  '/api/admin/whatsapp-bot?action=knowledge',
];

for (const route of GET_ROUTES) {
  test(`GET ${route} sin token → 401`, async ({ request }) => {
    const res = await request.get(route);
    expect(res.status()).toBe(401);
  });
}

const POST_ROUTES: { route: string; body: unknown }[] = [
  { route: '/api/campaigns/plan', body: {} },
  { route: '/api/campaigns/create', body: {} },
  { route: '/api/campaigns/c1/execute', body: {} },
  { route: '/api/mentoring/programs/create', body: {} },
  { route: '/api/mentoring/programs/f1/detail?action=assign-task', body: {} },
  // F2.2 whatsapp-bot: POSTs admin (401 sin token)
  { route: '/api/admin/whatsapp-bot?action=settings', body: { tone: 'x' } },
  { route: '/api/admin/whatsapp-bot?action=connect', body: {} },
  { route: '/api/admin/whatsapp-bot?action=logout', body: {} },
  { route: '/api/admin/whatsapp-bot?action=knowledge', body: { title: 'x' } },
  { route: '/api/admin/whatsapp-bot?action=sync-plans', body: {} },
  { route: '/api/admin/whatsapp-bot?action=send-message', body: { phone: 'x', text: 'y' } },
  { route: '/api/admin/whatsapp-bot?action=toggle-mode', body: { phone: 'x' } },
  { route: '/api/admin/whatsapp-bot?action=resume-bot', body: { phone: 'x' } },
  { route: '/api/admin/whatsapp-bot?action=transfer', body: { phone: 'x' } },
];

for (const { route, body } of POST_ROUTES) {
  test(`POST ${route} sin token → 401`, async ({ request }) => {
    const res = await request.post(route, { data: body });
    expect(res.status()).toBe(401);
  });
}

test('PATCH y DELETE sin token → 401', async ({ request }) => {
  expect((await request.patch('/api/campaigns/c1', { data: {} })).status()).toBe(401);
  expect((await request.delete('/api/campaigns/c1')).status()).toBe(401);
  expect((await request.patch('/api/mentoring/programs/f1', { data: {} })).status()).toBe(401);
  expect((await request.delete('/api/mentoring/programs/f1')).status()).toBe(401);
});

test('whatsapp-bot PUT/DELETE sin token → 401', async ({ request }) => {
  expect(
    (await request.put('/api/admin/whatsapp-bot?action=update-conversation&phone=54911', { data: {} })).status(),
  ).toBe(401);
  expect((await request.delete('/api/admin/whatsapp-bot?action=knowledge&id=k1')).status()).toBe(401);
});
