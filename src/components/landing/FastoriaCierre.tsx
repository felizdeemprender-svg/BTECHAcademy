'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Reveal, staggerContainer, staggerItem, Float } from '@/components/ui/animations';
import { ArrowRight } from 'lucide-react';

export function FastoriaCierre() {
  return (
      <section className="py-28 px-6 bg-gradient-to-b from-[#0F172A] to-slate-950 text-white relative z-10 text-center overflow-hidden">
        <Float
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1CB899]/10 rounded-full blur-3xl pointer-events-none"
          duration={8}
          distance={30}
        />

        <div className="max-w-4xl mx-auto relative z-10">
          <Reveal>
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-4 block">
              Es momento de dar el paso
            </span>
            <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
              Tu conocimiento ya tiene valor.
            </h2>
            <p className="mt-4 text-lg sm:text-2xl text-slate-300 font-medium">
              Fastoria te ayuda a convertirlo en un negocio.
            </p>
          </Reveal>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="my-8 flex items-center justify-center gap-3 text-xs sm:text-sm font-black uppercase tracking-widest text-[#1CB899]"
          >
            {['Creá', 'Vendé', 'Acompañá', 'Crecé'].map((step, i, arr) => (
              <motion.span key={step} variants={staggerItem} className="flex items-center gap-3">
                {step}
                {i < arr.length - 1 && <span className="text-slate-500">•</span>}
              </motion.span>
            ))}
          </motion.div>

          <Reveal delay={0.2}>
            <Link href="/auth">
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="animate-glow-pulse px-10 py-5 rounded-2xl bg-[#1CB899] hover:bg-[#18a287] text-[#0F172A] font-black text-base shadow-2xl shadow-[#1CB899]/30 inline-flex items-center gap-2 group transition-colors"
              >
                Empezar con Fastoria
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </Link>
          </Reveal>
        </div>
      </section>
  );
}
