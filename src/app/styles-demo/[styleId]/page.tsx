"use client";

import { useEffect, useState } from "react";
import { getStyleExamples } from "@/ai/flows/create-style-examples";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getLandingStyle } from "@/lib/landing-styles";
import { LandingMockup } from "@/app/mentoria/marketing/templates/components/template-mockups";
import { cn } from "@/lib/utils";

export default function StyleDemoPage() {
  const params = useParams();
  const styleId = params.styleId as string;
  const style = getLandingStyle(styleId);
  const [examples, setExamples] = useState<any[]>([]);

  useEffect(() => {
    if (styleId) {
      getStyleExamples(styleId).then((data) => {
        if (data?.examples) {
          setExamples(data.examples);
        }
      });
    }
  }, [styleId]);

  if (!style) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Estilo no encontrado</h1>
          <p className="text-gray-600 mb-4">El estilo solicitado no existe.</p>
          <Link href="/mentoria/marketing/templates">
            <Button>Volver a Templates</Button>
          </Link>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/mentoria/marketing/templates">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Demo: {style.name}
                </h1>
                <p className="text-sm text-gray-600">{style.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{style.layout}</Badge>
              <Badge variant="outline">{style.componentStyle}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panel de información */}
          <div className="lg:col-span-1 space-y-6">
            {/* Configuración del estilo */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">Configuración del Estilo</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Layout</p>
                  <p className="text-sm text-gray-600">{style.layout}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Component Style</p>
                  <p className="text-sm text-gray-600">{style.componentStyle}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Tipografía</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Headings: {style.typography.headingFont} (x{style.typography.headingScale})</p>
                    <p>Body: {style.typography.bodyFont} (x{style.typography.bodyScale})</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Espaciado</p>
                  <p className="text-sm text-gray-600">{style.spacing}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Animaciones</p>
                  <p className="text-sm text-gray-600">{style.animations}</p>
                </div>
              </div>
            </div>

            {/* Paleta de colores */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">Paleta de Colores</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Primary</p>
                  <div className="flex gap-2">
                    {style.colorProposals.primary.map((color, i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded border border-gray-200"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Secondary</p>
                  <div className="flex gap-2">
                    {style.colorProposals.secondary.map((color, i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded border border-gray-200"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Accent</p>
                  <div className="flex gap-2">
                    {style.colorProposals.accent.map((color, i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded border border-gray-200"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Secciones disponibles */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">
                Secciones ({style.availableSections.length})
              </h2>
              <div className="space-y-2">
                {style.availableSections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between p-2 rounded bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {section.name}
                      </p>
                      <p className="text-xs text-gray-600">{section.contentType}</p>
                    </div>
                    <Badge
                      variant={section.required ? "default" : "outline"}
                      className={cn(
                        "text-xs",
                        section.required
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-600"
                      )}
                    >
                      {section.required ? "Requerido" : "Opcional"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Secciones duplicables */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">
                Secciones Duplicables ({style.availableSections.filter(s => !s.required).length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {style.availableSections
                  .filter((s) => !s.required)
                  .map((section) => (
                    <Badge
                      key={section.id}
                      variant="outline"
                      className="text-xs text-green-600 border-green-200"
                    >
                      {section.name}
                    </Badge>
                  ))}
              </div>
            </div>

            {/* Directivas IA */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">Directivas para IA</h2>
              <p className="text-sm text-gray-600">{style.aiDirectives}</p>
            </div>
          </div>

          {/* Preview del mockup */}
          <div className="lg:col-span-2 space-y-6">
            {examples.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
                Cargando ejemplos generados por IA...
              </div>
            ) : (
              examples.map((example, index) => (
                <div key={index} className="bg-white rounded-xl border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">{example.variant || `Variante ${index + 1}`}</h2>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`/v/demo-${styleId}-style?v=${index}&preview=true`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Landing Real en nueva pestaña
                    </Button>
                  </div>
                  <div className="flex justify-center w-full h-[600px] rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    <iframe 
                      src={`/v/demo-${styleId}-style?v=${index}&preview=true`} 
                      className="w-[1280px] h-[calc(600px*1.28)] origin-top-left"
                      style={{ transform: 'scale(0.78125)', border: 'none' }}
                      title={`Preview Variante ${index + 1}`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
