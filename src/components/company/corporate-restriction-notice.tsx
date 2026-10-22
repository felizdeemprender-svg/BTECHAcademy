'use client';

import Link from 'next/link';
import { Building2, ShieldCheck, ArrowLeft, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CorporateRestrictionNoticeProps {
  feature: string;
  description?: string;
}

export function CorporateRestrictionNotice({
  feature,
  description,
}: CorporateRestrictionNoticeProps) {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-6">
      <Card className="border border-border rounded-xl shadow-none bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider gap-1.5 px-2.5 py-1">
              <Building2 className="h-3 w-3" />
              Administrado por la Empresa
            </Badge>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Acceso Delegado
            </span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground pt-3">
            {feature}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            Esta opción no está disponible de forma individual porque es administrada centralmente por tu empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed space-y-2">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Gobernanza Corporativa Activa</span>
            </div>
            <p>
              {description || `Como tutor vinculado a una organización, los servicios de ${feature} operan bajo las licencias, canales e infraestructura corporativa definida por la cuenta titular.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/settings/profile">
              <Button variant="default" className="gap-2 font-semibold text-xs">
                <User className="h-4 w-4" />
                Ir a Mi Perfil
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="gap-2 font-semibold text-xs">
                <ArrowLeft className="h-4 w-4" />
                Ir al Panel Principal
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
