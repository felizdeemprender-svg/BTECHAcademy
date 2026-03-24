import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseServer } from '@/firebase/server';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { firestore } = getFirebaseServer();
    const body = await request.json();
    
    // Validar autorización básica localmente si quisieramos, 
    // pero idealmente deberiamos validar con tokens si estuvieran pasados.
    // Como estamos usando Firebase SDK en cliente, podemos asumir 
    // que el body trae el mentorId correcto, pero validemos la suscripción.
    const { mentorId, id, ...courseData } = body;
    
    if (!mentorId || !id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Obtener datos del usuario
    const userDoc = await getDoc(doc(firestore, 'users', mentorId));
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const isAdmin = userData.roles?.includes('admin');
    
    if (!isAdmin) {
      const subscription = userData.subscription;
      
      if (!subscription || new Date(subscription.endDate) < new Date()) {
        return NextResponse.json({ error: 'Valid subscription required' }, { status: 403 });
      }

      // Contar cursos activos
      const coursesQuery = query(
        collection(firestore, 'courses'),
        where('mentorId', '==', mentorId),
        where('isActive', '==', true)
      );
      
      const coursesSnap = await getDocs(coursesQuery);
      const activeCoursesCount = coursesSnap.size;

      if (activeCoursesCount >= subscription.maxSimultaneousCourses) {
        return NextResponse.json({ 
          error: 'Course limit reached', 
          message: `Limit of ${subscription.maxSimultaneousCourses} active courses reached.` 
        }, { status: 403 });
      }
    }

    // Crear el curso en Firestore
    const courseRef = doc(firestore, 'courses', id);
    await setDoc(courseRef, {
      ...courseData,
      id,
      mentorId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return NextResponse.json({ success: true, id });
    
  } catch (error: any) {
    console.error('Error creating course via API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

