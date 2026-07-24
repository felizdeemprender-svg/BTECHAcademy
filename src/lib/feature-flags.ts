/**
 * Feature Flags para control de rollout del nuevo sistema de estilos de landings
 * Permite habilitar/deshabilitar funcionalidades gradualmente
 */

export const FEATURE_FLAGS = {
  // Habilita el nuevo sistema de estilos visuales
  // false = sistema actual (Classic), true = nuevo sistema con 5 estilos
  NEW_LANDING_STYLES: true,  // Temporalmente activado para pruebas
  
  // Habilita el preview en tiempo real en el LandingEditor
  // false = editor actual, true = editor con split view y preview
  LANDING_EDITOR_PREVIEW: false,
  
  // Estilos disponibles durante el rollout
  // Comienza solo con 'classic', se agregan otros gradualmente
  ENABLED_STYLES: ['classic', 'modern', 'minimal', 'corporate', 'creative'] as ('classic' | 'modern' | 'minimal' | 'corporate' | 'creative')[],
  
  // Habilita la generación de contenido con IA adaptada al estilo
  // false = IA actual, true = IA con directivas de estilo
  IA_STYLE_AWARE: false,
  
  // Porcentaje de usuarios que ven el nuevo sistema (0-100)
  // Usado para rollout gradual
  ROLLOUT_PERCENTAGE: 0,
  
  // Lista de userIds que tienen acceso al nuevo sistema (beta testing)
  BETA_USERS: [] as string[],
};

/**
 * Verifica si un usuario específico tiene acceso al nuevo sistema
 */
export function userHasNewStylesAccess(userId: string): boolean {
  if (!FEATURE_FLAGS.NEW_LANDING_STYLES) return false;
  
  // Beta users tienen acceso prioritario
  if (FEATURE_FLAGS.BETA_USERS.includes(userId)) return true;
  
  // Si rollout percentage es 100%, todos tienen acceso
  if (FEATURE_FLAGS.ROLLOUT_PERCENTAGE === 100) return true;
  
  // Si rollout percentage es 0%, nadie tiene acceso (excepto beta)
  if (FEATURE_FLAGS.ROLLOUT_PERCENTAGE === 0) return false;
  
  // Hash simple del userId para determinar si está en el porcentaje
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 100) < FEATURE_FLAGS.ROLLOUT_PERCENTAGE;
}

/**
 * Verifica si un estilo específico está habilitado
 */
export function isStyleEnabled(styleId: string): boolean {
  return FEATURE_FLAGS.ENABLED_STYLES.includes(styleId as any);
}

/**
 * Obtiene los estilos disponibles según los feature flags
 */
export function getEnabledStyles() {
  const { LANDING_STYLES } = require('./landing-styles');
  return LANDING_STYLES.filter((style: any) => 
    FEATURE_FLAGS.ENABLED_STYLES.includes(style.id)
  );
}
