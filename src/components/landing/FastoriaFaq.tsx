'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Reveal } from '@/components/ui/animations';

export function FastoriaFaq() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
      <section id="faq" className="py-24 px-6 bg-[#F8FAFC] relative z-10 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-3 block">
              Preguntas Frecuentes
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              ¿Tenés dudas? Te las respondemos.
            </h2>
          </Reveal>

          <div className="space-y-3">
            {[
              {
                q: "¿Necesito conocimientos técnicos?",
                a: "No. Fastoria está diseñada con una interfaz visual intuitiva para que puedas crear contenidos, configurar tus cobros y gestionar alumnos sin escribir una sola línea de código."
              },
              {
                q: "¿Puedo vender algo además de cursos?",
                a: "Sí. Podés ofrecer mentorías 1 a 1, programas híbridos, sesiones individuales de consultoría, productos digitales descargables (PDFs, plantillas) o paquetes combinados."
              },
              {
                q: "¿Dónde recibo el dinero de mis ventas?",
                a: "El dinero se acredita directamente en tu cuenta de cobros vinculada (como MercadoPago o pasarelas habilitadas). Vos tenés el control de tus fondos."
              },
              {
                q: "¿Puedo usar mi propia marca?",
                a: "Totalmente. Podés personalizar el logo, la paleta de colores, las tipografías y el estilo de tus páginas para que la experiencia responda 100% a tu identidad."
              },
              {
                q: "¿Qué es un crédito de IA?",
                a: "Un crédito de IA te permite utilizar las funciones inteligentes de Evo para generar copys, estructurar temarios de cursos, redactar campañas y crear recursos visuales."
              },
              {
                q: "¿Fastoria sirve para empresas?",
                a: "Sí. Contamos con Fastoria Empresas, pensado especialmente para organizaciones que requieren capacitación interna, seguimiento de colaboradores y entornos cerrados."
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-base font-black text-slate-900">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${
                      openFaqIndex === i ? 'rotate-180 text-[#1CB899]' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaqIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-6 pb-6 text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-50 pt-2"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>
  );
}
