export interface MentorPermissions {
  academic_management: boolean;
  mentor_challenges: boolean;
  students_view: boolean;
  followups_management: boolean;
  marketing_access: boolean;
  landing_access: boolean;
}

export function generatePermissionsFromPlan(plan: any): string[] {
  const permissions: string[] = [];
  
  const permsObj = plan.entitlements?.permissions || plan.permissions || {};

  if (permsObj.academic_management) {
    permissions.push('academic_management');
  }
  
  if (permsObj.mentor_challenges) {
    permissions.push('mentor_challenges');
  }
  
  if (permsObj.students_view) {
    permissions.push('students_view');
  }
  
  if (permsObj.followups_management) {
    permissions.push('followups_management');
  }
  
  if (permsObj.marketing_access) {
    permissions.push('marketing_access');
  }

  if (permsObj.landing_access) {
    permissions.push('landing_access');
  }

  if (permsObj.automations_access) {
    permissions.push('automations_access');
  }
  
  return permissions;
}

export function hasMarketingAccess(plan: any): boolean {
  return plan.entitlements?.permissions?.marketing_access || plan.permissions?.marketing_access || false;
}

export function canAccessMarketingTools(permissions: string[]): boolean {
  return permissions.includes('marketing_access');
}

export function canAccessLandings(permissions: string[]): boolean {
  return permissions.includes('landing_access');
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
