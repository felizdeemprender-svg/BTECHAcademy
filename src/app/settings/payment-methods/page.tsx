'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { PaymentMethodsManager } from '@/components/dashboard/payment-methods-manager';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, updateDoc, serverTimestamp, collection, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { isCompanyTutorProfile } from '@/domain/company';
import { CorporateRestrictionNotice } from '@/components/company/corporate-restriction-notice';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Save, Loader2 } from 'lucide-react';

function TutorOriginCountryCard({ user, profile }: { user: any; profile: any }) {
  const db = useFirestore();
  const { toast } = useToast();
  const initialCountry = profile?.homeCountry || profile?.profile?.homeCountry || 'AR';
  const initialCurrency = profile?.homeCurrency || profile?.profile?.homeCurrency || 'ARS';

  const [country, setCountry] = useState<string>(initialCountry);
  const [currency, setCurrency] = useState<string>(initialCurrency);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      const c = profile.homeCountry || profile.profile?.homeCountry;
      const curr = profile.homeCurrency || profile.profile?.homeCurrency;
      if (c) setCountry(c);
      if (curr) setCurrency(curr);
    }
  }, [profile]);

  const countryCurrencyMap: Record<string, { name: string; currency: string; label: string }> = {
    AR: { name: 'Argentina', currency: 'ARS', label: 'Pesos Argentinos (ARS)' },
    ES: { name: 'España / Europa', currency: 'EUR', label: 'Euros (EUR)' },
    US: { name: 'Estados Unidos', currency: 'USD', label: 'Dólares (USD)' },
    MX: { name: 'México', currency: 'MXN', label: 'Pesos Mexicanos (MXN)' },
    CO: { name: 'Colombia', currency: 'COP', label: 'Pesos Colombianos (COP)' },
    CL: { name: 'Chile', currency: 'CLP', label: 'Pesos Chilenos (CLP)' },
    PE: { name: 'Perú', currency: 'PEN', label: 'Soles (PEN)' },
    UY: { name: 'Uruguay', currency: 'UYU', label: 'Pesos Uruguayos (UYU)' },
    GLOBAL: { name: 'Internacional / Global', currency: 'USD', label: 'Dólares (USD)' },
  };

  const handleCountrySelect = (code: string) => {
    setCountry(code);
    const matched = countryCurrencyMap[code];
    if (matched) {
      setCurrency(matched.currency);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        homeCountry: country,
        homeCurrency: currency,
        'profile.homeCountry': country,
        'profile.homeCurrency': currency,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: 'País y Moneda Base Actualizados',
        description: `Tu país de origen ha sido configurado como ${countryCurrencyMap[country]?.name || country} (${currency}).`,
      });
    } catch (err) {
      console.error('Error guardando país de origen:', err);
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar la configuración de país.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="mb-6 border border-border shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <CardTitle className="text-base font-bold">País de Origen y Moneda Contable</CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Define la moneda base en la que se consolidan tus ingresos y contabilidad. Los alumnos de tu mismo país accederán a tus pasarelas locales; los alumnos de otros países operarán con pasarelas internacionales (USD).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">País de Residencia Fiscal</Label>
            <Select value={country} onValueChange={handleCountrySelect}>
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="Selecciona tu país" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(countryCurrencyMap).map(([code, item]) => (
                  <SelectItem key={code} value={code} className="text-xs">
                    {item.name} ({code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Moneda Contable Base</Label>
            <Input
              value={countryCurrencyMap[country]?.label || currency}
              disabled
              className="h-10 text-xs bg-muted/40 cursor-not-allowed font-medium"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs font-semibold"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Guardar País y Moneda Base
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TutorPaymentMethodsPage() {
  const { user, profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);

  const isCorporateTutor = isCompanyTutorProfile(profile);

  const methodsQuery = useMemoFirebase(() => {
    if (!user?.uid || isCorporateTutor) return null;
    return query(collection(db, 'users', user.uid, 'paymentMethods'));
  }, [db, user?.uid, isCorporateTutor]);

  // Checking existing methods just for migration logic
  const { data: methods, isLoading: methodsLoading } = useCollection(methodsQuery);

  // Migración automática de datos antiguos del perfil
  useEffect(() => {
    if (isCorporateTutor) return;
    const migrateOldData = async () => {
      if (!user?.uid || methodsLoading || (methods && methods.length > 0) || isMigrating) return;
      
      const oldMP = profile?.profile?.mercadopago;
      if (oldMP?.accessToken || oldMP?.publicKey) {
        setIsMigrating(true);
        try {
          const methodId = `pm_mp_legacy`;
          const methodRef = doc(db, 'users', user.uid, 'paymentMethods', methodId);
          await setDoc(methodRef, {
            id: methodId,
            name: 'Mercado Pago (Migrado)',
            type: 'mercadopago',
            isActive: true,
            config: {
              publicKey: oldMP.publicKey || '',
              accessToken: oldMP.accessToken || '',
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isMigrated: true
          });
          toast({ title: 'Datos migrados', description: 'Tus credenciales de Mercado Pago se han movido a este nuevo sistema.' });
        } catch (e) {
          console.error("Error migrando datos:", e);
        } finally {
          setIsMigrating(false);
        }
      }
    };

    migrateOldData();
  }, [user?.uid, methods, methodsLoading, profile, db, toast, isCorporateTutor, isMigrating]);

  if (!user?.uid) return null;

  if (isCorporateTutor) {
    return (
      <DashboardLayout>
        <CorporateRestrictionNotice
          feature="Métodos de Cobro"
          description="Las pasarelas de pago y métodos de cobro son centralizados y administrados directamente por la empresa. Las cobranzas e inscripciones operan bajo las cuentas corporativas configuradas."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TutorOriginCountryCard user={user} profile={profile} />
      <PaymentMethodsManager 
        title="Métodos de Cobro"
        description="Configura cómo deseas recibir los pagos de tus alumnos."
        collectionPath={`users/${user.uid}/paymentMethods`}
        infoCards={[
          {
            icon: <span className="text-xl">⚡</span>,
            title: "Cobro Directo",
            description: "El dinero va directo a tu cuenta sin intermediarios ni comisiones de BTECH.",
            color: "emerald"
          },
          {
            icon: <span className="text-xl">🌐</span>,
            title: "Página de Ventas",
            description: "Los métodos activos aparecerán automáticamente en tu checkout público.",
            color: "indigo"
          },
          {
            icon: <span className="text-xl">🛡️</span>,
            title: "Seguridad Total",
            description: "Tus credenciales se almacenan de forma segura y encriptada.",
            color: "amber"
          }
        ]}
      />
    </DashboardLayout>
  );
}
