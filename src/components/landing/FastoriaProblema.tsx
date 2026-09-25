'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Reveal, staggerContainer, staggerItem, Float } from '@/components/ui/animations';
import { Layout, BarChart3, CreditCard, Bot, Shield } from 'lucide-react';

export function FastoriaProblema() {
  return (
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
  );
}
