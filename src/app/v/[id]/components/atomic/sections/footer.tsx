'use client';

import React from 'react';
import {
  ShieldCheck,
  Instagram,
  Linkedin,
  Youtube,
  MessageCircle,
  Globe,
  Phone,
} from 'lucide-react';
import {
  SectionRenderContext,
  contrastTextOn,
  hexToRgba,
  TikTokIcon,
  XIcon,
} from '../shared';

export function FooterSection({ footerSection, ctx }: { footerSection: any; ctx: SectionRenderContext }) {
  const {
    page,
    mentorProfile,
    isFlashSale,
    isDark,
    isGlass,
    primaryColor,
    secondaryColor,
  } = ctx;

  const footerBg = isDark || isGlass ? secondaryColor : primaryColor;
  const footerText = contrastTextOn(footerBg);

  const socials = mentorProfile?.profile?.socials || {};
  const mentorName = mentorProfile?.displayName || page.branding?.name || '';
  const hasCustomFooter = footerSection && footerSection.isVisible !== false;
  const fs = isFlashSale;
  const footerCls = fs
    ? "py-16 px-6 text-center border-t-[3px]"
    : "py-16 px-6 text-center border-t";
  const footerStyle = fs ? { background: 'var(--fg)', color: 'var(--on-dark)' } : { background: footerBg, color: footerText };
  const borderCls = fs ? "border-b-[3px]" : "border-b";
  const borderStyle = fs ? { borderColor: 'rgba(255,255,255,0.16)' } : { borderColor: hexToRgba(footerText, 0.18) };
  const titleCls = fs ? "text-lg font-bold" : "text-lg font-bold";
  const bodyCls = fs ? "text-sm opacity-80 whitespace-pre-wrap max-w-xl mx-auto leading-relaxed" : "text-sm opacity-70 whitespace-pre-wrap max-w-xl mx-auto leading-relaxed";
  const chipCls = fs ? "text-sm font-semibold px-4 py-2 rounded-full border" : "text-sm font-semibold px-4 py-2 rounded-full border";
  const chipStyle = fs ? { borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)' } : { borderColor: hexToRgba(footerText, 0.28), background: hexToRgba(footerText, 0.08) };
  const iconCls = fs ? "h-6 w-6" : "h-6 w-6";
  const legalCls = fs ? "space-y-3 pt-4 border-t text-[11px] opacity-70 leading-relaxed font-mono" : "space-y-3 pt-4 border-t text-[11px] opacity-70 leading-relaxed font-mono";
  const legalStyle = fs ? { borderColor: 'rgba(255,255,255,0.16)' } : { borderColor: hexToRgba(footerText, 0.18) };
  const safeCls = fs ? "text-[10px] font-black uppercase tracking-[0.2em] opacity-70" : "text-[10px] font-black uppercase tracking-[0.2em] opacity-70";
  const copyCls = fs ? "text-xs font-medium opacity-70" : "text-xs font-medium opacity-70";

  return (
    <footer className={footerCls} style={footerStyle}>
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Seccion editable del tutor */}
        {hasCustomFooter && (
          <div className={`space-y-6 pb-8 ${borderCls}`} style={borderStyle}>
            {footerSection.title && <h3 className={titleCls}>{footerSection.title}</h3>}
            {footerSection.content && (
              <p className={bodyCls}>{footerSection.content}</p>
            )}
            {footerSection.bullets && footerSection.bullets.filter(Boolean).length > 0 && (
              <div className="flex flex-wrap justify-center gap-4">
                {footerSection.bullets.filter(Boolean).map((b: string, i: number) => (
                  <span key={i} className={chipCls} style={chipStyle}>
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Iconos de redes sociales del mentor */}
        {Object.values(socials).some(Boolean) && (
          <div className="flex items-center justify-center gap-6">
            {socials.linkedin && <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Linkedin className={`${iconCls} hover:text-[#0077B5]`} /></a>}
            {socials.instagram && <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Instagram className={`${iconCls} hover:text-[#E4405F]`} /></a>}
            {socials.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><XIcon className={`${iconCls} hover:opacity-60`} /></a>}
            {socials.youtube && <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Youtube className={`${iconCls} hover:text-[#FF0000]`} /></a>}
            {socials.tiktok && <a href={socials.tiktok} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><TikTokIcon className={`${iconCls} hover:opacity-60`} /></a>}
            {socials.whatsapp && <a href={`https://wa.me/${socials.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><MessageCircle className={`${iconCls} hover:text-[#25D366]`} /></a>}
            {socials.website && <a href={socials.website} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Globe className={`${iconCls} hover:opacity-60`} /></a>}
            {socials.phone && <a href={`tel:${socials.phone}`} className="hover:scale-110 transition-transform"><Phone className={iconCls} /></a>}
          </div>
        )}

        {/* Seguridad y copyright */}
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-success" />
          <span className={safeCls}>Entorno de Aprendizaje Seguro</span>
        </div>
        {mentorName && (
          <p className={copyCls}>© {new Date().getFullYear()} {mentorName}. Todos los derechos reservados.</p>
        )}

        {/* Disclaimer legal de plataforma */}
        <div className={legalCls} style={legalStyle}>
          <p>Este sitio no es parte del sitio web de Meta, Facebook o Facebook Inc. FACEBOOK es una marca comercial de FACEBOOK, Inc.</p>
          <p>Los resultados expuestos no son una promesa ni garantia de ganancias futuras. El exito requiere esfuerzo, tiempo y dedicacion.</p>
        </div>
      </div>
    </footer>
  );
}
