'use client';

import { FastoriaMarca } from '@/components/landing/FastoriaMarca';
import { FastoriaFeatures } from '@/components/landing/FastoriaFeatures';
import { FastoriaCierre } from '@/components/landing/FastoriaCierre';
import { FastoriaIdentificacion } from '@/components/landing/FastoriaIdentificacion';
import { FastoriaProblema } from '@/components/landing/FastoriaProblema';
import { FastoriaPropuesta } from '@/components/landing/FastoriaPropuesta';
import { FastoriaDiferencial } from '@/components/landing/FastoriaDiferencial';
import { FastoriaPricing } from '@/components/landing/FastoriaPricing';
import { FastoriaEnterprise } from '@/components/landing/FastoriaEnterprise';
import { FastoriaIntegrations } from '@/components/landing/FastoriaIntegrations';
import { FastoriaSocialProof } from '@/components/landing/FastoriaSocialProof';
import { FastoriaFaq } from '@/components/landing/FastoriaFaq';
import { FastoriaFooter } from '@/components/landing/FastoriaFooter';
import { WhatsAppFloatingButton } from '@/components/ui/whatsapp-floating-button';

import React, { useEffect, useRef, useState } from 'react';
import { motion, MotionConfig, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Reveal, staggerContainer, staggerItem, Float, Tilt, EASE } from '@/components/ui/animations';
import { DemoPlayer } from '@/components/remotion/DemoPlayer';
import {
  ArrowRight, Sparkles, Layout, CreditCard, Bot, HeartHandshake,
} from 'lucide-react';
import { useAuth } from '@/components/auth-context';

export default function FastoriaLanding() {
  const { user } = useAuth();
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
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

      {/* ─── Floating Navbar ─────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="fixed top-4 inset-x-0 mx-auto z-50 w-[94%] max-w-6xl"
      >
        <div className={`backdrop-blur-xl rounded-full px-5 py-3 flex items-center justify-between transition-all duration-300 ${scrolled ? 'bg-white/95 border border-slate-200 shadow-xl shadow-slate-900/10' : 'bg-white/70 border border-transparent shadow-lg shadow-slate-900/5'}`}>
          <Link href="/" className="flex items-center group">
            <motion.div
              whileHover={{ rotate: -8, scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="w-7 h-7 relative flex items-center justify-center -mr-2"
            >
              <Image
                src="/logoF.png"
                alt="Fastoria Logo"
                width={28}
                height={28}
                className="w-7 h-7 object-contain drop-shadow-sm"
                priority
              />
            </motion.div>
            <span className="font-black tracking-tight text-lg text-slate-900">
              ASTORIA<span className="text-[#1CB899]">.</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Link href='/courses' className='relative group px-3.5 py-1.5 rounded-full bg-[#1CB899]/15 text-[#1CB899] font-black border border-[#1CB899]/30 hover:bg-[#1CB899] hover:text-white transition-all shadow-sm flex items-center gap-1.5'>
              <span>Cursos</span>
              <span className='w-1.5 h-1.5 rounded-full bg-[#1CB899] group-hover:bg-white animate-pulse' />
            </Link>
            {[
              ['#identificacion', 'Para quién'],
              ['#problema', 'Problema'],
              ['#propuesta', 'Cómo funciona'],
              ['#diferencial', 'Diferencial'],
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
            <Link href='/courses' className='md:hidden flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-[#1CB899]/15 text-[#1CB899] border border-[#1CB899]/30 hover:bg-[#1CB899] hover:text-white transition-all shadow-sm'>Cursos</Link>
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

      {/* ─── 1. HERO ─────────────────────────────────────────────────── */}
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

          {/* Hero Product Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
            className="mt-14 relative mx-auto max-w-5xl"
          >
            <motion.div style={{ y: heroY, opacity: heroOpacity }}>
              <Float className="absolute -inset-2 bg-gradient-to-r from-[#1CB899]/20 via-violet-500/15 to-emerald-500/20 rounded-[40px] blur-2xl -z-10" duration={6} distance={12} />

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

              {/* Floating Highlights */}
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

      {/* ─── Secciones modulares ─────────────────────────────────────── */}
      <FastoriaIdentificacion />
      <FastoriaProblema />
      <FastoriaPropuesta />
      <FastoriaDiferencial />
      <FastoriaSocialProof />
      <FastoriaMarca />
      <FastoriaFeatures />
      <FastoriaPricing />
      <FastoriaEnterprise />
      <FastoriaIntegrations />
      <FastoriaFaq />
      <FastoriaCierre />
      <FastoriaFooter />

      <WhatsAppFloatingButton />

    </div>
    </MotionConfig>
  );
}
