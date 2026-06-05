import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';

export async function GET() {
  try {
    // 1. Consultar ambas posibles colecciones (CamelCase y Kebab-case)
    const [snap1, snap2] = await Promise.all([
      adminDb.collection('subscriptionPlans').get(),
      adminDb.collection('subscription-plans').get()
    ]);

    console.log(`[API_PLANS_DEBUG] Found in subscriptionPlans: ${snap1.size}`);
    console.log(`[API_PLANS_DEBUG] Found in subscription-plans: ${snap2.size}`);

    const allPlans = [
      ...snap1.docs.map(doc => ({ ...doc.data(), id: doc.id, _source: 'camelCase' })),
      ...snap2.docs.map(doc => ({ ...doc.data(), id: doc.id, _source: 'kebab-case' }))
    ];

    // 2. Normalizar y limpiar (Asegurar que tengan los campos mínimos para mostrarse)
    const normalizedPlans = allPlans.map((plan: any) => ({
      ...plan,
      name: plan.name || 'Plan sin nombre',
      price: Number(plan.price || 0),
      isActive: plan.isActive ?? true, // Si no tiene el campo, asumimos true para el debug
      aiQuotas: plan.aiQuotas || { totalCredits: 0 },
      limits: plan.limits || { maxCourses: 5, maxStudents: 100 }
    }));

    return NextResponse.json({ 
      plans: normalizedPlans,
      debug: {
        camelCaseSize: snap1.size,
        kebabCaseSize: snap2.size
      }
    });

  } catch (error: any) {
    console.error('[API_PLANS_ERROR]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
