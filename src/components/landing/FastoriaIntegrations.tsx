'use client';

import React from 'react';

export function FastoriaIntegrations() {
  return (
      <section id="integraciones" className="relative z-10 py-24 px-6 overflow-hidden bg-slate-50/50 border-t border-slate-200/60">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes scrollRight {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
          .integrations-track {
            animation: scrollRight 22s linear infinite;
          }
          .integrations-track:hover {
            animation-play-state: paused;
          }
        ` }} />

        <div className="container mx-auto max-w-6xl mb-12 text-center">
          <span className="text-[#1CB899] font-black text-xs uppercase tracking-[0.25em] mb-2 block">
            Ecosistema Conectado
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">
            Intégrate con tus <span className="text-[#1CB899]">herramientas favoritas</span>
          </h2>
          <p className="text-sm md:text-base text-slate-500 font-medium mt-3 max-w-2xl mx-auto">
            Conectá tu academia con herramientas de analítica, medios de pago, video y redes sociales.
          </p>
        </div>

        {/* Carousel Wrapper */}
        <div className="relative w-full">
          <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

          <div className="integrations-track flex gap-4 w-max">
            {[
              { name: "Gemini AI", icon: "gemini", color: "1CB899" },
              { name: "DeepSeek", icon: "deepseek", color: "4F46E5" },
              { name: "Firebase", icon: "firebase", color: "FFCA28" },
              { name: "MercadoPago", icon: "mercadopago", color: "009EE3" },
              { name: "Google Drive", icon: "googledrive", color: "34A853" },
              { name: "YouTube", icon: "youtube", color: "FF0000" },
              { name: "TikTok", icon: "tiktok", color: "000000" },
              { name: "PayPal", icon: "paypal", color: "003087" },
              { name: "WhatsApp API", icon: "whatsapp", color: "25D366" },
              { name: "LinkedIn", icon: "linkedin", color: "0A66C2" },
              { name: "Google Analytics", icon: "googleanalytics", color: "E37400" },
              { name: "Meta Ads", icon: "meta", color: "1877F2" },
              { name: "Instagram", icon: "instagram", color: "E4405F" },
              { name: "GitHub", icon: "github", color: "181717" },
              // Duplicado para loop sin saltos
              { name: "Gemini AI", icon: "gemini", color: "1CB899" },
              { name: "DeepSeek", icon: "deepseek", color: "4F46E5" },
              { name: "Firebase", icon: "firebase", color: "FFCA28" },
              { name: "MercadoPago", icon: "mercadopago", color: "009EE3" },
              { name: "Google Drive", icon: "googledrive", color: "34A853" },
              { name: "YouTube", icon: "youtube", color: "FF0000" },
              { name: "TikTok", icon: "tiktok", color: "000000" },
              { name: "PayPal", icon: "paypal", color: "003087" },
              { name: "WhatsApp API", icon: "whatsapp", color: "25D366" },
              { name: "LinkedIn", icon: "linkedin", color: "0A66C2" },
              { name: "Google Analytics", icon: "googleanalytics", color: "E37400" },
              { name: "Meta Ads", icon: "meta", color: "1877F2" },
              { name: "Instagram", icon: "instagram", color: "E4405F" },
              { name: "GitHub", icon: "github", color: "181717" },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm hover:shadow-md hover:border-[#1CB899] transition-all cursor-default"
              >
                <img
                  className="w-6 h-6 flex-shrink-0"
                  src={`https://cdn.simpleicons.org/${item.icon}/${item.color}`}
                  alt={item.name}
                  loading="lazy"
                />
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
  );
}
