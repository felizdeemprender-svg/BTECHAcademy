
export type Role = 'student' | 'mentor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Module {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  duration: string;
  order: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  mentorId: string;
  mentorName: string;
  modules: Module[];
  thumbnail: string;
  logo?: string;
  progress?: number;
  category: string;
}

/**
 * DATOS INSTITUCIONALES DE PRUEBA: ELIMINADOS
 * Se han vaciado estas constantes para garantizar que la plataforma utilice 
 * exclusivamente los datos reales de Cloud Firestore.
 */
export const MOCK_USERS: User[] = [];
export const MOCK_COURSES: Course[] = [];
