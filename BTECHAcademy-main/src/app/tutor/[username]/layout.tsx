import { Metadata } from 'next';

interface TutorLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    username: string;
  }>;
}

export async function generateMetadata({ params }: TutorLayoutProps): Promise<Metadata> {
  // TODO: Fetch tutor data from API
  const { username } = await params;
  const tutorName = username.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return {
    title: `${tutorName} - Tutor en Evolución Académica AI`,
    description: `Conoce a ${tutorName}, experto tutor en nuestra plataforma. Explora sus cursos y solicita acceso para comenzar tu aprendizaje.`,
    openGraph: {
      title: `${tutorName} - Tutor en Evolución Académica AI`,
      description: `Explora los cursos de ${tutorName} y comienza tu viaje de aprendizaje.`,
      type: 'profile',
    },
  };
}

export default async function TutorLayout({
  children,
  params
}: TutorLayoutProps) {
  const { username } = await params;
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
