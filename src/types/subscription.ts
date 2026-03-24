export enum SubscriptionStatus {
  NONE = 'none',           // Nunca ha tenido suscripción
  TRIAL = 'trial',         // En período de prueba
  ACTIVE = 'active',       // Suscripción activa
  INACTIVE = 'inactive',   // Suscripción inactiva (tuvo pero se canceló)
  CANCELLED = 'cancelled', // Cancelada explícitamente
  EXPIRED = 'expired'     // Expiró por tiempo
}

export interface SubscriptionPermissions {
  canCreateCustomPage: boolean;
  maxCourses: number;
  maxStudents: number;
  hasCustomBranding: boolean;
  hasAnalytics: boolean;
  hasPrioritySupport: boolean;
  canPublishCourses: boolean;
  requiresFreeCourses: boolean;
  freeCoursesRequired: number;
  maxInvitationsPerCourse: number;
  canAccessMarketplace: boolean;
  canReceivePayments: boolean;
  hasAdvancedFeatures: boolean;
}

export interface TutorSubscription {
  name?: string;           // Nombre del plan asigando
  status: SubscriptionStatus;
  type: 'free' | 'fixed' | 'percentage';
  startDate?: string;      // Fecha de inicio (ISO)
  endDate?: string;        // Fecha de fin (ISO)
  hasCustomPage: boolean;
  fixedAmount?: number;
  percentageRate?: number;
  requiresFreeCourses: boolean;
  freeCoursesCount: number;
  invitationsPerCourse: number;
  observations: string;
  autoRenew: boolean;
  limits: {
    maxCourses: number;
    maxStudents: number;
    hasCustomBranding: boolean;
    hasAnalytics: boolean;
    hasPrioritySupport: boolean;
  };
  payment?: {
    method: 'mercadopago' | 'stripe' | 'manual';
    lastPaymentDate?: Date;
    nextPaymentDate?: Date;
    paymentHistory: PaymentRecord[];
  };
  publicProfile: {
    enabled: boolean;
    showStats: boolean;
    showContact: boolean;
    allowPublicCourses: boolean;
  };
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  date: Date;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
}

// Funciones de validación
export const canAccessSubportal = (subscription: TutorSubscription): boolean => {
  return subscription.status === SubscriptionStatus.ACTIVE && 
         subscription.hasCustomPage && 
         subscription.publicProfile?.enabled;
};

export const canPublishCourse = (subscription: TutorSubscription, currentCourses: number): boolean => {
  if (subscription.status !== SubscriptionStatus.ACTIVE) return false;
  return currentCourses < subscription.limits.maxCourses;
};

export const validateFreeCourses = (subscription: TutorSubscription, freeCourses: number): boolean => {
  if (!subscription.requiresFreeCourses) return true;
  return freeCourses >= subscription.freeCoursesCount;
};

export const canAcceptInvitation = (subscription: TutorSubscription, courseInvitations: number): boolean => {
  if (subscription.status !== SubscriptionStatus.ACTIVE) return false;
  return courseInvitations < subscription.invitationsPerCourse;
};

export const calculatePermissions = (subscription: TutorSubscription): SubscriptionPermissions => {
  const isActive = subscription.status === SubscriptionStatus.ACTIVE;
  
  return {
    canCreateCustomPage: isActive && subscription.hasCustomPage,
    maxCourses: subscription.limits.maxCourses,
    maxStudents: subscription.limits.maxStudents,
    hasCustomBranding: isActive && subscription.limits.hasCustomBranding,
    hasAnalytics: isActive && subscription.limits.hasAnalytics,
    hasPrioritySupport: isActive && subscription.limits.hasPrioritySupport,
    canPublishCourses: isActive,
    requiresFreeCourses: subscription.requiresFreeCourses,
    freeCoursesRequired: subscription.freeCoursesCount,
    maxInvitationsPerCourse: subscription.invitationsPerCourse,
    canAccessMarketplace: isActive,
    canReceivePayments: isActive && subscription.type !== 'free',
    hasAdvancedFeatures: isActive && subscription.type !== 'free'
  };
};

export const getDefaultSubscription = (): TutorSubscription => {
  return {
    status: SubscriptionStatus.NONE,
    type: 'free',
    hasCustomPage: false,
    requiresFreeCourses: false,
    freeCoursesCount: 0,
    invitationsPerCourse: 0,
    observations: '',
    autoRenew: false,
    limits: {
      maxCourses: 0,
      maxStudents: 0,
      hasCustomBranding: false,
      hasAnalytics: false,
      hasPrioritySupport: false
    },
    publicProfile: {
      enabled: false,
      showStats: false,
      showContact: false,
      allowPublicCourses: false
    }
  };
};
