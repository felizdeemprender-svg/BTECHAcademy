'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layout, HeartHandshake, CreditCard, Users, Bot, 
  Sparkles, CheckCircle2, ArrowRight, Play, Check, Zap, 
  ChevronRight, BarChart2, ShieldCheck, Activity
} from 'lucide-react';

export const InteractiveCommandCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'builder' | 'mentoria' | 'evo'>('dashboard');
  const [liveMrr, setLiveMrr] = useState(1485000);
  const [activeMembers, setActiveMembers] = useState(342);
  const [isSimulatingSale, setIsSimulatingSale] = useState(false);

  const triggerSaleSimulation = () => {
    setIsSimulatingSale(true);
    setLiveMrr(prev => prev + 45000);
    setActiveMembers(prev => prev + 1);
    setTimeout(() => setIsSimulatingSale(false), 2000);
  };

  return (
    <div className="relative mx-auto max-w-6xl rounded-[32px] border border-white/15 bg-[#0B0F19]/90 p-3 md:p-6 shadow-[0_0_80px_rgba(28,184,153,0.15)] backdrop-blur-2xl">
      {/* Background Neon Mesh */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-3/4 h-48 bg-gradient-to-r from-[#1CB899]/20 via-violet-600/20 to-emerald-500/20 blur-[100px] -z-10" />

      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="text-[#1CB899] font-bold">fastoria-os</span>
            <span>/</span>
            <span className="text-white">live-cockpit</span>
          </div>
        </div>

        {/* Live Metrics Pill & Simulator */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-400">MRR:</span>
            <span className="text-white font-bold">ARS ${liveMrr.toLocaleString('es-AR')}</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={triggerSaleSimulation}
            className="flex items-center gap-1.5 bg-[#1CB899] hover:bg-[#18a287] text-[#090D16] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-[0_0_15px_rgba(28,184,153,0.4)]"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Simular Venta (+ARS $45k)</span>
          </motion.button>
        </div>
      </div>

      {/* Tabs Controls */}
      <div className="flex items-center gap-2 pt-4 pb-5 overflow-x-auto no-scrollbar">
        {[
          { id: 'dashboard', label: '1. Cockpit General', icon: BarChart2 },
          { id: 'builder', label: '2. Creador de Cursos', icon: Layout },
          { id: 'mentoria', label: '3. Procesos 1 a 1', icon: HeartHandshake },
          { id: 'evo', label: '4. Evo AI Terminal', icon: Bot },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-white/15 text-white border border-white/20 shadow-inner'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-[#1CB899]' : 'text-slate-400'}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Screen Content */}
      <div className="relative min-h-[420px] rounded-2xl border border-white/10 bg-[#070A12] p-5 md:p-6 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {[
                  { label: 'Alumnos Activos', val: activeMembers.toString(), change: '+12% este mes', color: 'text-emerald-400' },
                  { label: 'Tasa de Finalización', val: '92.4%', change: '3.4x sobre la media', color: 'text-sky-400' },
                  { label: 'Cobros Directos', val: '100% en cuenta', change: 'Sin intermediarios', color: 'text-purple-400' },
                  { label: 'Créditos IA Evo', val: '240 / 300', change: 'Activo y aprendiendo', color: 'text-amber-400' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                    <div className="text-[11px] font-semibold text-slate-400">{stat.label}</div>
                    <div className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.val}</div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">{stat.change}</div>
                  </div>
                ))}
              </div>

              {/* Live Program Feed */}
              <div className="border border-white/10 rounded-xl bg-white/[0.02] p-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#1CB899]" />
                    <span>Programas Activos en tu Escuela</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    Sincronización en vivo
                  </span>
                </div>

                <div className="divide-y divide-white/5 mt-2">
                  {[
                    { name: 'Master en Inteligencia Artificial Aplicada', type: 'Programa Híbrido', students: '184 Alumnos', rev: 'ARS $920.000', status: 'En Vivo' },
                    { name: 'Mentoría Ejecutiva High-Ticket (1 a 1)', type: 'Acompañamiento VIP', students: '18 Alumnos', rev: 'ARS $450.000', status: 'Activo' },
                    { name: 'Prompt Engineering & Automatizaciones', type: 'Curso Online', students: '140 Alumnos', rev: 'ARS $115.000', status: 'Grabado' },
                  ].map((item, i) => (
                    <div key={i} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-200">{item.name}</div>
                        <div className="text-[11px] text-slate-500">{item.type}</div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-slate-400 hidden sm:inline-block">{item.students}</span>
                        <span className="font-mono text-emerald-400 font-bold">{item.rev}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white hidden md:inline-block">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: BUILDER */}
          {activeTab === 'builder' && (
            <motion.div
              key="builder"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid lg:grid-cols-12 gap-6 items-center"
            >
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                  <Layout className="w-3.5 h-3.5" />
                  Módulo de Creación Visual
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white">
                  Creá programas completos en minutos con asistencia inteligente.
                </h3>
                <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-normal">
                  Sube tus videos, adjunta documentos descargables y configura cuestionarios autocalificables o deja que Evo te arme la estructura temática en 3 segundos.
                </p>

                <div className="space-y-2 pt-2">
                  {['Subida de video protegida con streaming adaptativo', 'Generador automático de quizzes con IA', 'Páginas de venta con checkout directo'].map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-[#1CB899]" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/[0.04] border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estructura del Curso</div>
                <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-white">
                    <span>Módulo 1: Fundamentos & Estrategia</span>
                    <span className="text-[#1CB899]">3 Lecciones</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pl-2 border-l border-white/20 space-y-1">
                    <div>1.1 Visión del Negocio (Video • 14 min)</div>
                    <div>1.2 Plantilla de Trabajo (PDF descargable)</div>
                    <div>1.3 Evaluación diagnóstica (Quiz IA)</div>
                  </div>
                </div>
                <div className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Módulo 2: Ejecución & Escala</span>
                  <span className="text-slate-500">4 Lecciones</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: MENTORÍA */}
          {activeTab === 'mentoria' && (
            <motion.div
              key="mentoria"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid lg:grid-cols-12 gap-6 items-center"
            >
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  Acompañamiento VIP
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white">
                  Gestiona procesos 1 a 1 como un profesional de clase mundial.
                </h3>
                <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-normal">
                  Control de sesiones, asignación de tareas individuales, seguimiento de objetivos y bitácora compartida con cada cliente.
                </p>
              </div>

              <div className="lg:col-span-6 bg-white/[0.04] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs">
                      LM
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Laura Martínez</div>
                      <div className="text-[10px] text-slate-400">Mentoría de Dirección Ejecutiva</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    En progreso
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-4 text-xs">
                  <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500">Sesiones</span>
                    <div className="font-bold text-white mt-0.5">4 de 6 completadas</div>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500">Próximo Encuentro</span>
                    <div className="font-bold text-emerald-400 mt-0.5">Jueves 10:00 hs</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: EVO */}
          {activeTab === 'evo' && (
            <motion.div
              key="evo"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Bot className="w-4 h-4 text-[#1CB899]" />
                  <span>Evo Co-Pilot • Generación Operativa en Vivo</span>
                </div>
                <span className="text-[10px] font-mono text-[#1CB899] bg-[#1CB899]/10 px-2.5 py-0.5 rounded-full border border-[#1CB899]/20">
                  Modelo Activo: Gemini 2.5 Pro
                </span>
              </div>

              <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3 font-mono text-xs">
                <div className="text-slate-400 flex items-center gap-2">
                  <span className="text-[#1CB899]">$</span>
                  <span>evo.generateCourse(&quot;Master en Ventas B2B High Ticket&quot;)</span>
                </div>
                <div className="text-slate-300 pl-4 border-l-2 border-[#1CB899] space-y-1 text-[11px]">
                  <p className="text-emerald-400">✓ Estructura de 5 módulos generada</p>
                  <p className="text-emerald-400">✓ 8 ejercicios prácticos y rúbricas listas</p>
                  <p className="text-emerald-400">✓ Copy de landing page optimizado para conversión</p>
                  <p className="text-white mt-2 font-sans font-semibold">¿Deseas activar el checkout directo con MercadoPago / Stripe?</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
