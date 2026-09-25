'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Reveal, EASE } from '@/components/ui/animations';
import { Check, CheckCircle2 } from 'lucide-react';

export function FastoriaDiferencial() {
  return (
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

            <Reveal delay={0.15} y={30} className="lg:col-span-6">
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white rounded-3xl border border-slate-200 p-7 md:p-8 shadow-xl relative"
              >
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-xl font-black text-slate-900">Programa de Liderazgo Ejecutivo</h3>
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
  );
}
