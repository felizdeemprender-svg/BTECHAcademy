import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import nextConfig from '../../../next.config';

vi.mock('@/lib/auth/verify-admin', () => ({
  verifyAdmin: vi.fn(),
}));

describe('Auditoría de Seguridad Informática - Pruebas Duales (P1 a P4)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /* ──────────────────────────────────────────────────────────
     1. Next.js Security Headers (P4)
     ────────────────────────────────────────────────────────── */
  describe('P4: Cabeceras de Seguridad HTTP (next.config.ts)', () => {
    it('debe declarar cabeceras de protección defensiva en todas las rutas', async () => {
      const headersConfig = await nextConfig.headers!();
      const globalHeaders = headersConfig.find(h => h.source === '/(.*)');
      expect(globalHeaders).toBeDefined();

      const headerMap: Record<string, string> = {};
      globalHeaders!.headers.forEach(h => {
        headerMap[h.key] = h.value;
      });

      expect(headerMap['X-Content-Type-Options']).toBe('nosniff');
      expect(headerMap['X-Frame-Options']).toBe('SAMEORIGIN');
      expect(headerMap['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headerMap['Strict-Transport-Security']).toContain('max-age=31536000');
    });
  });

  /* ──────────────────────────────────────────────────────────
     2. Admin Billing Endpoint Auth (P3)
     ────────────────────────────────────────────────────────── */
  describe('P3: Endpoint /api/admin/billing - Matriz Dual', () => {
    it('(-) Escenario Negativo: Rechaza con 401 si la petición no es de un administrador', async () => {
      const { verifyAdmin } = await import('@/lib/auth/verify-admin');
      (verifyAdmin as any).mockResolvedValue(null);

      const { GET } = await import('@/app/api/admin/billing/route');
      const req = new NextRequest('http://localhost:9002/api/admin/billing');
      const res = await GET(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('No autorizado');
    });

    it('(+) Escenario Positivo: Devuelve 200 y reporte si la petición proviene de un admin válido', async () => {
      const { verifyAdmin } = await import('@/lib/auth/verify-admin');
      (verifyAdmin as any).mockResolvedValue('admin_uid_123');

      const { GET } = await import('@/app/api/admin/billing/route');
      const req = new NextRequest('http://localhost:9002/api/admin/billing', {
        headers: { Authorization: 'Bearer valid-admin-token' },
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.summary).toBeDefined();
    });
  });

  /* ──────────────────────────────────────────────────────────
     3. Debug Endpoints Protection (P3)
     ────────────────────────────────────────────────────────── */
  describe('P3: Rutas /api/debug/* - Matriz Dual', () => {
    it('(-) Escenario Negativo: Devuelve 404 en entorno de producción para prevenir consumo indebido de IA', async () => {
      (process.env as any).NODE_ENV = 'production';

      const { POST: runAtomicPost } = await import('@/app/api/debug/run-atomic/route');
      const req = new NextRequest('https://fastoria.com.ar/api/debug/run-atomic', { method: 'POST' });
      const res = await runAtomicPost(req);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Not found');
    });

    it('(-) Escenario Negativo: /api/debug/dump devuelve 404 en entorno de producción', async () => {
      (process.env as any).NODE_ENV = 'production';

      const { GET: dumpGet } = await import('@/app/api/debug/dump/route');
      const res = await dumpGet();

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Not found');
    });
  });

  /* ──────────────────────────────────────────────────────────
     4. Firestore Rules Audit (P1)
     ────────────────────────────────────────────────────────── */
  describe('P1: Reglas de Firestore (firestore.rules) - Matriz Dual', () => {
    const rulesPath = path.resolve('firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

    it('(-) Escenario Negativo: /leads NO debe permitir lectura pública anónima', () => {
      const leadsBlock = rulesContent.split('match /leads/{leadId}')[1]?.split('match')[0] || '';
      expect(leadsBlock).not.toMatch(/allow\s+read:\s*if\s+true\s*;/);
    });

    it('(+) Escenario Positivo: /leads debe permitir creación pública anónima para captar prospectos de landings', () => {
      const leadsBlock = rulesContent.split('match /leads/{leadId}')[1]?.split('match')[0] || '';
      expect(leadsBlock).toMatch(/allow\s+create:\s*if\s+true\s*;/);
    });

    it('(-) Escenario Negativo: /leads no debe permitir actualización o borrado a usuarios comunes o anónimos', () => {
      const leadsBlock = rulesContent.split('match /leads/{leadId}')[1]?.split('match')[0] || '';
      expect(leadsBlock).toMatch(/allow\s+update,\s*delete:\s*if\s+isAdmin\(\)\s*;/);
    });

    it('(-) Escenario Negativo: /salesPages debe bloquear mutaciones de mentores que no sean dueños (Anti-IDOR)', () => {
      const spBlock = rulesContent.split('match /salesPages/{pageId}')[1]?.split('match')[0] || '';
      expect(spBlock).toMatch(/resource\.data\.mentorId\s*==\s*request\.auth\.uid/);
    });

    it('(+) Escenario Positivo: /salesPages debe permitir lectura pública para renderizar landings /v/[id]', () => {
      const spBlock = rulesContent.split('match /salesPages/{pageId}')[1]?.split('match')[0] || '';
      expect(spBlock).toMatch(/allow\s+read:\s*if\s+true\s*;/);
    });
  });

  /* ──────────────────────────────────────────────────────────
     5. Storage Rules Audit (P2)
     ────────────────────────────────────────────────────────── */
  describe('P2: Reglas de Storage (storage.rules) - Matriz Dual', () => {
    const storagePath = path.resolve('storage.rules');
    const storageContent = fs.readFileSync(storagePath, 'utf-8');

    it('(-) Escenario Negativo: NO debe existir comodín global que permita escritura irrestricta a cualquier usuario', () => {
      expect(storageContent).not.toMatch(/match\s+\/\{allPaths=\*\*\}[^}]+allow\s+read,\s*write:\s*if\s+request\.auth\s*!=\s*null\s*;/);
    });

    it('(+) Escenario Positivo: Debe garantizar lectura pública de imágenes y assets de cursos y landings', () => {
      expect(storageContent).toMatch(/match\s+\/\{allPaths=\*\*\}[^}]+allow\s+read:\s*if\s+true\s*;/);
    });

    it('(-) Escenario Negativo: users/{userId} debe restringir escritura exclusivamente al usuario dueño del UID', () => {
      const userBlock = storageContent.split('match /users/{userId}/{allPaths=**}')[1]?.split('match')[0] || '';
      expect(userBlock).toMatch(/request\.auth\.uid\s*==\s*userId/);
    });

    it('(+) Escenario Positivo: Debe declarar los prefijos operativos de cursos, landings y tareas sin bloquear la app', () => {
      expect(storageContent).toMatch(/match\s+\/courses\//);
      expect(storageContent).toMatch(/match\s+\/landings\//);
      expect(storageContent).toMatch(/match\s+\/sales_pages\//);
      expect(storageContent).toMatch(/match\s+\/followup_tasks\//);
      expect(storageContent).toMatch(/match\s+\/followup_guides\//);
    });
  });
});
