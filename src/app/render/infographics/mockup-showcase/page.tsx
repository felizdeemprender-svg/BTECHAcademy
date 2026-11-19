'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Target, Gift, Compass, Check, Calendar, Clock, MessageCircle } from 'lucide-react';

export default function MockupShowcasePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #fbf7f2 0%, #f5ece2 50%, #ebd7c3 100%)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
      className="select-none"
    >
      {/* Background Graphic Lines (Abstract Financial / Growth texture) */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 900,
          height: 1000,
          opacity: 0.12,
          pointerEvents: 'none',
        }}
        viewBox="0 0 900 1000"
        fill="none"
      >
        <path d="M50 800 C 250 650, 450 750, 650 400 S 850 200, 900 150" stroke="#8a4b26" strokeWidth="6" strokeDasharray="12 12" />
        <path d="M50 850 C 300 750, 500 800, 700 500 S 850 350, 900 300" stroke="#8a4b26" strokeWidth="4" />
        <circle cx="650" cy="400" r="16" fill="#8a4b26" />
        <circle cx="850" cy="200" r="20" fill="#8a4b26" />
        <line x1="100" y1="200" x2="100" y2="850" stroke="#8a4b26" strokeWidth="1" strokeDasharray="6 6" />
        <line x1="300" y1="200" x2="300" y2="850" stroke="#8a4b26" strokeWidth="1" strokeDasharray="6 6" />
        <line x1="500" y1="200" x2="500" y2="850" stroke="#8a4b26" strokeWidth="1" strokeDasharray="6 6" />
        <line x1="700" y1="200" x2="700" y2="850" stroke="#8a4b26" strokeWidth="1" strokeDasharray="6 6" />
      </svg>

      {/* TOP KICKER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: 140,
          left: 90,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#8c593b',
        }}
      >
        <span>•</span>
        <span>FELIZ DE EMPRENDER</span>
        <span>•</span>
        <span>ASESORÍA ESTRATÉGICA</span>
      </motion.div>

      {/* MAIN HOOK HEADLINE (With highlighted Badge) */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          top: 200,
          left: 90,
          width: 900,
          fontSize: 66,
          fontWeight: 900,
          lineHeight: 1.15,
          color: '#211915',
          letterSpacing: '-0.02em',
        }}
      >
        ¿Tenés un negocio pero no tenés{' '}
        <motion.span
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6, type: 'spring', stiffness: 200 }}
          style={{
            display: 'inline-block',
            backgroundColor: '#d8532a',
            color: '#ffffff',
            padding: '2px 24px',
            borderRadius: 22,
            boxShadow: '0 8px 24px rgba(216, 83, 42, 0.3)',
          }}
        >
          tiempo
        </motion.span>{' '}
        de ver cómo ordenarlo?
      </motion.div>

      {/* 3D SMARTPHONE MOCKUP (Rotated in perspective) */}
      <motion.div
        initial={{ x: 200, opacity: 0, rotateY: -25 }}
        animate={{ x: 0, opacity: 1, rotateY: -16 }}
        transition={{ duration: 1.0, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          top: 590,
          right: -40,
          width: 580,
          height: 1040,
          perspective: 1400,
          transformStyle: 'preserve-3d',
          transform: 'rotateY(-16deg) rotateX(6deg) rotateZ(2deg)',
        }}
      >
        {/* Device Outer Chassis */}
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#1c1b1f',
            borderRadius: 64,
            padding: 16,
            boxShadow: '0 45px 90px rgba(70, 40, 20, 0.32), 0 15px 30px rgba(0,0,0,0.18)',
            border: '6px solid #3d3b42',
          }}
        >
          {/* Device Screen */}
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#ffffff',
              borderRadius: 50,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'inset 0 0 12px rgba(0,0,0,0.06)',
            }}
          >
            {/* Phone Notch */}
            <div style={{ height: 38, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ width: 130, height: 20, backgroundColor: '#1c1b1f', borderRadius: 12 }} />
            </div>

            {/* Inner App UI: Booking Calendar */}
            <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#fbeee7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d8532a' }}>
                  <Calendar size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1f1a17' }}>Asesoría 1 a 1</div>
                  <div style={{ fontSize: 14, color: '#887d77' }}>40 min • Videollamada</div>
                </div>
              </div>

              {/* Month selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#2d2622' }}>Noviembre 2026</span>
                <span style={{ fontSize: 13, color: '#d8532a', fontWeight: 600 }}>Zona Horaria AR</span>
              </div>

              {/* Calendar Grid Mockup */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, textAlign: 'center', marginTop: 6 }}>
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                  <div key={i} style={{ fontSize: 12, fontWeight: 700, color: '#a0948d' }}>{d}</div>
                ))}
                {[...Array(14)].map((_, i) => (
                  <div key={i} style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#bbb' }}>{i + 1}</div>
                ))}
                {/* Active selectable days */}
                {[15, 16, 17, 18].map((day) => (
                  <div key={day} style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: '#2d2622', backgroundColor: '#f7f4f1', borderRadius: 10 }}>{day}</div>
                ))}
                {/* Selected Day */}
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.2, type: 'spring' }}
                  style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#ffffff', backgroundColor: '#d8532a', borderRadius: 10, boxShadow: '0 4px 12px rgba(216, 83, 42, 0.4)' }}
                >
                  19
                </motion.div>
                {[20, 21].map((day) => (
                  <div key={day} style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: '#2d2622', backgroundColor: '#f7f4f1', borderRadius: 10 }}>{day}</div>
                ))}
              </div>

              {/* Time Slots */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#685e58', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Horarios Disponibles
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <motion.div
                    initial={{ backgroundColor: '#ffffff' }}
                    animate={{ backgroundColor: '#d8532a', color: '#ffffff' }}
                    transition={{ delay: 1.5, duration: 0.4 }}
                    style={{ padding: '14px 16px', borderRadius: 12, border: '1.5px solid #d8532a', textAlign: 'center', fontSize: 16, fontWeight: 800, color: '#d8532a' }}
                  >
                    10:30 hs
                  </motion.div>
                  <div style={{ padding: '14px 16px', borderRadius: 12, border: '1.5px solid #ebdcd5', textAlign: 'center', fontSize: 16, fontWeight: 600, color: '#38312d', backgroundColor: '#ffffff' }}>
                    11:30 hs
                  </div>
                  <div style={{ padding: '14px 16px', borderRadius: 12, border: '1.5px solid #ebdcd5', textAlign: 'center', fontSize: 16, fontWeight: 600, color: '#38312d', backgroundColor: '#ffffff' }}>
                    15:00 hs
                  </div>
                  <div style={{ padding: '14px 16px', borderRadius: 12, border: '1.5px solid #ebdcd5', textAlign: 'center', fontSize: 16, fontWeight: 600, color: '#38312d', backgroundColor: '#ffffff' }}>
                    16:30 hs
                  </div>
                </div>
              </div>

              {/* Confirmation pill */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8, duration: 0.5 }}
                style={{
                  marginTop: 10,
                  padding: '12px 16px',
                  backgroundColor: '#f1f8f3',
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: '1px solid #c9e8d2',
                }}
              >
                <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: '#2b9348', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <Check size={16} strokeWidth={3} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e5f32' }}>Link de Meet generado automáticamente</div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* FLOATING GLASSMORPHISM SOLUTION CARD */}
      <motion.div
        initial={{ x: -140, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          top: 660,
          left: 90,
          width: 590,
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(28px)',
          borderRadius: 44,
          padding: '44px 40px',
          border: '2px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 30px 70px rgba(80, 50, 30, 0.16), 0 10px 25px rgba(0,0,0,0.06)',
          zIndex: 10,
        }}
      >
        {/* Badge: LA SOLUCIÓN */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#1f1a17',
            color: '#ffffff',
            padding: '6px 18px',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: '#d8532a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={12} strokeWidth={3} color="#ffffff" />
          </div>
          <span>LA SOLUCIÓN</span>
        </div>

        {/* Title */}
        <div style={{ fontSize: 36, fontWeight: 900, color: '#1f1a17', lineHeight: 1.15, marginBottom: 8 }}>
          Asesoría 1 a 1 personalizada
        </div>
        <div style={{ fontSize: 21, fontWeight: 600, color: '#7a6e67', marginBottom: 28 }}>
          <span style={{ color: '#d8532a', fontWeight: 800 }}>40 minutos</span> para armar tu estrategia a medida
        </div>

        {/* Staggered Bullet Points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            {
              icon: Video,
              text: 'Meet en vivo de 40 min mano a mano con tu tutor',
            },
            {
              icon: Compass,
              text: 'Diagnóstico de tu negocio según tu oferta actual',
            },
            {
              icon: Target,
              text: 'Plan de acción claro de corto, mediano y largo plazo',
            },
            {
              icon: Gift,
              text: 'De regalo: Plantillas operativas y acceso al campus',
              highlight: true,
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -25 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.0 + index * 0.22, ease: 'easeOut' }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: item.highlight ? '#d8532a' : '#1f1a17',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                    boxShadow: item.highlight ? '0 6px 18px rgba(216, 83, 42, 0.35)' : 'none',
                  }}
                >
                  <Icon size={20} strokeWidth={2.5} />
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: item.highlight ? 800 : 600,
                    color: item.highlight ? '#d8532a' : '#2b231f',
                    lineHeight: 1.3,
                  }}
                >
                  {item.text}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* BOTTOM CREDENTIALS AND AUTHORITY */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.8, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          bottom: 230,
          left: 90,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          fontSize: 20,
          fontWeight: 700,
          color: '#6e5e54',
        }}
      >
        <span style={{ color: '#d8532a' }}>★</span>
        <span>Asesores Certificados</span>
        <span>•</span>
        <span>+3.000 Emprendedores Guiados</span>
        <span>•</span>
        <span>Plan 100% Personalizado</span>
      </motion.div>

      {/* BOTTOM FLOATING CTA BUTTON */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 2.1, type: 'spring', stiffness: 220 }}
        style={{
          position: 'absolute',
          bottom: 120,
          left: 90,
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            backgroundColor: '#d8532a',
            color: '#ffffff',
            padding: '20px 48px',
            borderRadius: 36,
            fontSize: 26,
            fontWeight: 800,
            boxShadow: '0 16px 36px rgba(216, 83, 42, 0.42)',
            cursor: 'pointer',
          }}
        >
          <span>Escribinos</span>
          <MessageCircle size={28} />
        </motion.div>
      </motion.div>
    </div>
  );
}
