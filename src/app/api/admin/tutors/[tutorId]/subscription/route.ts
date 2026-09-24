import { NextResponse } from 'next/server';

import { verifyAdmin } from '@/lib/auth/verify-admin';
import { resolveGateway } from '@/lib/api/gateway';
import {
  handleGetTutorSubscription,
  handleUpdateTutorSubscription,
} from '@/lib/api/subscription-admin-handlers';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tutorId: string }> },
) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
  return handleUpdateTutorSubscription(
    await resolveGateway(),
    { uid: adminUid, isAdmin: true },
    (await params).tutorId,
    body,
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tutorId: string }> },
) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return handleGetTutorSubscription(
    await resolveGateway(),
    { uid: adminUid, isAdmin: true },
    (await params).tutorId,
  );
}
