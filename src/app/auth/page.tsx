
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Sparkles, AlertCircle, Loader2, Globe, ShieldCheck, ShieldAlert, UserPlus, KeyRound, Eye, EyeOff, Copy, Cookie, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Fallback for Alert components if local import fails
const CustomAlert = ({ variant, children, className }: any) => (
  <div className={`p-4 rounded-xl border-2 flex gap-3 ${variant === 'destructive' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-blue-50 border-blue-200 text-blue-900'} ${className}`}>
    {children}
  </div>
);

type AuthView = 'login' | 'reset' | 'activate';

export default function AuthPage() {
  const [view, setView] = useState<AuthView>('login');
  const [loading, setLoading] = useState(false);
  const [showPopupWarning, setShowPopupWarning] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [popupLostError, setPopupLostError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { 
    loginWithGoogle, 
    loginWithGoogleRedirect, 
    loginWithEmail, 
    registerWithEmail, 
    resetPassword, 
    user,
    isLoading: authLoading,
    isRedirecting
  } = useAuth();
  
  const db = useFirestore();
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
      console.error("[Login Error]", error);
      
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
      console.error("[Redirect Login Error]", error);
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

  const handleResetPassword = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Email requerido', description: 'Ingresa tu correo institucional.' });
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      toast({ 
        title: 'Correo enviado', 
        description: 'Si tu cuenta ya está activa, recibirás un enlace de recuperación.' 
      });
      setView('login');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo procesar la solicitud.' });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAccount = async () => {
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!normalizedEmail || !password) {
      toast({ variant: 'destructive', title: 'Datos incompletos', description: 'Ingresa email y contraseña para activar.' });
      return;
    }

    if (password.length < 6) {
      toast({ variant: 'destructive', title: 'Contraseña débil', description: 'La clave debe tener al menos 6 caracteres.' });
      return;
    }
    
    setLoading(true);
    try {
      const tempId = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const userRef = doc(db, 'users', tempId);
      
      let snap;
      try {
        snap = await getDoc(userRef);
      } catch (e: any) {
        console.error("[Auth Check Error]", e);
        toast({ 
          variant: 'destructive', 
          title: 'Error de Verificación', 
          description: `Servidor: ${e.message || 'No se pudo contactar con la base de datos.'}` 
        });
        setLoading(false);
        return;
      }
      
      if (!snap.exists()) {
        toast({ 
          variant: 'destructive', 
          title: 'Acceso Denegado', 
          description: 'Este correo no figura en nuestra lista de invitados.' 
        });
        setLoading(false);
        return;
      }

      await registerWithEmail(normalizedEmail, password);
      toast({ title: 'Éxito', description: 'Cuenta activada. Redirigiendo...' });

    } catch (error: any) {
      console.error("[Activation Error]", error);
      let errorMsg = error.message || "No se pudo verificar la cuenta. Intenta nuevamente.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = "Esta cuenta ya está activa. Por favor, inicia sesión normalmente.";
        setView('login');
      }

      toast({ 
        variant: 'destructive', 
        title: 'Fallo de Activación', 
        description: errorMsg 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error de acceso', 
        description: 'Credenciales incorrectas o cuenta no activada.' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (isRedirecting || (authLoading && !user)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-6 text-center space-y-6">
        <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center">
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

        <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
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

            {view === 'activate' ? (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><UserPlus className="h-5 w-5 text-accent" /> Activar Invitación</h3>
                  <p className="text-xs text-muted-foreground">Si fuice invitado por un mentor, crea tu contraseña aquí.</p>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Correo Invitado</Label>
                    <Input id="activate-email" name="email" type="email" placeholder="usuario@institucion.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Crear Contraseña</Label>
                    <div className="relative">
                      <Input 
                        id="activate-password"
                        name="password"
                        type={showPassword ? "text" : "password"} 
                        placeholder="Mínimo 6 caracteres" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="h-12 rounded-xl pr-10" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button onClick={handleActivateAccount} className="w-full h-12 rounded-xl font-bold bg-accent hover:bg-accent/90" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Activar mi Cuenta'}
                  </Button>
                  <Button variant="link" onClick={() => setView('login')} className="w-full text-xs font-bold text-slate-400">Volver al ingreso</Button>
                </div>
              </div>
            ) : view === 'reset' ? (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Correo institucional</Label>
                  <Input 
                    id="reset-email"
                    name="email"
                    type="email" 
                    placeholder="usuario@institucion.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <Button 
                  onClick={handleResetPassword} 
                  className="w-full h-12 rounded-xl font-bold bg-slate-900"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Enviar Enlace de Acceso'}
                </Button>
                <Button variant="link" onClick={() => setView('login')} className="w-full text-xs font-bold text-slate-400">Volver al ingreso</Button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleEmailLogin(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-email" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Correo Electrónico</Label>
                  <Input id="auth-email" name="email" type="email" placeholder="usuario@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center pr-1">
                    <Label htmlFor="auth-password" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Contraseña</Label>
                    <button type="button" onClick={() => setView('reset')} className="text-[10px] font-bold text-muted-foreground hover:underline uppercase tracking-tighter">¿Olvidaste tu clave?</button>
                  </div>
                  <div className="relative">
                    <Input 
                      id="auth-password" 
                      name="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="h-12 rounded-xl border-slate-200 pr-10" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base shadow-sm bg-slate-900 hover:bg-slate-800" disabled={loading || !email || !password}>
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Entrar al Sistema'}
                </Button>
                <div className="pt-2">
                  <Button variant="outline" onClick={() => { setView('activate'); setPassword(''); }} className="w-full h-12 rounded-xl font-bold text-accent border-accent/20 hover:bg-accent/5 gap-2">
                    <KeyRound className="h-4 w-4" /> Activar Invitación
                  </Button>
                </div>
              </form>
            )}

            {view === 'login' && !popupLostError && !showPopupWarning && (
              <>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100" /></div>
                  <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="bg-white px-4 text-slate-400">O continúa con</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button variant="outline" className="w-full h-12 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-3 border-slate-200 hover:bg-slate-50" onClick={handleGoogleLogin} disabled={loading}>
                    <Globe className="h-5 w-5 text-accent" /> Google Workspace
                  </Button>
                  <Button variant="ghost" className="w-full h-10 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-100" onClick={handleGoogleRedirectLogin} disabled={loading}>
                    Problemas con el login? <span className="text-accent ml-1 underline">Usa Redirección</span>
                  </Button>
                </div>
              </>
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
