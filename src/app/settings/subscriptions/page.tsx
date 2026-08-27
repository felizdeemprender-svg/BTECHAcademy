'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertTriangle, CheckCircle2, XCircle, Calendar, ShieldCheck, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function SettingsSubscriptionsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const sub = profile?.subscription;

  const handleCancelSubscription = async () => {
    if (!confirm('¿Estás seguro de que quieres cancelar tu suscripción? Perderás acceso al final del período.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Error al cancelar');
      toast({ title: 'Suscripción cancelada', description: 'No se realizarán próximos cobros.' });
      // Aquí recargaría o actualizaría el profile local si tuviera la mutación.
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al cancelar la suscripción' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-success text-white border-none gap-1"><CheckCircle2 className="h-3 w-3" /> Activa</Badge>;
      case 'trialing': return <Badge className="bg-primary text-white border-none gap-1"><ShieldCheck className="h-3 w-3" /> Prueba Gratuita</Badge>;
      case 'past_due': return <Badge className="bg-warn text-white border-none gap-1"><AlertTriangle className="h-3 w-3" /> Pago Fallido</Badge>;
      case 'suspended': return <Badge className="bg-destructive text-white border-none gap-1"><XCircle className="h-3 w-3" /> Suspendida</Badge>;
      case 'canceled': return <Badge className="bg-muted text-muted-foreground border-none gap-1"><XCircle className="h-3 w-3" /> Cancelada</Badge>;
      default: return <Badge variant="outline">Sin suscripción</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20 max-w-4xl mx-auto">
        <header>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Suscripción y Facturación</h1>
          <p className="text-muted-foreground text-lg font-medium mt-2">Gestiona tu plan activo y tus métodos de pago.</p>
        </header>

        <Card className="rounded-3xl border-2 overflow-hidden bg-white shadow-sm">
          <CardHeader className="bg-primary/5 border-b p-8">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-black">{sub?.planName || 'Plan Actual'}</CardTitle>
                <CardDescription className="text-sm font-medium mt-1">Detalles de tu membresía de Fastoria.</CardDescription>
              </div>
              {getStatusBadge(sub?.status)}
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Próximo Cobro</p>
                  <p className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    {sub?.nextBillingAt ? (
                      format(sub.nextBillingAt.toDate ? sub.nextBillingAt.toDate() : new Date(sub.nextBillingAt), 'dd/MM/yyyy')
                    ) : 'No disponible'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Método de Pago</p>
                  <p className="text-lg font-bold flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {sub?.gateway === 'stripe' ? 'Tarjeta de Crédito (Stripe)' : sub?.gateway === 'getnet' ? 'Tarjeta (Getnet)' : 'No registrado'}
                  </p>
                </div>
              </div>
              <div className="bg-muted/50 p-6 rounded-2xl border flex flex-col justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">¿Necesitas ayuda?</p>
                  <p className="text-xs text-muted-foreground mt-1">Si tienes problemas con tu facturación, contáctanos a soporte.</p>
                </div>
                <div className="mt-6 flex gap-3">
                  {sub?.status === 'active' || sub?.status === 'trialing' || sub?.status === 'past_due' ? (
                    <Button 
                      variant="outline" 
                      className="border-danger/20 text-danger hover:bg-danger/10 hover:text-danger rounded-xl font-bold"
                      onClick={handleCancelSubscription}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                      Cancelar Suscripción
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
