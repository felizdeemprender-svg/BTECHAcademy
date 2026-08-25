import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { StudentTask } from '@/types/student';

export function useStudentTasks(limitCount: number = 50) {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const db = useFirestore();

  // 1. Fetch Tareas Individuales (fuera de seguimiento)
  const indQuery = useMemoFirebase(() => {
    if (!profile?.uid || isAuthLoading) return null;
    return query(collection(db, 'users', profile.uid, 'individualTasks'));
  }, [db, profile?.uid, isAuthLoading]);

  const { data: indTasks, isLoading: isIndLoading, error: indError } = useCollection(indQuery);

  // 2. Fetch Tareas de Seguimientos (dentro de followups/{id}/tasks)
  const [fuTasks, setFuTasks] = useState<any[]>([]);
  const [isFuLoading, setIsFuLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid || isAuthLoading) {
      setIsFuLoading(false);
      return;
    }

    let unsubTasks: any[] = [];

    const fuQuery = query(collection(db, 'followups'), where('studentId', '==', profile.uid));
    const unsubFu = onSnapshot(fuQuery, (fuSnap) => {
      // Limpiar listeners previos si cambian los seguimientos
      unsubTasks.forEach(u => u());
      unsubTasks = [];

      if (fuSnap.empty) {
        setFuTasks([]);
        setIsFuLoading(false);
        return;
      }

      let loadedCount = 0;
      const expected = fuSnap.size;

      fuSnap.forEach(fuDoc => {
        const qTasks = query(collection(db, 'followups', fuDoc.id, 'tasks'));
        const u = onSnapshot(qTasks, (tSnap) => {
          const tasks = tSnap.docs.map(d => ({ ...d.data(), id: d.id, followUpId: fuDoc.id }));
          
          setFuTasks(prev => {
            const filtered = prev.filter(t => t.followUpId !== fuDoc.id);
            return [...filtered, ...tasks];
          });
          
          loadedCount++;
          if (loadedCount >= expected) {
            setIsFuLoading(false);
          }
        });
        unsubTasks.push(u);
      });
    }, (error) => {
      console.warn("⚠️ useStudentTasks (Seguimientos): Error capturado.", error);
      setIsFuLoading(false);
    });

    return () => {
      unsubFu();
      unsubTasks.forEach(u => u());
    };
  }, [db, profile?.uid, isAuthLoading]);

  // 3. Unificar ambas fuentes de datos y ordenar
  const allMergedTasks = useMemo(() => {
    const arr = [...(indTasks || []), ...fuTasks] as StudentTask[];
    arr.sort((a, b) => {
      const aTime = a.createdAt?.seconds || (a.createdAt as any)?._seconds || 0;
      const bTime = b.createdAt?.seconds || (b.createdAt as any)?._seconds || 0;
      return bTime - aTime;
    });
    return arr;
  }, [indTasks, fuTasks]);

  if (indError) {
    console.warn("⚠️ useStudentTasks (Individuales): Error capturado.", indError);
  }

  const isLoading = isIndLoading || isFuLoading;
  const pendingTasks = allMergedTasks.filter((t) => t.status === 'pending');
  const completedTasks = allMergedTasks.filter((t) => t.status === 'completed');

  return {
    tasks: allMergedTasks,
    pendingTasks,
    completedTasks,
    isLoading,
    isEmpty: !isLoading && allMergedTasks.length === 0
  };
}
