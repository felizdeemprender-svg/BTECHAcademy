export type RuleScope = 'global' | 'courses' | 'landings';

export type TriggerType = 
  | 'inactivity' 
  | 'course_completion' 
  | 'module_completion' 
  | 'course_enrollment' 
  | 'specific_date' 
  | 'birthday'
  | 'landing_registration'
  | 'landing_abandonment';

export type ActionType = 'dynamic_message' | 'fixed_template' | 'tag' | 'email';

export interface RuleTrigger {
  type: TriggerType;
  config?: any; // Configuración específica (ej. días de inactividad, ID del curso)
}

export interface RuleChannels {
  whatsapp: boolean;
  email: boolean;
}

export interface RuleAction {
  id: string;
  type: ActionType;
  config: any; // Configuración (ej. prompt, URL, tag)
}

export interface AutomationRule {
  id?: string;
  name: string;
  description?: string;
  scope: RuleScope;
  targetId?: string; // ID del curso o landing si el scope no es global
  trigger: RuleTrigger;
  channels: RuleChannels;
  actions: RuleAction[];
  isActive: boolean;
  tutorId: string; // ID del tutor dueño de la regla
  createdAt: number;
  updatedAt: number;
}

export interface AutomationLog {
  id?: string;
  ruleId: string;
  tutorId: string;
  studentId: string;
  studentName: string;
  actionType: ActionType;
  channel: string;
  status: 'success' | 'failed';
  summary: string; // Ej: "Mensaje enviado a Juan a las 10:00"
  timestamp: number;
}
