import { expect, test } from '@playwright/test';

test.describe('Landing Pages (Sales Pages V2) E2E', () => {
  const MOCK_LANDING_ID = 'e2e-mock-landing';
  const MOCK_API_URL = `**/api/sales-pages/${MOCK_LANDING_ID}/public*`;

  test('Renderiza landing V2 correctamente con datos mockeados', async ({ page }) => {
    // Interceptar la llamada a la API y devolver un mock de la landing
    await page.route(MOCK_API_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: {
            id: MOCK_LANDING_ID,
            isActive: true,
            title: 'Mock Landing V2',
            price: 19990,
            content: {
              sections: [
                {
                  id: 'hero-1',
                  type: 'hero',
                  props: {
                    title: 'Curso de Prueba E2E',
                    subtitle: 'Aprende a programar bots',
                    ctaText: 'Comprar ahora'
                  }
                }
              ]
            },
            branding: {
              primaryColor: '#ff0000'
            },
            mentorId: 'mentor-e2e'
          },
          course: {
            title: 'Bot Master'
          },
          modules: []
        })
      });
    });

    // Visitar la página
    await page.goto(`/v/${MOCK_LANDING_ID}`);

    // Esperar a que la API responda y la página se hidrate
    // Verificamos que no diga "Contenido en proceso" ni "Página no disponible"
    await expect(page.locator('text=Curso de Prueba E2E')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Aprende a programar bots')).toBeVisible();
    await expect(page.locator('text=Comprar ahora')).toBeVisible();
  });

  test('Renderiza estado 404 para landing inactiva o no encontrada', async ({ page }) => {
    await page.route('**/api/sales-pages/invalid-landing/public*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' })
      });
    });

    await page.goto('/v/invalid-landing');

    // Al no encontrarla, Next.js UI muestra "Página no disponible."
    await expect(page.locator('text=Página no disponible.')).toBeVisible();
  });
});
