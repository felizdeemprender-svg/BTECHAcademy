import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { resolveGateway } from '@/lib/api/gateway';
import { handleRunScheduler } from '@/lib/api/scheduler-handler';

// F1.2 — Autorización Dual: verifyAdmin para el Dashboard, y CRON_SECRET
// para llamadas de Google Cloud Scheduler en background.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const isValidCronSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  
  const adminUid = await verifyAdmin(request);
  
  if (!adminUid && !isValidCronSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return handleRunScheduler(await resolveGateway());
}
