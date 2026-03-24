'use client';

import { useState, useEffect } from 'react';
import { SubscriptionPermissions, TutorSubscription } from '@/types/subscription';

interface UseTutorPermissionsReturn {
  permissions: SubscriptionPermissions | null;
  loading: boolean;
  error: string | null;
  can: (action: string) => boolean;
  hasSubscription: boolean;
  isSubscriptionActive: boolean;
  subscriptionType: string;
}

export function useTutorPermissions(tutorId: string): UseTutorPermissionsReturn {
  const [permissions, setPermissions] = useState<SubscriptionPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, [tutorId]);

  const fetchPermissions = async () => {
    if (!tutorId) {
      setError('Tutor ID is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tutors/validate-permissions?tutorId=${tutorId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setPermissions(null);
      } else {
        setPermissions(data.permissions);
      }
    } catch (err) {
      console.error('Error fetching tutor permissions:', err);
      setError('Failed to load permissions');
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  };

  const can = (action: string): boolean => {
    if (!permissions) return false;
    
    switch (action) {
      case 'create_custom_page':
        return permissions.canCreateCustomPage;
      case 'publish_course':
        return permissions.canPublishCourses;
      case 'access_marketplace':
        return permissions.canAccessMarketplace;
      case 'receive_payments':
        return permissions.canReceivePayments;
      case 'has_analytics':
        return permissions.hasAnalytics;
      case 'has_custom_branding':
        return permissions.hasCustomBranding;
      case 'has_priority_support':
        return permissions.hasPrioritySupport;
      case 'has_advanced_features':
        return permissions.hasAdvancedFeatures;
      default:
        return false;
    }
  };

  const hasSubscription = permissions !== null;
  const isSubscriptionActive = permissions?.canPublishCourses || false;
  const subscriptionType = permissions?.maxCourses > 0 ? 'premium' : 'free';

  return {
    permissions,
    loading,
    error,
    can,
    hasSubscription,
    isSubscriptionActive,
    subscriptionType
  };
}

// Hook para validar acciones específicas
export function useTutorAction(tutorId: string, action: string) {
  const { can, loading, error } = useTutorPermissions(tutorId);
  
  return {
    canPerform: can(action),
    loading,
    error,
    action
  };
}

// Hook para obtener límites de uso
export function useTutorLimits(tutorId: string) {
  const { permissions, loading, error } = useTutorPermissions(tutorId);
  
  return {
    limits: permissions ? {
      maxCourses: permissions.maxCourses || 0,
      maxStudents: permissions.maxStudents || 0,
      coursesUsed: 0, // Esto necesitaría una API adicional
      studentsUsed: 0, // Esto necesitaría una API adicional
      coursesRemaining: (permissions.maxCourses || 0),
      studentsRemaining: (permissions.maxStudents || 0)
    } : null,
    loading,
    error
  };
}
