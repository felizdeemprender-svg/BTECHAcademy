'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  ArrowRight, Check, ChevronDown, Sparkles, Layers, Shield, 
  Users, Bot, Layout, CreditCard, Award, Calendar, Clock, 
  CheckCircle2, Flame, RefreshCw, BarChart3, Lock,
  ChevronRight, Laptop, MessageSquare, Zap, Target,
  Briefcase, HeartHandshake, FileCheck, HelpCircle,
  GraduationCap, UserCheck, Compass, ShoppingBag, Send, Rocket, TrendingUp,
  Activity, Star, Play, Terminal, Cpu, Globe, Sliders
} from 'lucide-react';
import { 
  IoLogoWhatsapp, IoLogoInstagram, IoMailOutline, IoGlobeOutline 
} from 'react-icons/io5';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { InteractiveCommandCenter } from '@/components/v3/interactive-command-center';
import { RoiCalculator } from '@/components/v3/roi-calculator';

export default function FastoriaV3Landing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [activeBrandTheme, setActiveBrandTheme] = useState<'teal' | 'violet' | 'amber'>('teal');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [evoStep, setEvoStep] = useState(0);

  // Animación del chat con Evo
  useEffect(() => {
    const timer = setInterval(() => {
      setEvoStep((prev) => (prev >= 6 ? 0 : prev + 1));
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const annualDiscountMultiplier = 10 / 12;

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

  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#070A12] text-[#F1F5F9] selection:bg-[#00F5A0]/20 selection:text-[#00F5A0] overflow-x-hidden font-sans relative">
      
      {/* Background Neon Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#1CB899]/15 via-violet-600/10 to-transparent blur-[140px]" />
        <div className="absolute top-[40%] -left-60 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[70%] -right-60 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
      </div>

      {/* Floating HUD Capsule Navbar (Modern Raycast / Linear 2026 Style) */}
      <nav className="fixed top-5 inset-x-0 mx-auto z-50 w-[94%] max-w-5xl">
        <motion.div 
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="backdrop-blur-2xl bg-[#090D16]/80 border border-white/15 rounded-2xl px-4 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex items-center justify-between transition-all"
        >
          {/* Logo con Status Live */}
          <Link href="/landing1" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1CB899] via-emerald-400 to-[#00F5A0] flex items-center justify-center text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(0,245,160,0.4)] group-hover:scale-105 transition-transform">
              F
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#090D16] animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-sm text-white leading-none">
                FASTORIA<span className="text-[#00F5A0]">.</span>
              </span>
              <span className="text-[9px] font-mono text-emerald-400/80 font-bold uppercase tracking-widest mt-0.5">
                ● LIVE OS
              </span>
            </div>
          </Link>

          {/* Links con Sliding Pill Magnética */}
          <div className="hidden md:flex items-center gap-1 p-1 bg-white/[0.03] border border-white/10 rounded-xl">
            {[
              { id: 'identificacion', label: 'Para quién' },
              { id: 'problema', label: 'El Problema' },
              { id: 'propuesta', label: 'Recorrido' },
              { id: 'diferencial', label: 'Diferencial' },
              { id: 'evo', label: 'Evo IA' },
              { id: 'pricing', label: 'Planes' },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onMouseEnter={() => setHoveredNav(item.id)}
                onMouseLeave={() => setHoveredNav(null)}
                className="relative px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                {hoveredNav === item.id && (
                  <motion.div
                    layoutId="nav-hover-pill"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    className="absolute inset-0 bg-white/10 rounded-lg -z-10 shadow-inner"
                  />
                )}
                {item.label}
              </a>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link href="/auth">
              <span className="hidden sm:inline-block text-xs font-bold text-slate-400 hover:text-white transition-colors px-2">
                Ingresar
              </span>
            </Link>
            <Link href="/auth">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="relative group overflow-hidden rounded-xl p-[1px] font-bold"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#1CB899] via-emerald-300 to-[#00F5A0] animate-pulse" />
                <span className="relative block px-4 py-2 rounded-[11px] bg-slate-950 text-[#00F5A0] group-hover:bg-slate-900 transition-colors text-xs font-black flex items-center gap-1.5">
                  <span>Empezar Gratis</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </nav>

      {/* ========================================================================= */}
      {/* 1. HERO — Next-Gen AI Kinetic Hero */}
      {/* ========================================================================= */}
      <section className="relative pt-36 pb-16 md:pt-44 md:pb-24 px-6 overflow-hidden z-10">
        <div className="max-w-6xl mx-auto text-center">
          
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/15 text-[#1CB899] text-xs font-mono font-bold tracking-wider mb-6 shadow-inner"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1CB899] animate-pulse" />
            <span>FASTORIA 3.0 • EL SISTEMA OPERATIVO DE CONOCIMIENTO</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.04] max-w-5xl mx-auto"
          >
            Creá, vendé y escalá tu{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1CB899] via-[#00F5A0] to-teal-200 drop-shadow-[0_0_35px_rgba(28,184,153,0.4)]">
              negocio de conocimiento.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed"
          >
            Cursos, productos digitales, mentorías, alumnos, seguimientos e inteligencia artificial. Todo en un mismo lugar.
          </motion.p>

          {/* Hero CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/auth" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#1CB899] hover:bg-[#18a287] text-slate-950 font-black text-sm shadow-[0_0_30px_rgba(28,184,153,0.4)] hover:shadow-[0_0_45px_rgba(28,184,153,0.6)] transition-all flex items-center justify-center gap-2 group">
                Empezar con Fastoria
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
            <a href="#identificacion" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold text-sm border border-white/15 backdrop-blur-xl transition-all flex items-center justify-center gap-2">
                Ver cómo funciona
              </button>
            </a>
          </motion.div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. IDENTIFICACIÓN — “Esto es para mí” */}
      {/* ========================================================================= */}
      <section id="identificacion" className="py-24 px-6 relative z-10 border-y border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto mb-16">
            <motion.span 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-[#1CB899] font-mono text-xs font-bold uppercase tracking-[0.25em] mb-3 block"
            >
              // IDENTIFICACIÓN
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-5xl font-black text-white tracking-tight"
            >
              ¿Vivís de lo que sabés?
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.65, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-base md:text-lg text-slate-400 font-normal leading-relaxed"
            >
              Sos <strong className="text-white">coach</strong>. <strong className="text-white">Consultor</strong>. <strong className="text-white">Mentor</strong>. <strong className="text-white">Capacitador</strong>. <strong className="text-white">Terapeuta</strong>. <strong className="text-white">Profesional</strong>. <strong className="text-white">Creador</strong>.
              <br />
              Quizás vendés un curso. Quizás una mentoría. Quizás sesiones individuales. O combinás todo eso.
            </motion.p>
            <p className="mt-3 text-sm text-slate-500 font-medium">
              Fastoria está pensada para transformar todo ese conocimiento en productos y servicios que puedas crear, vender y gestionar desde un mismo lugar.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { tag: 'CURSO', desc: 'Grabado o en vivo', icon: GraduationCap, color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
              { tag: 'MENTORÍA', desc: 'Acompañamiento VIP', icon: UserCheck, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
              { tag: 'PROGRAMA', desc: 'Módulos + Retos', icon: Target, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
              { tag: 'SESIONES', desc: 'Agendas 1 a 1', icon: Calendar, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
              { tag: 'PRODUCTO DIGITAL', desc: 'Guías y plantillas', icon: ShoppingBag, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
            ].map((item, i) => (
              <SpotlightCard key={i} className="text-center flex flex-col items-center justify-center p-6">
                <div className={`w-12 h-12 rounded-2xl ${item.color} border flex items-center justify-center mb-3 shadow-inner`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="font-black text-sm tracking-wider text-white">{item.tag}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">{item.desc}</div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. EL PROBLEMA — El Frankenstein tecnológico */}
      {/* ========================================================================= */}
      <section id="problema" className="py-24 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto mb-16">
            <motion.span 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-rose-400 font-mono text-xs font-bold uppercase tracking-[0.25em] mb-3 block"
            >
              // EL PROBLEMA
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-5xl font-black text-white tracking-tight"
            >
              Tu negocio no debería necesitar 8 herramientas para funcionar.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.65, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-base md:text-lg text-slate-400"
            >
              La fragmentación habitual desgasta tu tiempo y divide la experiencia de tus alumnos.
            </motion.p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* 8 Apps Dispersas */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { title: 'Cursos', tool: 'En una plataforma externa', icon: Layout, color: 'text-indigo-400' },
                { title: 'Landings', tool: 'En otro constructor web', icon: Laptop, color: 'text-sky-400' },
                { title: 'IA y Copy', tool: 'Pestañas sueltas de ChatGPT', icon: Bot, color: 'text-violet-400' },
                { title: 'Sesiones', tool: 'Links dispersos de Calendar', icon: Calendar, color: 'text-amber-400' },
                { title: 'Alumnos', tool: 'Planillas de Excel infinitas', icon: BarChart3, color: 'text-emerald-400' },
                { title: 'Tareas', tool: 'Audios y PDFs por WhatsApp', icon: MessageSquare, color: 'text-teal-400' },
                { title: 'Seguimientos', tool: 'Documentos desordenados', icon: FileCheck, color: 'text-rose-400' },
                { title: 'Pagos', tool: 'Gateways sin conectar', icon: CreditCard, color: 'text-orange-400' },
              ].map((item, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-xl">
                  <div className={`w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">{item.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.tool}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Convergencia en Fastoria */}
            <div className="lg:col-span-6">
              <SpotlightCard spotlightColor="rgba(0, 245, 160, 0.2)" className="p-8 md:p-10 border-white/20">
                <div className="w-12 h-12 rounded-2xl bg-[#1CB899]/20 border border-[#1CB899]/40 flex items-center justify-center text-[#1CB899] mb-6">
                  <Shield className="w-6 h-6" />
                </div>

                <div className="space-y-3 mb-8 text-sm">
                  <div className="text-slate-500 line-through font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Más herramientas dispersas.
                  </div>
                  <div className="text-slate-500 line-through font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Múltiples suscripciones mensuales.
                  </div>
                  <div className="text-slate-500 line-through font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Más tiempo administrando que enseñando.
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <div className="text-[#1CB899] font-mono text-xs font-bold uppercase tracking-widest mb-2">
                    LA RESPUESTA FASTORIA
                  </div>
                  <h3 className="text-2xl font-black text-white leading-snug">
                    Todo tu negocio converge en una sola interfaz limpia.
                  </h3>
                  <p className="text-slate-400 text-sm font-medium mt-3 leading-relaxed">
                    Fastoria pone todo en un mismo lugar: contenidos, clientes, cobros, seguimiento y generación con IA.
                  </p>
                </div>
              </SpotlightCard>
            </div>
            {/* ========================================================================= */}
      {/* 4. LA PROPUESTA — Una plataforma, todo el recorrido */}
      {/* ========================================================================= */}
      <section id="propuesta" className="py-24 px-6 relative z-10 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto mb-16">
            <motion.span 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-[#1CB899] font-mono text-xs font-bold uppercase tracking-[0.25em] mb-3 block"
            >
              // LA PROPUESTA
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-5xl font-black text-white tracking-tight"
            >
              Desde lo que sabés hasta un negocio que crece.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.65, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="mt-3 text-slate-400 text-base"
            >
              Una plataforma integral que cubre cada etapa de tu proceso.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: '01',
                title: 'CREÁ',
                desc: 'Cursos, programas y productos digitales.',
                detail: 'Sube videos, documentos, cuestionarios y contenido estructurado.',
                icon: Layout,
                color: 'text-blue-400'
              },
              {
                step: '02',
                title: 'VENDÉ',
                desc: 'Landings y medios de pago conectados.',
                detail: 'Páginas optimizadas para conversión con checkout directo.',
                icon: ShoppingBag,
                color: 'text-emerald-400'
              },
              {
                step: '03',
                title: 'ENTREGÁ',
                desc: 'Contenido, tareas y experiencia del alumno.',
                detail: 'Campus fluido donde tus alumnos aprenden y entregan actividades.',
                icon: Send,
                color: 'text-purple-400'
              },
              {
                step: '04',
                title: 'ACOMPAÑÁ',
                desc: 'Mentorías, sesiones y procesos individuales.',
                detail: 'Seguimiento personalizado de objetivos, avances y encuentros.',
                icon: HeartHandshake,
                color: 'text-amber-400'
              },
              {
                step: '05',
                title: 'CRECÉ',
                desc: 'IA y herramientas comerciales para potenciar.',
                detail: 'Evo IA te asiste con copys, campañas y optimización continua.',
                icon: TrendingUp,
                color: 'text-[#1CB899]'
              },
            ].map((node, i) => (
              <SpotlightCard key={i} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-slate-500">{node.step}</span>
                    <node.icon className={`w-5 h-5 ${node.color}`} />
                  </div>
                  <h3 className="font-black text-lg text-white mb-2">{node.title}</h3>
                  <p className="text-xs font-bold text-slate-300 leading-snug mb-3">{node.desc}</p>
                </div>
                <p className="text-[11px] text-slate-500 font-medium pt-3 border-t border-white/10">{node.detail}</p>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. DIFERENCIAL & PRODUCTO HÍBRIDO */}
      {/* ========================================================================= */}
      <section id="diferencial" className="py-24 px-6 relative z-10 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6">
              <motion.span 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-[#1CB899] font-mono text-xs font-bold uppercase tracking-[0.25em] mb-3 block"
              >
                // DIFERENCIAL
              </motion.span>
              <motion.h2 
                initial={{ opacity: 0, x: -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight"
              >
                No todo lo que sabés tiene que convertirse en un curso.
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.65, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 text-base md:text-lg text-slate-400 font-normal leading-relaxed"
              >
                Podés vender un curso, una mentoría, un proceso de coaching, un paquete de sesiones, un programa o una combinación de todo.
              </motion.p>
              <div className="mt-6 inline-flex items-center gap-2 font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-sm">
                <Check className="w-4 h-4" />
                Y gestionarlo todo desde Fastoria.
              </div>
            </div>

            {/* Ficha de un producto híbrido */}
            <div className="lg:col-span-6">
              <SpotlightCard className="p-7 md:p-8">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#1CB899] uppercase bg-[#1CB899]/10 px-2.5 py-1 rounded-md border border-[#1CB899]/30">
                      Producto Híbrido Ficticio
                    </span>
                    <h3 className="text-xl font-black text-white mt-2">Programa de Liderazgo Ejecutivo</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500">Modalidad</span>
                    <div className="text-xs font-black text-white">Mixta (360°)</div>
                  </div>
                </div>

                <div className="py-5 space-y-3">
                  {[
                    { text: 'Curso online completo', status: 'Disponible 24/7' },
                    { text: '6 sesiones individuales', status: '2 completadas' },
                    { text: '8 tareas prácticas con feedback', status: '5 entregadas' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10 text-xs">
                      <div className="flex items-center gap-2.5 text-slate-300 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-[#1CB899]" />
                        <span>{item.text}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-3 rounded-xl border border-white/10">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Próxima sesión</div>
                    <div className="text-xs font-black text-white mt-0.5">14 de Septiembre • 16:00</div>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-white/10">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Progreso General</div>
                    <div className="text-xs font-black text-[#1CB899] mt-0.5">68% completado</div>
                  </div>
                </div>
              </SpotlightCard>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SEGUIMIENTOS & 7. EVO IA (Animated Card) */}
      {/* ========================================================================= */}
      <section id="evo" className="py-24 px-6 relative z-10 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <motion.span 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-[#1CB899] font-mono text-xs font-bold uppercase tracking-[0.25em] block"
              >
                // INTELIGENCIA ARTIFICIAL NATIVA
              </motion.span>
              <motion.h2 
                initial={{ opacity: 0, x: -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl md:text-6xl font-black text-white tracking-tight"
              >
                Conocé a Evo.
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.65, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="text-lg text-slate-300 font-semibold"
              >
                Tu IA dentro de Fastoria.
              </motion.p>
              <p className="text-slate-400 text-sm md:text-base font-normal leading-relaxed">
                Evo acompaña al profesional mientras crea y gestiona su negocio. Diseñado para tareas concretas: estructuración de temarios, campañas, contenidos y seguimiento de alumnos.
              </p>
              <div className="pt-2">
                <a href="#pricing">
                  <button className="px-6 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-xs border border-white/15 transition-all flex items-center gap-2">
                    <span>Conocé Seguimientos & Evo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </a>
              </div>
            </div>

            {/* Evo Live Chat Card */}
            <div className="lg:col-span-6">
              <SpotlightCard className="p-0 overflow-hidden bg-[#0A0E1A]">
                {/* Header */}
                <div className="bg-[#121626] px-5 py-3.5 flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#3B2C68] text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="w-4 h-4 fill-white text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white tracking-tight block leading-none">Evo Assistant</span>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Creación Inteligente
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#1CB899] bg-[#1CB899]/10 px-2.5 py-0.5 rounded-full border border-[#1CB899]/30">
                    Paso {Math.min(3, Math.floor(evoStep / 2) + 1)}/3
                  </span>
                </div>

                {/* Chat Flow */}
                <div className="p-5 space-y-3 min-h-[360px] max-h-[400px] overflow-y-auto flex flex-col justify-between">
                  <div className="space-y-3">
                    
                    {/* Mensaje 0 */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-purple-900/40 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 border border-purple-700/50">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="bg-white/[0.06] text-slate-200 p-3 rounded-2xl rounded-tl-sm text-xs leading-relaxed max-w-[88%] border border-white/10">
                        ¡Hola! Soy Evo, tu agente personal. Conozco a todos tus alumnos y sus cursos. ¿En qué puedo ayudarte hoy?
                      </div>
                    </div>

                    {/* Paso 1 */}
                    <AnimatePresence>
                      {evoStep >= 1 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          className="flex justify-end"
                        >
                          <div className="bg-[#3B2C68] text-white p-3 rounded-2xl rounded-tr-sm text-xs font-medium max-w-[84%] border border-purple-500/30">
                            Evo, quiero crear un curso de <span className="text-emerald-300 font-bold">Liderazgo y Gestión de Equipos</span>.
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Respuesta 1 */}
                    <AnimatePresence>
                      {evoStep >= 2 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          className="flex items-start gap-2.5"
                        >
                          <div className="w-7 h-7 rounded-full bg-purple-900/40 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 border border-purple-700/50">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                          <div className="bg-white/[0.06] text-slate-200 p-3 rounded-2xl rounded-tl-sm text-xs leading-relaxed max-w-[88%] border border-white/10">
                            ¡Excelente! Diseñé 4 módulos clave: <strong>1. Comunicación</strong>, <strong>2. Delegación</strong>, <strong>3. Conflictos</strong> y <strong>4. Feedback 360°</strong>. ¿Sumamos guías y evaluaciones?
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Paso 2 */}
                    <AnimatePresence>
                      {evoStep >= 3 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          className="flex justify-end"
                        >
                          <div className="bg-[#3B2C68] text-white p-3 rounded-2xl rounded-tr-sm text-xs font-medium max-w-[84%] border border-purple-500/30">
                            Sí, generá las guías en PDF y 2 evaluaciones automáticas.
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Respuesta 2 */}
                    <AnimatePresence>
                      {evoStep >= 4 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          className="flex items-start gap-2.5"
                        >
                          <div className="w-7 h-7 rounded-full bg-purple-900/40 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 border border-purple-700/50">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                          <div className="bg-white/[0.06] text-slate-200 p-3 rounded-2xl rounded-tl-sm text-xs leading-relaxed max-w-[88%] border border-white/10">
                            Listos: 2 cuestionarios autocalificables y plantillas descargables adjuntas ✓.
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Paso 3 */}
                    <AnimatePresence>
                      {evoStep >= 5 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          className="flex justify-end"
                        >
                          <div className="bg-[#3B2C68] text-white p-3 rounded-2xl rounded-tr-sm text-xs font-medium max-w-[84%] border border-purple-500/30">
                            Perfecto. Armá la landing de venta con checkout y publícalo.
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Respuesta 3 */}
                    <AnimatePresence>
                      {evoStep >= 6 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          className="flex items-start gap-2.5"
                        >
                          <div className="w-7 h-7 rounded-full bg-purple-900/40 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 border border-purple-700/50">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                          <div className="bg-white/[0.06] text-slate-200 p-3 rounded-2xl rounded-tl-sm text-xs leading-relaxed max-w-[88%] border border-white/10">
                            🎉 <strong>¡Curso publicado con éxito!</strong> Landing activa con cobro conectado. Ya podés compartir tu link de venta.
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>

                  {/* Input Bar */}
                  <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                    <div className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-400 flex items-center justify-between">
                      <span>Pregúntale a Evo...</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1CB899] animate-ping" />
                    </div>
                    <button className="w-9 h-9 rounded-xl bg-[#3B2C68] text-white flex items-center justify-center shadow-xs">
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </div>
                </div>
              </SpotlightCard>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. TODO LO QUE TENÉS EN FASTORIA (4 Pilares) */}
      {/* ========================================================================= */}
      <section className="py-24 px-6 relative z-10 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto mb-16">
            <motion.span 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-[#1CB899] font-mono text-xs font-bold uppercase tracking-[0.25em] mb-3 block"
            >
              // STACK COMPLETO
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-5xl font-black text-white tracking-tight"
            >
              Todo lo que tenés en Fastoria.
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'CREAR',
                icon: Layout,
                color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                items: ['Cursos', 'Productos digitales', 'Módulos y contenidos', 'Landings', 'IA para contenido', 'Imágenes y video']
              },
              {
                title: 'GESTIONAR',
                icon: Users,
                color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                items: ['Alumnos', 'Progreso', 'Tareas', 'Seguimientos', 'Sesiones', 'Procesos individuales']
              },
              {
                title: 'VENDER',
                icon: CreditCard,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                items: ['Páginas de venta', 'Pagos', 'Referidos', 'Perfil público', 'Campañas con IA']
              },
              {
                title: 'PERSONALIZAR',
                icon: Sparkles,
                color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                items: ['Logo', 'Colores', 'Tipografías', 'Identidad visual']
              },
            ].map((pilar, idx) => (
              <SpotlightCard key={idx} className="p-6">
                <div className={`w-12 h-12 rounded-2xl ${pilar.color} border flex items-center justify-center font-bold mb-5`}>
                  <pilar.icon className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-white mb-4 tracking-tight">{pilar.title}</h3>
                <ul className="space-y-2.5 text-xs font-semibold text-slate-400">
                  {pilar.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-300">
                      <Check className="w-3.5 h-3.5 text-[#1CB899]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. PRICING */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-24 px-6 relative z-10 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto mb-12">
            <motion.span 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-[#1CB899] font-mono text-xs font-bold uppercase tracking-[0.25em] mb-3 block"
            >
              // PLANES & PRECIOS
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-5xl font-black text-white tracking-tight"
            >
              Un plan para cada momento de tu negocio.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.65, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="mt-3 text-slate-400 text-base"
            >
              Empezá donde estás. Crecé cuando lo necesites.
            </motion.p>

            {/* Toggle Mensual / Anual */}
            <div className="mt-8 inline-flex items-center p-1.5 bg-white/[0.05] border border-white/10 rounded-full">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  billingPeriod === 'monthly' ? 'bg-[#1CB899] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Facturación Mensual
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billingPeriod === 'annual' ? 'bg-[#1CB899] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Facturación Anual</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-[#1CB899] text-[10px] font-black">
                  2 meses bonificados
                </span>
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-stretch">
            {/* INICIAL */}
            <SpotlightCard className="flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">MOMENTO 01</div>
                <h3 className="text-2xl font-black text-white">INICIAL — CREÁ</h3>
                <p className="text-xs text-slate-400 mt-2 mb-6">
                  Para empezar a transformar tu conocimiento en productos y servicios.
                </p>

                <div className="mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">ARS ${getPrice(25000)}</span>
                    <span className="text-xs text-slate-400">/ mes</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400 block mt-1">Precio de lanzamiento</span>
                </div>

                <ul className="space-y-3 text-xs font-bold text-slate-300 mb-8">
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#1CB899]" /> 5 productos</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#1CB899]" /> 100 alumnos</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#1CB899]" /> 1 crédito IA mensual</li>
                </ul>
              </div>

              <Link href="/auth">
                <button className="w-full py-3.5 rounded-xl border border-white/20 hover:bg-white/10 text-white font-bold text-xs transition-all">
                  Elegir Inicial
                </button>
              </Link>
            </SpotlightCard>

            {/* EXPANSIÓN (Recomendado) */}
            <SpotlightCard spotlightColor="rgba(28, 184, 153, 0.3)" className="border-[#1CB899]/50 flex flex-col justify-between relative lg:-translate-y-2 bg-gradient-to-b from-[#1CB899]/10 to-transparent">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#1CB899] text-slate-950 text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-[0_0_15px_rgba(28,184,153,0.5)]">
                Recomendado
              </div>

              <div>
                <div className="text-xs font-mono font-bold text-[#1CB899] uppercase tracking-widest mb-1">MOMENTO 02</div>
                <h3 className="text-2xl font-black text-white">EXPANSIÓN — CRECÉ</h3>
                <p className="text-xs text-slate-300 mt-2 mb-6">
                  Para cuando ya tenés alumnos y querés desarrollar tu negocio.
                </p>

                <div className="mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">ARS ${getPrice(50000)}</span>
                    <span className="text-xs text-slate-400">/ mes</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#1CB899] block mt-1">Precio de lanzamiento</span>
                </div>

                <ul className="space-y-3 text-xs font-bold text-slate-200 mb-8">
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#1CB899]" /> 15 productos</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#1CB899]" /> 500 alumnos</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#1CB899]" /> 3 créditos IA mensuales</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#1CB899]" /> Seguimientos y mentorías</li>
                </ul>
              </div>

              <Link href="/auth">
                <button className="w-full py-3.5 rounded-xl bg-[#1CB899] hover:bg-[#18a287] text-slate-950 font-black text-xs transition-all shadow-[0_0_20px_rgba(28,184,153,0.4)]">
                  Elegir Expansión
                </button>
              </Link>
            </SpotlightCard>

            {/* FULL */}
            <SpotlightCard className="flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">MOMENTO 03</div>
                <h3 className="text-2xl font-black text-white">FULL — ESCALÁ</h3>
                <p className="text-xs text-slate-400 mt-2 mb-6">
                  Para cuando Fastoria se convierte en una pieza central de tu operación.
                </p>

                <div className="mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">ARS ${getPrice(150000)}</span>
                    <span className="text-xs text-slate-400">/ mes</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400 block mt-1">Precio de lanzamiento</span>
                </div>

                <ul className="space-y-3 text-xs font-bold text-slate-300 mb-8">
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#1CB899]" /> 50 productos</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#1CB899]" /> 2.000 alumnos</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#1CB899]" /> 10 créditos IA mensuales</li>
                </ul>
              </div>

              <Link href="/auth">
                <button className="w-full py-3.5 rounded-xl border border-white/20 hover:bg-white/10 text-white font-bold text-xs transition-all">
                  Elegir Full
                </button>
              </Link>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. FASTORIA EMPRESAS */}
      {/* ========================================================================= */}
      <section className="py-20 px-6 relative z-10 border-t border-white/10">
        <div className="max-w-5xl mx-auto rounded-3xl border border-white/15 bg-gradient-to-r from-slate-900/90 via-black/80 to-slate-900/90 p-8 md:p-12 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 backdrop-blur-2xl">
          <div className="max-w-xl">
            <span className="text-[#1CB899] font-mono text-xs font-bold uppercase tracking-[0.25em] mb-2 block">
              // ORGANIZACIONES
            </span>
            <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              ¿Querés llevar Fastoria a tu organización?
            </h3>
            <p className="mt-3 text-slate-400 text-sm md:text-base">
              Capacitación, contenidos y procesos de desarrollo en un entorno privado para empresas.
            </p>
          </div>

          <div className="bg-white/[0.04] border border-white/10 p-6 rounded-2xl text-center w-full lg:w-72 shrink-0">
            <div className="text-xs font-bold text-slate-400 uppercase">Inversión Empresas</div>
            <div className="text-2xl font-black text-white mt-1 mb-4">Desde ARS $100.000 <span className="text-xs text-slate-500">/ mes</span></div>
            <a href="https://wa.me/541157448819?text=Hola%20quiero%20conocer%20Fastoria%20Empresas" target="_blank" rel="noopener noreferrer">
              <button className="w-full py-3 rounded-xl bg-[#1CB899] hover:bg-[#18a287] text-slate-950 font-black text-xs transition-all shadow-[0_0_15px_rgba(28,184,153,0.3)]">
                Quiero conocer Fastoria Empresas
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 12. INTEGRACIONES & ALIANZAS (Sin alterar logos) */}
      {/* ========================================================================= */}
      <section className="relative z-10 py-24 px-6 overflow-hidden border-t border-white/10">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes scrollLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .integrations-track-v3 {
            animation: scrollLeft 40s linear infinite;
          }
          .integrations-track-v3:hover {
            animation-play-state: paused;
          }
        ` }} />

        <div className="container mx-auto max-w-6xl mb-12 text-center">
          <span className="text-[#1CB899] font-mono text-xs font-bold uppercase tracking-[0.25em] mb-2 block">
            // ECOSISTEMA CONECTADO
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            Intégrate con tus <span className="text-[#1CB899]">herramientas favoritas</span>
          </h2>
        </div>

        <div className="relative w-full">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#070A12] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#070A12] to-transparent z-10 pointer-events-none" />

          <div className="integrations-track-v3 flex gap-4 w-max">
            {[
              { name: "Gemini AI", icon: "gemini", color: "1CB899" },
              { name: "DeepSeek", icon: "deepseek", color: "4F46E5" },
              { name: "Firebase", icon: "firebase", color: "FFCA28" },
              { name: "MercadoPago", icon: "mercadopago", color: "009EE3" },
              { name: "Google Drive", icon: "googledrive", color: "34A853" },
              { name: "YouTube", icon: "youtube", color: "FF0000" },
              { name: "TikTok", icon: "tiktok", color: "FFFFFF" },
              { name: "PayPal", icon: "paypal", color: "003087" },
              { name: "WhatsApp API", icon: "whatsapp", color: "25D366" },
              { name: "LinkedIn", icon: "linkedin", color: "0A66C2" },
              { name: "Google Analytics", icon: "googleanalytics", color: "E37400" },
              { name: "Meta Ads", icon: "meta", color: "1877F2" },
              { name: "Instagram", icon: "instagram", color: "E4405F" },
              { name: "GitHub", icon: "github", color: "FFFFFF" },
              // Loop
              { name: "Gemini AI", icon: "gemini", color: "1CB899" },
              { name: "DeepSeek", icon: "deepseek", color: "4F46E5" },
              { name: "Firebase", icon: "firebase", color: "FFCA28" },
              { name: "MercadoPago", icon: "mercadopago", color: "009EE3" },
              { name: "Google Drive", icon: "googledrive", color: "34A853" },
              { name: "YouTube", icon: "youtube", color: "FF0000" },
              { name: "TikTok", icon: "tiktok", color: "FFFFFF" },
              { name: "PayPal", icon: "paypal", color: "003087" },
              { name: "WhatsApp API", icon: "whatsapp", color: "25D366" },
              { name: "LinkedIn", icon: "linkedin", color: "0A66C2" },
              { name: "Google Analytics", icon: "googleanalytics", color: "E37400" },
              { name: "Meta Ads", icon: "meta", color: "1877F2" },
              { name: "Instagram", icon: "instagram", color: "E4405F" },
              { name: "GitHub", icon: "github", color: "FFFFFF" },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-3 flex-shrink-0 backdrop-blur-xl hover:border-[#1CB899]/50 transition-all cursor-default"
              >
                <img
                  className="w-6 h-6 flex-shrink-0"
                  src={`https://cdn.simpleicons.org/${item.icon}/${item.color}`}
                  alt={item.name}
                  loading="lazy"
                />
                <span className="text-xs font-bold text-slate-300 whitespace-nowrap">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 13. FAQ */}
      {/* ========================================================================= */}
      <section className="py-24 px-6 relative z-10 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="max-w-3xl mx-auto mb-16">
            <motion.span 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-[#1CB899] font-mono text-xs font-bold uppercase tracking-[0.25em] mb-3 block"
            >
              // FAQ
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-5xl font-black text-white tracking-tight"
            >
              ¿Tenés dudas? Te las respondemos.
            </motion.h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "¿Necesito conocimientos técnicos?",
                a: "No. Fastoria está diseñada con una interfaz visual intuitiva para que puedas crear contenidos, configurar tus cobros y gestionar alumnos sin escribir una sola línea de código."
              },
              {
                q: "¿Puedo vender algo además de cursos?",
                a: "Sí. Podés ofrecer mentorías 1 a 1, programas híbridos, sesiones individuales de consultoría, productos digitales descargables o paquetes combinados."
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
                a: "Sí. Contamos con Fastoria Empresas, pensado especialmente para organizaciones que requieren capacitación interna y entornos cerrados."
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl"
              >
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-sm font-black text-white">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
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
                      className="px-5 pb-5 text-xs text-slate-400 font-medium leading-relaxed border-t border-white/5 pt-2"
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
      {/* 14. FINAL HERO CTA */}
      {/* ========================================================================= */}
      <section className="py-28 px-6 relative z-10 text-center overflow-hidden border-t border-white/10">
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="text-[#1CB899] font-mono text-xs font-bold uppercase tracking-[0.25em] mb-4 block">
            // EL MOMENTO ES AHORA
          </span>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Tu conocimiento ya tiene valor.
          </h2>
          <p className="mt-4 text-lg sm:text-2xl text-slate-300 font-medium">
            Fastoria te ayuda a convertirlo en un negocio.
          </p>

          <div className="my-8 flex items-center justify-center gap-3 text-xs sm:text-sm font-black uppercase tracking-widest text-[#1CB899]">
            <span>Creá</span>
            <span>•</span>
            <span>Vendé</span>
            <span>•</span>
            <span>Acompañá</span>
            <span>•</span>
            <span>Crecé</span>
          </div>

          <Link href="/auth">
            <button className="px-10 py-5 rounded-2xl bg-[#1CB899] hover:bg-[#18a287] text-slate-950 font-black text-base shadow-[0_0_35px_rgba(28,184,153,0.5)] transition-all inline-flex items-center gap-2 group">
              Empezar con Fastoria Gratis
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="relative z-10 py-16 px-6 border-t border-white/10 bg-black/60 text-white">
        <div className="container mx-auto max-w-xl text-center">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-[0_0_15px_rgba(28,184,153,0.2)]">
            <span className="text-base font-black text-[#1CB899]">//</span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-400 mb-8 uppercase tracking-wider">
            <Link href="/v3" className="hover:text-white transition-colors">Inicio</Link>
            <Link href="/courses" className="hover:text-white transition-colors">Cursos</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Mentores</Link>
            <Link href="/auth" className="hover:text-white transition-colors">Ingresar</Link>
            <a href="mailto:felizdeemprender@gmail.com" className="hover:text-white transition-colors">Contacto</a>
          </div>

          <div className="flex justify-center gap-3 mb-8">
            <a href="https://wa.me/541157448819" target="_blank" rel="noopener noreferrer" title="WhatsApp" className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-slate-300 hover:text-emerald-400 transition-all">
              <IoLogoWhatsapp className="w-4 h-4" />
            </a>
            <a href="https://instagram.com/felizdeemprender" target="_blank" rel="noopener noreferrer" title="Instagram" className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-slate-300 hover:text-pink-400 transition-all">
              <IoLogoInstagram className="w-4 h-4" />
            </a>
            <a href="mailto:felizdeemprender@gmail.com" title="Email" className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-slate-300 hover:text-[#1CB899] transition-all">
              <IoMailOutline className="w-4 h-4" />
            </a>
            <a href="https://www.fastoria.com.ar" target="_blank" rel="noopener noreferrer" title="Sitio Web" className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-slate-300 hover:text-sky-400 transition-all">
              <IoGlobeOutline className="w-4 h-4" />
            </a>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col items-center gap-1.5 text-[11px] font-semibold text-slate-500">
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
