'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Users, CreditCard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TutorAccessDenied() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-8">
        <Card className="border-none">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-primary mb-3">
                Acceso Denegado
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                No tienes los permisos necesarios para acceder a esta funcionalidad.
              </p>
              <p className="text-sm text-muted-foreground">
                Es posible que necesites una suscripción activa o configurar tu perfil correctamente.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">Explorar Tutores</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Descubre tutores expertos con suscripciones activas.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span className="font-medium">Ver Planes</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Conoce nuestros planes y beneficios disponibles.
                </p>
              </div>
            </div>
            <div className="space-y-3 pt-4">
              <Button asChild className="w-full">
                <Link href="/courses">
                  <Users className="h-5 w-5 mr-2" />
                  Explorar Marketplace
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/admin/subscriptions">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Ver Planes para Tutores
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
