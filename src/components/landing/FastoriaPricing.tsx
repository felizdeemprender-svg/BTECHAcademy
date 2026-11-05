'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Reveal, staggerContainer, staggerItem, Tilt, EASE } from '@/components/ui/animations';
import {
  Check, Zap, ArrowRight, Loader2, Mail, User, CreditCard, QrCode,
  AlertCircle, Rocket, Sparkles, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-context';
import { useToast } from '@/hooks/use-toast';
import { CountryCurrencySelector } from '@/components/commerce/country-currency-selector';
import {
  SUPPORTED_COUNTRIES,
  FALLBACK_RATES,
  type CountryInfo,
  type SupportedCurrency,
} from '@/lib/currency/types';
import { convertUsdAmount, formatCurrencyAmount } from '@/lib/currency/rates-service';

// ─── Checkout Dialog ──────────────────────────────────────────────────────────
function CheckoutDialog({
  open,
  onClose,
  selectedPlan,
  paymentMethods,
  checkoutData,
  setCheckoutData,
  selectedMethodId,
  setSelectedMethodId,
  isProcessing,
  onSubmit,
  upgradeInfo,
  selectedCountry,
  onSelectCountry,
  rates,
}: {
  open: boolean;
  onClose: () => void;
  selectedPlan: any;
  paymentMethods: any[];
  checkoutData: { firstName: string; lastName: string; email: string };
  setCheckoutData: (d: any) => void;
  selectedMethodId: string;
  setSelectedMethodId: (id: string) => void;
  isProcessing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  upgradeInfo: any;
  selectedCountry: CountryInfo;
  onSelectCountry: (c: CountryInfo) => void;
  rates: Record<SupportedCurrency, number>;
}) {
  const availablePaymentMethods = useMemo(() => {
    return paymentMethods.filter((method) => {
      return selectedCountry.allowedGateways.includes(method.type as any);
    });
  }, [paymentMethods, selectedCountry]);

  useEffect(() => {
    if (availablePaymentMethods.length > 0 && !availablePaymentMethods.some((m) => m.id === selectedMethodId)) {
      setSelectedMethodId(availablePaymentMethods[0].id);
    }
  }, [availablePaymentMethods, selectedMethodId, setSelectedMethodId]);

  if (!open || !selectedPlan) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="checkout-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

          {/* Dialog */}
          <motion.div
            key="checkout-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#0F172A] px-8 pt-8 pb-6">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 mb-1">
                {upgradeInfo
                  ? <Sparkles className="w-5 h-5 text-amber-400" />
                  : <Rocket className="w-5 h-5 text-[#1CB899]" />
                }
                <h3 className="text-lg font-black text-white">
                  {upgradeInfo ? 'Mejora de Plan (Upgrade)' : 'Activar Plan'}
                </h3>
              </div>
              <p className="text-slate-400 text-sm font-medium">
                {upgradeInfo
                  ? `Pasando del ${upgradeInfo.currentPlanName} al ${selectedPlan?.name}`
                  : `Estás a un paso de activar el plan ${selectedPlan?.name}`
                }
              </p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="px-8 py-6 space-y-5">

              {/* Upgrade info banner */}
              {upgradeInfo && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-slate-900">Aviso de Prorrateo</p>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed mt-0.5">
                        Tu plan actual vence el <strong>{upgradeInfo.expirationDate}</strong>.
                        Se te cobrará la diferencia por los <strong>{upgradeInfo.remainingMonths} meses</strong> restantes.
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-amber-200 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Diferencial a pagar:</span>
                    <span className="text-base font-black text-slate-900">${upgradeInfo.totalUpgradePrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ck-firstname" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 block mb-1.5">
                    Nombre
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="ck-firstname"
                      placeholder="Juan"
                      value={checkoutData.firstName}
                      onChange={(e) => setCheckoutData({ ...checkoutData, firstName: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1CB899]/30 focus:border-[#1CB899]"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="ck-lastname" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 block mb-1.5">
                    Apellido
                  </label>
                  <input
                    id="ck-lastname"
                    placeholder="Pérez"
                    value={checkoutData.lastName}
                    onChange={(e) => setCheckoutData({ ...checkoutData, lastName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1CB899]/30 focus:border-[#1CB899]"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="ck-email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 block mb-1.5">
                  Email de Acceso
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="ck-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={checkoutData.email}
                    readOnly={!!checkoutData.email && checkoutData.email.includes('@')}
                    onChange={(e) => setCheckoutData({ ...checkoutData, email: e.target.value })}
                    className={cn(
                      "w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1CB899]/30 focus:border-[#1CB899]",
                      checkoutData.email && "opacity-70"
                    )}
                  />
                </div>
              </div>

              {/* Selector de país y moneda referencial */}
              <CountryCurrencySelector
                selectedCountryCode={selectedCountry.code}
                onSelectCountry={onSelectCountry}
                usdAmount={selectedPlan.price}
                rates={rates}
              />

              {/* Payment methods */}
              {selectedPlan?.price > 0 && availablePaymentMethods.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-3">Método de Pago</p>
                  <div className="space-y-2">
                    {availablePaymentMethods.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethodId(method.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all text-left cursor-pointer",
                          selectedMethodId === method.id
                            ? "border-[#1CB899] bg-[#1CB899]/5"
                            : "border-slate-200 hover:border-slate-300 bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {method.type === 'mercadopago'
                            ? <QrCode className="h-5 w-5 text-blue-600" />
                            : <CreditCard className="h-5 w-5 text-slate-500" />
                          }
                          <span className="text-sm font-black text-slate-900">{method.name}</span>
                        </div>
                        {selectedMethodId === method.id && (
                          <div className="w-4 h-4 rounded-full bg-[#1CB899] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Aviso si no hay medios de pago para ese país */}
              {selectedPlan?.price > 0 && availablePaymentMethods.length === 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Suscripción para {selectedCountry.name}</span>
                  </div>
                  <p className="text-amber-700 leading-relaxed">
                    {selectedCountry.isDomesticArgentina
                      ? 'No se registran medios de cobro automáticos activos en este momento.'
                      : 'Para suscriptores en este país la activación se realiza mediante asistencia directa.'}
                  </p>
                  <a
                    href={`https://wa.me/5491176411666?text=Hola,%20quiero%20suscribirme%20al%20plan%20${encodeURIComponent(selectedPlan.name)}%20desde%20${encodeURIComponent(selectedCountry.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-[#138d74] underline hover:text-[#0f6f5b]"
                  >
                    Contactar por WhatsApp para activar plan <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isProcessing || (selectedPlan?.price > 0 && availablePaymentMethods.length === 0)}
                whileHover={isProcessing || (selectedPlan?.price > 0 && availablePaymentMethods.length === 0) ? {} : { scale: 1.02 }}
                whileTap={isProcessing || (selectedPlan?.price > 0 && availablePaymentMethods.length === 0) ? {} : { scale: 0.98 }}
                className="w-full py-3.5 rounded-2xl bg-[#1CB899] hover:bg-[#18a287] text-[#0F172A] font-black text-sm shadow-lg shadow-[#1CB899]/25 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : upgradeInfo ? (
                  <>Pagar Diferencial ${upgradeInfo.totalUpgradePrice.toFixed(2)} <ArrowRight className="w-4 h-4" /></>
                ) : selectedPlan?.price > 0 ? (
                  selectedCountry.isDomesticArgentina ? (
                    <>Pagar ARS ${convertUsdAmount(selectedPlan.price, 'ARS', rates).toLocaleString('es-AR')} y Comenzar <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>Pagar USD ${selectedPlan.price} y Comenzar <ArrowRight className="w-4 h-4" /></>
                  )
                ) : (
                  <>Activar Plan Gratuito <ArrowRight className="w-4 h-4" /></>
                )}
              </motion.button>

              <p className="text-center text-[10px] text-slate-400 font-medium">
                Pagos seguros · Cancelás cuando querés
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Pricing Content ─────────────────────────────────────────────────────
function FastoriaPricingContent() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan');
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [apiPlans, setApiPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Country and currency state
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(SUPPORTED_COUNTRIES[0]);
  const [rates, setRates] = useState<Record<SupportedCurrency, number>>(FALLBACK_RATES);

  // Sync country with localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fastoria_country_code');
      if (saved) {
        const found = SUPPORTED_COUNTRIES.find((c) => c.code === saved);
        if (found) setSelectedCountry(found);
      }
    } catch {}
  }, []);

  const handleCountryChange = (country: CountryInfo) => {
    setSelectedCountry(country);
    try {
      localStorage.setItem('fastoria_country_code', country.code);
    } catch {}
  };

  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutData, setCheckoutData] = useState({ firstName: '', lastName: '', email: '' });

  // Fetch plans + payment methods + currency rates
  useEffect(() => {
    const fetchData = async () => {
      try {
        const ratesRes = await fetch('/api/currency/rates');
        if (ratesRes.ok) {
          const ratesData = await ratesRes.json();
          if (ratesData?.rates) {
            setRates(ratesData.rates);
          }
        }
      } catch (err) {
        console.warn('[Pricing] Error loading currency rates:', err);
      }

      try {
        const plansRes = await fetch('/api/plans');
        const plansData = await plansRes.json();
        
        if (plansData?.plans && Array.isArray(plansData.plans)) {
          const active = plansData.plans
            .filter((p: any) => p.isActive !== false)
            .sort((a: any, b: any) => (Number(a.price) || 0) - (Number(b.price) || 0));
          setApiPlans(active);

          // Open checkout if ?plan= param is in URL
          if (planParam) {
            const matching = active.find(
              (p: any) => p.id === planParam || p.name?.toLowerCase() === planParam.toLowerCase()
            );
            if (matching) {
              setSelectedPlan(matching);
              setShowCheckout(true);
            }
          }
        }
      } catch (err) {
        console.error('[Pricing] Error fetching plans:', err);
      }

      try {
        const methodsRes = await fetch('/api/payments/methods');
        if (methodsRes.ok) {
          const methodsData = await methodsRes.json();
          if (methodsData?.methods) {
            setPaymentMethods(methodsData.methods);
            if (methodsData.methods.length === 1) {
              setSelectedMethodId(methodsData.methods[0].id);
            }
          }
        }
      } catch (err) {
        console.error('[Pricing] Error fetching methods:', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchData();
  }, []);

  // Pre-fill checkout with user profile
  useEffect(() => {
    if (profile) {
      const names = (profile.displayName || '').split(' ');
      setCheckoutData({
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: profile.email || '',
      });
    }
  }, [profile]);

  // Current active plan detection
  const currentPlan = useMemo(() => {
    if (!profile?.subscription || profile.subscription.status !== 'active') return null;
    return (
      apiPlans.find((p) => p.id === profile.subscription.planId) ||
      apiPlans.find((p) => p.name === (profile.subscription.planName || profile.subscription.name))
    );
  }, [profile, apiPlans]);

  // Upgrade calculation
  const upgradeInfo = useMemo(() => {
    if (!currentPlan || !selectedPlan || selectedPlan.id === currentPlan.id) return null;
    if (selectedPlan.price <= currentPlan.price) return null;

    const startDate = profile?.subscription?.startDate?.toDate
      ? profile.subscription.startDate.toDate()
      : new Date(profile?.subscription?.startDate);
    const now = new Date();
    const diffMonths = Math.floor(Math.abs(now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const remainingMonths = Math.max(0, (currentPlan.durationMonths || 12) - diffMonths);
    const monthlyDiff = selectedPlan.price - currentPlan.price;
    const totalUpgradePrice = monthlyDiff * remainingMonths;
    const expDate = new Date(startDate);
    expDate.setMonth(expDate.getMonth() + (currentPlan.durationMonths || 12));

    return {
      remainingMonths,
      monthlyDiff,
      totalUpgradePrice,
      currentPlanName: currentPlan.name,
      expirationDate: expDate.toLocaleDateString('es-AR'),
    };
  }, [currentPlan, selectedPlan, profile]);

  const getPlanPricing = (plan: any) => {
    const base = Number(plan.price ?? plan.pricing?.amount) || 0;
    const activePromo = plan.promotions?.periods?.find((pr: any) => {
      if (!pr.isActive) return false;
      const now = Date.now();
      const s = pr.startDate ? new Date(pr.startDate).getTime() : 0;
      const e = pr.endDate ? new Date(pr.endDate).getTime() : Infinity;
      return now >= s && now <= e;
    });

    let effectiveMonthly = base;
    let promoLabel = '';

    if (activePromo) {
      if (activePromo.discountPercentage) {
        effectiveMonthly = base * (1 - activePromo.discountPercentage / 100);
        promoLabel = activePromo.discountPercentage + '% OFF';
      } else if (activePromo.discountAmount) {
        effectiveMonthly = Math.max(0, base - activePromo.discountAmount);
        promoLabel = activePromo.name || 'Promoción Especial';
      }
    }

    return {
      priceStr: effectiveMonthly === 0 ? '0' : effectiveMonthly.toFixed(2),
      originalPriceStr: activePromo ? base.toFixed(2) : null,
      promoLabel: promoLabel || '',
    };
  };

  const openCheckout = (plan: any) => {
    setSelectedPlan(plan);
    setShowCheckout(true);
  };

  const handleFinalCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkoutData.email || !checkoutData.firstName) {
      toast({ variant: 'destructive', title: 'Datos incompletos', description: 'Por favor completá tu nombre y correo.' });
      return;
    }
    if (selectedPlan?.price > 0 && !selectedMethodId) {
      toast({ variant: 'destructive', title: 'Método de pago', description: 'Por favor seleccioná cómo deseás pagar.' });
      return;
    }

    // Si el plan es gratuito ($0) y no hay usuario autenticado, derivar a registro para activar cuenta en campus
    if (selectedPlan?.price === 0 && !user) {
      toast({
        title: 'Crea tu acceso',
        description: 'Para activar tu plan gratuito, completa tu registro con contraseña en el campus.',
      });
      window.location.href = `/auth?plan=${selectedPlan.id}&email=${encodeURIComponent(checkoutData.email)}&name=${encodeURIComponent(checkoutData.firstName)}`;
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/payments/subscribe', {
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
          upgradePrice: upgradeInfo?.totalUpgradePrice,
          countryCode: selectedCountry.code,
          currency: selectedCountry.currency,
          exchangeRate: rates[selectedCountry.currency] || 1,
        }),
      });
      const data = await res.json();

      if (data.init_point) {
        window.location.href = data.init_point;
      } else if (data.success) {
        toast({ title: '¡Plan Activado!', description: 'Tu suscripción fue procesada con éxito.' });
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
    <>
      <section id="pricing" className="py-24 px-6 bg-[#F8FAFC] relative z-10 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-3 block">
              Planes y Precios
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Un plan para cada momento de tu negocio.
            </h2>
            <p className="mt-3 text-slate-500 text-base font-medium">
              Empezá donde estás. Crecé cuando lo necesites.
            </p>

            {/* Selector de País y Moneda Visible en Portada */}
            <div className="mt-8 max-w-lg mx-auto text-left">
              <CountryCurrencySelector
                selectedCountryCode={selectedCountry.code}
                onSelectCountry={handleCountryChange}
                rates={rates}
                showConvertedAmount={false}
                showDisclaimer={true}
                className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm"
              />
            </div>
          </Reveal>

          <div
            className={cn(
              "grid grid-cols-1 gap-8 items-stretch",
              apiPlans.length === 1 ? "max-w-md mx-auto" :
              apiPlans.length === 2 ? "md:grid-cols-2 max-w-4xl mx-auto" :
              "md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto"
            )}
          >
            {loadingPlans ? (
              [1, 2, 3].map((k) => (
                <div key={k} className="h-[520px] bg-white rounded-3xl border border-slate-200 p-8 shadow-sm animate-pulse flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                    <div className="h-8 bg-slate-200 rounded w-1/2" />
                    <div className="h-12 bg-slate-200 rounded w-3/4" />
                    <div className="space-y-2 pt-6">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                      <div className="h-4 bg-slate-100 rounded w-5/6" />
                      <div className="h-4 bg-slate-100 rounded w-4/6" />
                    </div>
                  </div>
                  <div className="h-12 bg-slate-200 rounded-xl" />
                </div>
              ))
            ) : apiPlans.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <p className="text-slate-500 font-bold text-base">Próximamente nuevos planes disponibles.</p>
              </div>
            ) : (
              apiPlans.map((plan, idx) => {
                const pricing = getPlanPricing(plan);
                const isFeatured = plan.isRecommended || plan.isPopular || (apiPlans.length >= 3 ? idx === 1 : idx === apiPlans.length - 1);
                const isCurrent = currentPlan?.id === plan.id;
                const isUpgrade = !!(currentPlan && plan.price > currentPlan.price);
                const isDowngrade = !!(currentPlan && plan.price < currentPlan.price && plan.type !== 'free');

                const baseUsdPrice = Number(pricing.priceStr) || 0;
                const isFree = baseUsdPrice === 0;
                const isLocalCurrency = selectedCountry.currency !== 'USD';
                const localPriceNumber = isLocalCurrency && !isFree
                  ? convertUsdAmount(baseUsdPrice, selectedCountry.currency, rates)
                  : baseUsdPrice;
                const formattedNumberOnly = new Intl.NumberFormat('es-AR', {
                  minimumFractionDigits: isLocalCurrency && !['ARS', 'CLP', 'COP'].includes(selectedCountry.currency) ? 2 : 0,
                  maximumFractionDigits: isLocalCurrency && !['ARS', 'CLP', 'COP'].includes(selectedCountry.currency) ? 2 : 0,
                }).format(localPriceNumber);

                return (
                  <Tilt key={plan.id || idx} max={7} className="h-full">
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: idx * 0.1, ease: EASE }}
                      whileHover={{ y: isFeatured ? -8 : -4 }}
                      className={cn(
                        "rounded-3xl p-8 flex flex-col justify-between h-full transition-all relative",
                        isFeatured
                          ? "bg-[#0F172A] text-white border-2 border-[#1CB899] shadow-2xl lg:-translate-y-2"
                          : "bg-white text-slate-900 border border-slate-200 shadow-sm hover:shadow-md",
                        isCurrent && "ring-2 ring-[#1CB899]/40",
                        isDowngrade && "opacity-70"
                      )}
                    >
                      {/* Badges */}
                      {isFeatured && (
                        <motion.div
                          animate={{ y: [0, -2, 0] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#1CB899] text-[#0F172A] text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md"
                        >
                          Recomendado
                        </motion.div>
                      )}
                      {isCurrent && (
                        <div className="absolute top-6 right-6">
                          <span className="flex items-center gap-1 bg-[#1CB899]/15 text-[#1CB899] text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-[#1CB899]/30">
                            <Check className="w-3 h-3" /> Tu Plan
                          </span>
                        </div>
                      )}
                      {isDowngrade && (
                        <div className="absolute top-6 right-6">
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                            No Disponible
                          </span>
                        </div>
                      )}

                      <div>
                        <div className={cn("text-xs font-black uppercase tracking-widest mb-1", isFeatured ? "text-[#1CB899]" : "text-slate-400")}>
                          {`PLAN 0${idx + 1}`}
                        </div>
                        <h3 className={cn("text-2xl font-black", isFeatured ? "text-white" : "text-slate-900")}>
                          {plan.name}
                        </h3>
                        <p className={cn("text-sm font-medium mt-2 mb-6", isFeatured ? "text-slate-300" : "text-slate-500")}>
                          {plan.description || (
                            idx === 0 ? 'Para comenzar tu academia digital con bases sólidas.' :
                            idx === 1 ? 'Para mentores y academias en fase de expansión activa.' :
                            'Para grandes operaciones y academias consolidadas.'
                          )}
                        </p>

                        {/* Price: Valor grande en moneda del país elegido, chico en dólares */}
                        <div className={cn("mb-6 pb-6 border-b", isFeatured ? "border-slate-800" : "border-slate-100")}>
                          <div className="flex items-baseline gap-1.5 overflow-hidden">
                            {!isFree && (
                              <span className={cn("text-xs font-black uppercase", isFeatured ? "text-[#1CB899]" : "text-slate-400")}>
                                {selectedCountry.currency}
                              </span>
                            )}
                            <AnimatePresence mode="popLayout" initial={false}>
                              <motion.span
                                key={`price-${plan.id}-${selectedCountry.currency}`}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.25, ease: EASE }}
                                className={cn("text-4xl font-black", isFeatured ? "text-white" : "text-slate-900")}
                              >
                                {isFree ? '$0' : `$${formattedNumberOnly}`}
                              </motion.span>
                            </AnimatePresence>
                            <span className="text-xs font-bold text-slate-400">/ mes</span>
                          </div>

                          {/* Valor Chico: Correspondiente en Dólares */}
                          {!isFree && isLocalCurrency && (
                            <div className="mt-2.5 flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "text-xs font-bold px-2.5 py-0.5 rounded-lg",
                                  isFeatured
                                    ? "bg-slate-800 text-slate-300 border border-slate-700"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                )}
                              >
                                Ref: USD ${pricing.priceStr} / mes
                              </span>
                              <span className={cn("text-[10px] font-medium", isFeatured ? "text-slate-400" : "text-slate-500")}>
                                ({selectedCountry.name})
                              </span>
                            </div>
                          )}

                          {!isFree && !isLocalCurrency && (
                            <div className="mt-2 text-[11px] font-semibold text-slate-400">
                              Cobro internacional en USD
                            </div>
                          )}

                          {pricing.originalPriceStr && (
                            <span className="text-xs line-through text-slate-400 font-bold block mt-2">
                              Antes: {isLocalCurrency ? `${formatCurrencyAmount(convertUsdAmount(Number(pricing.originalPriceStr), selectedCountry.currency, rates), selectedCountry.currency)} · ` : ''}USD ${pricing.originalPriceStr}
                            </span>
                          )}
                          {pricing.promoLabel && (
                            <span className={cn("text-[11px] font-semibold block mt-1", isFeatured ? "text-[#1CB899]" : "text-emerald-600")}>
                              {pricing.promoLabel}
                            </span>
                          )}
                        </div>

                        {/* Features */}
                        <ul className={cn("space-y-3 text-sm font-bold mb-8", isFeatured ? "text-slate-200" : "text-slate-700")}>
                          {Boolean((plan.limits?.maxTutors && plan.limits.maxTutors > 0) || plan.targetAudience === 'enterprise') && (
                            <li className="flex items-center gap-2.5">
                              <Check className="w-4 h-4 text-[#1CB899] shrink-0" />
                              <span>
                                {plan.limits?.maxTutors === -1 ? 'Tutores ilimitados' : `Hasta ${plan.limits?.maxTutors || 5} tutores`}
                              </span>
                            </li>
                          )}
                          <li className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-[#1CB899] shrink-0" />
                            {plan.limits?.maxCourses === -1 || plan.limits?.maxCourses >= 9999
                              ? 'Cursos ilimitados'
                              : `Hasta ${plan.limits?.maxCourses || 5} cursos`}
                          </li>
                          <li className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-[#1CB899] shrink-0" />
                            {plan.limits?.maxStudents === -1 || plan.limits?.maxStudents >= 99999
                              ? 'Alumnos ilimitados'
                              : `Hasta ${plan.limits?.maxStudents || 100} alumnos`}
                          </li>
                          {Boolean(plan.aiQuotas?.totalCredits > 0) && (
                            <li className="flex items-center gap-2.5">
                              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                              {plan.aiQuotas.totalCredits} créditos Evo IA mensuales
                            </li>
                          )}
                          {Boolean(plan.limits?.hasAnalytics) && (
                            <li className="flex items-center gap-2.5">
                              <Check className="w-4 h-4 text-[#1CB899] shrink-0" />
                              Analíticas y métricas de retención
                            </li>
                          )}
                          {Boolean(plan.limits?.hasPrioritySupport) && (
                            <li className="flex items-center gap-2.5">
                              <Check className="w-4 h-4 text-[#1CB899] shrink-0" />
                              Soporte prioritario VIP
                            </li>
                          )}
                          {Array.isArray(plan.features) && plan.features.map((feature: string, fIdx: number) => (
                            <li key={fIdx} className="flex items-center gap-2.5">
                              <Check className="w-4 h-4 text-[#1CB899] shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Downgrade note */}
                      {isDowngrade && (
                        <div className="mb-4 flex items-center gap-2 text-slate-500 bg-slate-100 p-3 rounded-xl">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <p className="text-[10px] font-bold leading-tight">Disponible tras vencer tu plan actual.</p>
                        </div>
                      )}

                      {/* CTA Button */}
                      <motion.button
                        whileHover={isCurrent || isDowngrade ? {} : { scale: 1.02 }}
                        whileTap={isCurrent || isDowngrade ? {} : { scale: 0.97 }}
                        onClick={() => !isCurrent && !isDowngrade && openCheckout(plan)}
                        disabled={isCurrent || isDowngrade}
                        className={cn(
                          "w-full py-3.5 rounded-xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2",
                          isCurrent
                            ? "bg-[#1CB899]/10 text-[#1CB899] border-2 border-[#1CB899]/20 cursor-default shadow-none"
                            : isDowngrade
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                              : isFeatured
                                ? "bg-[#1CB899] hover:bg-[#18a287] text-[#0F172A]"
                                : "border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white cursor-pointer"
                        )}
                      >
                        <span>
                          {isCurrent ? 'Plan Activo' : isDowngrade ? 'No Disponible' : isUpgrade ? 'Mejorar Plan' : `Elegir ${plan.name}`}
                        </span>
                        {!isCurrent && !isDowngrade && <ArrowRight className="w-4 h-4" />}
                      </motion.button>
                    </motion.div>
                  </Tilt>
                );
              })
            )}
          </div>

          <div className="max-w-2xl mx-auto mt-10 p-4 bg-slate-50 border border-slate-200/90 rounded-2xl text-center space-y-1.5 shadow-xs">
            <p className="text-xs text-slate-700 font-bold">
              * El valor puede cambiar según la cotización del momento de realizar la transacción.
            </p>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              {selectedCountry.isDomesticArgentina
                ? 'Para Argentina los cobros se realizan en pesos argentinos (ARS) mediante Mercado Pago, Getnet o Transferencia bancaria. Cancelás cuando querés.'
                : `Para compras fuera de Argentina (${selectedCountry.name}) el pago se procesa exclusivamente con tarjeta internacional en USD mediante Stripe (Mercado Pago y Transferencia bancaria quedan excluidos). Cancelás cuando querés.`}
            </p>
          </div>
        </div>
      </section>

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        selectedPlan={selectedPlan}
        paymentMethods={paymentMethods}
        checkoutData={checkoutData}
        setCheckoutData={setCheckoutData}
        selectedMethodId={selectedMethodId}
        setSelectedMethodId={setSelectedMethodId}
        isProcessing={isProcessing}
        onSubmit={handleFinalCheckout}
        upgradeInfo={upgradeInfo}
        selectedCountry={selectedCountry}
        onSelectCountry={handleCountryChange}
        rates={rates}
      />
    </>
  );
}

// Suspense wrapper required for useSearchParams
export function FastoriaPricing() {
  return (
    <Suspense fallback={
      <section id="pricing" className="py-24 px-6 bg-[#F8FAFC] relative z-10 border-t border-slate-100">
        <div className="max-w-6xl mx-auto flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1CB899]" />
        </div>
      </section>
    }>
      <FastoriaPricingContent />
    </Suspense>
  );
}
