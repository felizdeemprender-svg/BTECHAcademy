import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { isNewMentoringApiEnabled } from '@/lib/feature-flags';
import { fetchProgramTasks, fetchStudentPrograms } from '@/lib/api/mentoring-client';
import {
  enrichLinkedTasksWithEnrollments,
  type EnrollmentProgressSnapshot,
} from '@/lib/courses/sync-mentoring-tasks';
import { StudentTask } from '@/types/student';

function toEpochMs(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value?._seconds === 'number') return value._seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function useStudentTasks(_limitCount: number = 50) {
  const { profile, user, isLoading: isAuthLoading } = useAuth();
  const db = useFirestore();
  const useApi = isNewMentoringApiEnabled();

  // 1. Fetch Tareas Individuales (users/{uid}/individualTasks)
  const indQuery = useMemoFirebase(() => {
    if (!profile?.uid || isAuthLoading) return null;
    return query(collection(db, 'users', profile.uid, 'individualTasks'));
  }, [db, profile?.uid, isAuthLoading]);

  const { data: indTasks, isLoading: isIndLoading, error: indError } = useCollection(indQuery);

  // 2. Fetch Tareas de Seguimientos (followups/{id}/tasks)
  const [fuTasks, setFuTasks] = useState<any[]>([]);
  const [isFuLoading, setIsFuLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  const refetch = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!profile?.uid || isAuthLoading) {
      setIsFuLoading(false);
      return;
    }

    if (useApi && user) {
      let cancelled = false;
      setIsFuLoading(true);
      (async () => {
        try {
          const token = await user.getIdToken();
          const programs = await fetchStudentPrograms(token);
          if (cancelled) return;
          if (programs.length === 0) {
            setFuTasks([]);
            setIsFuLoading(false);
            return;
          }
          const taskBatches = await Promise.all(
            programs.map(async (s) => {
              try {
                const tasks = await fetchProgramTasks(s.program.id, token);
                return tasks.map((t: any) => ({ ...t, followUpId: s.program.id }));
              } catch {
                return [];
              }
            })
          );
          if (!cancelled) {
            setFuTasks(taskBatches.flat());
            setIsFuLoading(false);
          }
        } catch (err) {
          console.warn('⚠️ useStudentTasks (API Seguimientos): Error capturado.', err);
          if (!cancelled) {
            setFuTasks([]);
            setIsFuLoading(false);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    let unsubTasks: Array<() => void> = [];

    const fuQuery = query(collection(db, 'followups'), where('studentId', '==', profile.uid));
    const unsubFu = onSnapshot(
      fuQuery,
      (fuSnap) => {
        unsubTasks.forEach((u) => u());
        unsubTasks = [];

        if (fuSnap.empty) {
          setFuTasks([]);
          setIsFuLoading(false);
          return;
        }

        let loadedCount = 0;
        const expected = fuSnap.size;

        fuSnap.forEach((fuDoc) => {
          const qTasks = query(collection(db, 'followups', fuDoc.id, 'tasks'));
          const u = onSnapshot(qTasks, (tSnap) => {
            const tasks = tSnap.docs.map((d) => ({ ...d.data(), id: d.id, followUpId: fuDoc.id }));

            setFuTasks((prev) => {
              const filtered = prev.filter((t) => t.followUpId !== fuDoc.id);
              return [...filtered, ...tasks];
            });

            loadedCount++;
            if (loadedCount >= expected) {
              setIsFuLoading(false);
            }
          });
          unsubTasks.push(u);
        });
      },
      (error) => {
        console.warn('⚠️ useStudentTasks (Seguimientos): Error capturado.', error);
        setIsFuLoading(false);
      }
    );

    return () => {
      unsubFu();
      unsubTasks.forEach((u) => u());
    };
  }, [useApi, db, user, profile?.uid, isAuthLoading, reloadTick]);

  // 2.5 Fetch Enrollments del alumno para derivar progreso en cursos/módulos vinculados (incluyendo mentorías grupales)
  const [studentEnrollments, setStudentEnrollments] = useState<EnrollmentProgressSnapshot[]>([]);

  useEffect(() => {
    if (!db || !profile?.uid || isAuthLoading) {
      setStudentEnrollments([]);
      return;
    }

    let byIdDocs: Array<EnrollmentProgressSnapshot & { id: string }> = [];
    let byEmailDocs: Array<EnrollmentProgressSnapshot & { id: string }> = [];

    const mergeEnrollments = () => {
      const map = new Map<string, EnrollmentProgressSnapshot>();
      for (const e of [...byIdDocs, ...byEmailDocs]) {
        map.set(e.id, e);
      }
      setStudentEnrollments(Array.from(map.values()));
    };

    const qById = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
    const unsubById = onSnapshot(
      qById,
      (snap) => {
        byIdDocs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as EnrollmentProgressSnapshot) }));
        mergeEnrollments();
      },
      () => {}
    );

    const normalizedEmail = profile.email?.toLowerCase().trim() || '';
    let unsubByEmail: (() => void) | undefined;
    if (normalizedEmail) {
      const qByEmail = query(
        collection(db, 'enrollments'),
        where('inviteEmail', '==', normalizedEmail)
      );
      unsubByEmail = onSnapshot(
        qByEmail,
        (snap) => {
          byEmailDocs = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as EnrollmentProgressSnapshot),
          }));
          mergeEnrollments();
        },
        () => {}
      );
    }

    return () => {
      unsubById();
      if (unsubByEmail) unsubByEmail();
    };
  }, [db, profile?.uid, profile?.email, isAuthLoading, reloadTick]);

  // 3. Unificar ambas fuentes de datos, enriquecer tareas vinculadas y ordenar
  const allMergedTasks = useMemo(() => {
    const merged = [...(indTasks || []), ...fuTasks] as StudentTask[];
    const enriched = enrichLinkedTasksWithEnrollments(merged, studentEnrollments);
    enriched.sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
    return enriched;
  }, [indTasks, fuTasks, studentEnrollments]);

  if (indError) {
    console.warn('⚠️ useStudentTasks (Individuales): Error capturado.', indError);
  }

  const isLoading = isIndLoading || isFuLoading;
  const pendingTasks = allMergedTasks.filter((t) => t.status === 'pending');
  const completedTasks = allMergedTasks.filter((t) => t.status === 'completed');

  return {
    tasks: allMergedTasks,
    pendingTasks,
    completedTasks,
    isLoading,
    isEmpty: !isLoading && allMergedTasks.length === 0,
    refetch,
  };
}
