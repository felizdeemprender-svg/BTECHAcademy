'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface OptimizedValidationReportProps {
  generatedAssets: any;
}

export function OptimizedValidationReport({ generatedAssets }: OptimizedValidationReportProps) {
  const [showDetails, setShowDetails] = useState(false);
  const allErrors: any[] = [];
  const allWarnings: any[] = [];

  ['socials', 'emails', 'ads'].forEach(channel => {
    const assets = generatedAssets?.[channel] || [];
    assets.forEach((asset: any) => {
      const validation = asset?.validationResults;
      if (validation) {
        if (validation.errors) allErrors.push(...validation.errors);
        if (validation.warnings) allWarnings.push(...validation.warnings);
      }
    });
  });

  if (allErrors.length === 0 && allWarnings.length === 0) {
    return (
      <div className="flex items-center justify-between p-4 bg-success/10 border border-success/20 rounded-xl">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <span className="font-bold text-success">Todo compatible con APIs</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)} className="text-success hover:bg-success/15 font-bold">
          {showDetails ? 'Ocultar' : 'Ver'} detalles
        </Button>
      </div>
    );
  }

  if (allErrors.length > 0) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-5 w-5 text-danger" />
            <span className="font-bold text-danger">{allErrors.length} errores criticos no corregibles</span>
          </div>
          <div className="text-sm text-danger">Estos errores deben ser corregidos manualmente para asegurar compatibilidad.</div>
        </div>
        <Button variant="outline" onClick={() => setShowDetails(!showDetails)} className="w-full font-bold">
          {showDetails ? 'Ocultar' : 'Ver'} reporte completo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-warn/10 border border-warn/20 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-5 w-5 text-warn" />
          <span className="font-bold text-warn">{allWarnings.length} advertencias (corregidas automaticamente)</span>
        </div>
        <div className="text-sm text-warn">El sistema aplico las adaptaciones necesarias para mantener la compatibilidad.</div>
      </div>
      <Button variant="outline" onClick={() => setShowDetails(!showDetails)} className="w-full font-bold">
        {showDetails ? 'Ocultar' : 'Ver'} detalles de adaptacion
      </Button>
    </div>
  );
}
