import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { channel = 'direct', source = 'direct' } = body;

    const pRef = adminDb.collection('salesPages').doc(id);
    
    await pRef.set({
      stats: {
        conversions: FieldValue.increment(1),
        channelBreakdown: {
          [channel]: { conversions: FieldValue.increment(1) }
        },
        sourceBreakdown: {
          [source]: { conversions: FieldValue.increment(1) }
        }
      }
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking sales page conversion:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
