
import { collectionGroup, query, where, or, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { StudentTask } from '@/types/student';

export function useStudentTasks(limitCount: number = 50) {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const db = useFirestore();

  const tasksQuery = useMemoFirebase(() => {
    if (!profile?.uid || !profile?.email || isAuthLoading) return null;
    
    return query(
      collectionGroup(db, 'individualTasks'),
      or(
        where('studentId', '==', profile.uid),
        where('studentEmail', '==', profile.email.toLowerCase().trim())
      ),
      orderBy('createdAt', 'desc')
    );
  }, [db, profile?.uid, profile?.email, isAuthLoading]);

  const { data: tasks, isLoading, error } = useCollection(tasksQuery);

  if (error) {
    console.warn("⚠️ useStudentTasks: Error de permisos o consulta capturado.", error);
  }

  const pendingTasks = tasks?.filter((t: any) => t.status === 'pending') as StudentTask[] || [];
  const completedTasks = tasks?.filter((t: any) => t.status === 'completed') as StudentTask[] || [];

  return {
    tasks: (tasks as StudentTask[]) || [],
    pendingTasks,
    completedTasks,
    isLoading,
    isEmpty: !isLoading && (!tasks || tasks.length === 0)
  };
}
