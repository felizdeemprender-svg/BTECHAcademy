'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Reveal, staggerContainer, staggerItem } from '@/components/ui/animations';
import { Check, Layout, Users, CreditCard, Sparkles } from 'lucide-react';

export function FastoriaFeatures() {
  return (
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
  );
}
