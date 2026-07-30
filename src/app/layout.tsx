import type {Metadata} from 'next';
import './globals.css';
import { LayoutWrapper } from './layout-wrapper';

export const metadata: Metadata = {
  title: 'FastoriaAcademy | Plataforma de Alto Impacto para Mentores',
  description: 'Descubre el futuro de la educación digital con FastoriaAcademy. Potencia tu marca personal, gestiona tus cursos con IA y accede a una red exclusiva de conocimiento institucional.',
  keywords: ['educación', 'IA', 'mentores', 'cursos online', 'BTECH', 'academy', 'FastoriaAcademy'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lexend:wght@300;400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var r=JSON.parse(localStorage.getItem('fastoria-active-brand'));if(!r||!r.fastoria)return;var t=r.fastoria,s=document.documentElement.style,c=t.color||{},h=t['shadcn-hsl']||{},e=t.radius||{},v=t.elevation||{},p=t.typography||{},l=t.theme||{},b=t.sidebar||{};var n=function(k,v){if(v)return s.setProperty(k,v)};n('--bg',c.bg?.$value);n('--surface',c.surface?.$value);n('--fg',c.fg?.$value);n('--fg-2',c['fg-2']?.$value);n('--muted',c.muted?.$value);n('--border',c.border?.$value);n('--border-soft',c['border-soft']?.$value);n('--accent',c.accent?.$value);n('--accent-muted',c['accent-muted']?.$value);n('--accent-light',c['accent-light']?.$value);n('--accent-on',c['accent-on']?.$value);n('--success',c.success?.$value);n('--warn',c.warn?.$value);n('--danger',c.danger?.$value);n('--background',h.background?.$value);n('--foreground',h.foreground?.$value);n('--primary',h.primary?.$value);n('--primary-foreground',h['primary-foreground']?.$value);n('--accent',h.accent?.$value);n('--accent-foreground',h['accent-foreground']?.$value);n('--border',h.border?.$value);n('--ring',h.ring?.$value);n('--radius',h.radius?.$value);n('--radius-sm',e.sm?.$value);n('--radius-md',e.md?.$value);n('--radius-lg',e.lg?.$value);n('--card-radius',e.card?.$value);n('--prof-shadow',v.shadow?.$value);n('--card-shadow',v['card-shadow']?.$value);n('--prof-border-width',v['border-width']?.$value);n('--font-display','"'+p['font-display']?.$value+'", sans-serif');n('--font-body','"'+p['font-body']?.$value+'", sans-serif');n('--font-mono','"'+p['font-mono']?.$value+'", monospace');n('--logo-type',l['logo-selected']?.$value);n('--sidebar-background',b.background?.$value);n('--sidebar-foreground',b.foreground?.$value);n('--sidebar-border',b.border?.$value);n('--sidebar-accent',b.accent?.$value);n('--sidebar-accent-foreground',b['accent-foreground']?.$value);n('--sidebar-ring',b.ring?.$value);n('--sidebar-primary',b.primary?.$value);n('--sidebar-primary-foreground',b['primary-foreground']?.$value);s.setProperty('--card-bg','#ffffff');s.setProperty('--card-border','none');var a=l.active?.$value;if(a){document.documentElement.classList.remove('theme-hd','theme-vanguardia','theme-institucional');document.documentElement.classList.add('theme-'+a)}}catch(e){}})();
          `}}
        />
      </head>
      <body className="font-body antialiased selection:bg-accent/30 selection:text-accent" suppressHydrationWarning>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
