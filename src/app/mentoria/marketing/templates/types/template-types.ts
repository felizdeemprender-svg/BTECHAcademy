export interface TemplateCollection {
  id: string;
  ownerId: string;
  name: string;
  directives: string;
  createdAt: any;
  updatedAt: any;
  assets: {
    landings?: any[];
    emails?: any[];
    socials?: any[];
    ads?: any[];
  };
  status: "generating" | "completed" | "error";
  generationProgress?: {
    current: number;
    total: number;
    label: string;
  };
  designTokens?: {
    primary: string;
    secondary: string;
    accent: string;
    fontHeading: string;
    fontBody: string;
  };
  validationMetadata?: any;
  generationConfig?: any;
}

export interface SocialTarget {
  enabled: boolean;
  thread?: number;
  single_post?: number;
  story?: number;
  carousel?: number;
  short_video?: number;
  document?: number;
}

export interface GenerationOptions {
  landings: boolean;
  emails: boolean;
  ads: boolean;
}

export interface AIHealthState {
  status: "checking" | "healthy" | "error" | "unavailable";
  message?: string;
  details?: string;
}

export interface EditingVariant {
  collection: string;
  channel: string;
  index: number;
  content: any;
}

export interface PendingRefinement {
  variant: any;
  explanation: string;
  channel: string;
  index: number;
}

export interface VideoConfig {
  presetId: "01" | "02" | "03" | "04" | "05";
  resolution: string;
  fps: 30 | 60;
  audioMood: string;
  sceneCount: number;
  totalDuration?: number;
  slideCount?: number;
  // Estrategia Descentralizada
  strategyVector?: string;
  commercialTone?: string;
}

// Tipos para generación AI
export interface GenerationProgress {
  current: number;
  total: number;
  label: string;
}

export interface GenerationResult {
  landings?: any[];
  emails?: any[];
  socials?: any[];
  ads?: any[];
  success?: boolean;
  error?: string;
}
