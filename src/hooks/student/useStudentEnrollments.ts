
import { useState, useEffect } from 'react';
import { collection, query, where, doc, getDoc, getDocs, or } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { EnrolledCourseWithData, StudentEnrollment } from '@/types/student';

export function useStudentEnrollments() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const db = useFirestore();
  const [coursesWithData, setCoursesWithData] = useState<EnrolledCourseWithData[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const enrollmentsQuery = useMemoFirebase(() => {
    if (!profile?.uid || isAuthLoading) return null;
    const ref = collection(db, 'enrollments');
    const userEmail = profile.email?.toLowerCase().trim();

    if (userEmail) {
      return query(
        ref, 
        or(
          where('studentId', '==', profile.uid),
          where('inviteEmail', '==', userEmail)
        )
      );
    } else {
      return query(ref, where('studentId', '==', profile.uid));
    }
  }, [db, profile?.uid, profile?.email, isAuthLoading]);

  const { data: enrollments, isLoading: loadingEnrollments, error } = useCollection(enrollmentsQuery);

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
            const courseRef = doc(db, 'courses', enroll.courseId);
            const courseSnap = await getDoc(courseRef);
            
            if (!courseSnap.exists()) return null;
            
            const courseData = courseSnap.data();
            
            let modulesCount = courseData.modulesCount;
            if (!modulesCount) {
              const modulesSnap = await getDocs(collection(db, 'courses', enroll.courseId, 'modules'));
              modulesCount = modulesSnap.size;
            }

            return {
              ...enroll,
              courseData: { ...courseData, id: courseSnap.id, modulesCount }
            } as EnrolledCourseWithData;
          })
        );
        
        setCoursesWithData(joinedData.filter((d): d is EnrolledCourseWithData => d !== null));
      } catch (error) {
        console.error("Error al cargar detalles de cursos:", error);
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
