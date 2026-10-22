'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { PaymentMethodsManager } from '@/components/dashboard/payment-methods-manager';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { isCompanyTutorProfile } from '@/domain/company';
import { CorporateRestrictionNotice } from '@/components/company/corporate-restriction-notice';

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
