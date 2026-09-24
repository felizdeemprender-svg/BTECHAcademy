"use client";

/**
 * Classic Style - Configuración completa para generación de landing pages
 * Este archivo contiene toda la información necesaria para que la IA genere landings
 * con el estilo Classic, incluyendo estructura, secciones, tokens y lógica de generación.
 */

import { useState, useEffect } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CLASSIC_STYLE_CONFIG, ClassicSectionType, ClassicTemplate } from './classic-style-config';

// ============================================================================
// COMPONENTE DE MOCKUP PARA VISUALIZACIÓN
// ============================================================================

/**
 * Genera secciones dinámicas según la configuración de la landing
 * Esta función simula el proceso real de la IA generando datos al azar
 * NOTA: Esta función es solo para visualización en el cliente
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

// ============================================================================
// COMPONENTE DE MOCKUP PARA VISUALIZACIÓN
// ============================================================================

/**
 * ClassicMockup - Componente para visualizar el estilo Classic
 * Usa datos al azar reales con useEffect para evitar error de hidratación
 */
export const ClassicMockup = ({
  template,
  index,
}: {
  template: ClassicTemplate;
  index: number;
}) => {
  const tokens = template.designTokens || CLASSIC_STYLE_CONFIG.designTokens;
  
  // Generar secciones al azar en el cliente para evitar error de hidratación
  const [randomSections, setRandomSections] = useState<ClassicSectionType[]>([]);
  
  useEffect(() => {
    const sections = generateClassicSections(template, index);
    setRandomSections(sections);
  }, [template.sectionCount, index]);
  
  const dynamicSections = template.sections || randomSections;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center border">
              <div className="w-4 h-4 bg-blue-500 rounded" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-foreground leading-none">
                Classic Style
              </p>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">
                Variante {index + 1}
              </p>
            </div>
          </div>
          <Badge className="bg-blue-500 text-white border-none text-[8px] font-black uppercase h-5">
            Classic
          </Badge>
        </div>
      </div>
      
      <div className="relative mx-auto rounded-lg overflow-hidden border-8 border-white bg-muted aspect-[16/10] max-w-[800px]">
        <div className="h-full w-full overflow-y-auto">
          {/* Hero Section */}
          <div className="p-8 bg-white">
            <h3 className="text-2xl font-bold mb-2" style={{ color: tokens.primary }}>
              {template.headline || "Historia Universal: Un Viaje Épico"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {template.subheadline || "Descubre cómo el pasado configura nuestro futuro"}
            </p>
          </div>
          
          {/* Dynamic Sections */}
          {dynamicSections && dynamicSections.map((section: ClassicSectionType, sectionIndex: number) => {
            const isImageRight = sectionIndex % 2 === 0;
            return (
              <div key={sectionIndex} className={`p-8 ${sectionIndex % 2 === 0 ? "bg-white" : "bg-muted"} relative z-10 group`}>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs bg-white/80 px-2 py-1 rounded shadow-sm">✏️ Editable</span>
                  <span className="text-xs bg-danger/15 text-danger px-2 py-1 rounded shadow-sm">🗑️ Eliminar</span>
                </div>
                <div className="flex gap-8 mb-6">
                  {isImageRight ? (
                    <>
                      <div className="flex-1">
                        <h2 style={{ color: tokens.primary }}>{section.title}</h2>
                        <p>{section.description}</p>
                        <ul>
                          {section.bulletPoints && section.bulletPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="w-80 h-48 relative flex-shrink-0 rounded-xl overflow-hidden shadow-sm">
                        <Image src={`https://picsum.photos/seed/marketing-${sectionIndex}/320/180`} alt={section.title || "Section Image"} fill className="object-cover" unoptimized />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-80 h-48 relative flex-shrink-0 rounded-xl overflow-hidden shadow-sm">
                        <Image src={`https://picsum.photos/seed/marketing-${sectionIndex}/320/180`} alt={section.title || "Section Image"} fill className="object-cover" unoptimized />
                      </div>
                      <div className="flex-1">
                        <h2 style={{ color: tokens.primary }}>{section.title}</h2>
                        <p>{section.description}</p>
                        <ul>
                          {section.bulletPoints && section.bulletPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* CTA Section */}
          <div className="p-8 bg-white text-center">
            <div className="inline-block px-6 py-3 rounded-lg font-semibold text-sm" style={{ backgroundColor: tokens.primary, color: "white" }}>
              {template.ctaText || "Comenzar Ahora"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
