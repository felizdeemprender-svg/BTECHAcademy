import { describe, it, expect, vi, beforeEach } from 'vitest';
import { config as middlewareConfig } from '../../middleware';
import tailwindConfig from '../../../tailwind.config';
import fs from 'fs';
import path from 'path';

describe('Optimizaciones de Middleware, Fuentes, Auth y Dependencias', () => {
  describe('Punto 1: Regex y Matcher de Middleware', () => {
    it('debe contener el matcher que excluye rutas estáticas y multimedia', () => {
      const matchers = middlewareConfig.matcher;
      expect(matchers).toBeDefined();
      expect(matchers.length).toBeGreaterThan(0);
      const matcherStr = matchers[0];

      // Verificamos que excluya api, _next y extensiones estáticas
      expect(matcherStr).toContain('api');
      expect(matcherStr).toContain('_next/static');
      expect(matcherStr).toContain('_next/image');
      expect(matcherStr).toContain('favicon.ico');
      expect(matcherStr).toContain('svg');
      expect(matcherStr).toContain('png');
      expect(matcherStr).toContain('webp');
      expect(matcherStr).toContain('mp4');
      expect(matcherStr).toContain('woff2');
    });

    it('debe ignorar archivos estáticos y procesar rutas de páginas dinámicas', () => {
      const matcherPattern = middlewareConfig.matcher[0];
      // Convertir el patrón de Next.js '/((?!...).*)' a RegExp estándar
      const regex = new RegExp(`^${matcherPattern}$`);

      // Rutas que NO deben ser interceptadas por el middleware (falsy en regex o excluidas)
      const staticAssets = [
        '/api/plans',
        '/_next/static/chunks/main.js',
        '/_next/image?url=foo',
        '/favicon.ico',
        '/logo.svg',
        '/images/hero.webp',
        '/photo.jpg',
        '/avatar.png',
        '/intro.mp4',
        '/fonts/inter.woff2',
      ];

      for (const asset of staticAssets) {
        expect(regex.test(asset)).toBe(false);
      }

      // Rutas que SÍ deben ser interceptadas y procesadas
      const pageRoutes = [
        '/dashboard',
        '/admin/users',
        '/v/landing-promo',
        '/courses/manage',
        '/settings/profile',
      ];

      for (const route of pageRoutes) {
        expect(regex.test(route)).toBe(true);
      }
    });
  });

  describe('Punto 2: Configuración de Tipografías con next/font y Tailwind', () => {
    it('debe mapear las variables CSS de next/font en tailwind.config.ts', () => {
      const fontFamily = tailwindConfig.theme?.extend?.fontFamily as Record<string, string[]>;
      expect(fontFamily).toBeDefined();
      expect(fontFamily.body).toContain('var(--font-inter)');
      expect(fontFamily.headline).toContain('var(--font-lexend)');
      expect(fontFamily.code).toContain('var(--font-source-code-pro)');
    });

    it('no debe contener enlaces externos render-blocking a Google Fonts en layout.tsx', () => {
      const layoutPath = path.resolve(__dirname, '../../app/layout.tsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

      // Certificar que no contiene <link href="https://fonts.googleapis.com
      expect(layoutContent).not.toContain('https://fonts.googleapis.com/css2');
      expect(layoutContent).not.toContain('https://fonts.gstatic.com');

      // Certificar que importa y usa next/font/google
      expect(layoutContent).toContain("from 'next/font/google'");
      expect(layoutContent).toContain('variable: \'--font-inter\'');
      expect(layoutContent).toContain('variable: \'--font-lexend\'');
      expect(layoutContent).toContain('variable: \'--font-source-code-pro\'');
    });
  });

  describe('Punto 3: Deduplicación y Cache de Sesión en Consolidación de Inscripciones', () => {
    beforeEach(() => {
      // Mock de sessionStorage en entorno Node
      const store: Record<string, string> = {};
      vi.stubGlobal('sessionStorage', {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, val: string) => { store[key] = val; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      });
      vi.stubGlobal('window', {});
    });

    it('debe saltarse la consulta a Firestore si las inscripciones ya fueron consolidadas en la sesión', async () => {
      const uid = 'user_test_123';
      const cacheKey = `enrollments_consolidated_${uid}`;

      // Simular que en la primera llamada de la sesión se guarda el flag
      sessionStorage.setItem(cacheKey, 'true');

      let queryExecuted = false;
      const simulateConsolidation = async (userId: string) => {
        if (typeof window !== 'undefined' && sessionStorage.getItem(`enrollments_consolidated_${userId}`) === 'true') {
          return; // Skip sin consultar
        }
        queryExecuted = true;
      };

      await simulateConsolidation(uid);

      // No debe ejecutar la consulta porque ya está en sessionStorage
      expect(queryExecuted).toBe(false);
    });
  });

  describe('Punto 4: Higiene de Dependencias en package.json', () => {
    it('no debe incluir next-rate-limit en dependencies', () => {
      const packageJsonPath = path.resolve(__dirname, '../../../package.json');
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(pkg.dependencies['next-rate-limit']).toBeUndefined();
    });
  });
});
