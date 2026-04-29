'use client';

import { useState, useEffect, use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import PublicSalesPage from '../[id]/page';

import { Suspense } from 'react';

function ResolverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();

  const username = searchParams.get('u');
  const slug = searchParams.get('s');

  const [landingId, setLandingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolve() {
      if (!username || !slug) {
        setError('URL mal formada');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/v/resolve?u=${username}&s=${slug}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error === 'Tutor not found' ? 'Tutor no encontrado' : 'Página de ventas no encontrada');
          setLoading(false);
          return;
        }

        setLandingId(data.id);
      } catch (err) {
        console.error('Resolution error:', err);
        setError('Error al resolver la página');
      } finally {
        setLoading(false);
      }
    }

    resolve();
  }, [db, username, slug]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
            Preparando tu Experiencia...
          </p>
        </div>
      </div>
    );
  }

  if (error || !landingId) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-6 p-8 max-w-md">
          <div className="w-20 h-20 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto text-rose-500">
            <span className="text-3xl font-bold">!</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{error || 'No disponible'}</h1>
          <p className="text-slate-500">Parece que la página que buscas ya no existe o el enlace es incorrecto.</p>
          <button 
            onClick={() => router.push('/')}
            className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return <PublicSalesPage params={Promise.resolve({ id: landingId })} />;
}

export default function ResolverPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    }>
      <ResolverContent />
    </Suspense>
  );
}
