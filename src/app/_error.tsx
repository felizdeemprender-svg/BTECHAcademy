'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-primary">Algo salió mal</h1>
          <p className="text-lg text-muted-foreground">
            Ha ocurrido un error inesperado. Por favor, intenta nuevamente o contacta con soporte.
          </p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={reset} 
            className="w-full h-12 text-lg bg-primary hover:bg-primary/90"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Intentar nuevamente
          </Button>
          
          <div className="flex gap-4">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full h-12">
                Página principal
              </Button>
            </Link>
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full h-12">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Detalles del error (desarrollo)
            </summary>
            <pre className="mt-2 p-4 bg-slate-100 rounded-lg text-xs overflow-auto">
              {error.message}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
