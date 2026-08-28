import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
export const dynamic = 'force-dynamic';
import { setupTutorBilling } from '@/services/payments/orchestrator';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    const email = userSnap.data()?.email;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

    const { url } = await setupTutorBilling(userId, email, baseUrl);
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('[SetupBilling] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
