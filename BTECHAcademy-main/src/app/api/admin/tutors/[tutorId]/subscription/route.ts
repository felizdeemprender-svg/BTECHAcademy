import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseServer } from '@/firebase/server';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

interface SubscriptionData {
  hasCustomPage: boolean;
  subscriptionType: 'fixed' | 'percentage' | 'free';
  fixedAmount?: number;
  percentageRate?: number;
  requiresFreeCourses: boolean;
  freeCoursesCount: number;
  invitationsPerCourse: number;
  observations: string;
  status?: 'active' | 'inactive' | 'trial' | 'cancelled';
  isPublic: boolean;
  isEnterprise: boolean;
  limits?: {
    maxCourses: number;
    maxStudents: number;
    hasCustomBranding: boolean;
    hasAnalytics: boolean;
    hasPrioritySupport: boolean;
  };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tutorId: string }> }
) {
  try {
    const { firestore } = getFirebaseServer();
    const tutorId = (await params).tutorId;
    const subscriptionData: SubscriptionData = await request.json();
    
    // Validar que el tutor exista
    const tutorDoc = await getDoc(doc(firestore, 'users', tutorId));
    if (!tutorDoc.exists()) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }
    
    // Validaciones de los datos
    const validation = validateSubscriptionData(subscriptionData);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error, field: validation.field },
        { status: 400 }
      );
    }
    
    // Preparar datos para actualizar
    const updateData: any = {
      subscription: {
        ...subscriptionData,
        updatedAt: serverTimestamp(),
        updatedBy: 'admin' // TODO: Obtener ID del admin autenticado
      }
    };
    
    // Si se está activando la suscripción, establecer fechas
    if (subscriptionData.status === 'active' && !tutorDoc.data().subscription?.startDate) {
      updateData.subscription.startDate = serverTimestamp();
      updateData.subscription.endDate = null; // Sin fecha de fin por ahora
    }
    
    // Actualizar documento del tutor
    await updateDoc(doc(firestore, 'users', tutorId), updateData);
    
    // Obtener datos actualizados para respuesta
    const updatedDoc = await getDoc(doc(firestore, 'users', tutorId));
    const updatedData = updatedDoc.data();
    
    if (!updatedData) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: updatedData.subscription
    });
    
  } catch (error) {
    console.error('Error updating tutor subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

function validateSubscriptionData(data: SubscriptionData) {
  // Validar tipo de abono y montos
  if (data.subscriptionType === 'fixed') {
    if (!data.fixedAmount || data.fixedAmount <= 0) {
      return { 
        isValid: false, 
        error: 'El monto fijo debe ser mayor a 0', 
        field: 'fixedAmount' 
      };
    }
    if (data.fixedAmount > 10000) {
      return { 
        isValid: false, 
        error: 'El monto fijo no puede exceder $10,000 USD', 
        field: 'fixedAmount' 
      };
    }
  }
  
  if (data.subscriptionType === 'percentage') {
    if (data.percentageRate === undefined || data.percentageRate < 0) {
      return { 
        isValid: false, 
        error: 'El porcentaje debe ser mayor o igual a 0', 
        field: 'percentageRate' 
      };
    }
    if (data.percentageRate > 100) {
      return { 
        isValid: false, 
        error: 'El porcentaje no puede exceder el 100%', 
        field: 'percentageRate' 
      };
    }
  }
  
  // Validar cursos gratuitos
  if (data.requiresFreeCourses) {
    if (!data.freeCoursesCount || data.freeCoursesCount < 1) {
      return { 
        isValid: false, 
        error: 'Debe especificar al menos 1 curso gratuito', 
        field: 'freeCoursesCount' 
      };
    }
    if (data.freeCoursesCount > 10) {
      return { 
        isValid: false, 
        error: 'No puede exigir más de 10 cursos gratuitos', 
        field: 'freeCoursesCount' 
      };
    }
  }
  
  // Validar invitaciones
  if (data.invitationsPerCourse < 0) {
    return { 
      isValid: false, 
      error: 'Las invitaciones no pueden ser negativas', 
      field: 'invitationsPerCourse' 
    };
  }
  if (data.invitationsPerCourse > 1000) {
    return { 
      isValid: false, 
      error: 'Las invitaciones por curso no pueden exceder 1000', 
      field: 'invitationsPerCourse' 
    };
  }
  
  // Validar límites si se proporcionan
  if (data.limits) {
    if (data.limits.maxCourses < 1 || data.limits.maxCourses > 100) {
      return { 
        isValid: false, 
        error: 'El máximo de cursos debe estar entre 1 y 100', 
        field: 'limits.maxCourses' 
      };
    }
    if (data.limits.maxStudents < 1 || data.limits.maxStudents > 10000) {
      return { 
        isValid: false, 
        error: 'El máximo de estudiantes debe estar entre 1 y 10,000', 
        field: 'limits.maxStudents' 
      };
    }
  }
  
  // Validar longitud de observaciones
  if (data.observations && data.observations.length > 2000) {
    return { 
      isValid: false, 
      error: 'Las observaciones no pueden exceder 2000 caracteres', 
      field: 'observations' 
    };
  }
  
  return { isValid: true };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tutorId: string }> }
) {
  try {
    const { firestore } = getFirebaseServer();
    const tutorId = (await params).tutorId;
    
    const tutorDoc = await getDoc(doc(firestore, 'users', tutorId));
    
    if (!tutorDoc.exists()) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }
    
    const data = tutorDoc.data();
    
    // Configuración por defecto si no tiene suscripción
    const defaultSubscription = {
      hasCustomPage: false,
      subscriptionType: 'free' as const,
      fixedAmount: 0,
      percentageRate: 0,
      requiresFreeCourses: false,
      freeCoursesCount: 0,
      invitationsPerCourse: 10,
      observations: '',
      status: 'inactive' as const,
      limits: {
        maxCourses: 3,
        maxStudents: 50,
        hasCustomBranding: false,
        hasAnalytics: false,
        hasPrioritySupport: false
      }
    };
    
    return NextResponse.json({
      tutor: {
        id: tutorId,
        displayName: data.displayName || data.email?.split('@')[0] || 'Sin nombre',
        email: data.email || '',
        username: data.username || '',
        photoURL: data.photoURL || '',
        subscription: data.subscription || defaultSubscription
      }
    });
    
  } catch (error) {
    console.error('Error fetching tutor subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutor subscription' },
      { status: 500 }
    );
  }
}
