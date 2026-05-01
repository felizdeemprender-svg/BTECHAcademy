'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';
import { 
  Check, 
  Zap, 
  Rocket, 
  ShieldCheck, 
  Users, 
  Sparkles, 
  ArrowRight,
  Loader2,
  Mail,
  User,
  CreditCard,
  QrCode,
  AlertCircle,
  Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from '@/components/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function PricingPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Checkout State
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [checkoutData, setCheckoutData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, methodsRes] = await Promise.all([
          fetch('/api/plans'),
          fetch('/api/payments/methods')
        ]);
        
        const plansData = await plansRes.json();
        const methodsData = await methodsRes.json();
        
        if (plansData.plans) setPlans(plansData.plans);
        if (methodsData.methods) {
          setPaymentMethods(methodsData.methods);
          if (methodsData.methods.length === 1) {
            setSelectedMethodId(methodsData.methods[0].id);
          }
        }
      } catch (error) {
        console.error("[Pricing] Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Sync with user profile if logged in
  useEffect(() => {
    if (profile) {
      const names = (profile.displayName || '').split(' ');
      setCheckoutData({
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: profile.email || ''
      });
    }
  }, [profile]);

  // UPGRADE LOGIC: Get current active plan
  const currentPlan = useMemo(() => {
    if (!profile?.subscription || profile.subscription.status !== 'active') return null;
    return plans.find(p => p.id === profile.subscription.planId);
  }, [profile, plans]);

  const upgradeInfo = useMemo(() => {
    if (!currentPlan || !selectedPlan || selectedPlan.id === currentPlan.id) return null;
    
    // Solo permitimos upgrade si el nuevo plan es más caro
    if (selectedPlan.price <= currentPlan.price) return null;

    // Cálculo simplificado de meses restantes (Asumiendo contrato de 12 meses)
    // En producción esto debería venir de una API de billing
    const startDate = profile.subscription.startDate?.toDate ? profile.subscription.startDate.toDate() : new Date(profile.subscription.startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    const remainingMonths = Math.max(0, (currentPlan.durationMonths || 12) - diffMonths);
    
    const monthlyDiff = selectedPlan.price - currentPlan.price;
    const totalUpgradePrice = monthlyDiff * remainingMonths;

    return {
      remainingMonths,
      monthlyDiff,
      totalUpgradePrice,
      currentPlanName: currentPlan.name,
      expirationDate: new Date(startDate.setMonth(startDate.getMonth() + (currentPlan.durationMonths || 12))).toLocaleDateString()
    };
  }, [currentPlan, selectedPlan, profile]);

  const openCheckout = (plan: any) => {
    setSelectedPlan(plan);
    setShowCheckout(true);
  };

  const handleFinalCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!checkoutData.email || !checkoutData.firstName) {
      toast({ variant: 'destructive', title: 'Datos incompletos', description: 'Por favor completa tu nombre y correo.' });
      return;
    }

    if (selectedPlan.price > 0 && !selectedMethodId) {
      toast({ variant: 'destructive', title: 'Método de pago', description: 'Por favor selecciona cómo deseas pagar.' });
      return;
    }

    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/payments/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          userId: user?.uid || null,
          email: checkoutData.email,
          firstName: checkoutData.firstName,
          lastName: checkoutData.lastName,
          paymentMethodId: selectedMethodId,
          isUpgrade: !!upgradeInfo,
          upgradePrice: upgradeInfo?.totalUpgradePrice
        })
      });

      const data = await response.json();

      if (data.init_point) {
        window.location.href = data.init_point;
      } else if (data.success) {
        toast({ title: '¡Suscripción Actualizada!', description: 'Tu plan ha sido mejorado con éxito.' });
        setShowCheckout(false);
      } else {
        throw new Error(data.error || 'Error al procesar la solicitud');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo completar el proceso.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      <LandingHeader />

      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden bg-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-50/50 rounded-full blur-3xl opacity-50 -z-10" />
        <div className="container mx-auto px-6 text-center">
          <Badge className="bg-indigo-100 text-indigo-700 border-none px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest mb-6">
            Ecosistema de Mentores
          </Badge>
          <h1 className="text-5xl lg:text-7xl font-headline font-black text-slate-900 tracking-tight mb-6">
            Eleva tu academia al <span className="text-indigo-600 underline decoration-indigo-200">Siguiente Nivel</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Gestión inteligente de planes con soporte para mejoras (Upgrades) y transición fluida entre niveles.
          </p>
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="h-[600px] animate-pulse bg-white border-none shadow-xl rounded-[2.5rem]" />
              ))
            ) : (plans || []).length === 0 ? (
              <div className="col-span-full text-center py-20 bg-white rounded-[3rem] shadow-xl border-2 border-dashed border-slate-100">
                <ShieldCheck className="h-20 w-20 text-slate-200 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-slate-400 italic">No hay planes activos disponibles en este momento.</h3>
              </div>
            ) : (plans || []).map((plan: any) => {
              const isCurrent = currentPlan?.id === plan.id;
              const isUpgrade = currentPlan && plan.price > currentPlan.price;
              const isDowngrade = currentPlan && plan.price < currentPlan.price && plan.type !== 'free';
              
              return (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "relative flex flex-col h-full border-none shadow-2xl rounded-[3rem] transition-all duration-500 hover:-translate-y-2 overflow-hidden",
                    plan.isEnterprise ? "bg-slate-900 text-white ring-4 ring-indigo-500/20" : "bg-white",
                    isCurrent && "ring-4 ring-emerald-500/30",
                    isDowngrade && "opacity-80 grayscale-[0.5]"
                  )}
                >
                  {isCurrent && (
                    <div className="absolute top-8 left-8">
                      <Badge className="bg-emerald-500 text-white border-none font-black text-[9px] uppercase tracking-widest px-3 py-1 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Tu Plan Actual
                      </Badge>
                    </div>
                  )}

                  {isDowngrade && (
                    <div className="absolute top-8 left-8">
                      <Badge className="bg-slate-200 text-slate-500 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1 flex items-center gap-1">
                        No Disponible
                      </Badge>
                    </div>
                  )}

                  <CardContent className="p-10 flex flex-col h-full">
                    <div className="mb-8 pt-6">
                      <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black">
                          {plan.type === 'free' ? '$0' : `$${plan.price}`}
                        </span>
                        <span className={cn("text-sm font-bold opacity-60", plan.isEnterprise ? "text-slate-400" : "text-slate-500")}>
                          {plan.type === 'percentage' ? 'Regalías' : '/mes'}
                        </span>
                      </div>
                    </div>

                    {/* Features & Quotas */}
                    <div className={cn(
                      "p-6 rounded-[2rem] mb-8 flex items-center justify-between",
                      plan.isEnterprise ? "bg-white/5 border border-white/10" : "bg-slate-50 border border-slate-100"
                    )}>
                      <div className="flex items-center gap-3">
                        <Zap className={cn("h-6 w-6", plan.isEnterprise ? "text-indigo-400" : "text-amber-500")} />
                        <div>
                          <p className={cn("text-lg font-black", plan.isEnterprise ? "text-white" : "text-slate-900")}>
                            {plan.aiQuotas?.totalCredits || 0}
                          </p>
                          <p className={cn("text-[9px] font-bold uppercase tracking-widest opacity-60", plan.isEnterprise ? "text-slate-400" : "text-slate-500")}>
                            BTECH Credits
                          </p>
                        </div>
                      </div>
                    </div>

                    <ul className="space-y-4 mb-10 flex-1">
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                        <span className="text-sm font-bold opacity-80">
                          {plan.limits?.maxCourses === -1 ? 'Cursos Ilimitados' : `Hasta ${plan.limits?.maxCourses} Cursos`}
                        </span>
                      </li>
                      {(plan.features || []).slice(0, 5).map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                          <span className="text-sm font-bold opacity-80 line-clamp-1">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isDowngrade && (
                      <div className="mb-4 flex items-center gap-2 text-slate-500 bg-slate-100 p-3 rounded-xl">
                        <AlertCircle className="h-4 w-4" />
                        <p className="text-[10px] font-bold leading-tight">
                          Disponible tras vencer tu plan actual.
                        </p>
                      </div>
                    )}

                    <Button 
                      onClick={() => openCheckout(plan)}
                      disabled={isCurrent || isDowngrade}
                      className={cn(
                        "w-full h-14 rounded-2xl text-lg font-black shadow-xl transition-all active:scale-95",
                        isCurrent 
                          ? "bg-emerald-50 text-emerald-600 border-2 border-emerald-100 cursor-default shadow-none" 
                          : isDowngrade
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                            : plan.isEnterprise 
                              ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30" 
                              : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/30"
                      )}
                    >
                      {isCurrent ? 'Activo' : isDowngrade ? 'No Disponible' : isUpgrade ? 'Mejorar Plan' : 'Comenzar Ahora'}
                      {!isCurrent && !isDowngrade && <ArrowRight className="ml-2 h-5 w-5" />}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Checkout Modal */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <div className="bg-primary p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-2">
                {upgradeInfo ? <Sparkles className="h-6 w-6 text-amber-300" /> : <Rocket className="h-6 w-6" />}
                {upgradeInfo ? 'Mejora de Plan (Upgrade)' : 'Configura tu Suscripción'}
              </DialogTitle>
              <DialogDescription className="text-white/70 font-medium">
                {upgradeInfo 
                  ? `Estás pasando del ${upgradeInfo.currentPlanName} al ${selectedPlan?.name}` 
                  : `Estás a un paso de activar el ${selectedPlan?.name}`}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <form onSubmit={handleFinalCheckout} className="p-8 space-y-6 bg-white">
            {/* Info de Upgrade */}
            {upgradeInfo && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-amber-900">Aviso de Prorrateo</p>
                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                      Tu plan actual vence el <strong>{upgradeInfo.expirationDate}</strong>. 
                      Se te cobrará solo la diferencia de los <strong>{upgradeInfo.remainingMonths} meses</strong> restantes.
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-amber-200 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Diferencial a Pagar:</span>
                  <span className="text-lg font-black text-amber-900">${upgradeInfo.totalUpgradePrice.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="checkout-firstname" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="checkout-firstname"
                    placeholder="Ej: Juan" 
                    value={checkoutData.firstName}
                    onChange={(e) => setCheckoutData({...checkoutData, firstName: e.target.value})}
                    className="pl-10 h-12 rounded-xl bg-slate-50 border-none font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="checkout-lastname" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Apellido</label>
                <Input 
                  id="checkout-lastname"
                  placeholder="Ej: Pérez" 
                  value={checkoutData.lastName}
                  onChange={(e) => setCheckoutData({...checkoutData, lastName: e.target.value})}
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="checkout-email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email de Acceso</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  id="checkout-email"
                  type="email"
                  placeholder="tu@email.com" 
                  value={checkoutData.email}
                  readOnly={!!profile}
                  onChange={(e) => setCheckoutData({...checkoutData, email: e.target.value})}
                  className={cn("pl-10 h-12 rounded-xl bg-slate-50 border-none font-bold", !!profile && "opacity-60")}
                />
              </div>
            </div>

            {selectedPlan?.price > 0 && (
              <div className="space-y-4 pt-4 border-t border-dashed">
                <label id="payment-method-label" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Método de Pago</label>
                <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-labelledby="payment-method-label">
                  {paymentMethods.map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethodId(method.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                        selectedMethodId === method.id 
                          ? "border-primary bg-primary/5 shadow-inner" 
                          : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {method.type === 'mercadopago' ? <QrCode className="h-5 w-5 text-blue-600" /> : <CreditCard className="h-5 w-5 text-slate-600" />}
                        <span className="text-sm font-black text-slate-900">{method.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button 
              type="submit"
              disabled={isProcessing}
              className="w-full h-14 rounded-2xl text-lg font-black bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 mt-4 transition-all active:scale-95"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                upgradeInfo 
                  ? `Pagar Diferencial $${upgradeInfo.totalUpgradePrice.toFixed(2)}` 
                  : selectedPlan?.price > 0 ? `Pagar $${selectedPlan.price} y Comenzar` : 'Activar Plan Gratuito'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      
      <LandingFooter />
    </div>
  );
}
