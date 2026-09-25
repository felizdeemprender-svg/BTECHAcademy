'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Reveal } from '@/components/ui/animations';
import { Check } from 'lucide-react';

export function FastoriaEnterprise() {
  return (
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
            <a href="https://wa.me/5491176411666?text=Hola%20quiero%20conocer%20Fastoria%20Empresas" target="_blank" rel="noopener noreferrer">
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
  );
}
