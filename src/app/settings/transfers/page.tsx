'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { collection, doc, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ArrowLeftRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Mail,
  Banknote,
  Hash,
  BookOpen,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type TransferStatus = 'pending' | 'approved' | 'rejected';

const STATUS_CONFIG: Record<TransferStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pendiente',
    color: 'bg-warn/10 text-warn border-warn/20',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  approved: {
    label: 'Aprobada',
    color: 'bg-success/10 text-success border-success/20',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: 'Rechazada',
    color: 'bg-danger/10 text-danger border-danger/20',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

export default function TransfersPage() {
  const db = useFirestore();
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [filter, setFilter] = useState<TransferStatus | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    order: any;
    action: 'approve' | 'reject';
  }>({ open: false, order: null, action: 'approve' });

  const isAdmin = profile?.roles?.includes('admin');

  const transfersQuery = useMemoFirebase(() => {
    if (!user?.uid || isAuthLoading || !profile) return null;

    if (isAdmin) {
      return query(
        collection(db, 'transferOrders')
      );
    }

    return query(
      collection(db, 'transferOrders'),
      where('mentorId', '==', user.uid)
    );
  }, [db, user?.uid, isAdmin, isAuthLoading]);

  const { data: rawOrders, isLoading } = useCollection(transfersQuery);

  // Sort in memory to avoid Firestore IndexedDB cache corruption issues with orderBy
  const allOrders = rawOrders ? [...rawOrders].sort((a: any, b: any) => {
    const timeA = a.createdAt?.seconds || 0;
    const timeB = b.createdAt?.seconds || 0;
    return timeB - timeA;
  }) : null;

  const orders = filter === 'all'
    ? allOrders
    : allOrders?.filter((o: any) => o.status === filter);

  const pendingCount = allOrders?.filter((o: any) => o.status === 'pending').length ?? 0;

  const handleAction = async (confirmed: boolean) => {
    if (!confirmed) {
      setConfirmDialog({ open: false, order: null, action: 'approve' });
      return;
    }

    const { order, action } = confirmDialog;
    setConfirmDialog({ open: false, order: null, action: 'approve' });
    setProcessingId(order.id);

    try {
      const response = await fetch('/api/payments/transfer/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action,
          mentorId: order.mentorId,
          approvedBy: user!.uid
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la transferencia');
      }

      toast({
        title: action === 'approve' ? '✅ Inscripción activada' : '❌ Transferencia rechazada',
        description:
          action === 'approve'
            ? `${order.studentName} ya tiene acceso a ${order.pageTitle}.`
            : `La orden de ${order.studentName} fue rechazada.`,
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error al procesar',
        description: e.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openConfirm = (order: any, action: 'approve' | 'reject') => {
    setConfirmDialog({ open: true, order, action });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
              <ArrowLeftRight className="h-10 w-10 text-primary" />
              Transferencias
            </h1>
            <p className="text-muted-foreground text-lg font-medium mt-1">
              Aprobá las inscripciones de alumnos que pagaron por transferencia bancaria.
            </p>
            {/* DEBUG INFO */}
            <div className="mt-2 text-xs text-muted-foreground">
              Debug: {user?.email} | isAdmin = {isAdmin ? 'YES' : 'NO'} | roles = {profile?.roles?.join(', ')} | allOrders = {allOrders?.length ?? 0}
            </div>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-3 bg-warn/10 border border-warn/20 rounded-2xl px-6 py-4">
              <AlertTriangle className="h-6 w-6 text-warn" />
              <div>
                <p className="font-black text-warn text-sm">
                  {pendingCount} {pendingCount === 1 ? 'transferencia pendiente' : 'transferencias pendientes'}
                </p>
                <p className="text-xs text-warn font-medium">Revisalas y aprobá el acceso</p>
              </div>
            </div>
          )}
        </header>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-5 py-2.5 rounded-2xl font-black text-sm transition-all',
                filter === f
                  ? 'bg-foreground text-white shadow-lg'
                  : 'bg-white text-muted-foreground border border-border hover:border-border'
              )}
            >
              {f === 'all' ? 'Todas' : STATUS_CONFIG[f].label}
              {f === 'pending' && pendingCount > 0 && (
                <span className="ml-2 bg-warn text-white text-[10px] font-black rounded-full px-2 py-0.5">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista de órdenes */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="font-black text-muted-foreground uppercase tracking-widest text-xs">Cargando órdenes...</p>
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-border">
              <Inbox className="h-10 w-10" />
            </div>
            <div className="text-center">
              <p className="font-black text-foreground">No hay transferencias aquí</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                {filter === 'pending'
                  ? 'No tenés transferencias pendientes de aprobación.'
                  : 'No se encontraron transferencias con este filtro.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order: any) => {
              const status = order.status as TransferStatus;
              const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
              const isPending = status === 'pending';
              const isProcessing = processingId === order.id;
              const createdAt = order.createdAt?.toDate?.()?.toLocaleDateString('es-AR', {
                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
              }) ?? '—';

              return (
                <Card
                  key={order.id}
                  className={cn(
                    'border rounded-lg overflow-hidden transition-all',
                    isPending
                      ? 'border-warn/20 shadow-warn/10 bg-white'
                      : 'border-muted shadow-md bg-white'
                  )}
                >
                  <CardContent className="p-8">
                    <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                      {/* Info principal */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge
                            className={cn(
                              'flex items-center gap-1.5 border font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-xl',
                              statusConfig.color
                            )}
                          >
                            {statusConfig.icon}
                            {statusConfig.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">{createdAt}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Alumno</p>
                              <p className="font-bold text-foreground text-sm">{order.studentName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Email</p>
                              <p className="font-bold text-foreground text-sm">{order.studentEmail}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Curso</p>
                              <p className="font-bold text-foreground text-sm">{order.pageTitle}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <Banknote className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Monto</p>
                              <p className="font-black text-primary text-lg">
                                ${(order.amount ?? 0).toLocaleString('es-AR')}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Código de referencia */}
                        <div className="flex items-center gap-3 p-4 bg-warn/10 border border-warn/15 rounded-2xl">
                          <Hash className="h-4 w-4 text-warn shrink-0" />
                          <div>
                            <p className="text-[10px] text-warn font-black uppercase tracking-widest">
                              Código de referencia (verificar en el banco)
                            </p>
                            <p className="font-black text-warn font-mono tracking-widest text-base">
                              {order.referenceCode}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      {isPending && (
                        <div className="flex flex-col gap-3 shrink-0 w-full lg:w-auto">
                          <Button
                            onClick={() => openConfirm(order, 'approve')}
                            disabled={isProcessing}
                            className="h-14 px-8 rounded-2xl font-black bg-success hover:bg-success text-white shadow-lg shadow-success/20 gap-2"
                          >
                            {isProcessing ? (
                              <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5" />
                            )}
                            Aprobar Inscripción
                          </Button>
                          <Button
                            onClick={() => openConfirm(order, 'reject')}
                            disabled={isProcessing}
                            variant="outline"
                            className="h-12 px-8 rounded-2xl font-black text-danger border-danger/20 hover:bg-danger/10 gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Rechazar
                          </Button>
                        </div>
                      )}

                      {status === 'approved' && (
                        <div className="flex items-center gap-2 px-5 py-3 bg-success/10 border border-success/15 rounded-2xl shrink-0">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                          <span className="font-black text-success text-sm">Inscripción activa</span>
                        </div>
                      )}

                      {status === 'rejected' && (
                        <div className="flex items-center gap-2 px-5 py-3 bg-danger/10 border border-danger/15 rounded-2xl shrink-0">
                          <XCircle className="h-5 w-5 text-danger" />
                          <span className="font-black text-danger text-sm">Rechazada</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Diálogo de confirmación */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && handleAction(false)}>
        <DialogContent className="mw-md">
          <DialogHeader className="space-y-4">
            <div
              className={cn(
                'w-16 h-16 rounded-3xl flex items-center justify-center mx-auto',
                confirmDialog.action === 'approve'
                  ? 'bg-success/15 text-success'
                  : 'bg-danger/15 text-danger'
              )}
            >
              {confirmDialog.action === 'approve' ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : (
                <XCircle className="h-8 w-8" />
              )}
            </div>
            <DialogTitle className="text-2xl font-black text-center">
              {confirmDialog.action === 'approve'
                ? '¿Confirmar el pago?'
                : '¿Rechazar esta transferencia?'}
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground font-medium">
              {confirmDialog.action === 'approve' ? (
                <>
                  Verificá que el monto de{' '}
                  <strong className="text-foreground">
                    ${(confirmDialog.order?.amount ?? 0).toLocaleString('es-AR')}
                  </strong>{' '}
                  fue acreditado con el código{' '}
                  <strong className="text-warn font-mono">
                    {confirmDialog.order?.referenceCode}
                  </strong>
                  . Luego de aprobar, el alumno recibirá acceso inmediato.
                </>
              ) : (
                <>
                  La transferencia de{' '}
                  <strong className="text-foreground">{confirmDialog.order?.studentName}</strong> será
                  rechazada. El alumno NO recibirá acceso al curso.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => handleAction(true)}
              className={cn(
                'w-full h-14 rounded-2xl font-black text-lg',
                confirmDialog.action === 'approve'
                  ? 'bg-success hover:bg-success text-white'
                  : 'bg-danger hover:bg-danger text-white'
              )}
            >
              {confirmDialog.action === 'approve' ? 'Sí, aprobar inscripción' : 'Sí, rechazar'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleAction(false)}
              className="text-muted-foreground font-bold hover:bg-transparent"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
