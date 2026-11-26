import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import https from 'https';
import dotenv from 'dotenv';

const prodEnvPath = path.resolve(process.cwd(), '.env.production');
if (fs.existsSync(prodEnvPath)) {
  dotenv.config({ path: prodEnvPath });
}

import admin from 'firebase-admin';

const prodServiceAccountPath = path.resolve(process.cwd(), 'service-account.json');
const hasProdServiceAccount = fs.existsSync(prodServiceAccountPath);

const describeProd = hasProdServiceAccount ? describe : describe.skip;

describeProd('Suite de Verificación en Producción (Live Matrix - btechacademy-8b329)', { timeout: 35000 }, () => {
  const prodHost = 'fastoria.com.ar';
  const prodBucket = 'btechacademy-8b329.firebasestorage.app';
  let prodAdminApp: admin.app.App;

  beforeAll(async () => {
    const existing = admin.apps.find((a) => a?.name === 'prod-verification-app');
    if (existing) {
      prodAdminApp = existing;
    } else {
      const sa = JSON.parse(fs.readFileSync(prodServiceAccountPath, 'utf-8'));
      prodAdminApp = admin.initializeApp(
        {
          credential: admin.credential.cert(sa),
          projectId: 'btechacademy-8b329',
          storageBucket: prodBucket,
        },
        'prod-verification-app'
      );
    }
  });

  afterAll(async () => {
    if (prodAdminApp) {
      await prodAdminApp.delete().catch(() => {});
    }
  });

  // Helper HTTP para el host de producción
  function httpProd(
    pathStr: string,
    method = 'GET',
    headers: Record<string, string> = {},
    body: string | null = null
  ): Promise<{ status: number; headers: Record<string, any>; body: string }> {
    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: prodHost,
          port: 443,
          path: pathStr,
          method,
          headers,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () =>
            resolve({
              status: res.statusCode || 500,
              headers: res.headers,
              body: data,
            })
          );
        }
      );

      req.on('error', (e) => resolve({ status: 500, headers: {}, body: e.message }));
      if (body) req.write(body);
      req.end();
    });
  }

  /* ─────────────────────────────────────────────────────────────
     BLOQUE 1: DISPONIBILIDAD Y CABECERAS DE SEGURIDAD EN PRODUCCIÓN
     ───────────────────────────────────────────────────────────── */
  describe('P1: Disponibilidad y Cabeceras HTTP en Producción', () => {
    it('(+) 1.1 Home / responde 200 OK en https://fastoria.com.ar', async () => {
      const res = await httpProd('/');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(100);
    });

    it('(+) 1.2 Cabeceras de seguridad activas en Producción (HSTS, nosniff, SAMEORIGIN)', async () => {
      const res = await httpProd('/');
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('(-) 1.3 Rutas debug deshabilitadas en Producción retornan 404', async () => {
      const rDump = await httpProd('/api/debug/dump');
      const rRun = await httpProd('/api/debug/run-atomic', 'POST', { 'Content-Type': 'application/json' }, '{}');
      expect(rDump.status).toBe(404);
      expect(rRun.status).toBe(404);
    });
  });

  /* ─────────────────────────────────────────────────────────────
     BLOQUE 2: PROTECCIÓN DE RUTAS Y ENDPOINTS EN PRODUCCIÓN
     ───────────────────────────────────────────────────────────── */
  describe('P2: Protección de Autenticación y Validación de Endpoints', () => {
    it('(-) 2.1 /api/admin/billing sin token de admin retorna 401', async () => {
      const res = await httpProd('/api/admin/billing');
      expect(res.status).toBe(401);
    });

    it('(-) 2.2 /api/diagnose sin token Bearer retorna 401', async () => {
      const res = await httpProd('/api/diagnose');
      expect(res.status).toBe(401);
    });

    it('(-) 2.3 /api/payments/checkout sin payload requerido retorna 400', async () => {
      const res = await httpProd(
        '/api/payments/checkout',
        'POST',
        { 'Content-Type': 'application/json' },
        JSON.stringify({})
      );
      expect(res.status).toBe(400);
    });

    it('(-) 2.4 /api/payments/transfer/initiate sin parámetros retorna 400', async () => {
      const res = await httpProd(
        '/api/payments/transfer/initiate',
        'POST',
        { 'Content-Type': 'application/json' },
        JSON.stringify({})
      );
      expect(res.status).toBe(400);
    });

    it('(-) 2.5 /api/courses/free-enrollment sin payload retorna 400', async () => {
      const res = await httpProd(
        '/api/courses/free-enrollment',
        'POST',
        { 'Content-Type': 'application/json' },
        JSON.stringify({})
      );
      expect(res.status).toBe(400);
    });

    it('(-) 2.6 Worker M2M con token inválido retorna 401 o 403', async () => {
      const res = await httpProd(
        '/api/video/worker',
        'POST',
        {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token_invalido_produccion',
        },
        JSON.stringify({ action: 'ping' })
      );
      expect([401, 403]).toContain(res.status);
    });
  });

  /* ─────────────────────────────────────────────────────────────
     BLOQUE 3: CONECTIVIDAD E INFRAESTRUCTURA FIREBASE EN PRODUCCIÓN
     ───────────────────────────────────────────────────────────── */
  describe('P3: Conectividad Firestore y Storage de Producción', () => {
    it('(+) 3.1 Conexión autenticada con Firestore de Producción (btechacademy-8b329)', async () => {
      const db = prodAdminApp.firestore();
      // Verificación de lectura básica en colección pública
      const snap = await db.collection('subscriptionPlans').limit(1).get();
      expect(snap).toBeDefined();
    });

    it('(+) 3.2 Storage de Producción responde para assets del bucket', async () => {
      const bucket = prodAdminApp.storage().bucket(prodBucket);
      const [exists] = await bucket.exists();
      expect(exists).toBe(true);
    });
  });
});
