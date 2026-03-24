import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Evolución Académica AI - Plataforma de Aprendizaje con IA',
  description: 'Plataforma exclusiva de formación impulsada por Inteligencia Artificial. Crea cursos impactantes, automatiza evaluaciones y ofrece experiencias personalizadas bajo invitación.',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
