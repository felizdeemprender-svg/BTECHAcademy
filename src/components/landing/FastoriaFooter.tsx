import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IoLogoWhatsapp, IoLogoInstagram, IoMailOutline, IoGlobeOutline } from 'react-icons/io5';

export function FastoriaFooter() {
  return (
      <footer id="footer" className="relative z-10 py-16 px-6 border-t border-slate-800 bg-[#0A0F1D] text-white">
        <div className="container mx-auto max-w-xl text-center">
          {/* Logo */}
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Image
              src="/logoF.png"
              alt="Fastoria Logo"
              width={40}
              height={40}
              className="w-10 h-10 object-contain drop-shadow-md"
            />
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-400 mb-8 uppercase tracking-wider">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <Link href="/courses" className="hover:text-white transition-colors">Cursos</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Mentores</Link>
            <Link href="/auth" className="hover:text-white transition-colors">Ingresar</Link>
            <a href="mailto:felizdeemprender@gmail.com" className="hover:text-white transition-colors">Contacto</a>
          </div>

          {/* Social Icons */}
          <div className="flex justify-center gap-3 mb-8">
            <a href="https://wa.me/5491176411666" target="_blank" rel="noopener noreferrer" title="WhatsApp" className="w-10 h-10 rounded-full border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-300 hover:text-emerald-400 hover:border-slate-700 transition-all">
              <IoLogoWhatsapp className="w-4 h-4" />
            </a>
            <a href="https://instagram.com/felizdeemprender" target="_blank" rel="noopener noreferrer" title="Instagram" className="w-10 h-10 rounded-full border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-300 hover:text-pink-400 hover:border-slate-700 transition-all">
              <IoLogoInstagram className="w-4 h-4" />
            </a>
            <a href="mailto:felizdeemprender@gmail.com" title="Email" className="w-10 h-10 rounded-full border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-300 hover:text-[#1CB899] hover:border-slate-700 transition-all">
              <IoMailOutline className="w-4 h-4" />
            </a>
            <a href="https://www.fastoria.com.ar" target="_blank" rel="noopener noreferrer" title="Sitio Web" className="w-10 h-10 rounded-full border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-300 hover:text-sky-400 hover:border-slate-700 transition-all">
              <IoGlobeOutline className="w-4 h-4" />
            </a>
          </div>

          {/* Copyright */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <p>© 2026 FASTORIA. Todos los derechos reservados.</p>
            <a href="https://www.felizdeemprender.com.ar" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">
              www.felizdeemprender.com.ar
            </a>
          </div>
        </div>
      </footer>
  );
}
