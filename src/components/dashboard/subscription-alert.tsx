'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, XCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubscriptionAlertProps {
  status: 'past_due' | 'suspended' | 'trialing' | 'active' | 'canceled' | string;
  gracePeriodEndsAt?: any;
  trialEndsAt?: any;
}

export function SubscriptionAlert({ status, gracePeriodEndsAt, trialEndsAt }: SubscriptionAlertProps) {
  const router = useRouter();

  if (status === 'active' || status === 'trialing' && !trialEndsAt) return null;

  // Calcular días restantes
  const getDaysLeft = (dateField: any): number => {
    if (!dateField) return 0;
    const date = dateField.toDate ? dateField.toDate() : new Date(dateField);
    return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  if (status === 'past_due') {
    const daysLeft = getDaysLeft(gracePeriodEndsAt);
    return (
      <div className={cn(
        'w-full px-4 py-3 flex items-center justify-between gap-4',
        'bg-amber-500 text-white'
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold truncate">
            ⚠️ No pudimos procesar tu pago.
            {daysLeft > 0
              ? ` Tu cuenta será suspendida en ${daysLeft} día${daysLeft !== 1 ? 's' : ''} si no regularizás.`
              : ' Tu cuenta está próxima a ser suspendida.'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push('/dashboard/payment-methods')}
          className="shrink-0 border-white/50 text-white hover:bg-white/20 font-bold h-8 px-4 rounded-lg"
        >
          <CreditCard className="h-3.5 w-3.5 mr-1.5" />
          Actualizar pago
        </Button>
      </div>
    );
  }

  if (status === 'suspended') {
    return (
      <div className="w-full px-4 py-3 flex items-center justify-between gap-4 bg-red-600 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <XCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold truncate">
            🔴 Tu cuenta está suspendida. Tus páginas de venta están pausadas hasta que regularices el pago.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push('/dashboard/payment-methods')}
          className="shrink-0 border-white/50 text-white hover:bg-white/20 font-bold h-8 px-4 rounded-lg"
        >
          <CreditCard className="h-3.5 w-3.5 mr-1.5" />
          Reactivar cuenta
        </Button>
      </div>
    );
  }

  return null;
}
