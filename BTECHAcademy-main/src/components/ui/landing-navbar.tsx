"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "Cursos", href: "/courses" },
  { label: "Security", href: "#security" },
  { label: "AI Lab", href: "#integrations" },
];

export function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center font-black text-base transition-colors",
                scrolled ? "bg-[#1CB899] text-white" : "bg-white/20 text-white backdrop-blur-sm"
              )}
            >
              F
            </div>
            <span
              className={cn(
                "text-base font-black tracking-tighter transition-colors",
                scrolled ? "text-slate-900" : "text-white"
              )}
            >
              FASTORIA<span className="text-[#1CB899]">.</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-full transition-all",
                  scrolled
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth"
              className={cn(
                "text-sm font-semibold transition-colors",
                scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/70 hover:text-white"
              )}
            >
              Ingresar
            </Link>
            <Link href="/auth">
              <Button
                className={cn(
                  "rounded-full px-5 font-bold text-sm h-9",
                  scrolled
                    ? "bg-[#1CB899] text-white hover:bg-[#1CB899]/90 shadow-sm"
                    : "bg-white text-slate-900 hover:bg-white/90"
                )}
              >
                Empezar
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2"
            aria-label="Menu"
          >
            {menuOpen ? (
              <X className={cn("w-5 h-5", scrolled ? "text-slate-900" : "text-white")} />
            ) : (
              <Menu className={cn("w-5 h-5", scrolled ? "text-slate-900" : "text-white")} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className={cn(
            "md:hidden border-t px-4 py-4",
            scrolled
              ? "bg-white/95 backdrop-blur-xl border-slate-200"
              : "bg-black/80 backdrop-blur-xl border-white/10"
          )}
        >
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "py-2.5 px-3 text-sm font-medium rounded-lg transition-colors",
                  scrolled
                    ? "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <hr className={cn("my-2", scrolled ? "border-slate-200" : "border-white/10")} />
            <Link
              href="/auth"
              className={cn(
                "py-2.5 px-3 text-sm font-medium rounded-lg transition-colors",
                scrolled
                  ? "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
              onClick={() => setMenuOpen(false)}
            >
              Ingresar
            </Link>
            <Link href="/auth" onClick={() => setMenuOpen(false)} className="w-full">
              <Button
                className={cn(
                  "rounded-full mt-2 font-bold text-sm h-10 w-full",
                  scrolled
                    ? "bg-[#1CB899] text-white hover:bg-[#1CB899]/90"
                    : "bg-white text-slate-900 hover:bg-white/90"
                )}
              >
                Empezar
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
