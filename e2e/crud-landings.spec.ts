import { expect, test } from '@playwright/test';

test.describe('Landings & Templates CRUD (Dashboard) E2E con Mocks', () => {
  test.beforeEach(async ({ page }) => {
    // Interceptar llamadas GET para evitar lectura de DB real
    await page.route('**/api/sales-pages*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'landing-mock-1',
                title: 'Landing de Prueba E2E',
                styleId: 'classic', // Template clásico
                status: 'draft'
              }
            ]
          })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('Alta de Landing con Template (Create) - Intercepta POST', async ({ page }) => {
    let postData = null;
    await page.route('**/api/sales-pages/create', async (route) => {
      postData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'new-landing-id', success: true })
      });
    });
  });

  test('Modificación de Landing y Tokens (Update) - Intercepta PATCH', async ({ page }) => {
    await page.route('**/api/sales-pages/landing-mock-1', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('Baja de Landing (Delete) - Intercepta DELETE', async ({ page }) => {
    await page.route('**/api/sales-pages/landing-mock-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.continue();
      }
    });
  });
});
