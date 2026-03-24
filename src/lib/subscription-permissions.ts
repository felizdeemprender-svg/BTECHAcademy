export interface SubscriptionPermissions {
  academic_management: boolean;
  mentor_challenges: boolean;
  students_view: boolean;
  followups_management: boolean;
  marketing_access: boolean;
}

export function generatePermissionsFromPlan(plan: any): string[] {
  const permissions: string[] = [];
  
  if (plan.permissions?.academic_management) {
    permissions.push('academic_management');
  }
  
  if (plan.permissions?.mentor_challenges) {
    permissions.push('mentor_challenges');
  }
  
  if (plan.permissions?.students_view) {
    permissions.push('students_view');
  }
  
  if (plan.permissions?.followups_management) {
    permissions.push('followups_management');
  }
  
  if (plan.permissions?.marketing_access) {
    permissions.push('marketing_access');
  }
  
  return permissions;
}

export function hasMarketingAccess(plan: any): boolean {
  return plan.permissions?.marketing_access || false;
}

export function canAccessMarketingTools(permissions: string[]): boolean {
  return permissions.includes('marketing_access');
}

export function getAvailableMarketingTools(permissions: string[]): string[] {
  if (!canAccessMarketingTools(permissions)) {
    return [];
  }
  
  return [
    'marketing_campaigns',
    'marketing_execution',
    'marketing_track',
    'marketing_pages',
    'marketing_templates'
  ];
}
