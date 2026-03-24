import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseServer } from '@/firebase/server';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
interface SubscriptionPlan {
  id?: string;
  name: string;
  type: 'free' | 'fixed' | 'percentage';
  price?: number;
  percentageRate?: number;
  durationMonths: number;
  maxSimultaneousCourses: number;
  isActive: boolean;
  features: string[];
  permissions: {
    academic_management: boolean;
    mentor_challenges: boolean;
    students_view: boolean;
    followups_management: boolean;
    marketing_access: boolean;
  };
  limits: {
    maxCourses: number;
    maxStudents: number;
    hasCustomBranding: boolean;
    hasAnalytics: boolean;
    hasPrioritySupport: boolean;
  };
  hasCustomPage: boolean;
  requiresFreeCourses: boolean;
  freeCoursesCount: number;
  invitationsPerCourse: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function GET() {
  try {
    const { firestore } = getFirebaseServer();
    const plansSnapshot = await getDocs(
      query(
        collection(firestore, 'subscriptionPlans'),
        orderBy('createdAt', 'desc')
      )
    );

    const plans = plansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as SubscriptionPlan[];

    return NextResponse.json({ plans });
    
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { firestore } = getFirebaseServer();
    const planData: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'> = await request.json();
    
    // Validaciones
    if (!planData.name || planData.name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre del plan es requerido' },
        { status: 400 }
      );
    }

    if (!planData.features || planData.features.length === 0) {
      return NextResponse.json(
        { error: 'Las características del plan son requeridas' },
        { status: 400 }
      );
    }

    if (planData.type !== 'free' && (planData.price === undefined || planData.price <= 0)) {
      return NextResponse.json(
        { error: 'El precio es requerido para planes de pago' },
        { status: 400 }
      );
    }

    if (planData.type === 'percentage' && (planData.percentageRate === undefined || planData.percentageRate <= 0)) {
      return NextResponse.json(
        { error: 'El porcentaje es requerido para planes porcentuales' },
        { status: 400 }
      );
    }

    if (!planData.durationMonths || planData.durationMonths <= 0) {
      return NextResponse.json(
        { error: 'La duración en meses es requerida' },
        { status: 400 }
      );
    }

    if (!planData.limits || planData.limits.maxCourses === undefined || planData.limits.maxStudents === undefined) {
      return NextResponse.json(
        { error: 'Los límites de cursos y estudiantes son requeridos' },
        { status: 400 }
      );
    }

    // Validar que al menos un permiso esté activo
    if (!planData.permissions || Object.values(planData.permissions).every(p => p === false)) {
      return NextResponse.json(
        { error: 'Al menos un permiso debe estar activo' },
        { status: 400 }
      );
    }

    // Crear documento
    const newPlanRef = await addDoc(collection(firestore, 'subscriptionPlans'), {
      ...planData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const newPlan = {
      id: newPlanRef.id,
      ...planData,
      createdAt: new Date(), // Dummy para respuesta instantánea
      updatedAt: new Date()
    };

    return NextResponse.json({ plan: newPlan }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription plan' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  _context: any
) {
  try {
    const { firestore } = getFirebaseServer();
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const updateData: Partial<SubscriptionPlan> = await request.json();
    
    // Validaciones
    if (updateData.type === 'free' && updateData.price && updateData.price > 0) {
      return NextResponse.json(
        { error: 'Los planes gratuitos no pueden tener precio' },
        { status: 400 }
      );
    }

    if (updateData.type === 'fixed' && updateData.percentageRate) {
      return NextResponse.json(
        { error: 'Los planes fijos no pueden tener porcentaje' },
        { status: 400 }
      );
    }

    if (updateData.type === 'percentage' && updateData.price) {
      return NextResponse.json(
        { error: 'Los planes porcentuales no pueden tener precio fijo' },
        { status: 400 }
      );
    }

    // Actualizar documento
    await updateDoc(doc(firestore, 'subscriptionPlans', id), {
      ...updateData,
      updatedAt: serverTimestamp()
    });

    return NextResponse.json({ 
      message: 'Plan actualizado exitosamente',
      id 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  _context: any
) {
  try {
    const { firestore } = getFirebaseServer();
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    
    // Verificar si el plan existe
    const planDoc = await getDoc(doc(firestore, 'subscriptionPlans', id));
    
    if (!planDoc.exists()) {
      return NextResponse.json(
        { error: 'Plan no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar documento
    await deleteDoc(doc(firestore, 'subscriptionPlans', id));

    return NextResponse.json({ 
      message: 'Plan eliminado exitosamente',
      id 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription plan' },
      { status: 500 }
    );
  }
}

