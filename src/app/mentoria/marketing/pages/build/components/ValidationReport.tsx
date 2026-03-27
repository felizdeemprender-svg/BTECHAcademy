'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, Lightbulb, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationReportProps {
  validationResults: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    platformAdaptations: any;
  };
  platform?: string;
  showDetails?: boolean;
}

export function ValidationReport({ 
  validationResults, 
  platform = 'General', 
  showDetails = true 
}: ValidationReportProps) {
  const { isValid, errors, warnings, platformAdaptations } = validationResults;

  if (isValid && warnings.length === 0 && !showDetails) {
    return (
      <Alert className="bg-emerald-50 border-emerald-200">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-emerald-800">
          ✅ Diseño compatible con todas las APIs
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          Reporte de Validación - {platform}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado General */}
        <div className="flex items-center gap-3">
          {isValid ? (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Válido
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800 border-red-200">
              <XCircle className="h-3 w-3 mr-1" />
              Con Errores
            </Badge>
          )}
          
          {warnings.length > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {warnings.length} Advertencias
            </Badge>
          )}
        </div>

        {/* Errores */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-red-800 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Errores Críticos
            </h4>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono">
                {errors.join('\n\n')}
              </pre>
            </div>
          </div>
        )}

        {/* Advertencias */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Advertencias y Recomendaciones
            </h4>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <pre className="text-sm text-amber-800 whitespace-pre-wrap font-mono">
                {warnings.join('\n\n')}
              </pre>
            </div>
          </div>
        )}

        {/* Adaptaciones por Plataforma */}
        {showDetails && platformAdaptations && Object.keys(platformAdaptations).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-blue-800 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Adaptaciones Aplicadas
            </h4>
            <div className="grid gap-3">
              {Object.entries(platformAdaptations).map(([plat, adaptation]: [string, any]) => (
                <div key={plat} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-blue-900 capitalize">{plat}</h5>
                    {adaptation.apiVersion && (
                      <Badge variant="outline" className="text-xs">
                        API: {adaptation.apiVersion}
                      </Badge>
                    )}
                  </div>
                  
                  {adaptation.adjustedColors && (
                    <div className="space-y-1 text-sm">
                      <p className="text-blue-800">
                        <span className="font-medium">Colores ajustados:</span>
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(adaptation.adjustedColors).map(([type, color]) => (
                          <div key={type} className="flex items-center gap-1">
                            <div 
                              className="w-4 h-4 rounded border border-gray-300" 
                              style={{ backgroundColor: color as string }}
                            />
                            <span className="text-xs text-blue-700">{type}: {String(color)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {adaptation.supportedFormats && (
                    <div className="text-sm text-blue-800">
                      <span className="font-medium">Formatos soportados:</span> {adaptation.supportedFormats.join(', ')}
                    </div>
                  )}
                  
                  {adaptation.recommendations && (
                    <div className="text-sm text-blue-800">
                      <span className="font-medium">Recomendaciones:</span>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {adaptation.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="text-blue-700">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PlatformValidationSummaryProps {
  validationResults: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    platformAdaptations: any;
  };
}

export function PlatformValidationSummary({ validationResults }: PlatformValidationSummaryProps) {
  const { isValid, errors, warnings, platformAdaptations } = validationResults;
  
  const platformCount = Object.keys(platformAdaptations || {}).length;
  const errorCount = errors.length;
  const warningCount = warnings.length;

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-3 h-3 rounded-full",
          isValid ? "bg-emerald-500" : "bg-red-500"
        )} />
        <span className="text-sm font-medium">
          {isValid ? "Válido" : "Con Errores"}
        </span>
      </div>
      
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span>{platformCount} plataformas</span>
        {errorCount > 0 && (
          <span className="text-red-600 font-medium">{errorCount} errores</span>
        )}
        {warningCount > 0 && (
          <span className="text-amber-600 font-medium">{warningCount} advertencias</span>
        )}
      </div>
    </div>
  );
}
