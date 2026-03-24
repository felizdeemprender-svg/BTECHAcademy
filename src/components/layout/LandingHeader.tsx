'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function LandingHeader() {
  const pathname = usePathname();
  
  return (
    <header className="px-6 py-5 flex items-center justify-between border-b bg-white/70 backdrop-blur-xl sticky top-0 z-50 transition-all">
      <Link href="/" className="flex items-center gap-3 group cursor-pointer">
        <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/25 group-hover:rotate-6 transition-transform">
          <Sparkles className="text-primary-foreground h-6 w-6" />
        </div>
        <div className="flex flex-col -gap-1">
          <span className="font-bold text-xl text-primary tracking-tight leading-none">BTECHAcademy</span>
          <span className="text-[10px] uppercase tracking-widest font-black text-accent ml-0.5">Potenciado por IA</span>
        </div>
      </Link>
      
      <nav className="hidden md:flex items-center gap-8">
        <Link 
          href="/catalogo" 
          className={cn(
            "text-sm font-bold transition-colors",
            pathname === '/catalogo' ? "text-primary" : "text-slate-500 hover:text-primary"
          )}
        >
          Catálogo
        </Link>
        <Link href="/about" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Institución</Link>
        <Link href="/services" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Servicios</Link>
      </nav>

      <div className="flex gap-4 items-center">
        <Link href="/auth">
          <Button variant="ghost" className="font-bold text-sm">Entrar</Button>
        </Link>
        <Link href="/auth">
          <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95">
            Acceso Institucional
          </Button>
        </Link>
      </div>
    </header>
  );
}
