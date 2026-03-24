
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(firebaseApp, 'default');

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
    const pageRef = doc(db, 'salesPages', pageId);
    
    // Use setDoc with merge: true to ensure the stats object exists
    await setDoc(pageRef, {
      stats: {
        totalClicks: increment(1),
        channelBreakdown: {
          [channel]: { clicks: increment(1) }
        },
        sourceBreakdown: {
          [source]: { clicks: increment(1) }
        },
        lastActivity: serverTimestamp()
      }
    }, { merge: true });

    // Build the landing URL with UTMs for internal tracking
    const landingUrl = new URL(`/v/${pageId}`, req.url);
    landingUrl.searchParams.set('v', variant);
    landingUrl.searchParams.set('s', source);
    landingUrl.searchParams.set('c', channel);

    return NextResponse.redirect(landingUrl.toString());
  } catch (error) {
    console.error('[API: Track] Error:', error);
    // Even if tracking fails, don't block the user from seeing the landing
    return NextResponse.redirect(new URL(`/v/${pageId}?v=${variant}`, req.url).toString());
  }
}

