
export interface StudentEnrollment {
  id: string;
  courseId: string;
  courseName?: string;
  status: 'active' | 'pending' | 'suspended' | string;
  inviteEmail?: string;
  studentId: string;
  progress?: {
    completedModules: string[];
    lastAccessed?: any;
  };
  createdAt?: any;
  updatedAt?: any;
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
}

export interface EnrolledCourseWithData extends StudentEnrollment {
  courseData?: CourseDetails;
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
