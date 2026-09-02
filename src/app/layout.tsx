import type {Metadata} from 'next';
import './globals.css';
import { LayoutWrapper } from './layout-wrapper';

export const metadata: Metadata = {
  title: 'Fastoria & BTECHAcademy | Plataforma de Alto Impacto para Creadores y Mentores',
  description: 'Descubre el futuro de la educación digital, comercialización y gestión de cursos con Inteligencia Artificial.',
  keywords: ['educación', 'IA', 'mentores', 'cursos online', 'Fastoria', 'BTECHAcademy', 'creadores'],
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
      </head>
      <body className="font-body antialiased selection:bg-accent/30 selection:text-accent" suppressHydrationWarning>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
