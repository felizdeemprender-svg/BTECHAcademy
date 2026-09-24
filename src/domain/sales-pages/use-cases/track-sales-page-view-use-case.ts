import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export class TrackSalesPageViewUseCase {
  async execute(id: string, channel: string, source: string) {
    if (!id) return;

    try {
      const pRef = adminDb.collection('salesPages').doc(id);

      // Utilizamos FieldValue de firebase-admin para backend
      await pRef.set({
        stats: {
          totalClicks: FieldValue.increment(1),
          channelBreakdown: {
            [channel]: { clicks: FieldValue.increment(1) }
          },
          sourceBreakdown: {
            [source]: { clicks: FieldValue.increment(1) }
          }
        }
      }, { merge: true });

    } catch (e) {
      console.error(`[Tracking] Error registering page view for ${id}:`, e);
      // No lanzamos error para no romper la experiencia si el tracking falla
    }
  }
}
