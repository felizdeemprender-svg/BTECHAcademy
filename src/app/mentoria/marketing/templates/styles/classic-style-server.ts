/**
 * Classic Style - Server-side functions for AI generation
 * Este archivo contiene las funciones de generación con IA que deben ejecutarse en el servidor
 */

import { CLASSIC_STYLE_CONFIG, ClassicSectionType, ClassicTemplate } from './classic-style-config';

// Re-exportar CLASSIC_STYLE_CONFIG para uso en server-side
export { CLASSIC_STYLE_CONFIG };

/**
 * Genera secciones dinámicas usando IA real con los prompts definidos
 * Esta función conecta con el flujo de IA para generar contenido específico del estilo
 * NOTA: Esta función solo debe ser importada desde archivos server-side
 */
export const generateClassicSectionsWithAI = async (
  topic: string,
  sectionCount: number = CLASSIC_STYLE_CONFIG.defaultSectionCount
): Promise<ClassicSectionType[]> => {
  try {
    // Importar la función de generación de IA dinámicamente
    const { ai } = await import('@/ai/genkit');
    
    // Usar el prompt de contenido definido en la configuración
    const prompt = CLASSIC_STYLE_CONFIG.prompts.content
      .replace('{topic}', topic)
      .replace('{count}', sectionCount.toString());
    
    const { output } = await ai.generate({
      prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });
    
    // Parsear la respuesta de la IA
    if (output && typeof output === 'object') {
      return output as ClassicSectionType[];
    }
    
    // Fallback a generación simulada si la IA falla
    return generateClassicSections({ sectionCount }, 0);
  } catch (error) {
    console.error('Error generando secciones con IA:', error);
    // Fallback a generación simulada
    return generateClassicSections({ sectionCount }, 0);
  }
};

/**
 * Genera secciones dinámicas según la configuración de la landing
 * Esta función simula el proceso real de la IA generando datos al azar
 */
export const generateClassicSections = (
  template: ClassicTemplate,
  index: number
): ClassicSectionType[] => {
  // Si hay secciones del template, usarlas
  if (template.sections && template.sections.length > 0) {
    return template.sections;
  }
  
  // Generar secciones con datos al azar
  const sectionCount = template.sectionCount || CLASSIC_STYLE_CONFIG.defaultSectionCount;
  const sections: ClassicSectionType[] = [];
  
  const topics = [
    "Civilizaciones Antiguas",
    "Egipto y Mesopotamia",
    "Grecia y Roma",
    "Edad Media",
    "Renacimiento",
    "Era Moderna",
    "Revoluciones",
    "Guerras Mundiales",
    "Historia de América",
    "Historia Contemporánea"
  ];
  
  const tutors = [
    "Dra. Elena Martínez",
    "Dr. Carlos Rodríguez",
    "Dra. Sofia Rossi",
    "Dr. James Chen",
    "Dra. Ana García"
  ];
  
  const benefits = [
    "Certificación reconocida",
    "Mentoría personalizada",
    "Proyectos prácticos",
    "Acceso 24/7",
    "Comunidad global",
    "Soporte vitalicio",
    "Materiales exclusivos",
    "Casos de estudio reales"
  ];
  
  for (let i = 0; i < sectionCount; i++) {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const tutor = tutors[Math.floor(Math.random() * tutors.length)];
    const selectedBenefits = benefits.sort(() => Math.random() - 0.5).slice(0, 4);
    
    sections.push({
      title: `${topic}: Un Viaje Profundo`,
      description: `Explora ${topic.toLowerCase()} con ${tutor}, experto reconocido en el campo. Descubre cómo estos eventos históricos moldearon nuestra civilización y aprende metodologías prácticas para aplicar este conocimiento.`,
      bulletPoints: selectedBenefits,
      hasVideo: i === 0 || i === 2,
      image: `section-${Math.floor(Math.random() * 1000)}`,
    });
  }
  
  return sections;
};
