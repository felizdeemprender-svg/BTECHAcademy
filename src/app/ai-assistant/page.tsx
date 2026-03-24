
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Loader2 } from 'lucide-react';

/**
 * Página del Asistente IA (EVO) - Desactivada.
 * Redirige automáticamente al dashboard.
 */
export default function AIAssistantPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirección inmediata al dashboard
    router.replace('/dashboard');
  }, [router]);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary/20 mx-auto" />
          <p className="text-muted-foreground font-bold italic">Redirigiendo al panel principal...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
