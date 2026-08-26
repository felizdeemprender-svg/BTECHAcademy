'use client';

import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { DemoPlayer } from '@/components/remotion/DemoPlayer';
import { Layers, Cpu, ArrowRight } from 'lucide-react';
import { LandingNavbar } from '@/components/ui/landing-navbar';
import { GradientMenu } from '@/components/ui/gradient-menu';
import Link from 'next/link';
import { IoLogoWhatsapp, IoLogoInstagram, IoMailOutline, IoGlobeOutline } from 'react-icons/io5';

export default function LandingV3() {
  const { scrollYProgress } = useScroll();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const videoY = useTransform(scrollYProgress, [0, 0.3], [100, -50]);
  const videoRotate = useTransform(scrollYProgress, [0, 0.3], [5, 0]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F172A] selection:bg-[#1CB899]/20 overflow-x-hidden font-sans">

      {/* Premium Background Asset */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/premium_bg.png')] bg-cover bg-center opacity-40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white opacity-80" />
      </div>

      {/* Floating Progress Indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[#1CB899] z-[100] origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Navbar — Gradient Menu */}
      <nav className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
        <div className="rounded-full bg-black/30 backdrop-blur-xl border border-white/15 shadow-lg shadow-black/10 px-4 sm:px-5 py-2">
          <GradientMenu />
        </div>
      </nav>

      {/* Rooftop Video Hero Section — reemplaza HeroScrubFrameSequence */}
      <section className="relative w-screen h-screen overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          src="/rooftop.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
        <div className="relative z-10 h-full flex flex-col justify-end px-6 pb-16 md:px-16 md:pb-20">
          <div className="max-w-4xl">
            <h1 className="font-black uppercase leading-[0.85] tracking-[-0.04em] text-white text-[20vw] sm:text-[18vw] md:text-[16vw] lg:text-[14vw]">
              FASTORIA
            </h1>
            <h2 className="font-black uppercase leading-[0.85] tracking-[-0.04em] text-[#1CB899] text-[16vw] sm:text-[14vw] md:text-[12vw] lg:text-[10vw] -mt-[2vw]">
              ACADEMY
            </h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-white/70 text-sm sm:text-base md:text-lg max-w-xl mt-4 font-medium"
            >
              La plataforma todo-en-uno para creadores de cursos, mentores y coaches que quieren escalar su impacto utilizando la IA.
            </motion.p>
            <div className="flex gap-3 mt-6">
              <Link href="/auth">
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="group inline-flex items-center gap-2 rounded-full bg-[#1CB899] py-2 pl-6 pr-2 text-sm font-bold text-[#0F172A] transition-all hover:gap-3 hover:bg-[#1CB899]/90"
                >
                  Cursos
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F172A] transition-transform group-hover:scale-110">
                    <ArrowRight className="h-4 w-4 text-white" />
                  </span>
                </motion.button>
              </Link>
              <Link href="/auth">
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-full border-2 border-white/30 bg-white/10 py-2 px-6 text-sm font-bold text-white transition-all hover:bg-white/20 hover:border-white/50 backdrop-blur-sm"
                >
                  Regístrate
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Remotion Interactive Section */}
      <section className="relative z-10 py-20 px-6 overflow-visible">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            style={{ y: videoY, rotateX: videoRotate }}
            className="relative"
          >
            {/* Floating UI Elements */}
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-20 -right-20 z-20 w-64 p-8 bg-white/80 backdrop-blur-xl rounded-[32px] border border-white/50 shadow-2xl hidden xl:block"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-[#1CB899]/10 rounded-xl flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-[#1CB899]" />
                </div>
                <span className="font-black text-sm uppercase">Gemini 2.5 Pro</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>Cursos Premium</span>
                    <span>50+</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: ["30%", "95%", "30%"] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="h-full bg-[#1CB899]"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>Páginas Propias</span>
                    <span>850+</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: ["40%", "85%", "40%"] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="h-full bg-[#7C3AED]"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ x: [0, 20, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-10 -left-10 z-20 w-72 p-8 bg-[#0F172A] rounded-[32px] shadow-2xl hidden xl:block"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Layers className="w-6 h-6 text-[#1CB899]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-black text-xs uppercase tracking-widest">Comunidad</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-3xl font-black text-white">1.2K+</div>
                  <div className="text-xs font-bold text-slate-400 mt-1">Mentores Activos</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-[#1CB899]">98%</div>
                  <div className="text-xs font-bold text-slate-400 mt-1">Satisfacción</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs font-bold text-slate-500">ESTUDIANTES</div>
                <div className="text-xl font-black text-white">10K+</div>
              </div>
            </motion.div>

            {/* The Remotion Player */}
            <div className="relative z-10 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#1CB899] to-[#7C3AED] rounded-[52px] blur-2xl opacity-10 group-hover:opacity-30 transition-opacity duration-1000" />
              <DemoPlayer />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mentor Journey Timeline */}
      <section className="relative z-10 py-32 px-6 bg-slate-50/50">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <span className="text-[#1CB899] font-black text-sm uppercase tracking-[0.25em] mb-4 block">
              Tu Evolución
            </span>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900">
              El Camino del <span className="text-[#1CB899]">Mentor</span>
            </h2>
          </motion.div>

          <div className="relative max-w-4xl mx-auto">
            {/* Línea central */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-[#1CB899] to-transparent hidden md:block" />

            {/* Timeline Item 1 */}
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="relative flex items-start mb-8 md:mb-12 md:pr-[50%] md:text-right"
            >
              <div className="hidden md:block absolute left-1/2 top-8 w-5 h-5 bg-white border-4 border-[#1CB899] rounded-full shadow-[0_0_20px_rgba(28,184,153,0.4)] -translate-x-1/2 z-10" />
              <div className="w-full md:w-[85%] bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:border-[#1CB899] hover:scale-[1.02] hover:shadow-xl transition-all duration-300">
                <span className="text-[#1CB899] font-black text-xs tracking-[0.2em] block mb-3">01</span>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Creación del Curso</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Sube tu curso, arma las clases, videos, adjunta la documentación, crea las preguntas o deja que la IA lo haga por ti.
                </p>
              </div>
              <div className="md:hidden absolute left-1/2 -top-2 w-4 h-4 bg-white border-[3px] border-[#1CB899] rounded-full shadow-[0_0_15px_rgba(28,184,153,0.3)] -translate-x-1/2 z-10" />
            </motion.div>

            {/* Timeline Item 2 */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="relative flex items-start md:justify-end mb-8 md:mb-12 md:pl-[50%]"
            >
              <div className="hidden md:block absolute left-1/2 top-8 w-5 h-5 bg-white border-4 border-[#1CB899] rounded-full shadow-[0_0_20px_rgba(28,184,153,0.4)] -translate-x-1/2 z-10" />
              <div className="w-full md:w-[85%] bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:border-[#1CB899] hover:scale-[1.02] hover:shadow-xl transition-all duration-300">
                <span className="text-[#1CB899] font-black text-xs tracking-[0.2em] block mb-3">02</span>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Lanzamiento Automatizado</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Lanza el curso en todas tus redes sociales en forma automática con nuestro sistema IA.
                </p>
              </div>
              <div className="md:hidden absolute left-1/2 -top-2 w-4 h-4 bg-white border-[3px] border-[#1CB899] rounded-full shadow-[0_0_15px_rgba(28,184,153,0.3)] -translate-x-1/2 z-10" />
            </motion.div>

            {/* Timeline Item 3 */}
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="relative flex items-start mb-8 md:mb-12 md:pr-[50%] md:text-right"
            >
              <div className="hidden md:block absolute left-1/2 top-8 w-5 h-5 bg-white border-4 border-[#1CB899] rounded-full shadow-[0_0_20px_rgba(28,184,153,0.4)] -translate-x-1/2 z-10" />
              <div className="w-full md:w-[85%] bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:border-[#1CB899] hover:scale-[1.02] hover:shadow-xl transition-all duration-300">
                <span className="text-[#1CB899] font-black text-xs tracking-[0.2em] block mb-3">03</span>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Gestión de Inscripciones</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Gestiona las inscripciones online y/o manualmente con total control.
                </p>
              </div>
              <div className="md:hidden absolute left-1/2 -top-2 w-4 h-4 bg-white border-[3px] border-[#1CB899] rounded-full shadow-[0_0_15px_rgba(28,184,153,0.3)] -translate-x-1/2 z-10" />
            </motion.div>

            {/* Timeline Item 4 */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="relative flex items-start md:justify-end md:pl-[50%]"
            >
              <div className="hidden md:block absolute left-1/2 top-8 w-5 h-5 bg-white border-4 border-[#1CB899] rounded-full shadow-[0_0_20px_rgba(28,184,153,0.4)] -translate-x-1/2 z-10" />
              <div className="w-full md:w-[85%] bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:border-[#1CB899] hover:scale-[1.02] hover:shadow-xl transition-all duration-300">
                <span className="text-[#1CB899] font-black text-xs tracking-[0.2em] block mb-3">04</span>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Evaluación Inteligente</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Deja que la IA corrija las evaluaciones de tus alumnos y te genere reportes detallados de cada uno.
                </p>
              </div>
              <div className="md:hidden absolute left-1/2 -top-2 w-4 h-4 bg-white border-[3px] border-[#1CB899] rounded-full shadow-[0_0_15px_rgba(28,184,153,0.3)] -translate-x-1/2 z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid — Inscripciones VIP */}
      <section className="relative z-10 py-32 px-6 bg-white">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-[#1CB899] font-black text-sm uppercase tracking-[0.25em] mb-4 block">
              Inscripciones VIP
            </span>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900">
              Todo lo que necesitas en <span className="text-[#1CB899]">un solo lugar</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 auto-rows-[minmax(200px,auto)]">
            {/* Card 1 — Matrícula (Tall) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0 }}
              className="md:col-span-2 md:row-span-2 group bg-white rounded-[32px] border border-slate-200 p-10 shadow-sm hover:shadow-xl hover:border-[#1CB899] transition-all duration-500 flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-[#1CB899]/10 flex items-center justify-center mb-8">
                  <svg className="w-7 h-7 text-[#1CB899]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <polyline points="16 3 21 8 23 6" />
                  </svg>
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Matrículas Inteligentes</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Gestiona tu matrícula mediante invitaciones directas o ventas públicas con control total sobre cada inscripción.
                </p>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-100">
                <div className="flex -space-x-3 mb-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                      U{i}
                    </div>
                  ))}
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Actividad en tiempo real</p>
              </div>
            </motion.div>

            {/* Card 2 — 10X Stat (Large Typography) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="md:col-span-4 group bg-white rounded-[32px] border border-slate-200 p-10 shadow-sm hover:shadow-xl hover:border-[#1CB899] transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-8"
            >
              <div className="flex-1">
                <h3 className="text-2xl font-black text-slate-900 mb-2">Impacto Directo</h3>
                <p className="text-slate-500 font-medium max-w-xs">
                  Multiplicá la eficiencia de tu equipo y la satisfacción de tus alumnos.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-8xl md:text-9xl font-black text-slate-900 tracking-tighter">10X</span>
                <div className="flex flex-col">
                  <span className="text-[#1CB899] font-black text-xl leading-none">Más</span>
                  <span className="text-slate-400 font-bold text-sm uppercase">Rápido</span>
                </div>
              </div>
            </motion.div>

            {/* Card 3 — IA Gemini (Medium) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-2 group bg-[#0F172A] rounded-[32px] p-10 shadow-xl hover:scale-[1.02] transition-all duration-500 text-white"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                <Cpu className="w-6 h-6 text-[#1CB899]" />
              </div>
              <h3 className="text-2xl font-black mb-4">Gemini 2.5 Pro</h3>
              <p className="text-slate-400 font-medium text-sm leading-relaxed mb-6">
                Generación de contenido, evaluaciones y feedback personalizado automático.
              </p>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: ["0%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-full bg-[#1CB899]" 
                />
              </div>
            </motion.div>

            {/* Card 4 — 42% Stats (Focused Typography) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="md:col-span-2 group bg-white rounded-[32px] border border-slate-200 p-10 shadow-sm hover:shadow-xl hover:border-[#1CB899] transition-all duration-500"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-black text-slate-900">Retención</h3>
                <span className="px-3 py-1 bg-violet-50 text-violet-600 rounded-full text-[10px] font-black uppercase">Monthly Growth</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-7xl font-black text-slate-900 tracking-tighter">42%</span>
                <ArrowRight className="text-[#1CB899] w-6 h-6 -rotate-45" />
              </div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Aumento en engagement</p>
            </motion.div>

            {/* Card 5 — Lanzamientos & Multi-formato (Horizontal) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="md:col-span-2 group bg-slate-50 rounded-[32px] border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-all duration-500 flex items-center gap-6"
            >
              <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center shrink-0">
                <Layers className="w-8 h-8 text-[#1CB899]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-1">Omnicanal</h3>
                <p className="text-slate-500 text-sm font-medium">Lanza en todas tus redes en segundos.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security Vault Section - Backup & Document Protection */}
      <section className="relative z-10 py-32 px-6 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50/30">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#1CB899]/5 blur-3xl"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[#7C3AED]/5 blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], rotate: [0, -30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(28,184,153,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(28,184,153,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="container mx-auto max-w-7xl relative">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-[#1CB899] font-black text-sm uppercase tracking-[0.25em] mb-4 block">
              Seguridad Garantizada
            </span>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900">
              Tus datos siempre <span className="text-[#1CB899]">protegidos</span>
            </h2>
          </motion.div>

          {/* Main Visual + Content Grid (invertido) */}
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            {/* Content (Left) */}
            <div className="space-y-8">
              {/* Main message */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white/70 backdrop-blur-xl border border-slate-200 rounded-[32px] p-8 md:p-10 shadow-xl shadow-slate-200/50"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-[#1CB899]/10 rounded-2xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#1CB899]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                    Toda tu documentación está resguardada
                    <br />
                    <span className="text-[#1CB899]">con backups periódicos</span>
                  </h3>
                </div>
                <p className="text-lg text-slate-500 font-medium leading-relaxed">
                  Cada archivo, video y documento de tus cursos se replica automáticamente en infraestructura descentralizada. Tu contenido permanece seguro, intacto y siempre disponible.
                </p>
              </motion.div>

              {/* Feature grid */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="grid grid-cols-2 gap-4"
              >
                {[
                  {
                    icon: (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    ),
                    title: "Backups Diarios",
                    desc: "Automáticos cada 24h",
                    color: "text-[#1CB899]",
                    bg: "bg-[#1CB899]/5",
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    ),
                    title: "Cifrado Extremo",
                    desc: "AES-256 en reposo",
                    color: "text-violet-500",
                    bg: "bg-violet-500/5",
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                    ),
                    title: "Redundancia",
                    desc: "3 copias geográficas",
                    color: "text-amber-500",
                    bg: "bg-amber-500/5",
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    ),
                    title: "Restauración",
                    desc: "Recuperación en segundos",
                    color: "text-blue-500",
                    bg: "bg-blue-500/5",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-200"
                  >
                    <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center ${item.color} mb-3`}>
                      {item.icon}
                    </div>
                    <h4 className="font-black text-sm text-slate-900">{item.title}</h4>
                    <p className="text-xs font-medium text-slate-400 mt-1">{item.desc}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Trust indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex items-center gap-3 text-xs font-bold text-slate-400"
              >
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white" />
                  ))}
                </div>
                <span>+2,500 mentores confían en nuestra infraestructura</span>
              </motion.div>
            </div>

            {/* Animated Vault Visual (Right) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative flex items-center justify-center h-[400px] md:h-[500px]"
            >
              {/* Outer rotating ring */}
              <motion.div
                className="absolute w-72 h-72 md:w-80 md:h-80 rounded-full border-2 border-[#1CB899]/20"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#1CB899] shadow-lg shadow-[#1CB899]/50" />
              </motion.div>

              {/* Middle rotating ring (opposite direction) */}
              <motion.div
                className="absolute w-56 h-56 md:w-64 md:h-64 rounded-full border-2 border-[#1CB899]/10 border-dashed"
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              >
                <motion.div
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#7C3AED]/60"
                />
              </motion.div>

              {/* Floating document icons orbiting */}
              {[
                { angle: 0, delay: 0, label: "PDF" },
                { angle: 72, delay: 0.5, label: "DOC" },
                { angle: 144, delay: 1, label: "VID" },
                { angle: 216, delay: 1.5, label: "PDF" },
                { angle: 288, delay: 2, label: "IMG" },
              ].map((doc, i) => (
                <motion.div
                  key={i}
                  className="absolute w-12 h-16 md:w-14 md:h-18 bg-white rounded-xl border border-slate-200 shadow-lg flex items-center justify-center text-[8px] font-black text-[#1CB899] uppercase tracking-wider"
                  animate={{
                    x: [0, 0, 0, 0, 0],
                    y: [0, -8, 0, 8, 0],
                  }}
                  transition={{
                    duration: 4,
                    delay: doc.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    transform: `rotate(${doc.angle}deg) translateX(130px) rotate(-${doc.angle}deg)`,
                  }}
                >
                  <div className="flex flex-col items-center">
                     <svg className="w-5 h-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span>{doc.label}</span>
                  </div>
                </motion.div>
              ))}

              {/* Center Vault / Shield */}
              <motion.div
                className="relative z-10 w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-[#1CB899] to-emerald-600 rounded-[32px] md:rounded-[40px] flex items-center justify-center shadow-2xl shadow-[#1CB899]/30"
                animate={{
                  boxShadow: [
                    "0 0 30px rgba(28,184,153,0.3)",
                    "0 0 60px rgba(28,184,153,0.5)",
                    "0 0 30px rgba(28,184,153,0.3)",
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg className="w-16 h-16 md:w-20 md:h-20 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>

                {/* Pulse ring */}
                <motion.div
                  className="absolute inset-0 rounded-[32px] md:rounded-[40px] border-2 border-white/30"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-[32px] md:rounded-[40px] border border-white/20"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                />
              </motion.div>

              {/* Status badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 whitespace-nowrap"
              >
                <motion.span
                  className="w-2 h-2 rounded-full bg-emerald-500 inline-block"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                Backup Activo • Tiempo Real
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Integrations Carousel */}
      <section className="relative z-10 py-32 px-6 overflow-hidden bg-slate-50/30">
        <style>{`
          @keyframes scrollLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .integrations-track {
            animation: scrollLeft 50s linear infinite;
          }
          .integrations-track:hover {
            animation-play-state: paused;
          }
        `}</style>

        <div className="container mx-auto max-w-7xl mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="text-[#1CB899] font-black text-sm uppercase tracking-[0.25em] mb-4 block">
              Integraciones
            </span>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900">
              Intégrate con tus <span className="text-[#1CB899]">herramientas favoritas</span>
            </h2>
            <p className="text-lg text-slate-400 font-medium mt-4 max-w-2xl mx-auto">
              Conecta tu escuela con prácticamente infinitas herramientas de marketing y afiliados para aumentar tus ventas.
            </p>
          </motion.div>
        </div>

        {/* Carousel Wrapper */}
        <div className="relative w-full">
          {/* Gradient fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-slate-50/30 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-slate-50/30 to-transparent z-10 pointer-events-none" />

          {/* Scrolling Track */}
          <div className="integrations-track flex gap-5 w-max">
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
              // Duplicated for seamless loop
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
                className="bg-white border border-slate-200 rounded-2xl px-6 py-4 flex items-center gap-3 flex-shrink-0 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(28,184,153,0.2)] hover:-translate-y-1 hover:scale-[1.04] hover:border-[#1CB899] cursor-default"
              >
                <img
                  className="w-7 h-7 flex-shrink-0"
                  src={`https://cdn.simpleicons.org/${item.icon}/${item.color}`}
                  alt={item.name}
                  loading="lazy"
                />
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="relative z-10 py-16 px-6 border-t border-slate-100 bg-white">
        <div className="container mx-auto max-w-xl text-center">
          {/* Logo */}
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <span className="text-xl font-black text-slate-800 tracking-tighter select-none">//</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-sm font-semibold text-slate-600 mb-8 uppercase tracking-wider">
            <Link href="/" className="hover:text-slate-900 transition-colors">Inicio</Link>
            <Link href="/courses" className="hover:text-slate-900 transition-colors">Cursos</Link>
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Mentores</Link>
            <Link href="/auth" className="hover:text-slate-900 transition-colors">Ingresar</Link>
            <a href="#footer" className="hover:text-slate-900 transition-colors">Contacto</a>
          </div>

          {/* Social Icons (Circular styled) */}
          <div className="flex justify-center gap-4 mb-8">
            <a href="https://wa.me/541157448819" target="_blank" rel="noopener noreferrer" title="WhatsApp" className="w-11 h-11 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-800 hover:text-emerald-500 hover:border-slate-300 transition-all shadow-sm">
              <IoLogoWhatsapp className="w-5 h-5" />
            </a>
            <a href="https://instagram.com/felizdeemprender" target="_blank" rel="noopener noreferrer" title="Instagram" className="w-11 h-11 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-800 hover:text-pink-500 hover:border-slate-300 transition-all shadow-sm">
              <IoLogoInstagram className="w-5 h-5" />
            </a>
            <a href="mailto:felizdeemprender@gmail.com" title="Email" className="w-11 h-11 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-800 hover:text-[#1CB899] hover:border-slate-300 transition-all shadow-sm">
              <IoMailOutline className="w-5 h-5" />
            </a>
            <a href="https://www.fastoria.com.ar" target="_blank" rel="noopener noreferrer" title="Sitio Web" className="w-11 h-11 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-800 hover:text-sky-500 hover:border-slate-300 transition-all shadow-sm">
              <IoGlobeOutline className="w-5 h-5" />
            </a>
          </div>

          {/* Subscription Form */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 w-full max-w-md mx-auto mb-10">
            <input
              type="email"
              placeholder="Tu correo electrónico"
              className="w-full h-11 px-5 rounded-full border border-slate-200 text-sm focus:outline-none focus:border-slate-400 bg-white text-center sm:text-left"
            />
            <button className="w-full sm:w-auto h-11 px-8 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors whitespace-nowrap">
              Suscribirse
            </button>
          </div>

          {/* Copyright */}
          <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-2 text-xs font-semibold text-slate-400">
            <p>© 2026 FASTORIA. Todos los derechos reservados.</p>
            <a href="https://www.felizdeemprender.com.ar" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">
              www.felizdeemprender.com.ar
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
