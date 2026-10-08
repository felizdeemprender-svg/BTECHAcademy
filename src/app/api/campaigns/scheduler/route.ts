import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { resolveGateway } from '@/lib/api/gateway';
import { handleRunScheduler } from '@/lib/api/scheduler-handler';

// F1.2 — Autorización Dual: verifyAdmin para el Dashboard, y CRON_SECRET
// para llamadas de Google Cloud Scheduler en background.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const cronSecretHeader = request.headers.get('x-cron-secret');
  const isValidCronSecret = 
    cronSecretHeader === process.env.CRON_SECRET || 
    authHeader === `Bearer ${process.env.CRON_SECRET}`;
  
  let adminUid: string | null = null;
  let verifyError = '';

  try {
    adminUid = await verifyAdmin(request);
  } catch (err: any) {
    verifyError = err.message;
  }
  
  if (!adminUid && !isValidCronSecret) {
    return NextResponse.json({ 
      error: `No autorizado: ${verifyError || 'Invalid Cron Secret'}`
    }, { status: 401 });
  }
  return handleRunScheduler(await resolveGateway());
}
