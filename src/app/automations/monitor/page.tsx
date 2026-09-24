'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

const mockLogs = [
  {
    id: 1,
    task: 'Envío de WhatsApp a @JuanPerez (Curso Finalizado)',
    status: 'success',
    time: 'Hace 5 minutos',
  },
  {
    id: 2,
    task: 'Recordatorio Live a Grupo A',
    status: 'pending',
    time: 'En cola (Rate Limit activo)',
  },
  {
    id: 3,
    task: 'Cross-selling a @MariaGomez',
    status: 'error',
    time: 'Hace 1 hora',
    error: 'Alumno con Opt-Out activo (STOP)',
  },
];

export default function MonitorPage() {
  return (
    <DashboardLayout>
      <div className="container py-8 max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitor de Automatizaciones</h1>
          <p className="text-muted-foreground mt-2">
            Supervisa las acciones que Evo está ejecutando en segundo plano.
          </p>
        </div>

        <Card className="border-primary/20 bg-background/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Logs en Vivo</CardTitle>
            </div>
            <CardDescription>Historial reciente de tareas ejecutadas por Evo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 rounded-lg border bg-background/50">
                  <div className="flex items-center gap-4">
                    {log.status === 'success' && <CheckCircle2 className="h-5 w-5 text-success" />}
                    {log.status === 'pending' && <Clock className="h-5 w-5 text-warn" />}
                    {log.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                    
                    <div>
                      <p className="font-medium text-sm">{log.task}</p>
                      {log.error && (
                        <p className="text-xs text-destructive mt-0.5">{log.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {log.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
