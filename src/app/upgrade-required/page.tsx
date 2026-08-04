'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, CreditCard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UpgradeRequired() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-8">
        <Card className="border-none">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-warn/15 rounded-full flex items-center justify-center mx-auto">
              <TrendingUp className="h-8 w-8 text-warn" />
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-primary mb-3">
                Actualización Requerida
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Esta funcionalidad requiere un plan de suscripción superior.
              </p>
              <p className="text-sm text-muted-foreground">
                Actualiza tu plan para acceder a todas las características disponibles.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-warn/10 rounded-lg border border-warn/20">
                <h3 className="font-semibold text-warn mb-2">
                  Características del Plan Superior:
                </h3>
                <ul className="text-sm text-warn space-y-1 text-left">
                  <li>• Página personalizada ilimitada</li>
                  <li>• Más cursos y estudiantes</li>
                  <li>• Branding personalizado</li>
                  <li>• Análisis avanzados</li>
                  <li>• Soporte prioritario</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button asChild className="w-full">
                <Link href="/admin/subscriptions">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Actualizar Plan Ahora
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/courses">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Explorar Opciones
                </Link>
              </Button>
              
              <Button variant="ghost" asChild className="w-full">
                <Link href="/dashboard">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Volver al Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
