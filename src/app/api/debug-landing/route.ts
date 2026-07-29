import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'No id' });

  try {
    await adminDb.collection('salesPages').doc(id).update({ isActive: true });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'No id' });

  try {
    const snap = await adminDb.collection('salesPages').doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' });
    return NextResponse.json(snap.data());
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
