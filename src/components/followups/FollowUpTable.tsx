
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
  ClipboardList, 
  UserCircle, 
  ChevronRight, 
  MoreVertical, 
  Pencil, 
  PlayCircle, 
  PauseCircle, 
  FileText, 
  Trash2 
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FollowUpStats } from './FollowUpStats';
import { useRouter } from 'next/navigation';

interface FollowUpTableProps {
  followUps: any[];
  isLoading: boolean;
  isAdmin: boolean;
  isMentor: boolean;
  onEdit: (f: any) => void;
  onToggleStatus: (f: any) => void;
  onDelete: (f: any) => void;
}

export function FollowUpTable({ 
  followUps, 
  isLoading, 
  isAdmin, 
  isMentor,
  onEdit,
  onToggleStatus,
  onDelete
}: FollowUpTableProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="p-20 text-center text-muted-foreground animate-pulse font-medium">
        Sincronizando seguimientos...
      </div>
    );
  }

  if (followUps.length === 0) {
    return (
      <div className="p-20 text-center italic text-muted-foreground">
        No se encontraron registros de seguimiento.
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
              <TableHead className="font-bold py-4 px-6 text-foreground text-[11px] uppercase tracking-wider">Programa / Alumno</TableHead>
              <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Sesiones (Hechas/Plan)</TableHead>
              <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Plan de Acción</TableHead>
              <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Inicio</TableHead>
              <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Estado</TableHead>
              <TableHead className="text-right py-4 px-6 text-foreground text-[11px] uppercase tracking-wider">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {followUps.map((f) => (
              <TableRow key={f.id} className={cn("hover:bg-secondary/20 border-b transition-colors", f.status === 'suspended' && "opacity-60 bg-muted/10")}>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-bold border shrink-0">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground line-clamp-1">{f.title}</p>
                        {f.type === 'group' ? (
                          <Badge className="text-[9px] h-4 bg-primary/20 text-primary hover:bg-primary/30 py-0 border-none shrink-0">Grupal</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] h-4 text-muted-foreground border-muted-foreground/30 py-0 shrink-0">1 a 1</Badge>
                        )}
                        {f.planGuideUrl && <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" title="Guía disponible" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <UserCircle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{f.studentName}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                
                <FollowUpStats followUpId={f.id} totalPlanned={f.totalSessions} />

                <TableCell className="text-center font-medium text-muted-foreground text-sm">
                  {f.startDate ? format(new Date(f.startDate), 'dd/MM/yyyy') : '-'}
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={cn(
                    "text-[9px] uppercase tracking-widest px-2 h-5 border-none",
                    f.status === 'active' ? "bg-success/10 text-success" : 
                    f.status === 'suspended' ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground"
                  )}>
                    {f.status === 'active' ? 'En Curso' : f.status === 'suspended' ? 'Suspendido' : 'Finalizado'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right px-6">
                  <div className="flex justify-end items-center gap-2">
                    <Button 
                      onClick={() => router.push(`/seguimientos/${f.id}`)}
                      size="sm" 
                      variant="ghost" 
                      className="rounded-xl h-9 px-4 font-bold text-primary hover:bg-primary/10 transition-colors"
                    >
                      Gestionar <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    {(isMentor || isAdmin) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs font-bold">
                          <DropdownMenuItem onClick={() => onEdit(f)} className="gap-2 py-2 cursor-pointer">
                            <Pencil className="h-3.5 w-3.5" /> Editar Programa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggleStatus(f)} className="gap-2 py-2 cursor-pointer">
                            {f.status === 'suspended' ? (
                              <><PlayCircle className="h-3.5 w-3.5 text-success" /> Habilitar Seguimiento</>
                            ) : (
                              <><PauseCircle className="h-3.5 w-3.5 text-warn" /> Suspender Seguimiento</>
                            )}
                          </DropdownMenuItem>
                          {f.planGuideUrl && (
                            <DropdownMenuItem onClick={() => window.open(f.planGuideUrl, '_blank')} className="gap-2 py-2 cursor-pointer">
                              <FileText className="h-3.5 w-3.5 text-blue-500" /> Ver Guía del Plan
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onDelete(f)}
                            className="text-destructive gap-2 py-2 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar Definitivamente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y">
        {followUps.map((f) => (
          <div key={f.id} className={cn("p-4 space-y-4", f.status === 'suspended' && "opacity-60 bg-muted/10")}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-bold border shrink-0">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground leading-tight">{f.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <UserCircle className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{f.studentName}</span>
                  </div>
                </div>
              </div>
              <Badge className={cn(
                "text-[8px] uppercase tracking-widest px-2 h-5 border-none",
                f.status === 'active' ? "bg-success/10 text-success" : 
                f.status === 'suspended' ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground"
              )}>
                {f.status === 'active' ? 'En Curso' : f.status === 'suspended' ? 'Suspendido' : 'Finalizado'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 py-2 border-y border-dashed">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter">Sesiones</span>
                <div className="flex items-center gap-2">
                   {/* Reutilizamos FollowUpStats pero solo necesitamos el valor, así que lo simulamos o extraemos lógica */}
                   <span className="text-xs font-bold">Consultar detalle →</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter">Inicio</span>
                <span className="text-xs font-bold">{f.startDate ? format(new Date(f.startDate), 'dd/MM/yyyy') : '-'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                onClick={() => router.push(`/seguimientos/${f.id}`)}
                className="flex-1 h-11 rounded-xl font-bold text-xs gap-2"
              >
                Gestionar Seguimiento <ChevronRight className="h-4 w-4" />
              </Button>
              {(isMentor || isAdmin) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 text-sm font-bold p-2">
                    <DropdownMenuItem onClick={() => onEdit(f)} className="gap-3 py-3 rounded-lg">
                      <Pencil className="h-4 w-4" /> Editar Programa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleStatus(f)} className="gap-3 py-3 rounded-lg">
                      {f.status === 'suspended' ? (
                        <><PlayCircle className="h-4 w-4 text-success" /> Habilitar</>
                      ) : (
                        <><PauseCircle className="h-4 w-4 text-warn" /> Suspender</>
                      )}
                    </DropdownMenuItem>
                    {f.planGuideUrl && (
                      <DropdownMenuItem onClick={() => window.open(f.planGuideUrl, '_blank')} className="gap-3 py-3 rounded-lg">
                        <FileText className="h-4 w-4 text-blue-500" /> Ver Guía
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(f)}
                      className="text-destructive gap-3 py-3 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
