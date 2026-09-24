const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROUTES = [
  '/',
  '/dashboard',
  '/admin/whatsapp-bot',
  '/admin/brand',
  '/admin/subscriptions',
  '/mentoria/marketing/pages',
  '/mentoria/marketing/track',
  '/mentoria/marketing/landings',
  '/mentoria/marketing/pages/build',
  '/courses',
  '/courses/manage',
  '/settings',
  '/dashboard/plan',
  '/referidos',
];

const BASE_URL = 'http://localhost:9002';

async function runSmokeTest() {
  console.log('🚀 Iniciando Smoke Test Automatizado...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  await context.addCookies([
    {
      name: 'btech_uid',
      value: 'smoke_test_admin_uid',
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'btech_role',
      value: 'admin',
      domain: 'localhost',
      path: '/',
    }
  ]);

  const page = await context.newPage();
  const report = [];

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route}`;
    console.log(`⏳ Visitando: ${url}`);
    
    let pageError = null;
    let consoleErrors = [];

    page.on('pageerror', exception => {
      pageError = exception.message;
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('401') && !text.includes('Failed to fetch sales pages: 401') && !text.includes('Failed to load resource')) {
          consoleErrors.push(text);
        }
      }
    });

    try {
      const response = await page.goto(url, { waitUntil: 'load', timeout: 120000 });
      await page.waitForTimeout(2000);

      const status = response ? response.status() : 'Unknown';
      const hasDevOverlay = await page.locator('nextjs-portal').count() > 0;
      
      if (pageError || consoleErrors.length > 0 || hasDevOverlay || status >= 500) {
        const result = {
          route,
          status,
          success: false,
          pageError,
          consoleErrors: consoleErrors.slice(0, 3),
          reactCrashed: hasDevOverlay
        };
        report.push(result);
        console.log(`❌ Error encontrado en ${route}`);
      } else {
        report.push({ route, status, success: true });
        console.log(`✅ OK (${status})`);
      }
    } catch (err) {
      report.push({ route, success: false, error: err.message });
      console.log(`❌ Error de navegación en ${route}: ${err.message}`);
    }

    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
  }

  await browser.close();

  console.log('\n📊 === REPORTE FINAL ===\n');
  const failed = report.filter(r => !r.success);
  
  if (failed.length === 0) {
    console.log('🎉 ¡Todas las rutas pasaron exitosamente sin crashear!');
  } else {
    console.log(`⚠️ Se encontraron problemas en ${failed.length} páginas:\n`);
    failed.forEach(f => {
      console.log(`Ruta: ${f.route}`);
      if (f.status) console.log(`  - Status: ${f.status}`);
      if (f.pageError) console.log(`  - JS Error: ${f.pageError}`);
      if (f.reactCrashed) console.log(`  - Pantalla Roja (React WSoD dev-overlay) detectada.`);
      if (f.consoleErrors && f.consoleErrors.length > 0) {
        console.log(`  - Console Errors:`);
        f.consoleErrors.forEach(e => console.log(`    * ${e}`));
      }
      console.log('');
    });
  }
}

runSmokeTest().catch(console.error);
