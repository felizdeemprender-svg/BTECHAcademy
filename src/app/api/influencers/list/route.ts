import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

/**
 * GET /api/influencers/list?mentorUid=xxx
 * Returns all referidos for a given mentor, enriched with stats.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mentorUid = searchParams.get('mentorUid');

    if (!mentorUid) {
      return NextResponse.json({ error: 'mentorUid is required' }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Get all referidos from mentor's subcollection
    const referidosSnap = await db
      .collection('mentorInfluencers')
      .doc(mentorUid)
      .collection('referidos')
      .get();

    if (referidosSnap.empty) {
      return NextResponse.json({ influencers: [] });
    }

    const referidoDocs = referidosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const influencerIds = referidoDocs.map(d => d.id);

    // Get landings assigned to these influencers for this mentor
    const landingsSnap = await db
      .collection('salesPages')
      .where('mentorId', '==', mentorUid)
      .get();

    const influencerLandingsCount: Record<string, number> = {};
    const relevantLandingIds: string[] = [];

    landingsSnap.docs.forEach(d => {
      const data = d.data();
      if (data.referidoId && influencerIds.includes(data.referidoId)) {
        relevantLandingIds.push(d.id);
        influencerLandingsCount[data.referidoId] = (influencerLandingsCount[data.referidoId] || 0) + 1;
      }
    });

    // Get leads for these landings
    const influencerLeads: Record<string, { total: number; converted: number }> = {};

    if (relevantLandingIds.length > 0) {
      // Batch in groups of 10 (Firestore 'in' limit)
      for (let i = 0; i < relevantLandingIds.length; i += 10) {
        const batch = relevantLandingIds.slice(i, i + 10);
        const leadsSnap = await db
          .collection('leads')
          .where('landingId', 'in', batch)
          .get();

        leadsSnap.docs.forEach(d => {
          const data = d.data();
          if (data.referidoId) {
            if (!influencerLeads[data.referidoId]) {
              influencerLeads[data.referidoId] = { total: 0, converted: 0 };
            }
            influencerLeads[data.referidoId].total++;
            if (data.status === 'converted') {
              influencerLeads[data.referidoId].converted++;
            }
          }
        });
      }
    }

    const influencers = referidoDocs.map((ref: any) => ({
      uid: ref.id,
      name: ref.displayName || 'Usuario sin nombre',
      email: ref.email || 'Sin email',
      photoURL: ref.photoURL || null,
      totalLeads: influencerLeads[ref.id]?.total || 0,
      convertedLeads: influencerLeads[ref.id]?.converted || 0,
      assignedLandings: influencerLandingsCount[ref.id] || 0,
    }));

    return NextResponse.json({ influencers });

  } catch (error: any) {
    console.error('[API Influencers List] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
