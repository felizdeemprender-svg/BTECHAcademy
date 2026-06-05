
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowUpStatsProps {
  followUpId: string;
  totalPlanned: number;
}

export function FollowUpStats({ followUpId, totalPlanned }: FollowUpStatsProps) {
  const db = useFirestore();
  const [stats, setStats] = useState({ completedSessions: 0, pendingTasks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const [sessionsSnap, tasksSnap] = await Promise.all([
          getDocs(query(collection(db, 'followups', followUpId, 'sessions'), where('isCompleted', '==', true))),
          getDocs(query(collection(db, 'followups', followUpId, 'tasks'), where('status', '!=', 'completed')))
        ]);
        
        if (isMounted) {
          setStats({
            completedSessions: sessionsSnap.size,
            pendingTasks: tasksSnap.size
          });
        }
      } catch (e) {
        console.error("Error fetching follow-up stats:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();
    return () => { isMounted = false; };
  }, [db, followUpId]);

  return (
    <>
      <TableCell className="text-center">
        {loading ? (
          <div className="flex justify-center"><Loader2 className="h-3 w-3 animate-spin opacity-20" /></div>
        ) : (
          <div className="flex flex-col items-center">
            <Badge variant="outline" className="rounded-lg h-6 px-2 font-bold border-primary/10 text-primary">
              {stats.completedSessions} / {totalPlanned}
            </Badge>
            <span className="text-[8px] uppercase font-bold text-muted-foreground mt-1">Consumidas</span>
          </div>
        )}
      </TableCell>
      <TableCell className="text-center">
        {loading ? (
          <div className="flex justify-center"><Loader2 className="h-3 w-3 animate-spin opacity-20" /></div>
        ) : (
          <div className="flex justify-center">
            {stats.pendingTasks > 0 ? (
              <Badge className="bg-amber-500 text-white border-none h-6 gap-1 px-2 font-bold shadow-sm animate-pulse">
                <Zap className="h-3 w-3" /> {stats.pendingTasks} Pend.
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 h-6 gap-1 px-2 font-bold">
                <CheckCircle2 className="h-3 w-3" /> Al Día
              </Badge>
            )}
          </div>
        )}
      </TableCell>
    </>
  );
}
