'use client';

import { useAuth } from '@/components/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-8 w-3/4 rounded-xl" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Si no está cargando, hay un usuario pero no tiene el rol de admin
  if (!isLoading && profile && !profile.roles.includes('admin')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <div className="w-20 h-20 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 mb-8 animate-in zoom-in duration-500">
          <ShieldAlert className="h-10 w-10" />
        </div>
        
        <div className="space-y-3 max-w-sm mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Acceso Restringido</h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Esta sección es para uso exclusivo de la administración institucional de <span className="text-primary font-bold">FastoriaAcademy</span>.
          </p>
        </div>

        <Link href="/dashboard">
          <Button variant="outline" className="h-12 px-8 rounded-2xl font-bold gap-2 border-2 hover:bg-slate-100 transition-all">
            <ArrowLeft className="h-4 w-4" /> Volver al Tablero
          </Button>
        </Link>
        
        <p className="mt-12 text-[10px] uppercase font-black tracking-[0.2em] text-slate-300">
          Identidad Registrada: {profile.email}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
