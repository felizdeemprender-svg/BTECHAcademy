'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Reveal, staggerContainer, staggerItem, EASE } from '@/components/ui/animations';
import { GraduationCap, UserCheck, Target, Calendar, ShoppingBag } from 'lucide-react';

export function FastoriaIdentificacion() {
  return (
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

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45, duration: 0.5, ease: EASE }}
                whileHover={{ scale: 1.03, y: -2 }}
                className="bg-[#0F172A] text-white p-6 rounded-2xl border border-slate-800 shadow-xl text-center w-full lg:w-64 shrink-0"
              >
                <div className="text-lg font-black tracking-tight leading-snug">
                  Centraliza tu negocio en <span className="text-[#1CB899]">FASTORIA</span>
                </div>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>
  );
}
