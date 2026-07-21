'use client';

import Link from 'next/link';
import { Sparkles, Globe } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="bg-primary pt-24 pb-12 px-6">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-4 gap-16 mb-20">
          <div className="col-span-2 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                 <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <span className="font-bold text-2xl text-white tracking-tight">FastoriaAcademy</span>
            </div>
            <p className="text-primary-foreground/60 max-w-sm text-lg leading-relaxed">
              Transformando la educación digital con inteligencia artificial y herramientas de gestión exclusivas para mentores.
            </p>
            <div className="flex gap-4">
              {[Globe, Globe, Globe].map((Icon, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer">
                  <Icon className="w-5 h-5" />
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-white font-black uppercase tracking-widest text-xs">Empresa</h4>
            <ul className="space-y-4 text-primary-foreground/60 font-medium text-sm">
              <li><Link href="/about" className="hover:text-accent transition-colors">Sobre Nosotros</Link></li>
              <li><Link href="/services" className="hover:text-accent transition-colors">Servicios</Link></li>
              <li><Link href="/case-studies" className="hover:text-accent transition-colors">Casos de Éxito</Link></li>
              <li><Link href="/contact" className="hover:text-accent transition-colors">Contacto</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-white font-black uppercase tracking-widest text-xs">Académico</h4>
            <ul className="space-y-4 text-primary-foreground/60 font-medium text-sm">
              <li><Link href="/courses" className="hover:text-accent transition-colors">Explorar Cursos</Link></li>
              <li><Link href="/mentors" className="hover:text-accent transition-colors">Nuestros Mentores</Link></li>
              <li><Link href="/certifications" className="hover:text-accent transition-colors">Verificar Título</Link></li>
              <li><Link href="/auth" className="hover:text-accent transition-colors">Portal Tutor</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-primary-foreground/40 font-medium">© 2024 FastoriaAcademy. Todos los derechos reservados.</p>
          <div className="flex gap-8 text-xs font-bold text-primary-foreground/40 uppercase tracking-widest">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacidad</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Términos</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
