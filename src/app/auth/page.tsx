'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Sparkles, AlertCircle, Loader2, Globe, ShieldCheck, ShieldAlert, Copy, Cookie, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth-context';
import { useToast } from '@/hooks/use-toast';

// Fallback for Alert components if local import fails
const CustomAlert = ({ variant, children, className }: any) => (
  <div className={`p-4 rounded-xl border-2 flex gap-3 ${variant === 'destructive' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-blue-50 border-blue-200 text-blue-900'} ${className}`}>
    {children}
  </div>
);

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [showPopupWarning, setShowPopupWarning] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [popupLostError, setPopupLostError] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { 
    loginWithGoogle, 
    loginWithGoogleRedirect, 
    user,
    isLoading: authLoading,
    isRedirecting
  } = useAuth();
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      router.push('/dashboard');
    }
  }, [user, mounted, router]);

  if (!mounted) return null;

  const handleCopyDomain = () => {
    if (unauthorizedDomain) {
      navigator.clipboard.writeText(unauthorizedDomain);
      toast({ title: 'Copiado', description: 'Dominio listo para pegar en Firebase Console.' });
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setShowPopupWarning(false);
    setUnauthorizedDomain(null);
    setPopupLostError(false);
    
    try {
      await loginWithGoogle();
      toast({ title: 'Bienvenido', description: 'Has iniciado sesión con Google Workspace.' });
    } catch (error: any) {
      console.warn("[Login Error]", error);
      
      // En Cloud Workstations, el popup es bloqueado casi siempre
      if (error.code === 'auth/popup-blocked' || error.message?.includes('popup-blocked')) {
        setShowPopupWarning(true);
      } else if (error.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(window.location.hostname);
      } else if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('missing initial state')) {
        setPopupLostError(true);
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'Error de acceso', 
          description: error.message || 'No se pudo completar el inicio de sesión con Google.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirectLogin = async () => {
    setLoading(true);
    setPopupLostError(false);
    setShowPopupWarning(false);
    try {
      await loginWithGoogleRedirect();
    } catch (error: any) {
      console.warn("[Redirect Login Error]", error);
      if (error.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(window.location.hostname);
      } else if (error.message?.includes('missing initial state')) {
        setPopupLostError(true);
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'Error de redirección', 
          description: error.message 
        });
      }
      setLoading(false);
    }
  };

  if (isRedirecting || (authLoading && !user)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-6 text-center space-y-6">
        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center">
          <Loader2 className="animate-spin text-primary h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Verificando Sesión</h2>
          <p className="text-slate-500 text-sm mt-1">Conectando con el entorno seguro de Evolución...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-6">
      <div className="w-full max-w-[440px] space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg mb-4">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-headline font-bold text-slate-900 tracking-tight">Evolución Académica</h1>
          <p className="text-slate-500 font-medium">Plataforma Institucional de Formación</p>
        </div>

        <Card className="rounded-lg overflow-hidden bg-white">
          <CardContent className="p-8 pt-10 space-y-6">
            {showPopupWarning && (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <CustomAlert variant="destructive">
                  <div className="space-y-1">
                    <p className="font-bold flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Popup Bloqueado</p>
                    <p className="text-xs">Tu navegador bloqueó la ventana de Google. Usa el método de redirección para evitar este bloqueo.</p>
                  </div>
                </CustomAlert>
                <Button variant="default" className="w-full h-14 rounded-xl font-bold bg-accent hover:bg-accent/90 shadow-lg flex items-center justify-center gap-2 text-white" onClick={handleGoogleRedirectLogin}>
                  <ArrowRight className="h-5 w-5" /> Entrar por Redirección
                </Button>
              </div>
            )}

            {unauthorizedDomain && (
              <CustomAlert variant="destructive">
                <div className="space-y-3">
                  <p className="font-bold flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Dominio no Autorizado</p>
                  <p className="text-xs">Añade este dominio en <strong>Firebase Console &gt; Authentication &gt; Settings</strong>:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-white p-2 rounded border border-rose-200 flex-1 font-mono break-all text-[10px] text-rose-700">
                      {unauthorizedDomain}
                    </code>
                    <Button size="icon" variant="outline" className="h-8 w-8 shrink-0 bg-white" onClick={handleCopyDomain}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CustomAlert>
            )}

            {popupLostError && (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <CustomAlert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
                  <div className="space-y-3">
                    <p className="font-bold flex items-center gap-2"><Cookie className="h-4 w-4 text-amber-600" /> Error de Comunicación (401)</p>
                    <p className="text-[11px]">En Cloud Workstations, el navegador bloquea la sesión por seguridad. <strong>Usa Modo Incógnito</strong> para una solución definitiva.</p>
                  </div>
                </CustomAlert>
                <div className="grid gap-2">
                  <Button variant="default" className="w-full h-14 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 shadow-lg flex items-center justify-center gap-2 text-white" onClick={handleGoogleRedirectLogin}>
                    <ArrowRight className="h-5 w-5" /> Entrar por Redirección (Recomendado)
                  </Button>
                </div>
              </div>
            )}

            {!popupLostError && !showPopupWarning && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="font-bold text-slate-900">Acceso a la plataforma</h3>
                  <p className="text-xs text-slate-500">
                    Utiliza tu cuenta de Google o institucional para acceder a tus cursos y contenido.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button variant="outline" className="w-full h-14 rounded-xl text-base font-bold shadow-sm flex items-center justify-center gap-3 border-slate-200 hover:bg-slate-50 transition-all hover:scale-[1.02]" onClick={handleGoogleLogin} disabled={loading}>
                    <Globe className="h-5 w-5 text-accent" /> Continuar con Google
                  </Button>
                  <Button variant="ghost" className="w-full h-10 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-100" onClick={handleGoogleRedirectLogin} disabled={loading}>
                    Problemas con el popup? <span className="text-accent ml-1 underline">Usar Redirección</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50/50 p-6 border-t border-slate-100">
            <div className="flex flex-col items-center gap-2 mx-auto">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Entorno Seguro Evolución</p>
              </div>
              <p className="text-[9px] text-slate-400 font-medium max-w-[200px] text-center">Solo usuarios previamente autorizados por la institución pueden acceder a este entorno.</p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
