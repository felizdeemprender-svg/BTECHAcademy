'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Rocket, Crown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'free' | 'fixed' | 'percentage';
  price?: number;
  percentageRate?: number;
  features: string[];
  isPublic: boolean;
  isActive: boolean;
  limits: {
    maxCourses: number;
    maxStudents: number;
  };
}

export default function PlansSection() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicPlans = async () => {
      try {
        const response = await fetch('/api/tutors/featured');
        if (response.ok) {
          const data = await response.json();
          // La API ya devuelve solo los públicos y activos
          const publicSubs = (data.subscriptions || []).map((sub: any) => ({
            id: sub.id,
            name: sub.tutorName || 'Plan Institucional',
            type: sub.subscriptionType,
            price: sub.fixedAmount,
            percentageRate: sub.percentageRate,
            features: sub.features || ['Acceso completo', 'Soporte premium', 'Certificaciones'],
            isPublic: true,
            isActive: true,
            limits: sub.limits || { maxCourses: 10, maxStudents: 200 }
          }));
          setPlans(publicSubs);
        }
      } catch (error) {
        console.error('Error loading featured subscriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicPlans();
  }, []);

  if (loading) return (
    <div className="grid md:grid-cols-3 gap-8 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-[500px] bg-secondary/20 rounded-3xl" />
      ))}
    </div>
  );

  if (plans.length === 0) return null;

  return (
    <section className="py-24 bg-gradient-to-b from-transparent to-primary/5">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="px-4 py-1 rounded-full border-primary/20 text-primary font-bold">Abonos Institucionales</Badge>
          <h2 className="text-4xl lg:text-5xl font-bold text-primary tracking-tight">Escala tu <span className="text-accent underline decoration-accent/30">Academia</span></h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Planes diseñados para mentores individuales y grandes instituciones que buscan liderar la educación con IA.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <Card key={plan.id} className={cn(
              "relative border-2 border-border/50 bg-card/50 backdrop-blur-xl rounded-lg overflow-hidden transition-all duration-500 group",
              plan.type === 'percentage' && "border-accent/40 shadow-accent/5 ring-1 ring-accent/20"
            )}>
              {plan.type === 'percentage' && (
                <div className="absolute top-0 right-0 p-6">
                  <div className="bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                    <Crown className="w-3 h-3" /> Popular
                  </div>
                </div>
              )}
              
              <CardHeader className="p-8 pb-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500",
                  plan.type === 'free' ? "bg-muted text-muted-foreground" :
                  plan.type === 'fixed' ? "bg-primary/10 text-primary" :
                  "bg-accent/10 text-accent"
                )}>
                  {plan.type === 'free' ? <Rocket className="w-7 h-7" /> :
                   plan.type === 'fixed' ? <Sparkles className="w-7 h-7" /> :
                   <Crown className="w-7 h-7" />}
                </div>
                <CardTitle className="text-2xl font-bold text-primary">{plan.name}</CardTitle>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {plan.type === 'free' ? '$0' : 
                     plan.type === 'fixed' ? `$${plan.price}` : 
                     `${plan.percentageRate}%`}
                  </span>
                  <span className="text-muted-foreground font-medium">
                    {plan.type === 'fixed' ? '/mes' : 
                     plan.type === 'percentage' ? 'por venta' : ''}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-8 pt-6 space-y-8">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Star className="w-3 h-3 text-accent fill-accent" /> Incluye:
                  </p>
                  <ul className="space-y-3">
                    {plan.features.slice(0, 6).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm font-medium leading-relaxed group-hover:text-primary transition-colors">
                        <div className="mt-1 bg-primary/10 rounded-full p-0.5 shrink-0">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Cursos</p>
                      <p className="font-bold text-primary">{plan.limits.maxCourses === -1 ? 'Ilimitados' : plan.limits.maxCourses}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Alumnos</p>
                      <p className="font-bold text-primary">{plan.limits.maxStudents === -1 ? 'Ilimitados' : plan.limits.maxStudents}</p>
                    </div>
                  </div>

                  <Link href="/auth">
                    <Button className={cn(
                      "w-full h-14 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95",
                      plan.type === 'percentage' 
                        ? "bg-accent hover:bg-accent/90 text-accent-foreground shadow-accent/20" 
                        : "bg-primary hover:bg-primary/95 shadow-primary/20"
                    )}>
                      Empezar Ahora
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
