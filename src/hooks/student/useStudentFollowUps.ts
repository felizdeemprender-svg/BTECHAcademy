
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, or, limit } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { StudentFollowUp, FollowUpSessionStats } from '@/types/student';

export function useStudentFollowUps() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const db = useFirestore();
  const [sessionStats, setSessionStats] = useState<Record<string, FollowUpSessionStats>>({});
  const [loadingStats, setLoadingStats] = useState(false);

  const followUpsQuery = useMemoFirebase(() => {
    if (!profile?.uid || isAuthLoading) return null;
    const ref = collection(db, 'followups');
    const studentEmail = profile.email?.toLowerCase().trim();
    
    if (!studentEmail) return query(ref, where('studentId', '==', profile.uid), limit(20));
    
    return query(
      ref, 
      or(
        where('studentId', '==', profile.uid), 
        where('studentEmail', '==', studentEmail)
      ), 
      limit(20)
    );
  }, [db, profile?.uid, profile?.email, isAuthLoading]);

  const { data: followUps, isLoading: loadingFollowUps } = useCollection(followUpsQuery);

  useEffect(() => {
    if (followUps && followUps.length > 0) {
      const fetchSessionStats = async () => {
        setLoadingStats(true);
        const stats: Record<string, FollowUpSessionStats> = {};
        for (const fu of followUps) {
          try {
            const sessionsSnap = await getDocs(
              query(
                collection(db, 'followups', fu.id, 'sessions'), 
                where('isCompleted', '==', true)
              )
            );
            stats[fu.id] = { consumed: sessionsSnap.size };
          } catch (e) {}
        }
        setSessionStats(stats);
        setLoadingStats(false);
      };
      fetchSessionStats();
    }
  }, [followUps, db]);

  return {
    followUps: (followUps as StudentFollowUp[]) || [],
    sessionStats,
    isLoading: loadingFollowUps || loadingStats,
    isEmpty: !loadingFollowUps && !loadingStats && (!followUps || followUps.length === 0)
  };
}
