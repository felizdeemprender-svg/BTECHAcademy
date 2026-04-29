import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { SubscriptionStatus } from '@/types/subscription';

export interface TutorBillingRow {
  id: string;
  displayName: string;
  email: string;
  username: string;
  photoURL: string;
  subscriptionType: 'fixed' | 'percentage' | 'free';
  subscriptionStatus: string;
  fixedAmount: number;
  percentageRate: number;
  startDate: string | null;
  endDate: string | null;
  // Calculados
  activeCoursesCount: number;
  totalSalesCount: number;       // Solo para type=percentage
  totalSalesRevenue: number;     // Solo para type=percentage
  billedAmount: number;          // Lo que la plataforma factura a este tutor
  planName: string;
}

export interface BillingReport {
  period: { from: string; to: string };
  summary: {
    totalBilled: number;
    fixedBilled: number;
    percentageBilled: number;
    fixedTutorsCount: number;
    percentageTutorsCount: number;
    freeTutorsCount: number;
    totalActiveTutors: number;
  };
  byType: {
    type: string;
    label: string;
    count: number;
    totalBilled: number;
    avgBilled: number;
  }[];
  tutors: TutorBillingRow[];
}

export async function GET(request: NextRequest) {
  try {
    const firestore = getAdminFirestore();
    const { searchParams } = new URL(request.url);
    
    // Rango de fechas (default: mes actual)
    const now = new Date();
    const fromStr = searchParams.get('from') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const toStr = searchParams.get('to') || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr);

    // 1. Obtener TODOS los tutores (roles mentor)
    const usersSnap = await firestore.collection('users')
      .where('roles', 'array-contains', 'mentor')
      .get();

    // 2. Obtener TODAS las salesPages para mapear precios por curso
    const salesPagesSnap = await firestore.collection('salesPages').get();
    const salesPagesByMentor: Record<string, { conversions: number; revenue: number }> = {};
    const priceByCourse: Record<string, number> = {};
    const mentorByCourse: Record<string, string> = {};
    
    for (const sp of salesPagesSnap.docs) {
      const data = sp.data();
      if (!data.mentorId || !data.courseId) continue;
      
      const mentorId = data.mentorId as string;
      const courseId = data.courseId as string;
      const price = (data.price as number) || 0;

      // Guardar mapeo para cargas directas
      if (data.isActive && (!priceByCourse[courseId] || price > priceByCourse[courseId])) {
        priceByCourse[courseId] = price;
        mentorByCourse[courseId] = mentorId;
      }

      if (!data.isActive) continue;
      
      const conversions = (data.stats?.conversions as number) || 0;
      const revenue = price * conversions;
      
      if (!salesPagesByMentor[mentorId]) {
        salesPagesByMentor[mentorId] = { conversions: 0, revenue: 0 };
      }
      salesPagesByMentor[mentorId].conversions += conversions;
      salesPagesByMentor[mentorId].revenue += revenue;
    }

    // 2.5. Sumar Cargas Directas (isDirect) a la facturación
    const directEnrollSnap = await firestore.collection('enrollments')
      .where('isDirect', '==', true)
      .get();

    for (const enrollDoc of directEnrollSnap.docs) {
      const data = enrollDoc.data();
      let enrolledAt: Date | null = null;
      
      if (data.enrolledAt?.toDate) {
        enrolledAt = data.enrolledAt.toDate();
      } else if (data.enrolledAt) {
        enrolledAt = new Date(data.enrolledAt);
      }
      
      // Filtrar por periodo
      if (enrolledAt && (enrolledAt < fromDate || enrolledAt > toDate)) continue;

      const courseId = data.courseId as string;
      const mentorId = mentorByCourse[courseId];
      const price = priceByCourse[courseId] || 0;

      if (mentorId) {
        if (!salesPagesByMentor[mentorId]) {
          salesPagesByMentor[mentorId] = { conversions: 0, revenue: 0 };
        }
        salesPagesByMentor[mentorId].conversions += 1;
        salesPagesByMentor[mentorId].revenue += price;
      }
    }

    // 3. Obtener conteo de cursos activos por mentor
    const coursesSnap = await firestore.collection('courses')
      .where('isActive', '==', true)
      .get();

    const coursesByMentor: Record<string, number> = {};
    for (const c of coursesSnap.docs) {
      const mentorId = c.data().mentorId as string;
      if (mentorId) {
        coursesByMentor[mentorId] = (coursesByMentor[mentorId] || 0) + 1;
      }
    }

    // 4. Construir filas por tutor
    const tutors: TutorBillingRow[] = [];
    let totalFixed = 0;
    let totalPercentage = 0;
    let countFixed = 0;
    let countPercentage = 0;
    let countFree = 0;

    for (const userDoc of usersSnap.docs) {
      const u = userDoc.data();
      const sub = u.subscription;
      
      if (!sub) continue;

      const subType: 'fixed' | 'percentage' | 'free' = sub.type || 'free';
      const subStatus = sub.status || SubscriptionStatus.NONE;
      const isActive = subStatus === SubscriptionStatus.ACTIVE || subStatus === 'active';
      
      if (!isActive) continue; // Solo tutores activos en el reporte

      const fixedAmount = (sub.fixedAmount as number) || 0;
      const percentageRate = (sub.percentageRate as number) || 0;
      
      const salesData = salesPagesByMentor[userDoc.id] || { conversions: 0, revenue: 0 };
      const activeCoursesCount = coursesByMentor[userDoc.id] || 0;

      let billedAmount = 0;
      if (subType === 'fixed') {
        billedAmount = fixedAmount;
        totalFixed += billedAmount;
        countFixed++;
      } else if (subType === 'percentage') {
        billedAmount = (salesData.revenue * percentageRate) / 100;
        totalPercentage += billedAmount;
        countPercentage++;
      } else {
        countFree++;
      }

      tutors.push({
        id: userDoc.id,
        displayName: (u.displayName as string) || (u.email as string)?.split('@')[0] || 'Tutor',
        email: (u.email as string) || '',
        username: (u.username as string) || '',
        photoURL: (u.photoURL as string) || '',
        subscriptionType: subType,
        subscriptionStatus: subStatus,
        fixedAmount,
        percentageRate,
        startDate: sub.startDate || null,
        endDate: sub.endDate || null,
        activeCoursesCount,
        totalSalesCount: salesData.conversions,
        totalSalesRevenue: salesData.revenue,
        billedAmount,
        planName: (sub.planName as string) || (sub.name as string) || 'Sin plan',
      });
    }

    // Ordenar por monto facturado desc
    tutors.sort((a, b) => b.billedAmount - a.billedAmount);

    const report: BillingReport = {
      period: { from: fromStr, to: toStr },
      summary: {
        totalBilled: totalFixed + totalPercentage,
        fixedBilled: totalFixed,
        percentageBilled: totalPercentage,
        fixedTutorsCount: countFixed,
        percentageTutorsCount: countPercentage,
        freeTutorsCount: countFree,
        totalActiveTutors: countFixed + countPercentage + countFree,
      },
      byType: [
        {
          type: 'fixed',
          label: 'Abono Fijo',
          count: countFixed,
          totalBilled: totalFixed,
          avgBilled: countFixed > 0 ? totalFixed / countFixed : 0,
        },
        {
          type: 'percentage',
          label: 'Por Porcentaje',
          count: countPercentage,
          totalBilled: totalPercentage,
          avgBilled: countPercentage > 0 ? totalPercentage / countPercentage : 0,
        },
        {
          type: 'free',
          label: 'Gratuito',
          count: countFree,
          totalBilled: 0,
          avgBilled: 0,
        },
      ],
      tutors,
    };

    return NextResponse.json(report);

  } catch (error: any) {
    console.error('[/api/admin/billing] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate billing report', details: error?.message },
      { status: 500 }
    );
  }
}
