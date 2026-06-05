import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageId = searchParams.get('pageId');
  const variant = searchParams.get('v') || '0';
  const source = searchParams.get('source') || 'unknown';
  const channel = searchParams.get('channel') || 'unknown';

  if (!pageId) {
    return NextResponse.json({ error: 'Missing pageId' }, { status: 400 });
  }

  try {
    const pageRef = adminDb.collection('salesPages').doc(pageId);
    
    // Use set with merge: true to ensure the stats object exists and is updated
    await pageRef.set({
      stats: {
        totalClicks: FieldValue.increment(1),
        channelBreakdown: {
          [channel]: { clicks: FieldValue.increment(1) }
        },
        sourceBreakdown: {
          [source]: { clicks: FieldValue.increment(1) }
        },
        lastActivity: FieldValue.serverTimestamp()
      }
    }, { merge: true });

    // Build the landing URL with UTMs for internal tracking
    const landingUrl = new URL(`/v/${pageId}`, req.url);
    landingUrl.searchParams.set('v', variant);
    landingUrl.searchParams.set('s', source);
    landingUrl.searchParams.set('c', channel);

    return NextResponse.redirect(landingUrl.toString());
  } catch (error) {
    console.error('[API: Track GET] Error:', error);
    // Even if tracking fails, don't block the user from seeing the landing
    return NextResponse.redirect(new URL(`/v/${pageId}?v=${variant}`, req.url).toString());
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, pageId, source, channel } = body;

    if (!pageId) {
      return NextResponse.json({ error: 'Missing pageId' }, { status: 400 });
    }

    const s = source || 'direct';
    const c = channel || 'direct';

    const pageRef = adminDb.collection('salesPages').doc(pageId);

    if (type === 'click') {
      await pageRef.set({
        stats: {
          totalClicks: FieldValue.increment(1),
          channelBreakdown: {
            [c]: { clicks: FieldValue.increment(1) }
          },
          sourceBreakdown: {
            [s]: { clicks: FieldValue.increment(1) }
          },
          lastActivity: FieldValue.serverTimestamp()
        }
      }, { merge: true });
    } else if (type === 'conversion') {
      await pageRef.set({
        stats: {
          conversions: FieldValue.increment(1),
          channelBreakdown: {
            [c]: { conversions: FieldValue.increment(1) }
          },
          sourceBreakdown: {
            [s]: { conversions: FieldValue.increment(1) }
          },
          lastActivity: FieldValue.serverTimestamp()
        }
      }, { merge: true });
    } else {
      return NextResponse.json({ error: 'Invalid tracking type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API: Track POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
