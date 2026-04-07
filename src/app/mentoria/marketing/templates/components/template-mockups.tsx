'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

// Componente para mostrar validaciones de plataforma
const ValidationBadge = ({ validationResults, platformAdaptations }: { 
  validationResults: any, 
  platformAdaptations: any 
}) => {
  if (!validationResults) return null;

  const { isValid, errors = [], warnings = [], adjustedColors, adjustedTypography } = validationResults;

  return (
    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        {isValid ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : errors.length > 0 ? (
          <AlertCircle className="w-4 h-4 text-red-500" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        )}
        <span className="text-xs font-semibold text-gray-700">
          Validación {isValid ? 'OK' : 'Con advertencias'}
        </span>
      </div>

      {/* Colores ajustados */}
      {adjustedColors && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-600 mb-1">Colores API:</p>
          <div className="flex gap-1">
            {adjustedColors.primary && (
              <div className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded border border-gray-300" 
                  style={{ backgroundColor: adjustedColors.primary }}
                />
                <span className="text-xs text-gray-500">P</span>
              </div>
            )}
            {adjustedColors.accent && (
              <div className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded border border-gray-300" 
                  style={{ backgroundColor: adjustedColors.accent }}
                />
                <span className="text-xs text-gray-500">A</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fuentes ajustadas */}
      {adjustedTypography && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-600 mb-1">Fuentes API:</p>
          <div className="space-y-1">
            {adjustedTypography.fontHeading && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Títulos:</span>
                <span className="text-xs font-medium" style={{ fontFamily: adjustedTypography.fontHeading }}>
                  {adjustedTypography.fontHeading}
                </span>
              </div>
            )}
            {adjustedTypography.fontBody && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Cuerpo:</span>
                <span className="text-xs" style={{ fontFamily: adjustedTypography.fontBody }}>
                  {adjustedTypography.fontBody}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Errores y advertencias */}
      {errors.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-red-600 mb-1">Errores:</p>
          <div className="space-y-1">
            {errors.slice(0, 2).map((error: string, i: number) => (
              <p key={i} className="text-xs text-red-600 truncate">{error}</p>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-yellow-600 mb-1">Advertencias:</p>
          <div className="space-y-1">
            {warnings.slice(0, 2).map((warning: string, i: number) => (
              <p key={i} className="text-xs text-yellow-600 truncate">{warning}</p>
            ))}
          </div>
        </div>
      )}

      {/* Adaptaciones de plataforma */}
      {platformAdaptations && Object.keys(platformAdaptations).length > 0 && (
        <div>
          <p className="text-xs font-medium text-blue-600 mb-1">Adaptaciones:</p>
          <div className="flex flex-wrap gap-1">
            {Object.keys(platformAdaptations).map((key: string) => (
              <Badge key={key} variant="outline" className="text-xs px-1 py-0">
                {key}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Iconos de plataformas
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const PlatformIcon = ({ platform, className }: { platform: string, className?: string }) => {
  switch (platform) {
    case 'instagram': return <div className="w-4 h-4 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-full" />;
    case 'twitter': return <div className="w-4 h-4 bg-blue-400 rounded-full" />;
    case 'tiktok': return <TikTokIcon className={className} />;
    case 'linkedin': return <div className="w-4 h-4 bg-blue-700 rounded-full" />;
    default: return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
  }
};

// Mockup de Social Media - Exactamente como en la versión 1 del Git
export const SocialMockup = ({ variant, index }: { variant: any, index: number }) => {
  const tokens = variant.designTokens;
  const isCarousel = variant.type === 'carousel' || variant.type === 'thread' || variant.type === 'document';
  const isVertical = variant.type === 'story' || variant.type === 'short_video';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border shadow-inner">
            <PlatformIcon platform={variant.platform} className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-900 leading-none">{variant.platform}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Variante {index + 1} • {variant.type?.replace('_', ' ')}</p>
          </div>
        </div>
        {isCarousel && <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase h-5">{variant.slideCount || 5} Slots</Badge>}
      </div>

      <div 
        className={cn(
          "relative mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-100 transition-all duration-500 group/mockup",
          isVertical ? "aspect-[9/16] w-full max-w-[340px]" : "aspect-square w-full"
        )}
      >
        {isCarousel && (
          <>
            <div className="absolute inset-0 translate-x-2 translate-y-2 bg-slate-200 rounded-[2rem] z-0" />
            <div className="absolute inset-0 translate-x-1 translate-y-1 bg-slate-300 rounded-[2rem] z-0" />
          </>
        )}

        <div className="absolute inset-0 z-10">
          <Image 
            src={`https://loremflickr.com/800/1200/marketing,business?lock=${variant.originalIndex || index}`}
            alt="Mockup" 
            fill 
            className="object-cover grayscale-[0.2] opacity-90 group-hover/mockup:scale-105 transition-transform duration-1000" 
            unoptimized 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
        </div>

        <div className="absolute inset-0 z-20 p-8 flex flex-col justify-between text-white">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white/40" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className="bg-white/20 backdrop-blur-md text-white border-none text-[7px] font-black uppercase px-2 h-5">AD PREVIEW</Badge>
              {isCarousel && (
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={cn("w-1 h-1 rounded-full", i === 0 ? "bg-white" : "bg-white/30")} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
              <h4 
                className="text-xl font-black italic leading-[1.1] text-white drop-shadow-lg" 
                style={{ fontFamily: tokens?.fontHeading }}
              >
                "{variant.hook || 'Slot para Gancho de Retención'}"
              </h4>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm" />
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">@entorno_institucional</span>
              </div>
              <Button size="sm" className="h-7 px-3 rounded-lg text-[8px] font-black uppercase shadow-lg" style={{ backgroundColor: tokens?.accent }}>
                Acceder al Programa
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Validaciones de plataforma */}
      <ValidationBadge 
        validationResults={variant.validationResults} 
        platformAdaptations={variant.platformAdaptations} 
      />
    </div>
  );
};

// Mockup de Landing Page - Mejorado con una sola landing por variante
export const LandingMockup = ({ template, index }: { template: any, index: number }) => {
  const tokens = template.designTokens;
  
  // Helper function para obtener colores según el índice - USA SOLO TOKENS DEL TEMPLATE GENERADO
  const getSectionColor = (sectionIndex: number) => {
    // Usar SOLO los colores del template generado, sin fallbacks fijos
    const primaryColor = tokens?.primary;
    const secondaryColor = tokens?.secondary;
    const accentColor = tokens?.accent;
    
    switch (sectionIndex) {
      case 0:
        return {
          price: primaryColor,
          button: primaryColor
        };
      case 1:
        return {
          price: accentColor,
          button: accentColor
        };
      case 2:
        return {
          price: secondaryColor,
          button: secondaryColor
        };
      default:
        return {
          price: primaryColor,
          button: primaryColor
        };
    }
  };
  
  // Tipo para las secciones
  type SectionType = {
    title: string;
    description: string;
    bulletPoints: string[];
    hasVideo: boolean;
    image: string;
  };
  
  // Generar secciones dinámicas según la configuración de la landing
  const generateSections = (): SectionType[] => {
    // Obtener configuración de secciones desde el template o usar valores por defecto
    const sectionCount = template.sectionCount || 3; // Número de secciones para esta landing
    const sections: SectionType[] = [];
    
    // Templates base para diferentes tipos de contenido - ENFOCADO EN EL CURSO Y TUTOR
    const sectionTemplates = [
      {
        title: 'Marketing Digital Avanzado',
        description: 'Domina las estrategias que transforman negocios con la guía de expertos',
        bulletPoints: [
          'Aprende de tutores con 15+ años de experiencia real',
          'Métodos probados en empresas Fortune 500',
          'Acceso a mentoría personalizada',
          'Certificación reconocida por la industria'
        ],
        hasVideo: false,
        image: '/api/placeholder/400/250'
      },
      {
        title: 'Tu Tutor Experto',
        description: 'Aprende directamente de profesionales que lideran el mercado digital',
        bulletPoints: [
          'Dr. Carlos Rodríguez - Ex-Google & Facebook',
          '15+ años de experiencia en marketing digital',
          'Más de 5000 estudiantes formados',
          'Conexiones directas con la industria'
        ],
        hasVideo: true,
        image: '/api/placeholder/400/250'
      },
      {
        title: 'Resultados Garantizados',
        description: 'Transforma tu carrera con las habilidades que demandan las empresas',
        bulletPoints: [
          'Aumento salarial del 40% en promedio',
          'Colocación en 6 meses o menos',
          'Red de contactos con empresas top',
          'Soporte de por vida'
        ],
        hasVideo: false,
        image: '/api/placeholder/400/250'
      },
      {
        title: 'Metodología Práctica',
        description: 'Aprende haciendo proyectos reales desde el primer día',
        bulletPoints: [
          'Proyectos para tu portafolio',
          'Casos de estudio reales',
          'Simulaciones de campañas',
          'Feedback personalizado del tutor'
        ],
        hasVideo: true,
        image: '/api/placeholder/400/250'
      }
    ];
    
    // Generar la cantidad de secciones especificada
    for (let i = 0; i < sectionCount; i++) {
      // Usar secciones del template si existen, sino usar templates base
      if (template.sections && template.sections[i]) {
        sections.push({
          ...template.sections[i],
          hasVideo: i === 0 // Solo la primera sección tiene video
        });
      } else {
        // Usar template base o generar variación
        const baseTemplate = sectionTemplates[i % sectionTemplates.length];
        sections.push({
          ...baseTemplate,
          title: template.sections?.[i]?.title || baseTemplate.title,
          description: template.sections?.[i]?.description || baseTemplate.description,
          bulletPoints: template.sections?.[i]?.bulletPoints || baseTemplate.bulletPoints,
          hasVideo: i === 0, // Solo la primera sección tiene video
          image: `${baseTemplate.image}-${index}` // Variar imagen por landing
        });
      }
    }
    
    return sections;
  };
  
  const dynamicSections = template.sections as SectionType[] || generateSections();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border shadow-inner">
              <div className="w-4 h-4 bg-blue-500 rounded" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-900 leading-none">Landing Page</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Variante {index + 1}</p>
            </div>
          </div>
          <Badge className="bg-blue-500 text-white border-none text-[8px] font-black uppercase h-5">
            {dynamicSections.length} Secciones
          </Badge>
        </div>
      </div>

      {/* Validaciones de plataforma */}
      <ValidationBadge 
        validationResults={template.validationResults} 
        platformAdaptations={template.platformAdaptations} 
      />

      <div className="relative mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white bg-white aspect-[16/10] max-w-[800px]">
        <div className="h-full w-full overflow-y-auto bg-white">
          {/* Header - Visible */}
          <div 
            className="p-8 text-white relative z-10"
            style={{ backgroundColor: template.designTokens?.primary || '#3b82f6' }}
          >
            <h3 className="text-xl font-bold leading-tight mb-2">{template.headline || 'Curso de Marketing Digital'}</h3>
            <p className="text-base leading-relaxed opacity-90">{template.subheadline || 'Aprende con Expertos'}</p>
          </div>

          {/* Secciones Dinámicas - Según Configuración de Landing */}
          {dynamicSections.map((section: SectionType, sectionIndex: number) => {
            // Determinar si la imagen va a la derecha (par) o izquierda (impar)
            const isImageRight = sectionIndex % 2 === 0;
            
            return (
            <div key={sectionIndex} className={`p-8 ${sectionIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} relative z-10`}>
              {/* Título y Descripción con Imagen Alternada */}
              <div className="flex gap-8 mb-6">
                {isImageRight ? (
                  <>
                    {/* Contenido a la izquierda */}
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-4 leading-tight" style={{ color: tokens?.primary || '#111827' }}>{section.title}</h2>
                      <p className="text-gray-600 mb-6 text-base leading-relaxed">{section.description}</p>
                      
                      {/* 3 Viñetas Concretas */}
                      <div className="space-y-3 mb-6">
                        {section.bulletPoints.map((bullet: string, bulletIndex: number) => (
                          <div key={bulletIndex} className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: tokens?.accent || '#3b82f6' }}></div>
                            <p className="text-sm text-gray-700 leading-relaxed">{bullet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Imagen o Video a la derecha */}
                    <div className="w-80 flex-shrink-0">
                      <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden shadow-md">
                        <Image 
                          src={`https://picsum.photos/seed/${section.image}-${index}-${sectionIndex}/320/180`} 
                          alt={section.title} 
                          fill 
                          className="object-cover" 
                          unoptimized 
                        />
                        {section.hasVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-14 h-14 bg-white/95 rounded-full flex items-center justify-center cursor-pointer hover:bg-white transition-all duration-200 shadow-lg">
                              <div className="w-0 h-0 border-l-[10px] border-l-gray-800 border-t-[7px] border-t-transparent transform -translate-x-1"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Imagen a la izquierda */}
                    <div className="w-80 flex-shrink-0">
                      <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden shadow-md">
                        <Image 
                          src={`https://picsum.photos/seed/${section.image}-${index}-${sectionIndex}/320/180`} 
                          alt={section.title} 
                          fill 
                          className="object-cover" 
                          unoptimized 
                        />
                        {section.hasVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-14 h-14 bg-white/95 rounded-full flex items-center justify-center cursor-pointer hover:bg-white transition-all duration-200 shadow-lg">
                              <div className="w-0 h-0 border-l-[10px] border-l-gray-800 border-t-[7px] border-t-transparent transform -translate-x-1"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Contenido a la derecha */}
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-4 leading-tight" style={{ color: tokens?.primary || '#111827' }}>{section.title}</h2>
                      <p className="text-gray-600 mb-6 text-base leading-relaxed">{section.description}</p>
                      
                      {/* 3 Viñetas Concretas */}
                      <div className="space-y-3 mb-6">
                        {section.bulletPoints.map((bullet: string, bulletIndex: number) => (
                          <div key={bulletIndex} className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: tokens?.accent || '#3b82f6' }}></div>
                            <p className="text-sm text-gray-700 leading-relaxed">{bullet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Opción de Compra */}
              <div className={`${sectionIndex === 0 ? 'bg-blue-50 border-blue-200' : sectionIndex === 1 ? 'bg-purple-50 border-purple-200' : sectionIndex === 2 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} p-6 rounded-xl border-2 shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1 leading-relaxed">
                      {sectionIndex === 0 ? 'Precio especial' : 
                       sectionIndex === 1 ? 'Oferta limitada' : 
                       sectionIndex === 2 ? 'Mejor precio' : 
                       `Opción ${sectionIndex + 1}`}
                    </p>
                    <p className={`text-3xl font-bold leading-tight ${
                      sectionIndex === 0 ? 'text-blue-600' : 
                      sectionIndex === 1 ? 'text-purple-600' : 
                      sectionIndex === 2 ? 'text-green-600' : 
                      'text-orange-600'
                    }`} style={{ color: getSectionColor(sectionIndex).price }}>$299</p>
                  </div>
                  <Button className={`px-8 py-4 text-base font-semibold leading-tight ${
                    sectionIndex === 0 ? 'bg-blue-600 hover:bg-blue-700' : 
                    sectionIndex === 1 ? 'bg-purple-600 hover:bg-purple-700' : 
                    sectionIndex === 2 ? 'bg-green-600 hover:bg-green-700' : 
                    'bg-orange-600 hover:bg-orange-700'
                  }`} style={{ backgroundColor: getSectionColor(sectionIndex).button }}>
                    Comprar Ahora
                  </Button>
                </div>
              </div>
            </div>
          );
          })}

          {/* Stats - Visible */}
          <div className="p-8 bg-gray-50 relative z-10">
            <div className="grid grid-cols-4 gap-6 text-center">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="text-3xl font-bold leading-tight mb-2" style={{ color: tokens?.primary || '#3b82f6' }}>500+</div>
                <div className="text-sm text-gray-600 leading-relaxed">Estudiantes</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="text-3xl font-bold leading-tight mb-2" style={{ color: tokens?.primary || '#3b82f6' }}>4.8</div>
                <div className="text-sm text-gray-600 leading-relaxed">Rating</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="text-3xl font-bold leading-tight mb-2" style={{ color: tokens?.primary || '#3b82f6' }}>95%</div>
                <div className="text-sm text-gray-600 leading-relaxed">Satisfacción</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="text-3xl font-bold leading-tight mb-2" style={{ color: tokens?.primary || '#3b82f6' }}>8</div>
                <div className="text-sm text-gray-600 leading-relaxed">Semanas</div>
              </div>
            </div>
          </div>

          {/* CTA Final - Visible */}
          <div className="p-8 text-center relative z-10" style={{ backgroundColor: tokens?.secondary + '20' || '#eff6ff' }}>
            <h3 className="text-2xl font-bold mb-3 leading-tight" style={{ color: tokens?.primary || '#111827' }}>¿Listo para empezar?</h3>
            <p className="text-gray-600 mb-6 text-base leading-relaxed">Únete a 500+ estudiantes</p>
            <div className="flex items-center justify-center gap-6">
              <div className="text-4xl font-bold leading-tight" style={{ color: tokens?.primary || '#3b82f6' }}>$299</div>
              <Button className="px-10 py-4 text-base font-semibold leading-tight" style={{ backgroundColor: tokens?.primary || '#3b82f6' }}>
                Inscribirse Ahora
              </Button>
            </div>
          </div>

          {/* Footer - Visible */}
          <div className="p-6 bg-gray-900 text-white text-center relative z-10">
            <span className="text-sm leading-relaxed">© 2024 BTECHAcademy</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mockup de Email - Mejorado
export const EmailMockup = ({ template, index }: { template: any, index: number }) => {
  const tokens = template.designTokens;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border shadow-inner">
            <div className="w-4 h-4 bg-red-500 rounded" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-900 leading-none">Email</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Variante {index + 1}</p>
          </div>
        </div>
        <Badge className="bg-red-500 text-white border-none text-[8px] font-black uppercase h-5">
          Marketing
        </Badge>
      </div>

      <div className="relative mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white bg-white max-w-[500px]">
        {/* Email Header */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <div>
                <p className="font-semibold text-sm">BTECHAcademy</p>
                <p className="text-xs text-gray-500">mentoria@btechacademy.com</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>

        {/* Email Subject */}
        <div className="p-4 border-b">
          <h3 
            className="text-lg font-bold"
            style={{ color: tokens?.primary, fontFamily: tokens?.fontHeading }}
          >
            {template.subject || 'Transforma tu Futuro con Nuestros Cursos'}
          </h3>
          <p className="text-sm text-gray-600 italic mt-1">
            {template.preheader || 'Descubre cómo la IA puede revolucionar tu carrera profesional'}
          </p>
        </div>

        {/* Email Body */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Personal greeting */}
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <span className="text-white font-bold">U</span>
              </div>
              <div>
                <p className="font-semibold text-sm">Hola, [Nombre]</p>
                <p className="text-xs text-gray-500">Estudiante de BTECHAcademy</p>
              </div>
            </div>

            {/* Main content */}
            <div className="space-y-3">
              <p className="text-gray-700 leading-relaxed">
                Estimado estudiante,
              </p>
              <p className="text-gray-700 leading-relaxed">
                {template.body?.substring(0, 300) || 'Te escribo para presentarte nuestra nueva colección de cursos diseñados para transformar tu carrera profesional. Con instructores expertos y contenido actualizado, estarás preparado para los desafíos del mañana.'}
              </p>
              <p className="text-gray-700 leading-relaxed">
                En nuestros programas encontrarás:
              </p>
              
              {/* Features list */}
              <div className="space-y-2 pl-4">
                {[
                  '🎯 Aprendizaje práctico con proyectos reales',
                  '👥 Mentoría personalizada con expertos',
                  '📚 Acceso a recursos actualizados constantemente',
                  '🏆 Certificación reconocida en la industria'
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>

              <p className="text-gray-700 leading-relaxed">
                ¿Estás listo para dar el siguiente paso en tu desarrollo profesional?
              </p>
            </div>

            {/* CTA Section */}
            <div 
              className="p-6 rounded-xl text-center"
              style={{ backgroundColor: tokens?.secondary }}
            >
              <h4 
                className="text-xl font-bold mb-2"
                style={{ color: tokens?.primary }}
              >
                ¿Listo para comenzar?
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Únete a miles de estudiantes que ya transformaron sus carreras
              </p>
              <Button 
                className="font-semibold px-6 py-3 rounded-lg"
                style={{ backgroundColor: tokens?.accent }}
              >
                Ver Cursos Disponibles
              </Button>
            </div>

            {/* Closing */}
            <div className="pt-3 border-t">
              <p className="text-gray-700 leading-relaxed">
                Esperamos verte pronto en nuestras clases virtuales.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Atentamente,<br />
                El equipo de BTECHAcademy
              </p>
            </div>
          </div>
        </div>

        {/* Email Footer */}
        <div className="p-4 border-t bg-gray-50 text-center">
          <p className="text-xs text-gray-500">
            © 2024 BTECHAcademy. Todos los derechos reservados.
          </p>
          <div className="flex justify-center gap-4 mt-2">
            <span className="text-xs text-blue-500 underline cursor-pointer">Cancelar suscripción</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-blue-500 underline cursor-pointer">Ver en navegador</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-blue-500 underline cursor-pointer">Añadir a contactos</span>
          </div>
          <div className="flex justify-center gap-2 mt-2">
            <div className="w-5 h-5 bg-blue-600 rounded"></div>
            <div className="w-5 h-5 bg-pink-600 rounded"></div>
            <div className="w-5 h-5 bg-blue-400 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mockup de Ad
export const AdMockup = ({ template, index }: { template: any, index: number }) => {
  const tokens = template.designTokens;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border shadow-inner">
            <div className="w-4 h-4 bg-purple-500 rounded" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-900 leading-none">Anuncio</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Variante {index + 1}</p>
          </div>
        </div>
        <Badge className="bg-purple-500 text-white border-none text-[8px] font-black uppercase h-5">
          Google Ads
        </Badge>
      </div>

      <div className="relative mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white bg-white max-w-[500px]">
        {/* Ad Header */}
        <div className="p-3 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-300 rounded"></div>
              <div className="text-xs text-gray-600">google.com</div>
            </div>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>

        {/* Ad Content */}
        <div className="p-4">
          <div className="space-y-3">
            {/* Ad Title */}
            <h3 
              className="text-lg font-bold text-blue-600 hover:underline cursor-pointer"
              style={{ fontFamily: tokens?.fontHeading }}
            >
              {template.headline || 'Cursos de Marketing Digital con IA'}
            </h3>
            
            {/* Ad Description */}
            <p className="text-sm text-gray-600 leading-relaxed">
              {template.description || 'Aprende marketing digital potenciado por inteligencia artificial. Cursos prácticos con proyectos reales y mentoría personalizada. Inscríbete hoy.'}
            </p>
            
            {/* Ad URL */}
            <div className="text-xs text-green-600 truncate">
              btechacademy.com/cursos/marketing-digital
            </div>
            
            {/* Ad Visual */}
            <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden mt-3">
              <Image 
                src={`https://picsum.photos/seed/ad-${template.adType || 'marketing'}-${index}/400/225`} 
                alt="Ad preview" 
                fill 
                className="object-cover" 
                unoptimized 
              />
            </div>
            
            {/* Ad CTA */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2">
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Ad</span>
                <span className="text-xs text-gray-500">BTECHAcademy</span>
              </div>
              <Button 
                size="sm" 
                className="h-8 px-4 rounded-lg text-xs font-bold"
                style={{ backgroundColor: tokens?.accent }}
              >
                {template.ctaText || 'Más Información'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
