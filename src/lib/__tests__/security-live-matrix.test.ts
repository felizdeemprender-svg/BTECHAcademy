import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where
} from 'firebase/firestore';

const serviceAccountPath = path.resolve(process.cwd(), 'service-account-test.json');
const hasServiceAccount = fs.existsSync(serviceAccountPath);

const describeLive = hasServiceAccount ? describe : describe.skip;

describeLive('Suite de Pruebas de Seguridad en Vivo - Matriz Dual y Resguardo Defensivo', { timeout: 30000 }, () => {
  let idTokenA: string;
  let idTokenB: string;
  let idTokenAdmin: string;
  let dbAnon: any;
  let dbTutorA: any;
  let dbTutorB: any;
  let dbAdmin: any;
  let bucketName: string;
  const host = 'btechacademy-test--feliz-de-emprender.us-central1.hosted.app';

  const UID_TUTOR_A = 'qa_vitest_tutor_a_' + Date.now();
  const UID_TUTOR_B = 'qa_vitest_tutor_b_' + Date.now();
  const UID_ADMIN = 'qa_vitest_admin_' + Date.now();

  beforeAll(async () => {
    // 1. Inicializar Firebase Admin
    if (!admin.apps.length) {
      const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
      admin.initializeApp({
        credential: admin.credential.cert(sa)
      });
    }

    bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'feliz-de-emprender.firebasestorage.app';

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'feliz-de-emprender.firebaseapp.com',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'feliz-de-emprender',
      storageBucket: bucketName
    };

    const appAnon = initializeApp(firebaseConfig, 'vitest-anon-app');
    dbAnon = getFirestore(appAnon);

    const appTutorA = initializeApp(firebaseConfig, 'vitest-tutor-a-app');
    const authTutorA = getAuth(appTutorA);
    dbTutorA = getFirestore(appTutorA);

    const appTutorB = initializeApp(firebaseConfig, 'vitest-tutor-b-app');
    const authTutorB = getAuth(appTutorB);
    dbTutorB = getFirestore(appTutorB);

    const appAdmin = initializeApp(firebaseConfig, 'vitest-admin-app');
    const authAdmin = getAuth(appAdmin);
    dbAdmin = getFirestore(appAdmin);

    // Helper para asegurar usuario
    async function setupUser(uid: string, roles: string[]) {
      try {
        await admin.auth().getUser(uid);
      } catch {
        await admin.auth().createUser({ uid });
      }
      await admin.auth().setCustomUserClaims(uid, { roles });
      await admin.firestore().collection('users').doc(uid).set({
        uid,
        email: `${uid}@qa.com`,
        roles,
        createdAt: new Date().toISOString()
      });
    }

    await setupUser(UID_TUTOR_A, ['mentor']);
    await setupUser(UID_TUTOR_B, ['mentor']);
    await setupUser(UID_ADMIN, ['admin']);

    const customTokenA = await admin.auth().createCustomToken(UID_TUTOR_A, { roles: ['mentor'] });
    const customTokenB = await admin.auth().createCustomToken(UID_TUTOR_B, { roles: ['mentor'] });
    const customTokenAdmin = await admin.auth().createCustomToken(UID_ADMIN, { roles: ['admin'] });

    const credA = await signInWithCustomToken(authTutorA, customTokenA);
    const credB = await signInWithCustomToken(authTutorB, customTokenB);
    const credAdmin = await signInWithCustomToken(authAdmin, customTokenAdmin);

    idTokenA = await credA.user.getIdToken();
    idTokenB = await credB.user.getIdToken();
    idTokenAdmin = await credAdmin.user.getIdToken();
  }, 30000);

  afterAll(async () => {
    if (hasServiceAccount) {
      await admin.auth().deleteUser(UID_TUTOR_A).catch(() => {});
      await admin.auth().deleteUser(UID_TUTOR_B).catch(() => {});
      await admin.auth().deleteUser(UID_ADMIN).catch(() => {});
      await admin.firestore().collection('users').doc(UID_TUTOR_A).delete().catch(() => {});
      await admin.firestore().collection('users').doc(UID_TUTOR_B).delete().catch(() => {});
      await admin.firestore().collection('users').doc(UID_ADMIN).delete().catch(() => {});
    }
  });

  // Storage Request Helper
  function storageReq(filePath: string, method = 'GET', token: string | null = null, content: string | null = null): Promise<{ status: number; body: string }> {
    return new Promise((resolve) => {
      const encoded = encodeURIComponent(filePath);
      const reqPath = method === 'POST'
        ? `/v0/b/${bucketName}/o?uploadType=media&name=${encoded}`
        : `/v0/b/${bucketName}/o/${encoded}?alt=media`;

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      if (content) {
        headers['Content-Type'] = 'text/plain';
        headers['Content-Length'] = String(Buffer.byteLength(content));
      }

      const req = https.request({
        hostname: 'firebasestorage.googleapis.com',
        path: reqPath,
        method,
        headers
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode || 500, body: data }));
      });

      req.on('error', (e) => resolve({ status: 500, body: e.message }));
      if (content) req.write(content);
      req.end();
    });
  }

  // HTTP Helper
  function httpReq(pathStr: string, method = 'GET', headers: Record<string, string> = {}, body: string | null = null): Promise<{ status: number; headers: Record<string, any>; body: string }> {
    return new Promise((resolve) => {
      const req = https.request({
        hostname: host,
        port: 443,
        path: pathStr,
        method,
        headers
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode || 500, headers: res.headers, body: data }));
      });

      req.on('error', (e) => resolve({ status: 500, headers: {}, body: e.message }));
      if (body) req.write(body);
      req.end();
    });
  }

  /* ─────────────────────────────────────────────────────────────
     BLOQUE 1: FIRESTORE RULES EN VIVO
     ───────────────────────────────────────────────────────────── */
  describe('P1: Firestore Rules - Validación de Casos de Uso Reales', () => {
    let testLeadId: string | null = null;
    const testLandingId = 'vitest_page_' + Date.now();

    it('(+) 1.1 Captura pública de lead anónimo: addDoc en /leads debe ser permitido', async () => {
      const ref = await addDoc(collection(dbAnon, 'leads'), {
        name: 'Lead Vitest',
        email: 'lead@vitest.com',
        landingId: 'landing_vitest_1',
        createdAt: new Date().toISOString()
      });
      testLeadId = ref.id;
      expect(testLeadId).toBeDefined();
    });

    it('(-) 1.2 Volcado masivo de leads (Data Scraping): getDocs en /leads debe ser denegado a anónimos', async () => {
      await expect(getDocs(collection(dbAnon, 'leads'))).rejects.toThrow();
    });

    it('(+) 1.3 Consulta de leads por Tutor autenticado: debe permitir leer leads asociados a landings', async () => {
      const q = query(collection(dbTutorA, 'leads'), where('landingId', '==', 'landing_vitest_1'));
      const snap = await getDocs(q);
      expect(snap.size).toBeGreaterThanOrEqual(1);
    });

    it('(-) 1.4 Borrado de lead por Tutor común: debe ser rechazado con permission-denied', async () => {
      if (!testLeadId) return;
      await expect(deleteDoc(doc(dbTutorA, 'leads', testLeadId))).rejects.toThrow();
    });

    it('(+) 1.5 Borrado administrativo de lead: debe ser permitido a rol admin', async () => {
      if (!testLeadId) return;
      await deleteDoc(doc(dbAdmin, 'leads', testLeadId));
      const checkSnap = await getDoc(doc(dbAdmin, 'leads', testLeadId));
      expect(checkSnap.exists()).toBe(false);
    });

    it('(+) 1.6 Creación de landing propia por Tutor A en /salesPages', async () => {
      await setDoc(doc(dbTutorA, 'salesPages', testLandingId), {
        title: 'Landing Vitest Tutor A',
        mentorId: UID_TUTOR_A,
        slug: 'landing-vitest-a'
      });
      const snap = await getDoc(doc(dbTutorA, 'salesPages', testLandingId));
      expect(snap.exists()).toBe(true);
      expect(snap.data()?.mentorId).toBe(UID_TUTOR_A);
    });

    it('(+) 1.7 Lectura pública de landing por anónimo (/v/[id])', async () => {
      const snap = await getDoc(doc(dbAnon, 'salesPages', testLandingId));
      expect(snap.exists()).toBe(true);
      expect(snap.data()?.title).toBe('Landing Vitest Tutor A');
    });

    it('(-) 1.8 Anti-IDOR: Tutor B intentando alterar landing de Tutor A debe ser bloqueado', async () => {
      await expect(updateDoc(doc(dbTutorB, 'salesPages', testLandingId), {
        title: 'Hacked by Tutor B'
      })).rejects.toThrow();
    });

    it('(+) 1.9 Modificación legítima por Tutor A (dueño de la landing)', async () => {
      await updateDoc(doc(dbTutorA, 'salesPages', testLandingId), {
        title: 'Landing Vitest Tutor A - Modificada'
      });
      const snap = await getDoc(doc(dbTutorA, 'salesPages', testLandingId));
      expect(snap.data()?.title).toBe('Landing Vitest Tutor A - Modificada');

      // Limpieza con admin
      await deleteDoc(doc(dbAdmin, 'salesPages', testLandingId));
    });
  });

  /* ─────────────────────────────────────────────────────────────
     BLOQUE 2: STORAGE RULES EN VIVO
     ───────────────────────────────────────────────────────────── */
  describe('P2: Storage Rules - Aislamiento de Tutores y Assets Multimedia', () => {
    it('(+) 2.1 Tutor A sube a su propia carpeta users/{uid}/**', async () => {
      const res = await storageReq(`users/${UID_TUTOR_A}/test-file.txt`, 'POST', idTokenA, 'contenido legitimo');
      expect(res.status).toBe(200);
    });

    it('(-) 2.2 Tutor B intentando escribir en users/TutorA/** debe retornar 403 Forbidden', async () => {
      const res = await storageReq(`users/${UID_TUTOR_A}/hacked.txt`, 'POST', idTokenB, 'ataque idor');
      expect(res.status).toBe(403);
    });

    it('(-) 2.3 Anónimo intentando escribir en users/TutorA/** debe retornar 403 Forbidden', async () => {
      const res = await storageReq(`users/${UID_TUTOR_A}/anon.txt`, 'POST', null, 'ataque anon');
      expect(res.status).toBe(403);
    });

    it('(+) 2.4 Tutor A sube a su carpeta de guías followup_guides/{uid}/**', async () => {
      const res = await storageReq(`followup_guides/${UID_TUTOR_A}/guia.txt`, 'POST', idTokenA, 'guia tutor A');
      expect(res.status).toBe(200);
    });

    it('(-) 2.5 Tutor B intentando escribir en followup_guides/TutorA/** debe retornar 403 Forbidden', async () => {
      const res = await storageReq(`followup_guides/${UID_TUTOR_A}/malware.txt`, 'POST', idTokenB, 'guia maliciosa');
      expect(res.status).toBe(403);
    });

    it('(+) 2.6 Lectura pública de assets multimedia: debe retornar 200 sin romper imágenes de landings', async () => {
      const res = await storageReq(`users/${UID_TUTOR_A}/test-file.txt`, 'GET', null);
      expect(res.status).toBe(200);
      expect(res.body).toBe('contenido legitimo');

      // Limpieza en Storage
      const bucket = admin.storage().bucket(bucketName);
      await bucket.file(`users/${UID_TUTOR_A}/test-file.txt`).delete().catch(() => {});
      await bucket.file(`followup_guides/${UID_TUTOR_A}/guia.txt`).delete().catch(() => {});
    });
  });

  /* ─────────────────────────────────────────────────────────────
     BLOQUE 3: ENDPOINTS Y CABECERAS EN TESTING DESPLEGADO
     ───────────────────────────────────────────────────────────── */
  describe('P3 & P4: Endpoints y Cabeceras en Servidor Desplegado', () => {
    it('(+) 3.1 Cabeceras de seguridad activas en Home: HSTS, nosniff, SAMEORIGIN', async () => {
      const res = await httpReq('/');
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('(-) 3.2 /api/admin/billing sin autorización debe retornar 401', async () => {
      const res = await httpReq('/api/admin/billing');
      expect(res.status).toBe(401);
    });

    it('(-) 3.3 Rutas debug deshabilitadas en producción/testing deben retornar 404', async () => {
      const rDump = await httpReq('/api/debug/dump');
      const rRun = await httpReq('/api/debug/run-atomic', 'POST', { 'Content-Type': 'application/json' }, '{}');
      expect(rDump.status).toBe(404);
      expect(rRun.status).toBe(404);
    });

    it('(-) 3.4 Worker M2M rechaza token no autorizado con 401', async () => {
      const res = await httpReq('/api/video/worker', 'POST', {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake_hacker_token'
      }, JSON.stringify({ action: 'ping' }));
      expect([401, 403]).toContain(res.status);
    });

    it('(+) 3.5 Worker M2M acepta token Secret Manager de Testing', async () => {
      const res = await httpReq('/api/video/worker', 'POST', {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fastoria_video_worker_secret_testing_2026'
      }, JSON.stringify({ action: 'ping' }));
      // Si la auth es válida, no responde 401 ni 403
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });
});
