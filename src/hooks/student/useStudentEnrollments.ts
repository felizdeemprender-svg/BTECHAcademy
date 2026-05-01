
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, doc, getDoc, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { StudentEnrollment, CourseDetails } from '@/types/student';

export interface EnrolledCourseWithData extends StudentEnrollment {
  courseData: CourseDetails;
}

export function useStudentEnrollments() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const db = useFirestore();
  const [coursesWithData, setCoursesWithData] = useState<EnrolledCourseWithData[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const idQuery = useMemoFirebase(() => {
    if (!profile?.uid || isAuthLoading) return null;
    return query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
  }, [db, profile?.uid, isAuthLoading]);

  const emailQuery = useMemoFirebase(() => {
    if (!profile?.email || isAuthLoading) return null;
    return query(collection(db, 'enrollments'), where('inviteEmail', '==', profile.email.toLowerCase().trim()));
  }, [db, profile?.email, isAuthLoading]);

  const { data: enrollmentsById, isLoading: loadingId, error: errorId } = useCollection(idQuery);
  const { data: enrollmentsByEmail, isLoading: loadingEmail, error: errorEmail } = useCollection(emailQuery);

  const enrollments = useMemo(() => {
    const combined = [...(enrollmentsById || []), ...(enrollmentsByEmail || [])];
    // Eliminar duplicados por ID de documento
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    return unique;
  }, [enrollmentsById, enrollmentsByEmail]);

  const loadingEnrollments = loadingId || loadingEmail;
  const error = errorId || errorEmail;

  if (error) {
    console.warn("⚠️ useStudentEnrollments: Error de permisos o consulta capturado.", error);
  }

  useEffect(() => {
    const fetchCourseDetails = async () => {
      if (!enrollments) {
        if (!loadingEnrollments) setLoadingDetails(false);
        return;
      }

      setLoadingDetails(true);
      try {
        const joinedData = await Promise.all(
          enrollments.map(async (enroll: any) => {
            if (!enroll || typeof enroll !== 'object' || !enroll.courseId) {
              console.warn("⚠️ useStudentEnrollments: Inscripción inválida:", enroll);
              return null;
            }

            try {
              const courseRef = doc(db, 'courses', enroll.courseId);
              const courseSnap = await getDoc(courseRef);
              
              if (!courseSnap.exists()) {
                console.warn(`⚠️ useStudentEnrollments: Curso ${enroll.courseId} no existe.`);
                return null;
              }
              
              const courseData = courseSnap.data() || {};
              
              let modulesCount = courseData.modulesCount || 0;
              
              // Solo buscar módulos si no tenemos el contador y el ID es válido
              if (!modulesCount && enroll.courseId) {
                try {
                  const modulesSnap = await getDocs(collection(db, 'courses', enroll.courseId, 'modules'));
                  modulesCount = modulesSnap.size;
                } catch (mErr) {
                  console.warn(`⚠️ No se pudieron cargar módulos para ${enroll.courseId}:`, mErr);
                  modulesCount = 0; 
                }
              }

              return {
                ...enroll,
                courseData: { 
                  ...courseData, 
                  id: courseSnap.id, 
                  modulesCount 
                }
              } as EnrolledCourseWithData;
            } catch (err) {
              console.error(`❌ Error procesando inscripción ${enroll.id}:`, err);
              return null;
            }
          })
        );
        
        const filtered = joinedData.filter((d: any): d is EnrolledCourseWithData => d !== null);
        setCoursesWithData(filtered);
      } catch (error) {
        console.error("❌ Error crítico en fetchCourseDetails:", error);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchCourseDetails();
  }, [db, enrollments, loadingEnrollments]);

  return {
    enrollments: coursesWithData,
    isLoading: loadingEnrollments || loadingDetails,
    isEmpty: !loadingEnrollments && !loadingDetails && coursesWithData.length === 0
  };
}
