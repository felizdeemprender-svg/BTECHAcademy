'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { PaymentMethodsManager } from '@/components/dashboard/payment-methods-manager';
import { useAuth } from '@/components/auth-context';

export default function AdminPaymentMethodsPage() {
  const { profile } = useAuth();
  
  // Solo renderizar si es admin
  if (profile && !profile.roles?.includes('admin')) {
    return <DashboardLayout><div className="p-8">No tienes permisos.</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <PaymentMethodsManager 
        title="Métodos de Pago del Sistema"
        description="Configura cómo deseas cobrar a los tutores y planes de la plataforma."
        collectionPath="systemPaymentMethods"
        infoCards={[
          {
            icon: <span className="text-xl">⚡</span>,
            title: "Cobro Directo",
            description: "Los cobros a los tutores van directo a las cuentas de la plataforma.",
            color: "emerald"
          },
          {
            icon: <span className="text-xl">🌐</span>,
            title: "Pasarelas Activas",
            description: "Puedes mantener múltiples métodos activos según corresponda.",
            color: "indigo"
          },
          {
            icon: <span className="text-xl">🛡️</span>,
            title: "Seguridad Total",
            description: "Tus credenciales se almacenan de forma segura a nivel global.",
            color: "amber"
          }
        ]}
      />
    </DashboardLayout>
  );
}
