import { expect, test } from '@playwright/test';

test.describe('Mentorías CRUD (Dashboard) E2E con Mocks', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/mentoring/programs*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'mentoring-mock-1',
                title: 'Programa Mentoría E2E',
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

  test('Alta de Programa de Mentoría (Create) - Intercepta POST', async ({ page }) => {
    await page.route('**/api/mentoring/programs/create', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'new-program-id', success: true })
      });
    });
  });

  test('Modificación de Programa (Update) - Intercepta PATCH', async ({ page }) => {
    await page.route('**/api/mentoring/programs/mentoring-mock-1', async (route) => {
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

  test('Baja de Programa (Delete) - Intercepta DELETE', async ({ page }) => {
    await page.route('**/api/mentoring/programs/mentoring-mock-1', async (route) => {
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
