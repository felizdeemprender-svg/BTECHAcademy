import type { Metadata } from 'next';
import { Inter, Lexend, Source_Code_Pro } from 'next/font/google';
import './globals.css';
import { LayoutWrapper } from './layout-wrapper';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-code-pro',
});

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
    <html
      lang="es"
      className={`${inter.variable} ${lexend.variable} ${sourceCodePro.variable}`}
      suppressHydrationWarning
    >
      <body className={`${inter.className} font-body antialiased selection:bg-accent/30 selection:text-accent`} suppressHydrationWarning>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
