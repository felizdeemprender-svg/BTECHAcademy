export interface UserSubscriptionLimits {
  maxCourses: number;
  maxStudents: number;
  hasCustomBranding: boolean;
  hasAnalytics: boolean;
  hasPrioritySupport: boolean;
}

export interface UserSubscription {
  status: 'active' | 'inactive' | 'trial' | 'cancelled' | 'none' | 'past_due' | 'suspended' | 'expired';
  type: 'free' | 'fixed' | 'mixed';
  planId?: string;
  planName?: string;
  name?: string;
  isEnterprise?: boolean;
  hasPremiumAI?: boolean;
  hasCustomPage?: boolean;
  startDate?: string;
  endDate?: string;
  fixedAmount?: number;

  requiresFreeCourses?: boolean;
  freeCoursesCount?: number;
  invitationsPerCourse?: number;
  observations?: string;
  autoRenew?: boolean;
  gracePeriodEndsAt?: any;
  trialEndsAt?: any;
  aiQuotas?: {
    totalCredits: number;
    usedCredits: number;
  };
  limits: UserSubscriptionLimits;
  publicProfile: {
    enabled: boolean;
    showStats: boolean;
    showContact: boolean;
    allowPublicCourses: boolean;
  };
  payment?: {
    method: 'mercadopago' | 'stripe' | 'manual';
    lastPaymentDate?: any;
    nextPaymentDate?: any;
    paymentHistory: any[];
    stripeCustomerId?: string;
    defaultPaymentMethodId?: string;
  };
  billingCycle?: {
    currentCycleStart?: any;
    currentCycleEnd?: any;
    promotionalCycleIndex?: number;
    cancelAtPeriodEnd?: boolean;
    monthlySalesAmount?: number; // Ventas acumuladas en el ciclo para calcular regalías
  };
  updatedAt?: any;
  updatedBy?: string;
}

export interface UserProfile {
  bio?: string;
  socials?: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    whatsapp?: string;
    phone?: string;
    website?: string;
  };
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  username?: string;
  signInProvider?: 'google.com' | 'password';
  roles: string[];
  isMentor: boolean;
  isEnterprise?: boolean;
  mentorPermissions: string[];
  isActive: boolean;
  isPreRegistered?: boolean;
  createdAt: any;
  updatedAt?: any;
  lastLogin?: any;
  subscription?: UserSubscription;
  profile?: UserProfile;
  associatedMentors?: string[];
}

export type RoleType = 'alumno' | 'mentor' | 'marketing' | 'admin';
