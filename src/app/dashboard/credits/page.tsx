'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, ArrowUpCircle, Clock, Activity, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default function TutorCreditsDashboard() {
  const { profile, user } = useAuth();
  const db = useFirestore();

  // Consultar últimos movimientos
  const txQuery = user ? query(
    collection(db, 'users', user.uid, 'ai_transactions'),
    orderBy('timestamp', 'desc'),
    limit(50)
  ) : null;
  const { data: transactions, isLoading: loadingTx } = useCollection(txQuery);

  if (!user || !profile) {
    return <DashboardLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div></DashboardLayout>;
  }

  const quotas = profile.subscription?.aiQuotas || { totalCredits: 0, usedCredits: 0 };
  const total = quotas.totalCredits || 0;
  const used = quotas.usedCredits || 0;
  const balance = Math.max(0, total - used);
  const usagePercentage = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 100;
  
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Consumo de IA</h1>
            <p className="text-muted-foreground mt-2">Monitorea la cuota de generación de tu Plan Mensual.</p>
          </div>
          <Link href="/dashboard/plan">
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-6 shadow-primary/20">
              <ArrowUpCircle className="w-4 h-4 mr-2" /> Mejorar Plan
            </Button>
          </Link>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Balance Widget */}
          <Card className="md:col-span-2 border-none rounded-lg bg-gradient-to-br from-primary to-foreground text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Zap className="w-32 h-32" />
            </div>
            <CardContent className="p-10 relative z-10 flex flex-col justify-between h-full min-h-[220px]">
              <div>
                <p className="text-primary-foreground/80 font-bold tracking-widest uppercase text-xs">Créditos Disponibles</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-6xl font-black tracking-tighter">{balance.toLocaleString('es-AR')}</span>
                  <span className="text-xl font-bold text-primary-foreground/60">/ {total.toLocaleString('es-AR')}</span>
                </div>
                
                {/* Progress bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-xs font-bold mb-1.5 text-primary-foreground/80">
                    <span>Consumido: {used.toLocaleString('es-AR')}</span>
                    <span>{usagePercentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${usagePercentage > 90 ? 'bg-danger' : 'bg-success'}`} 
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm text-primary-foreground/80">
                  Tus créditos se renuevan automáticamente cada mes según tu nivel de suscripción.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-none rounded-lg bg-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-4 h-4 text-success" /> Resumen del Mes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-muted-foreground">Evaluaciones a Alumnos</span>
                  <span className="font-bold text-primary">60%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-success w-[60%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-muted-foreground">Generación de Videos</span>
                  <span className="font-bold text-primary">30%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-warn w-[30%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-muted-foreground">ADN y Marketing</span>
                  <span className="font-bold text-primary">10%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[10%] rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card className="border-none rounded-lg overflow-hidden bg-white">
          <CardHeader className="border-b bg-muted/50 p-6">
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-muted-foreground" /> Últimos Movimientos (10 días)</CardTitle>
            <CardDescription>Historial de consumo automático de IA.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingTx ? (
              <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : transactions?.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground font-medium">No has consumido créditos en los últimos 10 días.</div>
            ) : (
              <div className="divide-y">
                {transactions?.map((tx: any) => (
                  <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-muted transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center text-danger">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground capitalize">
                          {tx.actionType.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs font-bold text-muted-foreground">
                          {tx.timestamp ? formatDistanceToNow(tx.timestamp.toDate(), { addSuffix: true, locale: es }) : 'Reciente'}
                          {tx.model && ` • Modelo: ${tx.model.split('/')[1] || tx.model}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-danger text-lg">{tx.amount} cr</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
