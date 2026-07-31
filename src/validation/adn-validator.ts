import Ajv from 'ajv';
import coreSchema from './schema/core.json';
import typographySchema from './schema/typography.json';
import audioSchema from './schema/audio.json';
import motionSchema from './schema/motion.json';
import compositionSchema from './schema/composition.json';
import blueprintSchema from './schema/blueprint.json';
import blueprintInfoSchema from './schema/blueprint-info.json';
import engineRequirementsSchema from './schema/engine-requirements.json';
import globalFXSchema from './schema/global-fx.json';

// Configurar AJV con módulos
const ajv = new Ajv({ 
  allErrors: true,
  verbose: false,
  strict: false,
  allowUnionTypes: true
});

// Registrar módulos secundarios
ajv.addSchema(typographySchema, 'typography.json');
ajv.addSchema(audioSchema, 'audio.json');
ajv.addSchema(motionSchema, 'motion.json');
ajv.addSchema(compositionSchema, 'composition.json');
ajv.addSchema(blueprintSchema, 'blueprint.json');
ajv.addSchema(blueprintInfoSchema, 'blueprint-info.json');
ajv.addSchema(engineRequirementsSchema, 'engine-requirements.json');
ajv.addSchema(globalFXSchema, 'global-fx.json');

// Compilar el esquema principal
const validateSchema = ajv.compile(coreSchema);

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ADNValidator {
  /**
   * Valida un ADN contra el schema JSON
   */
  static validate(adn: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!adn || typeof adn !== 'object') {
      errors.push('ADN debe ser un objeto válido');
      return { isValid: false, errors, warnings };
    }

    // 1. Validar contra el schema JSON (EL CORAZÓN DE LA VALIDACIÓN)
    const isValid = validateSchema(adn);
    if (!isValid && validateSchema.errors) {
      console.log('❌ Schema validation failed:', validateSchema.errors.map(e => `${e.instancePath}: ${e.message}`).join(' | '));
      validateSchema.errors.forEach(error => {
        const path = error.instancePath || 'root';
        errors.push(`${path}: ${error.message}`);
      });
    }

    // 2. Validaciones básicas de negocio (Hardcoded solo lo imprescindible)
    if (!adn.id) errors.push('ID es requerido');
    if (!adn.name) errors.push('Nombre es requerido');

    // Validar formato de ID
    if (adn.id && !/^(\d{2,}_[A-Z_]+|adn_\d+)$/.test(adn.id)) {
      errors.push('ID debe tener formato "01_NOMBRE" o "adn_01"');
    }

    // Validar versión
    if (adn.version && !['1.0', '2.0'].includes(adn.version.toString())) {
      errors.push('Versión debe ser "1.0" o "2.0"');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateOrThrow(adn: any): any {
    const result = this.validate(adn);
    if (!result.isValid) {
      throw new Error(`ADN inválido:\n${result.errors.join('\n')}`);
    }
    return adn;
  }

  static validateArray(adns: any[]): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    adns.forEach((adn, index) => {
      const result = this.validate(adn);
      if (!result.isValid) {
        allErrors.push(`ADN ${index + 1} (${adn.id || 'sin id'}): ${result.errors.join(', ')}`);
      }
      allWarnings.push(...result.warnings.map(w => `ADN ${index + 1}: ${w}`));
    });

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }
}
