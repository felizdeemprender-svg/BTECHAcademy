/**
 * E2E (Playwright) — Paso 14.
 * Sin escrituras: specs de contrato sin auth (401) + smoke público.
 * Requiere el dev server en http://localhost:9002 (externo).
 * Con E2E_ID_TOKEN se habilitan checks autenticados de lectura.
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:9002',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', headless: true },
    },
  ],
});
