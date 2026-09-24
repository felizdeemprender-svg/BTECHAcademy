import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { resolveGateway } from '@/lib/api/gateway';
import { handleRunScheduler } from '@/lib/api/scheduler-handler';

// F1.2 — Solo admin (verifyAdmin en el borde, igual que antes). El
// scheduler mantiene su lógica propia (NO reuse de execute-campaign
// manual: cambiaría respuestas); vive en `handleRunScheduler` vía gateway.
export async function GET(request: Request) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return handleRunScheduler(await resolveGateway());
}
