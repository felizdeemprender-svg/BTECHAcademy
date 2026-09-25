'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reveal, EASE } from '@/components/ui/animations';

export function FastoriaMarca() {
  const [activeBrandTheme, setActiveBrandTheme] = useState<'teal' | 'violet' | 'amber'>('teal');

  return (
      <section className="py-24 px-6 bg-white relative z-10 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-3 block">
              Personalización
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Es Fastoria. Pero se siente tuyo.
            </h2>
            <p className="mt-4 text-base md:text-lg text-slate-600 font-normal">
              Tu logo. Tus colores. Tus tipografías. Tus landings. Tu perfil.
              <br />
              <strong className="text-slate-900 font-bold">Tu negocio sigue siendo tu negocio.</strong>
            </p>
          </Reveal>

          <Reveal delay={0.1} y={30} className="bg-slate-50 rounded-3xl border border-slate-200 p-6 md:p-10 shadow-sm max-w-4xl mx-auto">
            <div className="flex justify-center gap-3 mb-8">
              {[
                { key: 'teal', label: 'Marca: Studio Wellness', color: 'bg-emerald-600' },
                { key: 'violet', label: 'Marca: Tech Mentoring', color: 'bg-violet-600' },
                { key: 'amber', label: 'Marca: Business Coach', color: 'bg-amber-600' },
              ].map((theme) => (
                <motion.button
                  key={theme.key}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveBrandTheme(theme.key as any)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2 border ${
                    activeBrandTheme === theme.key
                      ? 'bg-white border-slate-900 shadow-md text-slate-900'
                      : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <motion.span
                    animate={activeBrandTheme === theme.key ? { scale: [1, 1.35, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    className={`w-3 h-3 rounded-full ${theme.color}`}
                  />
                  {theme.label}
                </motion.button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md transition-all">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeBrandTheme}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs ${
                        activeBrandTheme === 'teal' ? 'bg-emerald-600' : activeBrandTheme === 'violet' ? 'bg-violet-600' : 'bg-amber-600'
                      }`}>
                        {activeBrandTheme === 'teal' ? 'W' : activeBrandTheme === 'violet' ? 'T' : 'B'}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">
                          {activeBrandTheme === 'teal' ? 'Wellness Academy' : activeBrandTheme === 'violet' ? 'Tech Mentoring Hub' : 'Executive Business'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">Campus personalizado</div>
                      </div>
                    </div>
                    <div className={`text-xs font-bold px-3 py-1 rounded-full ${
                      activeBrandTheme === 'teal' ? 'bg-emerald-50 text-emerald-700' : activeBrandTheme === 'violet' ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      Identidad Propia Activa
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Colores de Marca</div>
                      <div className="text-xs font-bold text-slate-800 mt-1">Paleta Adaptable</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Tipografías</div>
                      <div className="text-xs font-bold text-slate-800 mt-1">Personalizadas</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Páginas de Venta</div>
                      <div className="text-xs font-bold text-slate-800 mt-1">Tu Estilo Visual</div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </section>
  );
}
