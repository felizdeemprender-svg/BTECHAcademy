"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { getLandingStyle } from "@/lib/landing-styles";
import { ClassicMockup } from "../styles/classic-style";

// ============================================================================
// COMPONENTE PARA MOSTRAR VALIDACIONES DE PLATAFORMA
// ============================================================================

const ValidationBadge = ({
  validationResults,
  platformAdaptations,
}: {
  validationResults: any;
  platformAdaptations: any;
}) => {
  if (!validationResults) return null;

  const hasErrors = Object.values(validationResults).some((result: any) => result?.status === "error");
  const hasWarnings = Object.values(validationResults).some((result: any) => result?.status === "warning");

  if (!hasErrors && !hasWarnings) return null;

  return (
    <div className="flex gap-2">
      {hasErrors && (
        <Badge variant="destructive" className="text-[8px] font-black uppercase h-5">
          Errores de validación
        </Badge>
      )}
      {hasWarnings && (
        <Badge variant="secondary" className="text-[8px] font-black uppercase h-5">
          Advertencias
        </Badge>
      )}
    </div>
  );
};

// ============================================================================
// MOCKUP DE EMAIL
// ============================================================================

export const EmailMockup = ({
  template,
  index,
}: {
  template: any;
  index: number;
}) => {
  const tokens = template.designTokens;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border shadow-inner">
            <div className="w-4 h-4 bg-red-500 rounded" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-900 leading-none">
              Email
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
              Variante {index + 1}
            </p>
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
                <p className="font-semibold text-sm">FastoriaAcademy</p>
                <p className="text-xs text-gray-500">
                  mentoria@FastoriaAcademy.com
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>

        {/* Email Body */}
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2" style={{ color: tokens?.primary || "#3b82f6" }}>
            {template.headline || "Historia Universal: Un Viaje Épico"}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {template.subheadline || "Descubre cómo el pasado configura nuestro futuro"}
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-xs text-gray-700">
              Únete a nuestro curso exclusivo de historia universal con la Dra. Elena Martínez.
            </p>
          </div>
          <button
            className="w-full py-3 rounded-lg font-semibold text-sm text-white"
            style={{ backgroundColor: tokens?.primary || "#3b82f6" }}
          >
            {template.ctaText || "Comenzar Ahora"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MOCKUP DE AD
// ============================================================================

export const AdMockup = ({
  template,
  index,
}: {
  template: any;
  index: number;
}) => {
  const tokens = template.designTokens;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center border shadow-inner">
            <div className="w-4 h-4 bg-green-500 rounded" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-900 leading-none">
              Ad
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
              Variante {index + 1}
            </p>
          </div>
        </div>
        <Badge className="bg-green-500 text-white border-none text-[8px] font-black uppercase h-5">
          Ads
        </Badge>
      </div>

      <div className="relative mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white bg-white aspect-[16/9] max-w-[600px]">
        <div className="h-full w-full overflow-y-auto">
          <div className="p-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <h3 className="text-2xl font-bold mb-2">
              {template.headline || "Historia Universal: Un Viaje Épico"}
            </h3>
            <p className="text-sm mb-4">
              {template.subheadline || "Descubre cómo el pasado configura nuestro futuro"}
            </p>
            <button className="px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold text-sm">
              {template.ctaText || "Comenzar Ahora"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// WRAPPER QUE SELECCIONA EL MOCKUP CORRECTO SEGÚN EL TIPO
// ============================================================================

export const LandingMockup = ({
  template,
  index,
}: {
  template: any;
  index: number;
}) => {
  // Obtener el estilo del template, default a 'classic'
  const styleId = template.styleId || 'classic';
  const style = getLandingStyle(styleId);

  // Siempre usar ClassicMockup
  return <ClassicMockup template={template} index={index} />;
};
