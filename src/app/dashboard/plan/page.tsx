'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { 
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
  Calendar,
  Check,
  Package,
  Layers,
  ArrowUpRight,
  BadgePercent,
  Clock,
  Info,
  Palette,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { differenceInDays, format } from 'date-fns';

export default function MyPlanPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-10 w-10 animate-spin text-accent/20" />
      </div>
    }>
      <PlanContentInner />
    </Suspense>
  );
}

function PlanContentInner() {
  const { user, profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [plans, setPlans] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [courseCount, setCourseCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  
  // Checkout State
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
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

        // Fetch actual counts if mentor
        if (user) {
          const coursesQuery = query(collection(db, 'courses'), where('tutorId', '==', user.uid));
          const coursesSnap = await getCountFromServer(coursesQuery);
          setCourseCount(coursesSnap.data().count);

          // Estudiantes únicos (aproximado por enrollements)
          const studentsQuery = query(collection(db, 'enrollments'), where('mentorId', '==', user.uid));
          const studentsSnap = await getDocs(studentsQuery);
          const uniqueStudents = new Set(studentsSnap.docs.map(d => d.data().studentId));
          setStudentCount(uniqueStudents.size);
        }

      } catch (error) {
        console.error("[MyPlan] Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, db]);

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

  const sub = profile?.subscription;
  const currentPlan = useMemo(() => {
    if (!sub || sub.status !== 'active') return null;
    return plans.find(p => p.id === sub.planId);
  }, [sub, plans]);

  // Upgrade Calculation
  const upgradeInfo = useMemo(() => {
    if (!currentPlan || !selectedPlan || selectedPlan.id === currentPlan.id) return null;
    if (selectedPlan.price <= currentPlan.price) return null;

    const startDate = sub.startDate?.toDate ? sub.startDate.toDate() : new Date(sub.startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    const remainingMonths = Math.max(0, (currentPlan.durationMonths || 12) - diffMonths);
    
    const monthlyDiff = selectedPlan.price - currentPlan.price;
    const totalUpgradePrice = monthlyDiff * remainingMonths;

    return {
      remainingMonths,
      totalUpgradePrice,
      currentPlanName: currentPlan.name
    };
  }, [currentPlan, selectedPlan, sub]);

  const handleFinalCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlan.price > 0 && !selectedMethodId) {
      toast({ variant: 'destructive', title: 'Método de pago', description: 'Selecciona cómo deseas pagar.' });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/payments/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          userId: user?.uid,
          email: checkoutData.email,
          firstName: checkoutData.firstName,
          lastName: checkoutData.lastName,
          paymentMethodId: selectedMethodId,
          isUpgrade: !!upgradeInfo,
          upgradePrice: upgradeInfo?.totalUpgradePrice
        })
      });

      const data = await response.json();
      if (data.init_point) window.location.href = data.init_point;
      else if (data.success) {
        toast({ title: '¡Plan Actualizado! 🚀', description: 'Tu nueva capacidad ha sido habilitada.' });
        setShowCheckout(false);
      } else throw new Error(data.error);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const limits = sub?.limits || { maxCourses: 0, maxStudents: 0 };
  const courseProgress = limits.maxCourses > 0 ? (courseCount / limits.maxCourses) * 100 : 0;
  const studentProgress = limits.maxStudents > 0 ? (studentCount / limits.maxStudents) * 100 : 0;

  const endD = sub?.endDate?.toDate ? sub.endDate.toDate() : (sub?.endDate ? new Date(sub.endDate) : null);
  const daysLeft = endD ? differenceInDays(endD, new Date()) : 0;

  const getSubdomainUrl = () => {
    const previewUsername = profile?.username || '';
    if (typeof window === 'undefined') return '';
    const parts = window.location.origin.split('://');
    if (parts.length < 2) return '';
    const protocol = parts[0];
    const fullHost = parts[1];
    let baseHost = fullHost;
    if (fullHost.includes('localhost')) {
      baseHost = fullHost.includes('.') ? fullHost.split('.').slice(-1)[0] : fullHost;
    } else {
      const hostParts = fullHost.split('.');
      if (hostParts.length > 2) baseHost = hostParts.slice(-2).join('.');
    }
    return `${protocol}://${previewUsername.toLowerCase()}.${baseHost}`;
  };

  const tutorProfileUrl = getSubdomainUrl();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary/20" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Cargando tu ecosistema...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-12 pb-20">
        {/* Header con Estatus */}
        <section className="space-y-8">
          <div>
            <h1 className="text-4xl font-black text-foreground tracking-tight">Suscripción y Capacidad</h1>
            <p className="text-muted-foreground font-medium">Gestiona los límites, recursos y facturación de tu academia.</p>
          </div>

          <Tabs defaultValue="capacidad" className="w-full">
            <TabsList className="bg-secondary/10 p-1.5 rounded-none border-b h-16 w-full justify-start gap-2 px-6 mb-8">
              <TabsTrigger value="capacidad" className="rounded-xl gap-2 font-bold px-6 h-11"><Layers className="h-4 w-4" /> Capacidad</TabsTrigger>
              <TabsTrigger value="facturacion" className="rounded-xl gap-2 font-bold px-6 h-11 text-warn bg-warn/10/50 border-warn/15"><CreditCard className="h-4 w-4" /> Facturación</TabsTrigger>
            </TabsList>

            <TabsContent value="capacidad" className="m-0 space-y-12">
              <div className="grid md:grid-cols-3 gap-6">
            {/* Tarjeta de Plan Actual */}
            <Card className="md:col-span-1 bg-primary text-white relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Package className="w-32 h-32" />
              </div>
              <CardContent className="p-8 space-y-6 relative z-10">
                <Badge className="bg-white/20 text-white border-none px-3 py-1 text-[10px] uppercase font-black tracking-widest">
                  Plan Activo
                </Badge>
                <div>
                  <h2 className="text-3xl font-black">{sub?.planName || sub?.name || 'Sin Plan'}</h2>
                  <p className="text-primary/15/70 text-sm font-bold uppercase tracking-tighter">
                    {daysLeft > 0 ? `Vence en ${daysLeft} días` : 'Expirado o sin vigencia'}
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs font-bold text-primary/15">Sincronizado con Producción</span>
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta de Métricas */}
            <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
              <Card className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cursos Activos</p>
                    <h3 className="text-3xl font-black text-foreground">{courseCount} <span className="text-sm text-muted-foreground font-bold">/ {limits.maxCourses === -1 ? '∞' : limits.maxCourses}</span></h3>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <Layers className="h-6 w-6" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Progress value={courseProgress} className="h-2 bg-muted" indicatorClassName="bg-primary" />
                  <p className="text-[10px] font-bold text-right text-muted-foreground uppercase tracking-widest">
                    {courseProgress.toFixed(0)}% Utilizado
                  </p>
                </div>
              </Card>

              <Card className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estudiantes</p>
                    <h3 className="text-3xl font-black text-foreground">{studentCount} <span className="text-sm text-muted-foreground font-bold">/ {limits.maxStudents === -1 ? '∞' : limits.maxStudents}</span></h3>
                  </div>
                  <div className="p-3 bg-success/10 rounded-2xl text-success">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Progress value={studentProgress} className="h-2 bg-muted" indicatorClassName="bg-success" />
                  <p className="text-[10px] font-bold text-right text-muted-foreground uppercase tracking-widest">
                    {studentProgress.toFixed(0)}% Utilizado
                  </p>
                </div>
              </Card>
            </div>

            {/* Nueva Tarjeta de Créditos IA */}
            <Card className="md:col-span-3 rounded-lg bg-white p-10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-10 opacity-5">
                <Sparkles className="w-40 h-40" />
              </div>
              <div className="grid md:grid-cols-4 gap-10 items-center relative z-10">
                <div className="md:col-span-1 space-y-4">
                  <Badge className="bg-warn/15 text-warn border-none px-3 py-1 text-[9px] uppercase font-black tracking-widest">
                    Fastoria AI Engine
                  </Badge>
                  <h3 className="text-2xl font-black text-foreground leading-tight">Créditos de Generación</h3>
                  <p className="text-sm text-muted-foreground font-medium">Consumo de tokens para creación de contenidos, imágenes y videos.</p>
                </div>

                <div className="md:col-span-2 flex items-center gap-12">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Saldo Disponible</p>
                    <p className="text-5xl font-black text-foreground">
                      {(((sub?.aiQuotas?.totalCredits || 0) - (sub?.aiQuotas?.usedCredits || 0)) + (profile?.credits?.balance || 0)).toFixed(5)}
                    </p>
                  </div>
                  <div className="h-16 w-px bg-muted hidden md:block" />
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-muted-foreground">Progreso de Consumo</span>
                      <span className="text-primary">Total: {sub?.aiQuotas?.totalCredits || 0}</span>
                    </div>
                    <Progress 
                      value={sub?.aiQuotas?.totalCredits > 0 ? ((sub?.aiQuotas?.usedCredits || 0) / sub?.aiQuotas?.totalCredits) * 100 : 0} 
                      className="h-3 bg-muted" 
                      indicatorClassName="bg-warn" 
                    />
                  </div>
                </div>

                <div className="md:col-span-1 flex justify-center md:justify-end">
                  {currentPlan?.rechargeOptions?.some((opt: any) => opt.credits > 0 && opt.price > 0) && (
                    <Button 
                      onClick={() => document.getElementById('credits-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className="h-14 px-8 rounded-2xl font-bold bg-foreground text-white hover:scale-105 transition-all"
                    >
                      Comprar Créditos
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Capacidades Extra */}
            <div className="md:col-span-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-muted flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Invitaciones</p>
                  <p className="text-lg font-black text-foreground">{sub?.invitationsPerCourse || 0} <span className="text-[10px] text-muted-foreground">/ curso</span></p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-muted flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Branding</p>
                  <p className="text-lg font-black text-foreground">{sub?.limits?.hasCustomBranding ? 'Habilitado' : 'Estándar'}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-muted flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">IA Premium</p>
                  <p className="text-lg font-black text-foreground">{sub?.hasPremiumAI ? 'Activa' : 'No'}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-muted flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Fin de Abono</p>
                  <p className="text-lg font-black text-foreground">{endD ? format(endD, 'dd/MM/yy') : '---'}</p>
                </div>
              </div>
            </div>
          </div>
          </TabsContent>

          {/* Nueva Pestaña de Facturación */}
          <TabsContent value="facturacion" className="m-0 space-y-8">
            {(() => {
              const billing = profile?.billingCycle;
              const hasCard = profile?.payment?.stripeCustomerId;
              
              // Cálculo de regalía estimado en frontend (es un espejo del backend cron)
              let royaltiesAmount = 0;
              let currentPercentage = 0;
              const sales = billing?.monthlySalesAmount || 0;
              
              if (sub?.type === 'mixed' && currentPlan?.pricing?.revenueShare) {
                const { freeStudentsIncluded = 0, tiers = [] } = currentPlan.pricing.revenueShare;
                const studentsForTier = Math.max(0, studentCount - freeStudentsIncluded);
                const matchingTier = tiers.find((t: any) => studentsForTier >= t.min && (t.max === -1 || t.max === 0 || studentsForTier <= t.max));
                if (matchingTier) {
                  currentPercentage = matchingTier.percentage;
                  royaltiesAmount = sales * (currentPercentage / 100);
                }
              }

              const fixedAmount = sub?.fixedAmount || 0;
              let discountPercent = 0;
              const promoIndex = billing?.promotionalCycleIndex || 0;

              if (currentPlan && currentPlan.promotions && currentPlan.promotions.periods) {
                let elapsed = 0;
                for (const period of currentPlan.promotions.periods) {
                  if (promoIndex >= elapsed && promoIndex < elapsed + period.cycleCount) {
                    discountPercent = period.discountPercent;
                    break;
                  }
                  elapsed += period.cycleCount;
                }
              }

              const discountedFixedAmount = fixedAmount * (1 - (discountPercent / 100));
              const estimatedTotal = discountedFixedAmount + royaltiesAmount;

              const cStart = billing?.currentCycleStart?.toDate ? billing.currentCycleStart.toDate() : (billing?.currentCycleStart ? new Date(billing.currentCycleStart) : new Date());
              const cEnd = billing?.currentCycleEnd?.toDate ? billing.currentCycleEnd.toDate() : (billing?.currentCycleEnd ? new Date(billing.currentCycleEnd) : new Date());

              return (
                <div className="grid md:grid-cols-3 gap-8">
                  {/* Panel Izquierdo: Resumen y Deuda */}
                  <div className="md:col-span-2 space-y-8">
                    <Card className="p-8 border-none bg-primary text-white shadow-xl">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <p className="text-primary/40 font-bold uppercase tracking-widest text-xs mb-1">Total a Pagar (Estimado)</p>
                          <h2 className="text-6xl font-black">${estimatedTotal.toFixed(2)}</h2>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-white/20 text-white border-none uppercase tracking-widest text-[10px]">Ciclo Actual</Badge>
                          <p className="text-xs font-bold mt-2 opacity-80">{format(cStart, 'dd/MM/yy')} al {format(cEnd, 'dd/MM/yy')}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">Abono Fijo</p>
                          <p className="text-xl font-bold">${discountedFixedAmount.toFixed(2)}</p>
                          {discountPercent > 0 && (
                            <p className="text-xs text-success-foreground bg-success/20 inline-block px-2 rounded-full mt-1">Descuento {discountPercent}%</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">Regalías ({currentPercentage}%)</p>
                          <p className="text-xl font-bold">${royaltiesAmount.toFixed(2)}</p>
                          <p className="text-xs opacity-60 mt-1">Base: ${sales.toFixed(2)} vendidas</p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-8 space-y-6 bg-white border-muted">
                      <h3 className="text-xl font-black border-b pb-4">Detalle de Regalías</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Users className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-bold">Total Alumnos Activos</p>
                            <p className="text-sm text-muted-foreground">Tu comisión depende de este número.</p>
                          </div>
                        </div>
                        <p className="text-3xl font-black">{studentCount}</p>
                      </div>

                      {currentPlan?.pricing?.revenueShare?.freeStudentsIncluded > 0 && (
                        <div className="flex items-center justify-between opacity-70">
                          <p className="text-sm font-bold">Alumnos de Gracia (Excluidos de regalía)</p>
                          <p className="text-sm font-bold">-{currentPlan.pricing.revenueShare.freeStudentsIncluded}</p>
                        </div>
                      )}
                      
                      <div className="bg-muted p-4 rounded-xl flex items-center justify-between">
                        <p className="text-sm font-bold uppercase tracking-widest">Regalía Aplicada</p>
                        <Badge className="bg-warn text-white border-none">{currentPercentage}%</Badge>
                      </div>
                    </Card>
                  </div>

                  {/* Panel Derecho: Método de Pago */}
                  <div className="md:col-span-1 space-y-6">
                    <Card className="p-6 border-muted bg-white text-center">
                      <div className="mx-auto w-16 h-16 rounded-full bg-success/10 text-success flex items-center justify-center mb-4">
                        {hasCard ? <Check className="h-8 w-8" /> : <CreditCard className="h-8 w-8" />}
                      </div>
                      <h3 className="text-xl font-black mb-2">{hasCard ? 'Tarjeta Guardada' : 'No tienes tarjeta'}</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        {hasCard 
                          ? 'Los cobros se realizarán automáticamente a tu tarjeta al finalizar tu ciclo.' 
                          : 'Debes configurar una tarjeta para que el sistema pueda cobrar tu abono a fin de mes.'}
                      </p>
                      <Button 
                        onClick={async () => {
                          const res = await fetch('/api/payments/setup-billing', { 
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user?.uid })
                          });
                          const data = await res.json();
                          if (data.url) window.location.href = data.url;
                          else toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar enlace de configuración.' });
                        }}
                        className={cn("w-full h-12 rounded-xl font-bold", hasCard ? "bg-muted text-foreground" : "bg-primary text-white")}
                      >
                        {hasCard ? 'Cambiar Tarjeta' : 'Configurar Tarjeta Ahora'}
                      </Button>
                    </Card>
                  </div>
                </div>
              );
            })()}
          </TabsContent>
          </Tabs>
        </section>

        {/* Sección de Upgrades y Créditos */}
        <div className="space-y-16">
          {/* 1. Compra de Créditos (Prioridad) */}
          {currentPlan?.rechargeOptions?.some((opt: any) => opt.credits > 0 && opt.price > 0) && (
            <section id="credits-section" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                    <Zap className="h-6 w-6 text-warn" /> Recargar Créditos Extra
                  </h2>
                  <p className="text-muted-foreground font-medium">Añade potencia de fuego a tu plan {currentPlan.name} sin cambiar de suscripción.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {currentPlan.rechargeOptions
                  .filter((opt: any) => opt.credits > 0 && opt.price > 0)
                  .map((opt: any, idx: number) => (
                    <Card 
                      key={idx}
                      className="group relative p-8 transition-all hover:-translate-y-2"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Sparkles className="w-20 h-20" />
                      </div>
                      <div className="space-y-6 relative z-10">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Pack de Créditos</p>
                          <h4 className="text-3xl font-black text-foreground">+{opt.credits}</h4>
                        </div>
                        <div className="pt-4 border-t border-muted flex items-center justify-between">
                          <span className="text-2xl font-black text-foreground">${opt.price}</span>
                          <Button 
                            onClick={() => {
                              setSelectedPlan({ ...currentPlan, isCreditPack: true, packCredits: opt.credits, packPrice: opt.price });
                              setShowCheckout(true);
                            }}
                            size="sm" 
                            className="rounded-xl font-bold bg-foreground text-white"
                          >
                            Comprar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </section>
          )}

          {/* 2. Planes de Suscripción */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                  <Rocket className="h-6 w-6 text-primary" /> Mejorar tu Plan
                </h2>
                <p className="text-muted-foreground font-medium">Escala tus límites y desbloquea herramientas de IA avanzada.</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {plans.filter(p => p.isActive !== false).map((plan) => {
                const isCurrent = sub?.planId === plan.id;
                const isUpgrade = currentPlan && plan.price > currentPlan.price;
                const isDowngrade = currentPlan && plan.price < currentPlan.price && plan.type !== 'free';

                return (
                  <Card 
                    key={plan.id}
                    className={cn(
                      "relative flex flex-col h-full border-none rounded-lg transition-all duration-500 hover:-translate-y-2 overflow-hidden",
                      plan.isEnterprise ? "bg-foreground text-white" : "bg-white",
                      isCurrent && "ring-4 ring-success/30"
                    )}
                  >
                    <CardContent className="p-10 flex flex-col h-full">
                      <div className="mb-8">
                        <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black">${plan.price}</span>
                          <span className="text-sm font-bold opacity-60">/mes</span>
                        </div>
                      </div>

                      <div className={cn(
                        "p-6 rounded-lg mb-8 flex items-center justify-between",
                        plan.isEnterprise ? "bg-white/5 border border-white/10" : "bg-muted border border-muted"
                      )}>
                        <div className="flex items-center gap-3">
                          <Zap className={cn("h-6 w-6", plan.isEnterprise ? "text-primary" : "text-warn")} />
                          <div>
                            <p className={cn("text-lg font-black", plan.isEnterprise ? "text-white" : "text-foreground")}>
                              {plan.aiQuotas?.totalCredits || 0}
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">Créditos IA</p>
                          </div>
                        </div>
                      </div>

                      <ul className="space-y-4 mb-10 flex-1">
                        <li className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                          <span className="text-sm font-bold opacity-80">
                            {plan.limits?.maxCourses === -1 ? 'Cursos Ilimitados' : `Hasta ${plan.limits?.maxCourses} Cursos`}
                          </span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                          <span className="text-sm font-bold opacity-80">
                            {plan.limits?.maxStudents === -1 ? 'Estudiantes Ilimitados' : `Hasta ${plan.limits?.maxStudents} Alumnos`}
                          </span>
                        </li>
                        {plan.hasPremiumAI && (
                          <li className="flex items-start gap-3">
                            <Sparkles className="h-5 w-5 text-warn mt-0.5 shrink-0" />
                            <span className="text-sm font-bold text-warn">IA Premium Habilitada</span>
                          </li>
                        )}
                      </ul>

                      <Button 
                        onClick={() => {
                          setSelectedPlan({ ...plan, isCreditPack: false });
                          setShowCheckout(true);
                        }}
                        disabled={isCurrent || isDowngrade}
                        className={cn(
                          "w-full h-14 rounded-2xl text-lg font-black transition-all active:scale-95",
                          isCurrent 
                            ? "bg-success/10 text-success border-2 border-success/15 cursor-default shadow-none" 
                            : isDowngrade
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : plan.isEnterprise 
                                ? "bg-primary hover:bg-primary text-white shadow-primary/30" 
                                : "bg-foreground hover:bg-foreground text-white"
                        )}
                      >
                        {isCurrent ? 'Plan Actual' : isDowngrade ? 'No Disponible' : isUpgrade ? 'Mejorar Ahora' : 'Comprar Plan'}
                        {!isCurrent && !isDowngrade && <ArrowUpRight className="ml-2 h-5 w-5" />}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>

        {/* FAQ o Tips */}
        <section className="bg-white rounded-lg p-10 border border-muted flex flex-col md:flex-row items-center gap-10">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Info className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-black text-foreground">¿Necesitas un plan a medida?</h4>
            <p className="text-muted-foreground font-medium">Si tu academia supera los 2,000 alumnos o requieres integraciones personalizadas, contacta a nuestro equipo de soporte para un plan Enterprise exclusivo.</p>
          </div>
          <Button variant="outline" className="h-14 px-8 rounded-2xl font-bold border-2 ml-auto shrink-0">Contactar Soporte</Button>
        </section>
      </div>

      {/* Checkout Modal */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="mw-md">
          <div className="px-8 pt-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-2">
                {selectedPlan?.isCreditPack ? <Zap className="h-6 w-6 text-primary" /> : (upgradeInfo ? <Sparkles className="h-6 w-6 text-warn/30" /> : <Rocket className="h-6 w-6 text-primary" />)}
                {selectedPlan?.isCreditPack ? 'Comprar Créditos Extra' : (upgradeInfo ? 'Mejora de Capacidad' : 'Confirmar Suscripción')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium">
                {selectedPlan?.isCreditPack 
                  ? `Recarga de +${selectedPlan.packCredits} créditos Fastoria AI`
                  : (upgradeInfo 
                    ? `Subiendo del ${upgradeInfo.currentPlanName} al ${selectedPlan?.name}` 
                    : `Activando el plan ${selectedPlan?.name}`)}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <form onSubmit={handleFinalCheckout} className="px-8 pb-8 space-y-6 bg-white">
            {selectedPlan?.isCreditPack ? (
              <div className="bg-warn/10 border border-warn/15 rounded-2xl p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-black text-warn">Total a Pagar</p>
                    <p className="text-xs text-warn font-medium">Carga inmediata de saldo</p>
                  </div>
                  <span className="text-2xl font-black text-warn">${selectedPlan.packPrice}</span>
                </div>
              </div>
            ) : upgradeInfo && (
              <div className="bg-warn/10 border border-warn/15 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warn mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-warn">Prorrateo de Mejora</p>
                    <p className="text-xs text-warn font-medium leading-relaxed">
                      Se te cobrará solo el diferencial por los meses restantes de tu ciclo actual.
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-warn/20 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-warn tracking-widest">Diferencial:</span>
                  <span className="text-lg font-black text-warn">${upgradeInfo.totalUpgradePrice.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Método de Pago</label>
              <div className="grid gap-3">
                {paymentMethods.map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethodId(method.id)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                      selectedMethodId === method.id ? "border-primary bg-primary/10/50" : "border-muted"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {method.type === 'mercadopago' ? <QrCode className="h-5 w-5 text-blue-600" /> : <CreditCard className="h-5 w-5 text-muted-foreground" />}
                      <span className="text-sm font-black">{method.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button 
              type="submit"
              disabled={isProcessing}
              className={cn(
                "w-full h-14 rounded-2xl text-lg font-black text-white",
                selectedPlan?.isCreditPack ? "bg-warn shadow-warn/20" : "bg-primary shadow-primary/20"
              )}
            >
              {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : (
                selectedPlan?.isCreditPack 
                  ? `Pagar $${selectedPlan.packPrice}` 
                  : (upgradeInfo ? `Pagar Diferencial $${upgradeInfo.totalUpgradePrice.toFixed(2)}` : 'Confirmar y Pagar')
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
