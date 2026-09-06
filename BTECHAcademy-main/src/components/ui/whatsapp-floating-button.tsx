'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoLogoWhatsapp } from 'react-icons/io5';
import { X } from 'lucide-react';

interface WhatsAppFloatingButtonProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

export function WhatsAppFloatingButton({
  phoneNumber = '5491176411666',
  defaultMessage = '¡Hola Fastoria! Quisiera hacer una consulta sobre la plataforma y los planes.'
}: WhatsAppFloatingButtonProps) {
  const [showTooltip, setShowTooltip] = useState(true);

  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(defaultMessage);
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3 font-sans">
      {/* Tooltip / Speech Bubble */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25, delay: 1 }}
            className="hidden sm:flex items-center gap-2.5 bg-white/95 backdrop-blur-md text-slate-800 px-3.5 py-2.5 rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/80 text-xs font-semibold max-w-[210px] relative"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>¿Tenés dudas? Chateá con nuestro asistente</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Cerrar mensaje"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#25D366] to-[#128C7E] text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 relative group transition-all"
        aria-label="Contactar por WhatsApp"
      >
        <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-30 animate-ping pointer-events-none" />
        <IoLogoWhatsapp className="w-7 h-7 transition-transform group-hover:rotate-6" />
        
        {/* Active status indicator */}
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
      </motion.a>
    </div>
  );
}
