'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, MotionConfig, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { Reveal, staggerContainer, staggerItem, Float, Tilt, EASE } from '@/components/ui/animations';
import { DemoPlayer } from '@/components/remotion/DemoPlayer';
import { 
  ArrowRight, Check, ChevronDown, Sparkles, Layers, Shield, 
  Users, Bot, Layout, CreditCard, Award, Calendar, Clock, 
  CheckCircle2, Flame, RefreshCw, BarChart3, Lock,
  ChevronRight, Laptop, MessageSquare, Zap, Target,
  Briefcase, HeartHandshake, FileCheck, HelpCircle,
  GraduationCap, UserCheck, Compass, ShoppingBag, Send, Rocket, TrendingUp
} from 'lucide-react';
import { 
  IoLogoWhatsapp, IoLogoInstagram, IoMailOutline, IoGlobeOutline 
} from 'react-icons/io5';
import { useAuth } from '@/components/auth-context';
import { cn } from '@/lib/utils';

export default function FastoriaLanding() {
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [apiPlans, setApiPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/plans')
      .then((res) => res.json())
      .then((data) => {
        if (data?.plans && Array.isArray(data.plans)) {
          const active = data.plans.filter((p: any) => p.isActive !== false);
          active.sort((a: any, b: any) => (Number(a.price) || 0) - (Number(b.price) || 0));
          setApiPlans(active);
        }
      })
      .catch((err) => console.error('[Landing] Error loading plans from API:', err))
      .finally(() => setLoadingPlans(false));
  }, []);

  const getPlanPricing = (plan: any) => {
    const base = Number(plan.price) || 0;
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

    if (billingPeriod === 'annual') {
      effectiveMonthly = Math.round(effectiveMonthly * (10 / 12) * 100) / 100;
    }

    return {
      priceStr: effectiveMonthly === 0 ? '0' : effectiveMonthly.toFixed(2),
      originalPriceStr: activePromo ? base.toFixed(2) : null,
      promoLabel: promoLabel || (billingPeriod === 'annual' ? '2 meses bonificados' : '')
    };
  };
  const [activeBrandTheme, setActiveBrandTheme] = useState<'teal' | 'violet' | 'amber'>('teal');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, -55]);
  const heroOpacity = useTransform(heroProgress, [0, 0.85], [1, 0.35]);

  const [evoStep, setEvoStep] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Animación progresiva del diálogo con Evo (3 interacciones completas)
  useEffect(() => {
    // evoStep va de 0 a 6 (0: saludo, 1: typing tutor 1, 2: tutor 1, 3: typing evo 1, 4: evo 1, 5: tutor 2, 6: evo 2, 7: tutor 3, 8: evo 3)
    const timer = setInterval(() => {
      setEvoStep((prev) => (prev >= 6 ? 0 : prev + 1));
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // Pricing helper
  const annualDiscountMultiplier = 10 / 12; // Pay 10 months, get 12

  const getPrice = (monthlyPrice: number) => {
    if (billingPeriod === 'annual') {
      const discountedMonthly = Math.round(monthlyPrice * annualDiscountMultiplier);
      return discountedMonthly.toLocaleString('es-AR');
    }
    return monthlyPrice.toLocaleString('es-AR');
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-[#1CB899]/20 selection:text-[#0F172A] overflow-x-hidden font-sans">

      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#1CB899] via-emerald-500 to-teal-600 z-[100] origin-left"
        style={{ scaleX: progressScale }}
      />

      {/* Dynamic Background Patterns */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <Float className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#1CB899]/5 rounded-full blur-3xl pointer-events-none" duration={9} distance={20} />
        <Float className="absolute top-[30%] -left-40 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl pointer-events-none" duration={11} distance={26} delay={1} />
        <Float className="absolute bottom-[8%] right-[12%] w-[440px] h-[440px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" duration={13} distance={16} delay={2} />
      </div>

      {/* Floating Top Navbar */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="fixed top-4 inset-x-0 mx-auto z-50 w-[94%] max-w-6xl"
      >
        <div className={`backdrop-blur-xl rounded-full px-5 py-3 flex items-center justify-between transition-all duration-300 ${scrolled ? 'bg-white/95 border border-slate-200 shadow-xl shadow-slate-900/10' : 'bg-white/70 border border-transparent shadow-lg shadow-slate-900/5'}`}>
          <Link href="/" className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ rotate: -8, scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1CB899] to-emerald-400 flex items-center justify-center text-white font-black text-sm shadow-sm shadow-[#1CB899]/30"
            >
              F
            </motion.div>
            <span className="font-black tracking-tight text-lg text-slate-900">
              FASTORIA<span className="text-[#1CB899]">.</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-xs font-bold uppercase tracking-wider text-slate-600">
            {[
              ['/courses', 'Cursos'],
              ['#identificacion', 'Para quién'],
              ['#problema', 'Problema'],
              ['#propuesta', 'Cómo funciona'],
              ['#diferencial', 'Diferencial'],
              ['#evo', 'Evo IA'],
              ['#pricing', 'Precios'],
              ['#faq', 'FAQ'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="relative group py-1 hover:text-[#1CB899] transition-colors">
                {label}
                <span className="absolute left-0 -bottom-0.5 w-full h-0.5 bg-[#1CB899] rounded-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            {user ? (
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-[#1CB899] hover:bg-[#18a287] text-white text-xs font-bold px-4 py-2 sm:px-5 sm:py-2.5 rounded-full shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>Ir a mi Campus</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              </Link>
            ) : (
              <Link href="/auth">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 sm:px-5 sm:py-2.5 rounded-full shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>Ingresar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              </Link>
            )}
          </div>
        </div>
      </motion.nav>

      {/* ========================================================================= */}
      {/* 1. HERO — Entender Fastoria en 5 segundos */}
      {/* ========================================================================= */}
      <section ref={heroRef} className="relative pt-36 pb-20 md:pt-44 md:pb-28 px-6 overflow-hidden z-10">
        <div className="max-w-6xl mx-auto text-center">

          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1CB899]/10 border border-[#1CB899]/20 text-[#138d74] text-xs font-black uppercase tracking-[0.18em] mb-6"
          >
            <motion.span
              animate={{ rotate: [0, 15, -10, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
              className="inline-flex"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#1CB899]" />
            </motion.span>
            TU CONOCIMIENTO PUEDE SER UN NEGOCIO.
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.08] max-w-4xl mx-auto"
          >
            Creá, vendé y hacé crecer tu{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1CB899] via-emerald-500 to-teal-700 animate-gradient-text">
              negocio de conocimiento.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
            className="mt-6 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed"
          >
            Cursos, productos digitales, mentorías, alumnos, seguimientos e inteligencia artificial. Todo en un mismo lugar.
          </motion.p>

          {/* Hero CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5"
          >
            <Link href={user ? "/dashboard" : "/auth"} className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#1CB899] hover:bg-[#18a287] text-white font-black text-sm shadow-xl shadow-[#1CB899]/25 hover:shadow-2xl hover:shadow-[#1CB899]/35 transition-colors flex items-center justify-center gap-2 group"
              >
                {user ? "Continuar a mi Campus" : "Empezar con Fastoria"}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </Link>
            <a href="#propuesta" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                Ver cómo funciona
              </motion.button>
            </a>
          </motion.div>

          {/* Hero Product Mockup Protagonista */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
            className="mt-14 relative mx-auto max-w-5xl"
          >
            <motion.div style={{ y: heroY, opacity: heroOpacity }}>
              {/* Glow Aura */}
              <Float className="absolute -inset-2 bg-gradient-to-r from-[#1CB899]/20 via-violet-500/15 to-emerald-500/20 rounded-[40px] blur-2xl -z-10" duration={6} distance={12} />

              {/* Interactive Player / Software Mockup */}
              <Tilt max={6}>
              <div className="bg-white rounded-3xl md:rounded-[36px] border border-slate-200/90 shadow-2xl p-2 md:p-3 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-bold text-slate-400 ml-2">fastoria.app / panel-mentor</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Plataforma Activa
                  </div>
                </div>
                <DemoPlayer />
              </div>
              </Tilt>

              {/* Floating Highlights under Hero */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 text-left"
              >
                {[
                  { label: 'Cursos & Contenidos', val: '100% Flexibles', icon: Layout, color: 'text-sky-600 bg-sky-50 border-sky-100' },
                  { label: 'Mentorías & Sesiones', val: 'Seguimiento 1 a 1', icon: HeartHandshake, color: 'text-violet-600 bg-violet-50 border-violet-100' },
                  { label: 'IA Operativa Evo', val: 'Contenido y Campañas', icon: Bot, color: 'text-[#138d74] bg-emerald-50 border-emerald-100' },
                  { label: 'Cobros Directos', val: 'A tu propia cuenta', icon: CreditCard, color: 'text-amber-600 bg-amber-50 border-amber-100' },
                ].map((feat, i) => (
                  <motion.div
                    key={i}
                    variants={staggerItem}
                    whileHover={{ y: -3 }}
                    className="bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow group"
                  >
                    <div className={`w-10 h-10 rounded-xl ${feat.color} border flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform`}>
                      <feat.icon className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">{feat.label}</div>
                      <div className="text-[11px] font-semibold text-slate-500">{feat.val}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. IDENTIFICACIÓN — “Esto es para mí” */}
      {/* ========================================================================= */}
      <section id="identificacion" className="py-24 px-6 bg-white relative z-10 border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-3 block">
              Identificación
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              ¿Vivís de lo que sabés?
            </h2>
            <p className="mt-4 text-base md:text-lg text-slate-600 leading-relaxed font-normal">
              <strong className="text-slate-900">Coach, consultor, mentor, terapeuta o creador:</strong> si vivís de lo que sabés, Fastoria convierte ese conocimiento en productos y servicios que podés crear, vender y gestionar desde un solo lugar.
            </p>
          </Reveal>

          {/* Composición gráfica: CURSO + MENTORÍA + PROGRAMA + SESIONES + PRODUCTO DIGITAL → TU NEGOCIO */}
          <Reveal className="bg-slate-50 rounded-3xl border border-slate-200 p-8 md:p-12 shadow-sm">
            <div className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mb-8">
              La arquitectura de tu oferta en Fastoria
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 max-w-5xl mx-auto">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full lg:w-auto"
              >
                {[
                  { tag: 'CURSO', desc: 'Grabado o en vivo', icon: GraduationCap, color: 'border-blue-200 bg-blue-50/70 text-blue-800', iconColor: 'text-blue-600' },
                  { tag: 'MENTORÍA', desc: 'Acompañamiento VIP', icon: UserCheck, color: 'border-purple-200 bg-purple-50/70 text-purple-800', iconColor: 'text-purple-600' },
                  { tag: 'PROGRAMA', desc: 'Módulos + Retos', icon: Target, color: 'border-emerald-200 bg-emerald-50/70 text-emerald-800', iconColor: 'text-emerald-600' },
                  { tag: 'SESIONES', desc: 'Agendas 1 a 1', icon: Calendar, color: 'border-amber-200 bg-amber-50/70 text-amber-800', iconColor: 'text-amber-600' },
                  { tag: 'PRODUCTO DIGITAL', desc: 'Guías y plantillas', icon: ShoppingBag, color: 'border-rose-200 bg-rose-50/70 text-rose-800', iconColor: 'text-rose-600' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    variants={staggerItem}
                    whileHover={{ y: -3 }}
                    className={`p-4 rounded-2xl border ${item.color} text-center flex flex-col items-center justify-center group hover:shadow-sm transition-shadow cursor-default`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-white/80 border border-white flex items-center justify-center mb-3 ${item.iconColor} shadow-2xs group-hover:scale-110 group-hover:-rotate-6 transition-transform`}>
                      <item.icon className="w-6 h-6" strokeWidth={2.2} />
                    </div>
                    <div className="font-black text-sm tracking-wider">{item.tag}</div>
                    <div className="text-xs opacity-80 mt-0.5 font-medium">{item.desc}</div>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
                className="flex items-center justify-center py-2 lg:py-0 px-2 text-[#1CB899]"
              >
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-10 h-10 rounded-full bg-[#1CB899]/10 border border-[#1CB899]/30 flex items-center justify-center font-black text-lg"
                >
                  →
                </motion.div>
              </motion.div>

              {/* Tu Negocio Result */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45, duration: 0.5, ease: EASE }}
                whileHover={{ scale: 1.03, y: -2 }}
                className="bg-[#0F172A] text-white p-6 rounded-2xl border border-slate-800 shadow-xl text-center w-full lg:w-64 shrink-0"
              >
                <div className="text-[10px] font-black text-[#1CB899] uppercase tracking-widest mb-1">
                  CENTRALIZADO EN FASTORIA
                </div>
                <div className="text-xl font-black tracking-tight">TU NEGOCIO</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">1 plataforma, 0 caos operativo</div>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. EL PROBLEMA — El Frankenstein tecnológico */}
      {/* ========================================================================= */}
      <section id="problema" className="py-24 px-6 bg-[#F8FAFC] relative z-10">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-rose-500 font-black text-xs uppercase tracking-[0.25em] mb-3 block">
              El Frankenstein Tecnológico
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Tu negocio no debería necesitar 5 herramientas para funcionar.
            </h2>
            <p className="mt-4 text-base md:text-lg text-slate-600 font-normal">
              La fragmentación desgasta tu tiempo y divide la experiencia de tus alumnos.
            </p>
          </Reveal>

          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* Las 8 herramientas dispersas */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5"
            >
              {[
                { title: 'Cursos', tool: 'En una plataforma externa', icon: Layout, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
                { title: 'Alumnos', tool: 'Planillas de Excel infinitas', icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                { title: 'Pagos', tool: 'Gateways sin conectar', icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
                { title: 'IA y Copy', tool: 'Pestañas sueltas de ChatGPT', icon: Bot, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={staggerItem}
                  whileHover={{ y: -3 }}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow flex items-center gap-3.5 group"
                >
                  <div className={`w-10 h-10 rounded-xl ${item.bg} border flex items-center justify-center shrink-0 ${item.color} shadow-xs group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-800 tracking-tight">{item.title}</div>
                    <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">{item.tool}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Convergencia en Fastoria */}
            <Reveal delay={0.15} y={30} className="lg:col-span-6">
              <div className="bg-gradient-to-br from-[#0F172A] to-slate-900 text-white rounded-3xl p-8 md:p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
                <Float className="absolute top-0 right-0 w-48 h-48 bg-[#1CB899]/10 rounded-full blur-2xl" duration={8} distance={14} />
                
                <div className="w-12 h-12 rounded-2xl bg-[#1CB899]/20 border border-[#1CB899]/40 flex items-center justify-center text-[#1CB899] mb-6">
                  <Shield className="w-6 h-6" />
                </div>

                <div className="space-y-3 mb-8">
                  <div className="text-slate-400 line-through text-sm font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Más herramientas.
                  </div>
                  <div className="text-slate-400 line-through text-sm font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Más suscripciones.
                  </div>
                  <div className="text-slate-400 line-through text-sm font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Más tiempo administrando.
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <div className="text-[#1CB899] font-black text-xs uppercase tracking-widest mb-2">
                    LA RESPUESTA FASTORIA
                  </div>
                  <h3 className="text-2xl font-black text-white leading-snug">
                    Todo tu negocio converge en una sola interfaz limpia.
                  </h3>
                  <p className="text-slate-300 text-sm font-medium mt-3 leading-relaxed">
                    Fastoria empieza a poner todo eso en un mismo lugar: contenidos, clientes, cobros, seguimiento y generación con IA.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. LA PROPUESTA — Una plataforma, todo el recorrido */}
      {/* ========================================================================= */}
      <section id="propuesta" className="py-24 px-6 bg-white relative z-10 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-3 block">
              La Propuesta
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Desde lo que sabés hasta un negocio que crece.
            </h2>
            <p className="mt-3 text-slate-500 text-base font-medium">
              Una plataforma integral que cubre cada etapa de tu proceso.
            </p>
          </Reveal>

          {/* Journey Visual Horizontal Interactivo */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-5 gap-4 relative"
          >
            {[
              {
                step: '01',
                title: 'CREÁ',
                desc: 'Cursos, programas y productos digitales.',
                detail: 'Sube videos, documentos, cuestionarios y contenido estructurado.',
                icon: Layout,
                badgeColor: 'border-blue-500 text-blue-500 bg-blue-50/30',
                iconColor: 'text-blue-600 bg-blue-50 border-blue-100'
              },
              {
                step: '02',
                title: 'VENDÉ',
                desc: 'Landings y medios de pago conectados a tu cuenta.',
                detail: 'Páginas optimizadas para conversión con checkout directo.',
                icon: ShoppingBag,
                badgeColor: 'border-emerald-500 text-emerald-500 bg-emerald-50/30',
                iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100'
              },
              {
                step: '03',
                title: 'ENTREGÁ',
                desc: 'Contenido, tareas y experiencia del alumno.',
                detail: 'Campus fluido donde tus alumnos aprenden y entregan actividades.',
                icon: Send,
                badgeColor: 'border-violet-500 text-violet-500 bg-violet-50/30',
                iconColor: 'text-violet-600 bg-violet-50 border-violet-100'
              },
              {
                step: '04',
                title: 'ACOMPAÑÁ',
                desc: 'Mentorías, sesiones y procesos individuales.',
                detail: 'Seguimiento personalizado de objetivos, avances y encuentros.',
                icon: HeartHandshake,
                badgeColor: 'border-amber-500 text-amber-500 bg-amber-50/30',
                iconColor: 'text-amber-600 bg-amber-50 border-amber-100'
              },
              {
                step: '05',
                title: 'CRECÉ',
                desc: 'IA y herramientas comerciales para potenciar tu negocio.',
                detail: 'Evo IA te asiste con copys, campañas y optimización continua.',
                icon: TrendingUp,
                badgeColor: 'border-[#1CB899] text-[#1CB899] bg-[#1CB899]/5',
                iconColor: 'text-[#138d74] bg-emerald-50 border-emerald-200'
              },
            ].map((node, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-[#1CB899] transition-shadow flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <motion.div
                      whileHover={{ rotate: -6, scale: 1.1 }}
                      className={`w-11 h-11 rounded-xl ${node.iconColor} border flex items-center justify-center shadow-2xs transition-colors`}
                    >
                      <node.icon className="w-5 h-5" strokeWidth={2.2} />
                    </motion.div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${node.badgeColor}`}>
                      {node.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-black text-slate-400 group-hover:text-[#1CB899] transition-colors">{node.step}.</span>
                    <h3 className="font-black text-lg text-slate-900">{node.title}</h3>
                  </div>
                  <p className="text-sm font-bold text-slate-700 leading-snug mb-3">{node.desc}</p>
                </div>
                <p className="text-sm text-slate-500 font-medium pt-3 border-t border-slate-100">{node.detail}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. DIFERENCIAL — No todo lo que sabés es un curso */}
      {/* ========================================================================= */}
      <section id="diferencial" className="py-24 px-6 bg-[#F8FAFC] relative z-10 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            <Reveal className="lg:col-span-6">
              <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-3 block">
                Diferencial de Formato
              </span>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                No todo lo que sabés tiene que convertirse en un curso.
              </h2>
              <p className="mt-5 text-base md:text-lg text-slate-600 font-normal leading-relaxed">
                Podés vender un curso, una mentoría, un proceso de coaching, un paquete de sesiones, un programa o una combinación de todo.
              </p>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="mt-4 inline-flex items-center gap-2 font-bold text-slate-900 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-sm"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                Y gestionarlo todo desde Fastoria.
              </motion.div>
            </Reveal>

            {/* Ficha de un producto híbrido ficticio */}
            <Reveal delay={0.15} y={30} className="lg:col-span-6">
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white rounded-3xl border border-slate-200 p-7 md:p-8 shadow-xl relative"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-black text-[#1CB899] uppercase tracking-wider bg-[#1CB899]/10 px-2.5 py-1 rounded-md">
                      Producto Híbrido Ficticio
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-2">Programa de Liderazgo Ejecutivo</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400">Modalidad</span>
                    <div className="text-xs font-black text-slate-800">Mixta (360°)</div>
                  </div>
                </div>

                <div className="py-5 space-y-3">
                  {[
                    { text: 'Curso online completo', icon: CheckCircle2, status: 'Disponible 24/7' },
                    { text: '6 sesiones individuales', icon: CheckCircle2, status: '2 completadas' },
                    { text: '8 tareas prácticas con feedback', icon: CheckCircle2, status: '5 entregadas' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <item.icon className="w-4 h-4 text-[#1CB899]" />
                        <span className="text-xs font-bold text-slate-800">{item.text}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Próxima sesión</div>
                    <div className="text-xs font-black text-slate-900 mt-0.5">14 de Septiembre • 16:00</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Progreso General</div>
                    <div className="text-xs font-black text-[#1CB899] mt-0.5">68% completado</div>
                    <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: '68%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.4, ease: EASE }}
                        className="h-full bg-gradient-to-r from-[#1CB899] to-emerald-400 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SEGUIMIENTOS — Mostrar el diferencial funcionando */}
      {/* ========================================================================= */}
      <section className="py-24 px-6 bg-white relative z-10 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Mockup Seguimiento */}
            <Reveal className="lg:col-span-6 order-2 lg:order-1">
              <div className="bg-[#0F172A] text-white rounded-3xl p-7 md:p-8 border border-slate-800 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
                      LM
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Laura Martínez</h4>
                      <p className="text-[11px] text-slate-400">Cliente Activo</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-[#1CB899]/20 text-[#1CB899] px-2.5 py-1 rounded-full border border-[#1CB899]/30">
                    En Proceso
                  </span>
                </div>

                <div className="py-5 grid grid-cols-2 gap-3 text-left">
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Proceso</div>
                    <div className="text-xs font-bold text-white mt-0.5">Mentoría Ejecutiva</div>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Sesiones</div>
                    <div className="text-xs font-bold text-white mt-0.5">4 de 6 realizadas</div>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Próxima</div>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5">Jueves 10:00 hs</div>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Tareas pendientes</div>
                    <div className="text-xs font-bold text-amber-400 mt-0.5">2 por revisar</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Último seguimiento: <strong>21/08</strong></span>
                  <span className="text-emerald-400 font-semibold">Proceso al día ✓</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15} className="lg:col-span-6 order-1 lg:order-2">
              <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-3 block">
                Seguimientos
              </span>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Acompañar también es parte de tu producto.
              </h2>
              <p className="mt-5 text-base md:text-lg text-slate-600 font-normal leading-relaxed">
                Fastoria permite organizar procesos individuales de mentoría, coaching, consultoría o acompañamiento profesional con bitácora, tareas y metas claras.
              </p>
              <p className="mt-3 text-xs md:text-sm text-slate-500 font-medium">
                El seguimiento se visualiza como un proceso profesional de alto valor, no como un ticket de soporte.
              </p>
              <div className="mt-8">
                <a href="#pricing">
                  <motion.button
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2"
                  >
                    Conocé Seguimientos
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </a>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. EVO — IA integrada al negocio */}
      {/* ========================================================================= */}
      <section id="evo" className="py-24 px-6 bg-[#0F172A] text-white relative z-10 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1CB899]/20 border border-[#1CB899]/40 text-[#1CB899] text-xs font-black uppercase tracking-wider mb-4"
            >
              <Bot className="w-3.5 h-3.5" />
              IA Integrada al Negocio
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">
              Conocé a Evo.
            </h2>
            <p className="mt-3 text-xl text-slate-300 font-semibold">
              Tu IA dentro de Fastoria.
            </p>
            <p className="mt-3 text-slate-400 text-sm md:text-base max-w-xl mx-auto font-normal">
              Evo acompaña al profesional mientras crea y gestiona su negocio. Diseñado para tareas concretas: campañas, contenido, imágenes y video.
            </p>
          </Reveal>

          {/* Evo Chat Interface Mockup — Diálogo Secuencial Animado */}
          <Reveal delay={0.1} y={40} className="max-w-md mx-auto relative">
            {/* Window Container */}
            <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-2xl shadow-slate-900/30 overflow-hidden text-slate-900 text-left">
              {/* Header */}
              <div className="bg-[#EAEAF8] px-5 py-3.5 flex items-center justify-between border-b border-slate-200/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#3B2C68] text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4 fill-white text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-[#1E1B4B] tracking-tight block leading-none">Evo Assistant</span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Creación Inteligente
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#3B2C68] bg-white/70 px-2 py-0.5 rounded-full border border-slate-200">
                    Paso {Math.min(3, Math.floor(evoStep / 2) + 1)}/3
                  </span>
                  <button className="text-slate-500 hover:text-slate-800 transition-colors p-1">
                    <span className="text-lg leading-none font-light">×</span>
                  </button>
                </div>
              </div>

              {/* Chat Body */}
              <div className="p-5 space-y-3 bg-white min-h-[380px] max-h-[430px] overflow-y-auto flex flex-col justify-between scroll-smooth">
                <div className="space-y-3">
                  
                  {/* Mensaje 0: Saludo Inicial de Evo */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#EAEAF8] text-[#3B2C68] flex items-center justify-center shrink-0 mt-0.5 border border-[#D5D5EC]">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-[#EAEAF8] text-[#1E1B4B] p-3 rounded-2xl rounded-tl-sm text-xs font-normal leading-relaxed max-w-[88%] shadow-2xs">
                      ¡Hola! Soy Evo, tu agente personal. Conozco a todos tus alumnos y sus cursos. ¿En qué puedo ayudarte hoy?
                    </div>
                  </motion.div>

                  {/* Interacción 1: Tutor pide crear un curso */}
                  <AnimatePresence>
                    {evoStep >= 1 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex justify-end"
                      >
                        <div className="bg-[#3B2C68] text-white p-3 rounded-2xl rounded-tr-sm text-xs font-medium max-w-[84%] shadow-xs">
                          Evo, quiero crear un curso de <span className="text-emerald-300 font-bold">Liderazgo y Gestión de Equipos</span>.
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Respuesta 1: Evo propone el temario */}
                  <AnimatePresence>
                    {evoStep >= 2 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-start gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#EAEAF8] text-[#3B2C68] flex items-center justify-center shrink-0 mt-0.5 border border-[#D5D5EC]">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div className="bg-[#EAEAF8] text-[#1E1B4B] p-3 rounded-2xl rounded-tl-sm text-xs font-normal leading-relaxed max-w-[88%] shadow-2xs">
                          ¡Excelente! Diseñé 4 módulos clave: <strong>1. Comunicación Asertiva</strong>, <strong>2. Delegación Efectiva</strong>, <strong>3. Resolución de Conflictos</strong> y <strong>4. Feedback 360°</strong>. ¿Querés que sumemos desafíos prácticos?
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Interacción 2: Tutor pide recursos y evaluaciones */}
                  <AnimatePresence>
                    {evoStep >= 3 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex justify-end"
                      >
                        <div className="bg-[#3B2C68] text-white p-3 rounded-2xl rounded-tr-sm text-xs font-medium max-w-[84%] shadow-xs">
                          Sí, generá las guías en PDF y 2 evaluaciones automáticas.
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Respuesta 2: Evo confirma recursos y evaluaciones */}
                  <AnimatePresence>
                    {evoStep >= 4 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-start gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#EAEAF8] text-[#3B2C68] flex items-center justify-center shrink-0 mt-0.5 border border-[#D5D5EC]">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div className="bg-[#EAEAF8] text-[#1E1B4B] p-3 rounded-2xl rounded-tl-sm text-xs font-normal leading-relaxed max-w-[88%] shadow-2xs">
                          Listos: 2 cuestionarios autocalificables creados y plantillas descargables adjuntas en cada lección ✓.
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Interacción 3: Tutor pide armar landing y publicar */}
                  <AnimatePresence>
                    {evoStep >= 5 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex justify-end"
                      >
                        <div className="bg-[#3B2C68] text-white p-3 rounded-2xl rounded-tr-sm text-xs font-medium max-w-[84%] shadow-xs">
                          Perfecto. Armá la landing de venta con checkout y publícalo.
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Respuesta 3: Evo publica el curso */}
                  <AnimatePresence>
                    {evoStep >= 6 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-start gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#EAEAF8] text-[#3B2C68] flex items-center justify-center shrink-0 mt-0.5 border border-[#D5D5EC]">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div className="bg-[#EAEAF8] text-[#1E1B4B] p-3 rounded-2xl rounded-tl-sm text-xs font-normal leading-relaxed max-w-[88%] shadow-2xs">
                          🎉 <strong>¡Curso publicado con éxito!</strong> Landing activa con cobro conectado. Ya podés compartir tu link de venta.
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

                {/* Input Bar & Typing Status */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-400 bg-white shadow-2xs flex items-center justify-between">
                      <span className="truncate">
                        {evoStep === 0 && 'Escribiendo orden...'}
                        {evoStep === 1 && 'Evo procesando temario...'}
                        {evoStep === 2 && 'Pidiendo recursos...'}
                        {evoStep === 3 && 'Evo generando evaluaciones...'}
                        {evoStep === 4 && 'Pidiendo publicación...'}
                        {evoStep === 5 && 'Evo publicando curso...'}
                        {evoStep === 6 && 'Curso listo y operando ✓'}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3B2C68] animate-ping" />
                    </div>
                    <button className="w-9 h-9 rounded-xl bg-[#3B2C68] hover:bg-[#2D2152] text-white flex items-center justify-center transition-colors shadow-xs shrink-0">
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating FAB Button (Cierre / Toggle) */}
            <div className="absolute -bottom-5 -right-3 w-11 h-11 rounded-full bg-[#EAEAF8] border border-white shadow-lg flex items-center justify-center text-slate-600 text-base font-light hover:bg-[#D5D5EC] transition-all cursor-pointer">
              ×
            </div>
          </Reveal>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. TU MARCA — Fastoria detrás, el mentor adelante */}
      {/* ========================================================================= */}
      <section className="py-24 px-6 bg-white relative z-10 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-3 block">
              Personalización
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Es Fastoria. Pero se siente tuyo.
            </h2>
            <p className="mt-4 text-base md:text-lg text-slate-600 font-normal">
              Tu logo. Tus colores. Tus tipografías. Tus landings. Tu perfil.
              <br />
              <strong className="text-slate-900 font-bold">Tu negocio sigue siendo tu negocio.</strong>
            </p>
          </Reveal>

          {/* Theme Interactive Switcher Preview */}
          <Reveal delay={0.1} y={30} className="bg-slate-50 rounded-3xl border border-slate-200 p-6 md:p-10 shadow-sm max-w-4xl mx-auto">
            <div className="flex justify-center gap-3 mb-8">
              {[
                { key: 'teal', label: 'Marca: Studio Wellness', color: 'bg-emerald-600' },
                { key: 'violet', label: 'Marca: Tech Mentoring', color: 'bg-violet-600' },
                { key: 'amber', label: 'Marca: Business Coach', color: 'bg-amber-600' },
              ].map((theme) => (
                <motion.button
                  key={theme.key}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveBrandTheme(theme.key as any)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2 border ${
                    activeBrandTheme === theme.key
                      ? 'bg-white border-slate-900 shadow-md text-slate-900'
                      : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <motion.span
                    animate={activeBrandTheme === theme.key ? { scale: [1, 1.35, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    className={`w-3 h-3 rounded-full ${theme.color}`}
                  />
                  {theme.label}
                </motion.button>
              ))}
            </div>

            {/* Dynamic Campus Mockup */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md transition-all">
              <AnimatePresence mode="wait">
              <motion.div
                key={activeBrandTheme}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs ${
                    activeBrandTheme === 'teal' ? 'bg-emerald-600' : activeBrandTheme === 'violet' ? 'bg-violet-600' : 'bg-amber-600'
                  }`}>
                    {activeBrandTheme === 'teal' ? 'W' : activeBrandTheme === 'violet' ? 'T' : 'B'}
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900">
                      {activeBrandTheme === 'teal' ? 'Wellness Academy' : activeBrandTheme === 'violet' ? 'Tech Mentoring Hub' : 'Executive Business'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold">Campus personalizado</div>
                  </div>
                </div>
                <div className={`text-xs font-bold px-3 py-1 rounded-full ${
                  activeBrandTheme === 'teal' ? 'bg-emerald-50 text-emerald-700' : activeBrandTheme === 'violet' ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  Identidad Propia Activa
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Colores de Marca</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">Paleta Adaptable</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Tipografías</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">Personalizadas</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Páginas de Venta</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">Tu Estilo Visual</div>
                </div>
              </div>
              </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. TODO LO QUE TENÉS EN FASTORIA (Grilla 4 Pilares) */}
      {/* ========================================================================= */}
      <section className="py-24 px-6 bg-white relative z-10">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-3 block">
              Funcionalidades Clave
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Todo lo que tenés en Fastoria.
            </h2>
            <p className="mt-3 text-slate-500 text-base font-medium">
              El stack completo para construir y operar tu negocio.
            </p>
          </Reveal>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {/* CREAR */}
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="bg-slate-50/80 rounded-2xl border border-slate-200 p-6 hover:border-blue-300 hover:shadow-md transition-shadow group"
            >
              <motion.div
                whileHover={{ rotate: -6, scale: 1.08 }}
                className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold mb-5 shadow-xs"
              >
                <Layout className="w-6 h-6" strokeWidth={2} />
              </motion.div>
              <h3 className="font-black text-xl text-slate-900 mb-4 tracking-tight">CREAR</h3>
              <ul className="space-y-3 text-sm font-semibold text-slate-600">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-blue-500" /> Cursos</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-blue-500" /> Productos digitales</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-blue-500" /> Landings con IA</li>
              </ul>
            </motion.div>

            {/* GESTIONAR */}
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="bg-slate-50/80 rounded-2xl border border-slate-200 p-6 hover:border-purple-300 hover:shadow-md transition-shadow group"
            >
              <motion.div
                whileHover={{ rotate: -6, scale: 1.08 }}
                className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex items-center justify-center font-bold mb-5 shadow-xs"
              >
                <Users className="w-6 h-6" strokeWidth={2} />
              </motion.div>
              <h3 className="font-black text-xl text-slate-900 mb-4 tracking-tight">GESTIONAR</h3>
              <ul className="space-y-3 text-sm font-semibold text-slate-600">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-purple-500" /> Alumnos</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-purple-500" /> Progreso y tareas</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-purple-500" /> Sesiones</li>
              </ul>
            </motion.div>

            {/* VENDER */}
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="bg-slate-50/80 rounded-2xl border border-slate-200 p-6 hover:border-emerald-300 hover:shadow-md transition-shadow group"
            >
              <motion.div
                whileHover={{ rotate: -6, scale: 1.08 }}
                className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold mb-5 shadow-xs"
              >
                <CreditCard className="w-6 h-6" strokeWidth={2} />
              </motion.div>
              <h3 className="font-black text-xl text-slate-900 mb-4 tracking-tight">VENDER</h3>
              <ul className="space-y-3 text-sm font-semibold text-slate-600">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500" /> Páginas de venta</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500" /> Pagos</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500" /> Campañas con IA</li>
              </ul>
            </motion.div>

            {/* PERSONALIZAR */}
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="bg-slate-50/80 rounded-2xl border border-slate-200 p-6 hover:border-amber-300 hover:shadow-md transition-shadow group"
            >
              <motion.div
                whileHover={{ rotate: -6, scale: 1.08 }}
                className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold mb-5 shadow-xs"
              >
                <Sparkles className="w-6 h-6" strokeWidth={2} />
              </motion.div>
              <h3 className="font-black text-xl text-slate-900 mb-4 tracking-tight">PERSONALIZAR</h3>
              <ul className="space-y-3 text-sm font-semibold text-slate-600">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-500" /> Logo y colores</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-500" /> Tipografías</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-500" /> Identidad visual</li>
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11 & 12. FASTORIA CRECE CON VOS & PRICING */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-24 px-6 bg-[#F8FAFC] relative z-10 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-3 block">
              Planes y Precios
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Un plan para cada momento de tu negocio.
            </h2>
            <p className="mt-3 text-slate-500 text-base font-medium">
              Empezá donde estás. Crecé cuando lo necesites.
            </p>

            {/* Toggle Mensual / Anual */}
            <div className="mt-8 inline-flex items-center p-1.5 bg-slate-200/80 rounded-full">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`relative px-5 py-2 rounded-full text-xs font-bold transition-colors ${
                  billingPeriod === 'monthly' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {billingPeriod === 'monthly' && (
                  <motion.span
                    layoutId="billing-pill"
                    className="absolute inset-0 bg-white rounded-full shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Facturación Mensual</span>
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`relative px-5 py-2 rounded-full text-xs font-bold transition-colors ${
                  billingPeriod === 'annual' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {billingPeriod === 'annual' && (
                  <motion.span
                    layoutId="billing-pill"
                    className="absolute inset-0 bg-white rounded-full shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span>Facturación Anual</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#1CB899] text-white text-[10px] font-black">
                    2 meses bonificados
                  </span>
                </span>
              </button>
            </div>
          </Reveal>

          {/* Dynamic Pricing Cards */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className={cn(
              "grid grid-cols-1 gap-8 items-stretch",
              apiPlans.length === 1 ? "max-w-md mx-auto" :
              apiPlans.length === 2 ? "md:grid-cols-2 max-w-4xl mx-auto" :
              "md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto"
            )}
          >
            {loadingPlans ? (
              [1, 2].map((k) => (
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
                <Link href="/planes" className="mt-4 inline-block text-xs font-bold text-[#1CB899] hover:underline">
                  Ver página de planes
                </Link>
              </div>
            ) : (
              apiPlans.map((plan, idx) => {
                const pricing = getPlanPricing(plan);
                const isFeatured = plan.isRecommended || plan.isPopular || (apiPlans.length >= 3 ? idx === 1 : idx === apiPlans.length - 1);

                return (
                  <Tilt key={plan.id || idx} max={7} className="h-full">
                    <motion.div
                      variants={staggerItem}
                      whileHover={{ y: isFeatured ? -8 : -4 }}
                      className={cn(
                        "rounded-3xl p-8 flex flex-col justify-between h-full transition-all relative",
                        isFeatured
                          ? "bg-[#0F172A] text-white border-2 border-[#1CB899] shadow-2xl lg:-translate-y-2"
                          : "bg-white text-slate-900 border border-slate-200 shadow-sm hover:shadow-md"
                      )}
                    >
                      {isFeatured && (
                        <motion.div
                          animate={{ y: [0, -2, 0] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#1CB899] text-[#0F172A] text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md"
                        >
                          Recomendado
                        </motion.div>
                      )}

                      <div>
                        <div className={cn("text-xs font-black uppercase tracking-widest mb-1", isFeatured ? "text-[#1CB899]" : "text-slate-400")}>
                          {`PLAN 0${idx + 1}`}
                        </div>
                        <h3 className={cn("text-2xl font-black", isFeatured ? "text-white" : "text-slate-900")}>
                          {plan.name}
                        </h3>
                        <p className={cn("text-sm font-medium mt-2 mb-6", isFeatured ? "text-slate-300" : "text-slate-500")}>
                          {plan.description || (idx === 0 ? 'Para comenzar tu academia digital con bases sólidas.' : idx === 1 ? 'Para mentores y academias en fase de expansión activa.' : 'Para grandes operaciones y academias consolidadas.')}
                        </p>

                        <div className={cn("mb-6 pb-6 border-b", isFeatured ? "border-slate-800" : "border-slate-100")}>
                          <div className="flex items-baseline gap-1.5 overflow-hidden">
                            <span className={cn("text-xs font-black uppercase", isFeatured ? "text-[#1CB899]" : "text-slate-400")}>USD</span>
                            <AnimatePresence mode="popLayout" initial={false}>
                              <motion.span
                                key={`price-${plan.id}-${billingPeriod}`}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.25, ease: EASE }}
                                className={cn("text-4xl font-black", isFeatured ? "text-white" : "text-slate-900")}
                              >
                                ${pricing.priceStr}
                              </motion.span>
                            </AnimatePresence>
                            <span className="text-xs font-bold text-slate-400">/ mes</span>
                          </div>
                          {pricing.originalPriceStr && (
                            <span className="text-xs line-through text-slate-400 font-bold block mt-1">
                              Antes: USD ${pricing.originalPriceStr}
                            </span>
                          )}
                          {pricing.promoLabel && (
                            <span className={cn("text-[11px] font-semibold block mt-1", isFeatured ? "text-[#1CB899]" : "text-emerald-600")}>
                              {pricing.promoLabel}
                            </span>
                          )}
                        </div>

                        <ul className={cn("space-y-3 text-sm font-bold mb-8", isFeatured ? "text-slate-200" : "text-slate-700")}>
                          <li className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-[#1CB899] shrink-0" />
                            {plan.limits?.maxCourses === -1 || (plan.limits?.maxCourses && plan.limits.maxCourses >= 100) ? 'Cursos ilimitados' : `Hasta ${plan.limits?.maxCourses || 5} cursos`}
                          </li>
                          <li className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-[#1CB899] shrink-0" />
                            {plan.limits?.maxStudents === -1 || (plan.limits?.maxStudents && plan.limits.maxStudents >= 5000) ? 'Alumnos ilimitados' : `Hasta ${plan.limits?.maxStudents || 100} alumnos`}
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

                      <Link href={`/planes?plan=${plan.id}`}>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className={cn(
                            "w-full py-3.5 rounded-xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer",
                            isFeatured
                              ? "bg-[#1CB899] hover:bg-[#18a287] text-[#0F172A]"
                              : "border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                          )}
                        >
                          <span>Elegir {plan.name}</span>
                          <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      </Link>
                    </motion.div>
                  </Tilt>
                );
              })
            )}
          </motion.div>

          <p className="text-center text-xs text-slate-400 mt-8 font-medium">
            * Los precios están expresados en USD. Facturación anual bonifica 2 meses equivalentes. Cancelás cuando quieras.
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 13. FASTORIA EMPRESAS (Sección independiente) */}
      {/* ========================================================================= */}
      <section className="py-20 px-6 bg-slate-900 text-white relative z-10 border-t border-slate-800">
        <Reveal y={30} className="max-w-5xl mx-auto bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-slate-700 p-8 md:p-12 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-2 block">
              Para Organizaciones
            </span>
            <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              ¿Querés llevar Fastoria a tu organización?
            </h3>
            <p className="mt-3 text-slate-300 text-sm md:text-base font-normal">
              Capacitación, contenidos y procesos de desarrollo en un entorno privado para empresas.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-6 text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#1CB899]" /> Cursos privados</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#1CB899]" /> Participantes internos</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#1CB899]" /> Coaching y mentoría</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#1CB899]" /> Sesiones</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#1CB899]" /> Tareas</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#1CB899]" /> Seguimiento individual</span>
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl text-center w-full lg:w-72 shrink-0"
          >
            <div className="text-xs font-bold text-slate-400 uppercase">Inversión Empresas</div>
            <div className="text-2xl font-black text-white mt-1 mb-4">Desde ARS 100.000 <span className="text-xs font-normal text-slate-400">/ mes</span></div>
            <a href="https://wa.me/541157448819?text=Hola%20quiero%20conocer%20Fastoria%20Empresas" target="_blank" rel="noopener noreferrer">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 rounded-xl bg-[#1CB899] hover:bg-[#18a287] text-[#0F172A] font-black text-xs shadow-md transition-colors"
              >
                Quiero conocer Fastoria Empresas
              </motion.button>
            </a>
          </motion.div>
        </Reveal>
      </section>

      {/* ========================================================================= */}
      {/* 14. INTEGRACIONES & ALIANZAS (Sin modificar logos) */}
      {/* ========================================================================= */}
      <section id="integraciones" className="relative z-10 py-24 px-6 overflow-hidden bg-slate-50/50 border-t border-slate-200/60">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes scrollLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .integrations-track {
            animation: scrollLeft 22s linear infinite;
          }
          .integrations-track:hover {
            animation-play-state: paused;
          }
        ` }} />

        <div className="container mx-auto max-w-6xl mb-12 text-center">
          <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-2 block">
            Ecosistema Conectado
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">
            Intégrate con tus <span className="text-[#1CB899]">herramientas favoritas</span>
          </h2>
          <p className="text-sm md:text-base text-slate-500 font-medium mt-3 max-w-2xl mx-auto">
            Conectá tu academia con herramientas de analítica, medios de pago, video y redes sociales.
          </p>
        </div>

        {/* Carousel Wrapper */}
        <div className="relative w-full">
          <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

          <div className="integrations-track flex gap-4 w-max">
            {[
              { name: "Gemini AI", icon: "gemini", color: "1CB899" },
              { name: "DeepSeek", icon: "deepseek", color: "4F46E5" },
              { name: "Firebase", icon: "firebase", color: "FFCA28" },
              { name: "MercadoPago", icon: "mercadopago", color: "009EE3" },
              { name: "Google Drive", icon: "googledrive", color: "34A853" },
              { name: "YouTube", icon: "youtube", color: "FF0000" },
              { name: "TikTok", icon: "tiktok", color: "000000" },
              { name: "PayPal", icon: "paypal", color: "003087" },
              { name: "WhatsApp API", icon: "whatsapp", color: "25D366" },
              { name: "LinkedIn", icon: "linkedin", color: "0A66C2" },
              { name: "Google Analytics", icon: "googleanalytics", color: "E37400" },
              { name: "Meta Ads", icon: "meta", color: "1877F2" },
              { name: "Instagram", icon: "instagram", color: "E4405F" },
              { name: "GitHub", icon: "github", color: "181717" },
              // Duplicado para loop sin saltos
              { name: "Gemini AI", icon: "gemini", color: "1CB899" },
              { name: "DeepSeek", icon: "deepseek", color: "4F46E5" },
              { name: "Firebase", icon: "firebase", color: "FFCA28" },
              { name: "MercadoPago", icon: "mercadopago", color: "009EE3" },
              { name: "Google Drive", icon: "googledrive", color: "34A853" },
              { name: "YouTube", icon: "youtube", color: "FF0000" },
              { name: "TikTok", icon: "tiktok", color: "000000" },
              { name: "PayPal", icon: "paypal", color: "003087" },
              { name: "WhatsApp API", icon: "whatsapp", color: "25D366" },
              { name: "LinkedIn", icon: "linkedin", color: "0A66C2" },
              { name: "Google Analytics", icon: "googleanalytics", color: "E37400" },
              { name: "Meta Ads", icon: "meta", color: "1877F2" },
              { name: "Instagram", icon: "instagram", color: "E4405F" },
              { name: "GitHub", icon: "github", color: "181717" },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm hover:shadow-md hover:border-[#1CB899] transition-all cursor-default"
              >
                <img
                  className="w-6 h-6 flex-shrink-0"
                  src={`https://cdn.simpleicons.org/${item.icon}/${item.color}`}
                  alt={item.name}
                  loading="lazy"
                />
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 15. PRUEBA SOCIAL */}
      {/* ========================================================================= */}
      <section className="py-24 px-6 bg-white relative z-10 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-3 block">
              Prueba Social
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Profesionales que ya están construyendo con Fastoria.
            </h2>
          </Reveal>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              {
                quote: "Pasé de gestionar mis alumnos en tres herramientas y planillas a hacerlo todo desde Fastoria en una sola vista.",
                name: "Mariana Costa",
                role: "Consultora de Negocios",
                metric: "Ahorró 8 hs semanales",
              },
              {
                quote: "El sistema de seguimiento individual me permitió vender mentorías a un ticket mucho más alto con total profesionalismo.",
                name: "Carlos Méndez",
                role: "Mentor Ejecutivo",
                metric: "+120 alumnos activos",
              },
              {
                quote: "Con Evo armo la estructura de las clases y los textos de venta en minutos. La integración con cobros directos es impecable.",
                name: "Sofía Valenzuela",
                role: "Capacitadora Digital",
                metric: "Lanzamiento en 48 hs",
              },
            ].map((testi, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                whileHover={{ y: -4 }}
                className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-shadow"
              >
                <p className="text-sm md:text-base font-medium text-slate-700 leading-relaxed mb-6">
                  "{testi.quote}"
                </p>
                <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">{testi.name}</div>
                    <div className="text-xs text-slate-500 font-medium">{testi.role}</div>
                  </div>
                  <span className="text-xs font-bold text-[#1CB899] bg-[#1CB899]/10 px-2.5 py-1 rounded-full">
                    {testi.metric}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 16. FAQ (Preguntas Frecuentes) */}
      {/* ========================================================================= */}
      <section id="faq" className="py-24 px-6 bg-[#F8FAFC] relative z-10 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-3 block">
              Preguntas Frecuentes
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              ¿Tenés dudas? Te las respondemos.
            </h2>
          </Reveal>

          <div className="space-y-3">
            {[
              {
                q: "¿Necesito conocimientos técnicos?",
                a: "No. Fastoria está diseñada con una interfaz visual intuitiva para que puedas crear contenidos, configurar tus cobros y gestionar alumnos sin escribir una sola línea de código."
              },
              {
                q: "¿Puedo vender algo además de cursos?",
                a: "Sí. Podés ofrecer mentorías 1 a 1, programas híbridos, sesiones individuales de consultoría, productos digitales descargables (PDFs, plantillas) o paquetes combinados."
              },
              {
                q: "¿Dónde recibo el dinero de mis ventas?",
                a: "El dinero se acredita directamente en tu cuenta de cobros vinculada (como MercadoPago o pasarelas habilitadas). Vos tenés el control de tus fondos."
              },
              {
                q: "¿Puedo usar mi propia marca?",
                a: "Totalmente. Podés personalizar el logo, la paleta de colores, las tipografías y el estilo de tus páginas para que la experiencia responda 100% a tu identidad."
              },
              {
                q: "¿Qué es un crédito de IA?",
                a: "Un crédito de IA te permite utilizar las funciones inteligentes de Evo para generar copys, estructurar temarios de cursos, redactar campañas y crear recursos visuales."
              },
              {
                q: "¿Fastoria sirve para empresas?",
                a: "Sí. Contamos con Fastoria Empresas, pensado especialmente para organizaciones que requieren capacitación interna, seguimiento de colaboradores y entornos cerrados."
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-base font-black text-slate-900">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${
                      openFaqIndex === i ? 'rotate-180 text-[#1CB899]' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaqIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-6 pb-6 text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-50 pt-2"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 17. CIERRE — Final Conversion CTA */}
      {/* ========================================================================= */}
      <section className="py-28 px-6 bg-gradient-to-b from-[#0F172A] to-slate-950 text-white relative z-10 text-center overflow-hidden">
        <Float
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1CB899]/10 rounded-full blur-3xl pointer-events-none"
          duration={8}
          distance={30}
        />

        <div className="max-w-4xl mx-auto relative z-10">
          <Reveal>
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-4 block">
              Es momento de dar el paso
            </span>
            <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
              Tu conocimiento ya tiene valor.
            </h2>
            <p className="mt-4 text-lg sm:text-2xl text-slate-300 font-medium">
              Fastoria te ayuda a convertirlo en un negocio.
            </p>
          </Reveal>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="my-8 flex items-center justify-center gap-3 text-xs sm:text-sm font-black uppercase tracking-widest text-[#1CB899]"
          >
            {['Creá', 'Vendé', 'Acompañá', 'Crecé'].map((step, i, arr) => (
              <motion.span key={step} variants={staggerItem} className="flex items-center gap-3">
                {step}
                {i < arr.length - 1 && <span className="text-slate-500">•</span>}
              </motion.span>
            ))}
          </motion.div>

          <Reveal delay={0.2}>
            <Link href="/auth">
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="animate-glow-pulse px-10 py-5 rounded-2xl bg-[#1CB899] hover:bg-[#18a287] text-[#0F172A] font-black text-base shadow-2xl shadow-[#1CB899]/30 inline-flex items-center gap-2 group transition-colors"
              >
                Empezar con Fastoria
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="relative z-10 py-16 px-6 border-t border-slate-800 bg-[#0A0F1D] text-white">
        <div className="container mx-auto max-w-xl text-center">
          {/* Logo */}
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10">
            <span className="text-base font-black text-[#1CB899]">//</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-400 mb-8 uppercase tracking-wider">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <Link href="/courses" className="hover:text-white transition-colors">Cursos</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Mentores</Link>
            <Link href="/auth" className="hover:text-white transition-colors">Ingresar</Link>
            <a href="mailto:felizdeemprender@gmail.com" className="hover:text-white transition-colors">Contacto</a>
          </div>

          {/* Social Icons */}
          <div className="flex justify-center gap-3 mb-8">
            <a href="https://wa.me/541157448819" target="_blank" rel="noopener noreferrer" title="WhatsApp" className="w-10 h-10 rounded-full border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-300 hover:text-emerald-400 hover:border-slate-700 transition-all">
              <IoLogoWhatsapp className="w-4 h-4" />
            </a>
            <a href="https://instagram.com/felizdeemprender" target="_blank" rel="noopener noreferrer" title="Instagram" className="w-10 h-10 rounded-full border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-300 hover:text-pink-400 hover:border-slate-700 transition-all">
              <IoLogoInstagram className="w-4 h-4" />
            </a>
            <a href="mailto:felizdeemprender@gmail.com" title="Email" className="w-10 h-10 rounded-full border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-300 hover:text-[#1CB899] hover:border-slate-700 transition-all">
              <IoMailOutline className="w-4 h-4" />
            </a>
            <a href="https://www.fastoria.com.ar" target="_blank" rel="noopener noreferrer" title="Sitio Web" className="w-10 h-10 rounded-full border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-300 hover:text-sky-400 hover:border-slate-700 transition-all">
              <IoGlobeOutline className="w-4 h-4" />
            </a>
          </div>

          {/* Copyright */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <p>© 2026 FASTORIA. Todos los derechos reservados.</p>
            <a href="https://www.felizdeemprender.com.ar" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">
              www.felizdeemprender.com.ar
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
