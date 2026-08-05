'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/courses', label: 'Catálogo' },
  { href: '/planes', label: 'Planes' },
  { href: '/about', label: 'Institución' },
  { href: '/services', label: 'Servicios' },
];

export function LandingHeader() {
  const pathname = usePathname();

  return (
    <header className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between border-b bg-white/70 backdrop-blur-xl sticky top-0 z-50 transition-all">
      <Link href="/" className="flex items-center gap-3 group cursor-pointer">
        <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-primary/25 group-hover:rotate-6 transition-transform">
          <Sparkles className="text-primary-foreground h-6 w-6" />
        </div>
        <div className="flex flex-col -gap-1">
          <span className="font-bold text-xl text-primary tracking-tight leading-none">FastoriaAcademy</span>
          <span className="text-[10px] uppercase tracking-widest font-black text-accent ml-0.5">Potenciado por IA</span>
        </div>
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm font-bold transition-colors",
              pathname === link.href ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex gap-2 sm:gap-4 items-center">
        <Link href="/auth">
          <Button variant="ghost" className="font-bold text-sm">Entrar</Button>
        </Link>
        <Link href="/auth" className="hidden md:inline-flex">
          <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95">
            Acceso Institucional
          </Button>
        </Link>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden h-11 w-11 rounded-xl" aria-label="Abrir menú">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-6 flex flex-col">
            <SheetHeader className="text-left">
              <SheetTitle className="text-primary font-bold text-xl">Menú</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 mt-4 flex-1">
              {NAV_LINKS.map((link) => (
                <SheetClose asChild key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "px-4 py-3 rounded-xl text-sm font-bold transition-colors",
                      pathname === link.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-primary hover:bg-muted"
                    )}
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <SheetClose asChild>
              <Link href="/auth">
                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl shadow-lg shadow-primary/20">
                  Acceso Institucional
                </Button>
              </Link>
            </SheetClose>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
