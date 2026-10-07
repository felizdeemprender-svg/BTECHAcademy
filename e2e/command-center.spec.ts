import { test, expect } from '@playwright/test';

test.describe('Centro de Mando (Marketing Campaigns)', () => {
  test('debe renderizar el título y elementos principales', async ({ page }) => {
    // Si la app usa auth de Firebase en E2E, tal vez haya que loguear,
    // pero intentamos navegar directo.
    await page.goto('/marketing/campaigns');
    
    // Verificar que el header está presente
    await expect(page.locator('h1:has-text("Centro de Mando")')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Orquestador y Scheduler en Piloto Automático')).toBeVisible();
    
    // Verificar que hay columnas de calendario
    const columnHeaders = page.getByText(/oct/i);
    const count = await columnHeaders.count();
    expect(count).toBeGreaterThan(0);
  });

  test('el filtro de búsqueda debe ocultar campañas no coincidentes', async ({ page }) => {
    await page.route('**/api/campaigns*', async route => {
      await route.fulfill({ json: [
        {
          executable: true,
          campaign: { id: 'mock-1', title: 'Lanzamiento: IA para Negocios', strategy: { timeline: [] }, executionLogs: [] }
        },
        {
          executable: true,
          campaign: { id: 'mock-2', title: 'Black Friday: Curso Creadores', strategy: { timeline: [] }, executionLogs: [] }
        }
      ]});
    });
    
    await page.goto('/marketing/campaigns');

    // Inicialmente debe mostrar las campañas de mock
    await expect(page.getByText('Lanzamiento: IA para Negocios')).toBeVisible();
    await expect(page.getByText('Black Friday: Curso Creadores')).toBeVisible();

    // Rellenar el input de búsqueda
    await page.fill('input[placeholder="Buscar campaña..."]', 'Inexistente');

    // Ya no deben estar visibles
    await expect(page.getByText('Lanzamiento: IA para Negocios')).toBeHidden();
    await expect(page.getByText('Black Friday: Curso Creadores')).toBeHidden();

    // Buscar "Black"
    await page.fill('input[placeholder="Buscar campaña..."]', 'Black');
    await expect(page.getByText('Lanzamiento: IA para Negocios')).toBeHidden();
    await expect(page.getByText('Black Friday: Curso Creadores')).toBeVisible();
  });
});
