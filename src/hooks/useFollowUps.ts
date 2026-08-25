
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, or, orderBy, onSnapshot, serverTimestamp, doc, setDoc, updateDoc, deleteDoc, getCountFromServer } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { StudentFollowUp, FollowUpSessionStats } from '@/types/student';

export function useFollowUps() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const db = useFirestore();
  const [followUps, setFollowUps] = useState<StudentFollowUp[]>([]);
  const [sessionStats, setSessionStats] = useState<Record<string, FollowUpSessionStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = profile?.roles.includes('admin');
  const isMentor = profile?.roles.includes('mentor');

  useEffect(() => {
    // No iniciar si el auth está cargando o no hay perfil con roles
    if (isAuthLoading || !profile?.uid || !profile?.roles) return;

    setIsLoading(true);
    const ref = collection(db, 'followups');
    let q;

    try {
      if (isAdmin) {
        q = query(ref);
      } else if (isMentor) {
        q = query(ref, where('mentorId', '==', profile.uid));
      } else {
        // Evitamos or() que causa crashes internos en el SDK de Firebase
        q = query(ref, where('studentId', '==', profile.uid));
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        let data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as StudentFollowUp));
        
        data.sort((a, b) => {
          const timeA = a.createdAt?.seconds || a.createdAt?._seconds || 0;
          const timeB = b.createdAt?.seconds || b.createdAt?._seconds || 0;
          return timeB - timeA;
        });

        setFollowUps(data);
        setIsLoading(false);
        setError(null);
      }, (err) => {
        console.error("[useFollowUps] Snapshot error:", err);
        setError(err.message);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (err: any) {
      console.error("[useFollowUps] Setup error:", err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [db, profile?.uid, profile?.email, profile?.roles, isAuthLoading, isAdmin, isMentor]);

  // Fetch session stats
  useEffect(() => {
    if (followUps.length === 0) return;

    const fetchAllStats = async () => {
      const stats: Record<string, FollowUpSessionStats> = {};
      await Promise.all(followUps.map(async (fu) => {
        try {
          const sessionsSnap = await getDocs(
            query(collection(db, 'followups', fu.id, 'sessions'), or(where('isCompleted', '==', true), where('status', '==', 'completed')))
          );
          stats[fu.id] = { consumed: sessionsSnap.size };
        } catch (e) {
          console.error(`Error fetching stats for ${fu.id}:`, e);
        }
      }));
      setSessionStats(stats);
    };

    fetchAllStats();
  }, [followUps, db]);

  return {
    followUps,
    sessionStats,
    isLoading,
    error,
    isAdmin,
    isMentor
  };
}
