import { expect, test } from '@playwright/test';

test.describe('Marketing y Videos CRUD (Dashboard) E2E con Mocks', () => {
  test.beforeEach(async ({ page }) => {
    // Interceptar listados para Marketing
    await page.route('**/api/campaigns*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'campaign-mock-1',
                name: 'Campaña Lanzamiento E2E',
                status: 'draft',
                timeline: []
              }
            ]
          })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('Creación de Plan de Campaña (Generate Plan) - Intercepta POST', async ({ page }) => {
    await page.route('**/api/campaigns/plan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          plan: {
            title: 'Plan Estratégico',
            timeline: [
              { day: 1, action: 'Email Teaser' }
            ]
          }
        })
      });
    });
  });

  test('Alta de Campaña (Create) - Intercepta POST', async ({ page }) => {
    await page.route('**/api/campaigns/create', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'new-campaign-id', success: true })
      });
    });
  });

  test('Publicación de Campaña (Execute/Publish) - Intercepta POST', async ({ page }) => {
    await page.route('**/api/campaigns/*/execute', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Campaña en ejecución' })
      });
    });
  });

  test('Creación de Video de Marketing (Video Generation) - Intercepta POST', async ({ page }) => {
    await page.route('**/api/video/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          jobId: 'video-job-123',
          status: 'processing',
          message: 'Video rendering started'
        })
      });
    });
  });
  
  test('Consulta de Estado de Video (Job Status) - Intercepta GET', async ({ page }) => {
    await page.route('**/api/video/status/video-job-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          status: 'completed',
          url: 'https://cdn.example.com/mock-video.mp4'
        })
      });
    });
  });
});
