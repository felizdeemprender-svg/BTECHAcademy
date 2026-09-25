'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Reveal, staggerContainer, staggerItem, EASE } from '@/components/ui/animations';
import { Layout, ShoppingBag, Send, HeartHandshake, TrendingUp } from 'lucide-react';

export function FastoriaPropuesta() {
  return (
      <section id="propuesta" className="py-24 px-6 bg-white relative z-10 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-3 block">
              La Propuesta
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Desde lo que sabés hasta un negocio que crece.
            </h2>
            <p className="mt-3 text-slate-500 text-base font-medium">
              Una plataforma integral que cubre cada etapa de tu proceso.
            </p>
          </Reveal>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-5 gap-4 relative"
          >
            {[
              {
                step: '01',
                title: 'CREÁ',
                desc: 'Cursos, programas y productos digitales.',
                detail: 'Sube videos, documentos, cuestionarios y contenido estructurado.',
                icon: Layout,
                badgeColor: 'border-blue-500 text-blue-500 bg-blue-50/30',
                iconColor: 'text-blue-600 bg-blue-50 border-blue-100'
              },
              {
                step: '02',
                title: 'VENDÉ',
                desc: 'Landings y medios de pago conectados a tu cuenta.',
                detail: 'Páginas optimizadas para conversión con checkout directo.',
                icon: ShoppingBag,
                badgeColor: 'border-emerald-500 text-emerald-500 bg-emerald-50/30',
                iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100'
              },
              {
                step: '03',
                title: 'ENTREGÁ',
                desc: 'Contenido, tareas y experiencia del alumno.',
                detail: 'Campus fluido donde tus alumnos aprenden y entregan actividades.',
                icon: Send,
                badgeColor: 'border-violet-500 text-violet-500 bg-violet-50/30',
                iconColor: 'text-violet-600 bg-violet-50 border-violet-100'
              },
              {
                step: '04',
                title: 'ACOMPAÑÁ',
                desc: 'Mentorías, sesiones y procesos individuales.',
                detail: 'Seguimiento personalizado de objetivos, avances y encuentros.',
                icon: HeartHandshake,
                badgeColor: 'border-amber-500 text-amber-500 bg-amber-50/30',
                iconColor: 'text-amber-600 bg-amber-50 border-amber-100'
              },
              {
                step: '05',
                title: 'CRECÉ',
                desc: 'IA y herramientas comerciales para potenciar tu negocio.',
                detail: 'Evo IA te asiste con copys, campañas y optimización continua.',
                icon: TrendingUp,
                badgeColor: 'border-[#1CB899] text-[#1CB899] bg-[#1CB899]/5',
                iconColor: 'text-[#138d74] bg-emerald-50 border-emerald-200'
              },
            ].map((node, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-[#1CB899] transition-shadow flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <motion.div
                      whileHover={{ rotate: -6, scale: 1.1 }}
                      className={`w-11 h-11 rounded-xl ${node.iconColor} border flex items-center justify-center shadow-2xs transition-colors`}
                    >
                      <node.icon className="w-5 h-5" strokeWidth={2.2} />
                    </motion.div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${node.badgeColor}`}>
                      {node.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-black text-slate-400 group-hover:text-[#1CB899] transition-colors">{node.step}.</span>
                    <h3 className="font-black text-lg text-slate-900">{node.title}</h3>
                  </div>
                  <p className="text-sm font-bold text-slate-700 leading-snug mb-3">{node.desc}</p>
                </div>
                <p className="text-sm text-slate-500 font-medium pt-3 border-t border-slate-100">{node.detail}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
  );
}
