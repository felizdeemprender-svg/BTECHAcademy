'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const RoiCalculator: React.FC = () => {
  const [students, setStudents] = useState<number>(80);
  const [ticketPrice, setTicketPrice] = useState<number>(35000); // ARS

  const monthlyRevenue = students * ticketPrice;
  const annualRevenue = monthlyRevenue * 12;

  // Plan sugerido
  let suggestedPlan = 'INICIAL';
  let planPrice = 25000;

  if (students > 500) {
    suggestedPlan = 'FULL';
    planPrice = 150000;
  } else if (students > 100) {
    suggestedPlan = 'EXPANSIÓN (Recomendado)';
    planPrice = 50000;
  }

  const profitMargin = Math.round(((monthlyRevenue - planPrice) / monthlyRevenue) * 100);

  return (
    <div className="relative mx-auto max-w-4xl rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-6 md:p-10 backdrop-blur-2xl text-white shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#1CB899]/20 text-[#1CB899] flex items-center justify-center border border-[#1CB899]/30">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight">Simulador de Ingresos y ROI</h3>
          <p className="text-xs text-slate-400 font-medium">Calculá cuánto podés facturar con tu conocimiento en Fastoria</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* Sliders */}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-slate-300">Cantidad de Alumnos / Clientes:</span>
              <span className="text-[#1CB899] font-mono text-sm">{students} alumnos</span>
            </div>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={students}
              onChange={(e) => setStudents(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#1CB899]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-slate-300">Precio Promedio de tu Producto / Mes:</span>
              <span className="text-[#1CB899] font-mono text-sm">ARS ${ticketPrice.toLocaleString('es-AR')}</span>
            </div>
            <input
              type="range"
              min="5000"
              max="200000"
              step="5000"
              value={ticketPrice}
              onChange={(e) => setTicketPrice(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#1CB899]"
            />
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Plan Fastoria sugerido:</span>
              <span className="font-bold text-white">{suggestedPlan}</span>
            </div>
            <div className="flex justify-between">
              <span>Costo plataforma:</span>
              <span className="font-mono text-slate-300">ARS ${planPrice.toLocaleString('es-AR')}/mes</span>
            </div>
          </div>
        </div>

        {/* Output Card */}
        <div className="bg-gradient-to-br from-[#0F172A] to-[#070A12] p-6 md:p-8 rounded-2xl border border-white/10 text-center relative overflow-hidden">
          <div className="text-[11px] font-black uppercase tracking-widest text-[#1CB899] mb-1">
            INGRESOS MENSUALES ESTIMADOS
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
            ARS ${monthlyRevenue.toLocaleString('es-AR')}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-medium">
            Equivalente a <strong className="text-slate-200">ARS ${(annualRevenue).toLocaleString('es-AR')}</strong> al año
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-around">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Margen de Ganancia</div>
              <div className="text-xl font-black text-emerald-400">{profitMargin}%</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Cobro Directo</div>
              <div className="text-xl font-black text-[#1CB899]">100% Tuyo</div>
            </div>
          </div>

          <Link href="/auth">
            <button className="mt-6 w-full py-3.5 rounded-xl bg-[#1CB899] hover:bg-[#18a287] text-[#090D16] font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1CB899]/20">
              <span>Empezar a Escalar con Fastoria</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};
