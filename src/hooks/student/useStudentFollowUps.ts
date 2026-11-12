import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, or, limit } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { isNewMentoringApiEnabled } from '@/lib/feature-flags';
import { fetchProgramSessions, fetchStudentPrograms } from '@/lib/api/mentoring-client';
import { StudentFollowUp, FollowUpSessionStats } from '@/types/student';

export function useStudentFollowUps() {
  const { profile, user, isLoading: isAuthLoading } = useAuth();
  const db = useFirestore();
  const useApi = isNewMentoringApiEnabled();

  const [apiFollowUps, setApiFollowUps] = useState<StudentFollowUp[]>([]);
  const [apiLoading, setApiLoading] = useState(useApi);
  const [sessionStats, setSessionStats] = useState<Record<string, FollowUpSessionStats>>({});
  const [loadingStats, setLoadingStats] = useState(false);

  // Modo API (incluye individuales por uid/email y grupales asignadas vía enrollments)
  useEffect(() => {
    if (!useApi || isAuthLoading) return;
    if (!user || !profile?.uid) {
      setApiFollowUps([]);
      setApiLoading(false);
      return;
    }

    let cancelled = false;
    setApiLoading(true);

    (async () => {
      try {
        const token = await user.getIdToken();
        const summaries = await fetchStudentPrograms(token);
        if (cancelled) return;

        const mapped = summaries.map((s) => ({
          ...s.program,
          id: s.program.id,
          type: s.program.type,
          title: s.program.title,
          goal: s.program.goal ?? '',
          mentorId: s.program.mentorId,
          studentId: s.program.studentId ?? '',
          studentName: s.program.studentName,
          studentEmail: s.program.studentEmail,
          totalSessions: s.program.totalSessions,
          status: s.program.status,
          masterFileUrl: s.program.masterFileUrl ?? undefined,
          createdAt: s.program.createdAt,
        })) as StudentFollowUp[];

        setApiFollowUps(mapped);
        setApiLoading(false);

        if (mapped.length > 0) {
          setLoadingStats(true);
          const entries = await Promise.all(
            mapped.map(async (fu) => {
              try {
                const sessions = await fetchProgramSessions(fu.id, token);
                const consumed = sessions.filter(
                  (sess: any) => sess.isCompleted || sess.status === 'completed'
                ).length;
                return [fu.id, { consumed }] as const;
              } catch {
                return [fu.id, { consumed: 0 }] as const;
              }
            })
          );
          if (!cancelled) {
            setSessionStats(Object.fromEntries(entries));
            setLoadingStats(false);
          }
        }
      } catch (err) {
        console.warn('⚠️ useStudentFollowUps (API): Error cargando mentorías.', err);
        if (!cancelled) {
          setApiFollowUps([]);
          setApiLoading(false);
          setLoadingStats(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [useApi, isAuthLoading, user, profile?.uid]);

  // Modo legacy Firestore directo (solo si el flag está apagado; evita or() bloqueado por rules)
  const legacyQuery = useMemoFirebase(() => {
    if (useApi || !profile?.uid || isAuthLoading) return null;
    return query(collection(db, 'followups'), where('studentId', '==', profile.uid), limit(20));
  }, [useApi, db, profile?.uid, isAuthLoading]);

  const { data: legacyFollowUps, isLoading: loadingLegacy, error } = useCollection(legacyQuery);

  if (error) {
    console.warn('⚠️ useStudentFollowUps: Error de permisos capturado.', error);
  }

  useEffect(() => {
    if (useApi || !legacyFollowUps || legacyFollowUps.length === 0) return;

    let cancelled = false;
    const fetchSessionStats = async () => {
      setLoadingStats(true);
      const stats: Record<string, FollowUpSessionStats> = {};
      for (const fu of legacyFollowUps) {
        try {
          const sessionsSnap = await getDocs(
            query(
              collection(db, 'followups', fu.id, 'sessions'),
              or(where('isCompleted', '==', true), where('status', '==', 'completed'))
            )
          );
          stats[fu.id] = { consumed: sessionsSnap.size };
        } catch {}
      }
      if (!cancelled) {
        setSessionStats(stats);
        setLoadingStats(false);
      }
    };
    fetchSessionStats();

    return () => {
      cancelled = true;
    };
  }, [useApi, legacyFollowUps, db]);

  const followUps = useMemo(
    () => (useApi ? apiFollowUps : ((legacyFollowUps as StudentFollowUp[]) || [])),
    [useApi, apiFollowUps, legacyFollowUps]
  );

  const isLoading = (useApi ? apiLoading : loadingLegacy) || loadingStats;

  return {
    followUps,
    sessionStats,
    isLoading,
    isEmpty: !isLoading && followUps.length === 0,
  };
}
