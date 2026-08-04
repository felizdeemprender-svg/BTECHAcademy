
'use client';

import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  History,
  FileText,
  UserCircle,
  BrainCircuit,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

/** Convierte cualquier formato de fecha de Firestore a Date de forma segura */
function toDate(value: any): Date | null {
  if (!value) return null;
  // Firestore Timestamp ({seconds, nanoseconds})
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}


interface TaskTableProps {
  tasks: any[];
  isLoading: boolean;
  type: 'pending' | 'history';
  onAction: (task: any) => void;
}

export function TaskTable({ tasks, isLoading, type, onAction }: TaskTableProps) {
  if (isLoading) {
    return (
      <div className="p-20 text-center text-muted-foreground animate-pulse font-medium">
        Sincronizando desafíos...
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-20 text-center italic text-muted-foreground">
        {type === 'pending' ? 'No tienes desafíos pendientes.' : 'No hay historial de desafíos.'}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader className="bg-secondary/50 border-b">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="font-bold py-4 px-6 text-foreground text-[11px] uppercase tracking-wider">Desafío / Mentor</TableHead>
              {type === 'history' && <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Resultado</TableHead>}
              <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">
                {type === 'pending' ? 'Asignado' : 'Completado'}
              </TableHead>
              <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Estado</TableHead>
              <TableHead className="text-right py-4 px-6 text-foreground text-[11px] uppercase tracking-wider">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id} className="hover:bg-secondary/20 border-b transition-colors">
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-bold border shrink-0 shadow-sm",
                      type === 'pending' ? "bg-accent/5 text-accent border-accent/10" : "bg-success/10 text-success border-success/15"
                    )}>
                      {type === 'pending' ? <Zap className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground line-clamp-1">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <UserCircle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{task.mentorName || 'Sistema'}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>

                {type === 'history' && (
                  <TableCell className="text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-lg font-black text-success leading-none">{task.score || 0}%</span>
                      <span className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest mt-1">Score IA</span>
                    </div>
                  </TableCell>
                )}

                <TableCell className="text-center font-medium text-muted-foreground text-sm">
                  {(() => { const d = toDate(task.completedAt || task.createdAt); return d ? format(d, 'dd/MM/yyyy') : '-'; })()}
                </TableCell>

                <TableCell className="text-center">
                  <Badge className={cn(
                    "text-[9px] uppercase tracking-widest px-2 h-5 border-none",
                    type === 'pending' ? "bg-warn/10 text-warn" : "bg-success/10 text-success"
                  )}>
                    {type === 'pending' ? 'Pendiente' : 'Completado'}
                  </Badge>
                </TableCell>

                <TableCell className="text-right px-6">
                  <Button 
                    onClick={() => onAction(task)}
                    size="sm" 
                    variant="ghost" 
                    className={cn(
                      "rounded-xl h-9 px-4 font-bold transition-colors",
                      type === 'pending' ? "text-accent hover:bg-accent/10" : "text-primary hover:bg-primary/10"
                    )}
                  >
                    {type === 'pending' ? 'Contestar' : 'Ver Detalle'} <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y">
        {tasks.map((task) => (
          <div key={task.id} className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold border shrink-0",
                  type === 'pending' ? "bg-accent/5 text-accent border-accent/10" : "bg-success/10 text-success border-success/15"
                )}>
                  {type === 'pending' ? <Zap className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground leading-tight">{task.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <UserCircle className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{task.mentorName || 'Sistema'}</span>
                  </div>
                </div>
              </div>
              {type === 'history' && (
                <div className="text-right">
                  <span className="text-lg font-black text-success block">{task.score}%</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 py-2 border-y border-dashed">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter">Fecha</span>
                <span className="text-xs font-bold">
                  {(() => { const d = toDate(task.completedAt || task.createdAt); return d ? format(d, 'dd/MM/yyyy') : '-'; })()}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter">Estado</span>
                <Badge className={cn(
                  "text-[8px] uppercase tracking-widest px-2 h-5 border-none w-fit",
                  type === 'pending' ? "bg-warn/10 text-warn" : "bg-success/10 text-success"
                )}>
                  {type === 'pending' ? 'Pendiente' : 'Completado'}
                </Badge>
              </div>
            </div>

            <Button 
              onClick={() => onAction(task)}
              className={cn(
                "w-full h-11 rounded-xl font-bold text-xs gap-2 shadow-lg",
                type === 'pending' ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
              )}
            >
              {type === 'pending' ? (
                <><MessageSquare className="h-4 w-4" /> Contestar Ahora</>
              ) : (
                <><FileText className="h-4 w-4" /> Ver Retroalimentación</>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
