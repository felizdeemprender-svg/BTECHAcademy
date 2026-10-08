'use client';

import React, { useState, useMemo } from 'react';
import { Play, Pause, Instagram, Linkedin, Twitter, Mail, Calendar, Clock, Activity, Video, Search, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useMentorCampaigns } from '@/hooks/mentoring/use-mentor-campaigns';
import { useToast } from '@/hooks/use-toast';

const NetworkIcon = ({ network, className = "w-3 h-3" }: { network: string, className?: string }) => {
  switch (network.toLowerCase()) {
    case 'instagram': return <Instagram className={className} />;
    case 'linkedin': return <Linkedin className={className} />;
    case 'twitter': 
    case 'x': return <Twitter className={className} />;
    case 'email': return <Mail className={className} />;
    case 'tiktok': return <Video className={className} />;
    case 'youtube': return <Play className={className} />;
    default: return <Activity className={className} />;
  }
};

const getNetworkColorClasses = (network: string) => {
  switch (network.toLowerCase()) {
    case 'instagram': return 'bg-pink-50 text-pink-700 border-pink-200 hover:border-pink-300 hover:bg-pink-100';
    case 'linkedin': return 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300 hover:bg-blue-100';
    case 'tiktok': return 'bg-slate-100 text-slate-800 border-slate-300 hover:border-slate-400 hover:bg-slate-200';
    case 'youtube': return 'bg-red-50 text-red-700 border-red-200 hover:border-red-300 hover:bg-red-100';
    case 'twitter': 
    case 'x': return 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100';
    case 'email': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100';
    default: return 'bg-muted/30 text-foreground border-border hover:border-primary/30 hover:bg-muted/50';
  }
};

export default function CampaignsCommandCenter() {
  const { user, profile } = useAuth();
  const { data: dbData, isLoading } = useMentorCampaigns(profile?.uid);
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleForceSync = async () => {
    if (!user) return;
    try {
      setIsSyncing(true);
      const token = await user.getIdToken();
      const res = await fetch('/api/campaigns/scheduler', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "Sincronización Completada",
          description: `Se procesaron ${data.dispatchesExecuted || 0} acciones atrasadas o pendientes.`,
        });
        // We could mutate/reload campaigns here if we used SWR/React Query mutate, 
        // but `useMentorCampaigns` might auto-refresh via Firestore onSnapshot
      } else {
        toast({
          title: "Error de sincronización",
          description: data.error || data.details || "Falló la comunicación con el orquestador",
          variant: "destructive"
        });
      }
    } catch (e: any) {
      toast({
        title: "Error inesperado",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const activeCampaigns = useMemo(() => {
    if (!dbData) return [];
    return dbData
      .filter((s: any) => s.executable)
      .map((s: any) => {
        const c = s.campaign;
        const timelineRaw = c.strategy?.timeline ?? [];
        const executionLogs = c.executionLogs ?? [];
        const isActive = c.isActive ?? false;
        const autoPilot = c.autoPilot ?? false;

        const mappedTimeline = timelineRaw.map((event: any) => {
          const events: any[] = [];
          
          if (event.socialSchedule) {
            Object.keys(event.socialSchedule).forEach(plat => {
              const arr = Array.isArray(event.socialSchedule[plat]) ? event.socialSchedule[plat] : [event.socialSchedule[plat]];
              arr.forEach((sch: any) => {
                const vName = sch.videoName || sch.marketingName || sch.assetName || sch.name || 'Contenido';
                const vTime = sch.time || '12:00';
                const format = sch.format || 'post';
                
                const log = executionLogs.find((l: any) => l.day === event.day && (l.videoName === sch.videoName || l.action === sch.videoName || l.videoName === vName) && (l.platform === plat || !l.platform));
                
                let status = 'pending';
                let errorMessage = undefined;
                if (log) {
                  status = log.status === 'success' ? 'success' : 'error';
                  if (status === 'error') errorMessage = log.feedback || log.errorMessage;
                }

                events.push({
                  network: plat,
                  time: vTime,
                  format: format,
                  status: status,
                  errorMessage: errorMessage
                });
              });
            });
          } else if (event.channels) {
             event.channels.forEach((ch: string) => {
                const log = executionLogs.find((l: any) => l.day === event.day && l.action === event.action && (!l.platform || l.platform === ch));
                let status = 'pending';
                let errorMessage = undefined;
                if (log) {
                  status = log.status === 'success' ? 'success' : 'error';
                  if (status === 'error') errorMessage = log.feedback || log.errorMessage;
                }
                events.push({
                   network: ch,
                   time: '08:00',
                   format: 'post',
                   status,
                   errorMessage
                });
             });
          }

          return {
            day: event.day,
            events
          };
        });

        return {
          id: c.id,
          title: c.title,
          status: c.status || 'active',
          progress: s.progressPercent || 0,
          currentDay: s.currentDay,
          startDate: c.startDate || new Date().toISOString().split('T')[0],
          timeline: mappedTimeline
        };
      });
  }, [dbData]);

  const baseDate = activeCampaigns.length > 0 && activeCampaigns[0].startDate
    ? new Date(activeCampaigns[0].startDate + 'T12:00:00Z')
    : new Date();
  
  const maxDays = 14;
  const calendarDays = Array.from({ length: maxDays }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    return d;
  });
  
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCampaigns = activeCampaigns.filter((camp: any) => 
    camp.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="bg-background text-foreground p-8 font-body">
        {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-headline tracking-tight mb-2">Centro de Mando</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Orquestador y Scheduler en Piloto Automático
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar campaña..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-prof pl-9 h-10 w-64 text-sm"
            />
          </div>
          <button className="btn-prof px-4 py-2 bg-background border text-foreground flex items-center gap-2 hover:bg-muted">
            <Calendar className="w-4 h-4" />
            Octubre 2026
          </button>
          <button 
            onClick={handleForceSync}
            disabled={isSyncing}
            className="btn-prof px-4 py-2 bg-primary text-primary-foreground flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isSyncing ? "Sincronizando..." : "Forzar Sincronización"}
          </button>
        </div>
      </div>

      {/* Timeline Gantt Chart */}
      <div className="card-prof overflow-x-auto bg-card">
        {/* Timeline Header (Days) */}
        <div className="grid grid-cols-[300px_1fr] border-b border-border bg-muted/30 min-w-max">
          <div className="p-4 font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center">
            Campaña Activa
          </div>
          <div className="grid divide-x divide-border/50" style={{ gridTemplateColumns: `repeat(${maxDays}, minmax(180px, 1fr))` }}>
            {calendarDays.map((date, i) => (
              <div key={i} className="p-4 text-center">
                <span className="text-xs text-muted-foreground block uppercase font-bold">
                  {date.toLocaleString('es-ES', { month: 'short' })}
                </span>
                <span className="text-lg font-headline">{date.getDate().toString().padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Loading / Empty State */}
        {isLoading && (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
          </div>
        )}
        {!isLoading && filteredCampaigns.length === 0 && (
          <div className="py-20 flex flex-col justify-center items-center text-muted-foreground">
            <Activity className="w-12 h-12 opacity-20 mb-4" />
            <p className="font-bold text-lg">No hay campañas en ejecución</p>
            <p className="text-sm">Inicia una campaña en modo piloto automático para verla aquí.</p>
          </div>
        )}

        {/* Timeline Rows */}
        <div className="divide-y divide-border/50">
          {filteredCampaigns.map((camp: any) => (
            <div key={camp.id} className="grid grid-cols-[300px_1fr] hover:bg-muted/10 transition-colors group min-w-max">
              {/* Campaign Info */}
              <div className="p-6 border-r border-border/50 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-base line-clamp-1" title={camp.title}>{camp.title}</h3>
                  {camp.isActive ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      Activa
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      Pausada
                    </span>
                  )}
                </div>
                <div className="w-full bg-border-soft rounded-full h-1.5 mb-2">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${camp.progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Progreso: {camp.progress}% • Día actual: {camp.currentDay}</p>
              </div>

              {/* Campaign Days Grid */}
              <div className="grid relative divide-x divide-border/20" style={{ gridTemplateColumns: `repeat(${maxDays}, minmax(180px, 1fr))` }}>
                
                {/* Indicador de Día Actual visualizado como fondo o borde si cayera hoy, omitido temporalmente en este mock estático */}

                {calendarDays.map((colDate, idx) => {
                  const [y, m, d] = camp.startDate.split('-').map(Number);
                  const campStart = new Date(y, m - 1, d);
                  
                  // Calcular qué día relativo de la campaña es esta columna
                  const diffTime = colDate.getTime() - campStart.getTime();
                  const relativeDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                  
                  // Obtener eventos solo si la columna mapea a un día válido de esta campaña
                  const dayEvents = relativeDay > 0 ? (camp.timeline.find((t: any) => t.day === relativeDay)?.events || []) : [];
                  const isCurrentDay = relativeDay === camp.currentDay;
                  
                  // Agrupar eventos por red social
                  const groupedEvents = dayEvents.reduce((acc: any, evt: any) => {
                    if (!acc[evt.network]) acc[evt.network] = [];
                    acc[evt.network].push(evt);
                    return acc;
                  }, {});
                  
                  return (
                    <div key={idx} className={`p-2 relative min-h-[120px] transition-colors ${isCurrentDay ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : 'hover:bg-muted/5'}`}>
                        <div className="flex flex-col gap-2 relative z-10 pt-2">
                        {Object.entries(groupedEvents).map(([networkName, eventsForNetwork]: [string, any], idx: number) => (
                          <div 
                            key={idx} 
                            className={`group/tooltip relative flex items-center justify-center gap-2 border rounded-xl px-3 py-2.5 text-xs transition-colors cursor-pointer w-full shadow-sm ${getNetworkColorClasses(networkName)}`}
                          >
                            <NetworkIcon network={networkName} className="w-4 h-4 text-current" />
                            <span className="font-bold capitalize truncate leading-none">{networkName}</span>
                            {eventsForNetwork.length > 1 && (
                               <span className="bg-black/10 text-current px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none">{eventsForNetwork.length}</span>
                            )}
                            
                            {/* Notificador visual de error en la pastilla base */}
                            {eventsForNetwork.some((e: any) => e.status === 'error') && (
                              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-danger rounded-full border border-background animate-pulse" />
                            )}
                            
                            {/* Tooltip Oculto (Se muestra al hacer hover) */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[340px] opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:visible invisible transition-all z-50 pointer-events-none">
                              <div className="bg-card text-card-foreground border border-border rounded-md p-4 shadow-lg">
                                <div className="flex items-center gap-2 font-bold mb-3 capitalize border-b border-border/50 pb-2">
                                  <NetworkIcon network={networkName} className="w-4 h-4 text-primary" />
                                  {networkName} ({eventsForNetwork.length})
                                </div>
                                <table className="w-full text-xs text-left">
                                  <thead>
                                    <tr className="text-muted-foreground border-b border-border/30">
                                      <th className="pb-2 font-medium">Horario</th>
                                      <th className="pb-2 font-medium">Formato</th>
                                      <th className="pb-2 font-medium">Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/20">
                                    {eventsForNetwork.map((evt: any, i: number) => (
                                      <React.Fragment key={i}>
                                        <tr className={evt.status === 'error' ? 'bg-danger/5' : ''}>
                                          <td className="py-2 font-medium text-foreground">{evt.time}</td>
                                          <td className="py-2 capitalize text-foreground">{evt.format}</td>
                                          <td className="py-2">
                                            {evt.status === 'success' && (
                                              <span className="text-success font-bold flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-success" /> Éxito
                                              </span>
                                            )}
                                            {evt.status === 'error' && (
                                              <span className="text-danger font-bold flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-danger" /> Falló
                                              </span>
                                            )}
                                            {(evt.status === 'pending' || !evt.status) && (
                                              <span className="text-muted-foreground font-bold flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Pendiente
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                        {evt.status === 'error' && evt.errorMessage && (
                                          <tr className="bg-danger/5">
                                            <td colSpan={3} className="pb-2 pt-0 px-2">
                                              <div className="bg-danger/10 text-danger border border-danger/20 rounded p-1.5 text-[10px] font-mono leading-tight">
                                                {evt.errorMessage}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {/* Flechita del tooltip */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-border" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
