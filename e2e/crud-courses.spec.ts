import { expect, test } from '@playwright/test';

test.describe('Cursos CRUD (Dashboard) E2E con Mocks', () => {
  // Simulamos que estamos logueados o saltamos si la página exige Firebase Auth real
  test.beforeEach(async ({ page }) => {
    // Interceptar la carga inicial de cursos para no depender de la DB de prod
    await page.route('**/api/catalog/courses*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'course-mock-1',
                title: 'Curso Mock E2E',
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

  test('Alta de Curso (Create) - Intercepta POST sin modificar DB', async ({ page }) => {
    // Interceptamos la creación
    let postData = null;
    await page.route('**/api/catalog/courses/create', async (route) => {
      postData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'new-course-id', success: true })
      });
    });

    // Como no podemos bypassear el auth state de Firebase fácilmente en Playwright 
    // sin un token real, este test asume que la vista de creación hace un POST a la API.
    // Si la UI usa el SDK de Firebase directamente (addDoc), esto no interceptará el SDK de Firebase.
    // Se deja estructurado para cuando se migre 100% la creación a la API REST de Next.js.
    
    // Aquí irían los page.goto('/courses/create') y page.click('button')
  });

  test('Modificación de Curso (Update) - Intercepta PATCH', async ({ page }) => {
    await page.route('**/api/catalog/courses/course-mock-1', async (route) => {
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

  test('Baja de Curso (Delete) - Intercepta DELETE', async ({ page }) => {
    await page.route('**/api/catalog/courses/course-mock-1', async (route) => {
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
