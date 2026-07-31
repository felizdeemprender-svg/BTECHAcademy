
export interface EvaluationData {
  score: number;
  feedback: string;
  submittedAt: string;
  isSupport?: boolean;
  strengths?: string[];
  areasToImprove?: string[];
  answers?: Record<string, any>;
  questions?: any[];
}

export interface StudentEnrollment {
  id: string;
  courseId: string;
  courseName?: string;
  status: 'active' | 'pending' | 'suspended' | string;
  inviteEmail?: string;
  studentId: string;
  progressPercent?: number;
  progress?: {
    completedModules: string[];
    evaluations?: Record<string, EvaluationData>;
    lastAccessed?: any;
  };
  createdAt?: any;
  updatedAt?: any;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  videoUrl?: string;
  questions?: any[];
  supportQuestions?: any[];
  enableSupportQuestions?: boolean;
  hasSupportEnabled?: boolean;
  minPassingScore?: number;
  allowRetries?: boolean;
  supportMaterials?: any[];
}

export interface CourseDetails {
  id: string;
  title: string;
  thumbnail?: string;
  modulesCount: number;
  duration?: string;
  status?: string;
  category?: string;
  mentorId?: string;
  brandingOverride?: {
    primaryColor?: string;
    brandName?: string;
    [key: string]: any;
  };
  modules?: Module[];
}

export interface StudentTask {
  id: string;
  title: string;
  description: string;
  mentorId: string;
  mentorName: string;
  studentId: string;
  studentEmail: string;
  status: 'pending' | 'completed' | string;
  score?: number;
  answer?: string;
  fileUrl?: string;
  aiFeedback?: string;
  allowFileUpload?: boolean;
  evaluationCriteria?: string;
  createdAt?: any;
  updatedAt?: any;
  completedAt?: string;
}

export interface StudentFollowUp {
  id: string;
  title: string;
  goal: string;
  mentorId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  totalSessions: number;
  status: 'active' | 'paused' | string;
  createdAt?: any;
}

export interface FollowUpSessionStats {
  consumed: number;
}

/**
 * Registro permanente e independiente del curso.
 * Se crea cuando un alumno alcanza el 100% de progreso.
 * Sobrevive a la eliminación del curso — es el historial académico del alumno.
 * ID del documento: `{studentId}_{courseId}`
 */
export interface StudentAchievement {
  id: string;
  studentId: string;
  studentEmail: string;
  courseId: string;
  /** Snapshot del título al momento de completar — persiste aunque el curso se borre */
  courseTitle: string;
  mentorId: string;
  completedAt: string;
  /** Promedio ponderado de scores de todas las evaluaciones aprobadas */
  finalScore: number;
  /** Resumen liviano por módulo — sin answers ni questions completas */
  moduleSummary: {
    moduleId: string;
    moduleTitle: string;
    score: number;
    completedAt: string;
  }[];
}
