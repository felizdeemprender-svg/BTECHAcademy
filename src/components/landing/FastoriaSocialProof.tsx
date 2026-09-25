'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Reveal, staggerContainer, staggerItem } from '@/components/ui/animations';

export function FastoriaSocialProof() {
  return (
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
                name: "Federico D´Odorico",
                role: "Consultora de Negocios",
                metric: "Ahorró 8 hs semanales",
              },
              {
                quote: "El sistema de seguimiento individual me permitió vender mentorías a un ticket mucho más alto con total profesionalismo.",
                name: "Agustina Stein",
                role: "Mentora Ejecutiva",
                metric: "+120 alumnos activos",
              },
              {
                quote: "Con Evo armo la estructura de las clases y los textos de venta en minutos. La integración con cobros directos es impecable.",
                name: "Milagros Falduto",
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
  );
}
