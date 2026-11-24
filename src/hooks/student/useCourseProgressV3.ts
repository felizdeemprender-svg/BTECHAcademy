'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { 
  doc, 
  collection, 
  query, 
  orderBy, 
  where, 
  onSnapshot, 
  or,
  and
} from 'firebase/firestore';
import { useAuth } from '@/components/auth-context';
import { CourseDetails, StudentEnrollment, Module } from '@/types/student';

export function useCourseProgressV3(courseId: string) {
  const { profile } = useAuth();
  const db = useFirestore();

  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [mentorProfile, setMentorProfile] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});

  const currentMentorIdRef = useRef<string | null>(null);

  // 1. Suscripción a Curso, Módulos y Mentor (con guard de cambio de ID)
  useEffect(() => {
    if (!courseId || !db) return;
    
    let unsubMentor: (() => void) | null = null;

    const unsubCourse = onSnapshot(doc(db, 'courses', courseId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as CourseDetails;
        setCourse(data);

        // Re-suscribir al mentor solo si el mentorId cambió realmente
        if (data.mentorId && data.mentorId !== currentMentorIdRef.current) {
          currentMentorIdRef.current = data.mentorId;
          if (unsubMentor) {
            unsubMentor();
            unsubMentor = null;
          }
          unsubMentor = onSnapshot(doc(db, 'users', data.mentorId), (mSnap) => {
            if (mSnap.exists()) setMentorProfile(mSnap.data());
          }, (err) => console.warn("[V3] Error mentor profile:", err));
        }
      }
    }, (err) => console.error("[V3] Error curso:", err));

    const qMods = query(collection(db, 'courses', courseId, 'modules'), orderBy('order', 'asc'));
    const unsubMods = onSnapshot(qMods, (snap) => {
      const modsData = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Partial<Module>)
      })) as Module[];
      setModules(modsData);
    }, (err) => console.error("[V3] Error modulos:", err));

    return () => {
      unsubCourse();
      unsubMods();
      if (unsubMentor) {
        unsubMentor();
        unsubMentor = null;
      }
    };
  }, [courseId, db]);

  // 2. Suscripción unificada a Matrícula (elimina race conditions y flash de bloqueo)
  useEffect(() => {
    if (!courseId || !profile?.uid || !profile?.email || !db) return;

    const normalizedEmail = profile.email.toLowerCase().trim();
    const qEnrollment = query(
      collection(db, 'enrollments'),
      and(
        where('courseId', '==', courseId),
        or(
          where('studentId', '==', profile.uid),
          where('inviteEmail', '==', normalizedEmail)
        )
      )
    );

    const unsub = onSnapshot(qEnrollment, (snap) => {
      if (!snap.empty) {
        setEnrollment({ id: snap.docs[0].id, ...snap.docs[0].data() } as StudentEnrollment);
      } else {
        setEnrollment(null);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("[V3] Error cargando inscripcion:", err);
      setIsLoading(false);
    });

    return () => {
      unsub();
    };
  }, [courseId, profile?.uid, profile?.email, db]);

  // 3. Persistencia de borradores de respuestas con protección ante fallos de storage
  const activeModuleId = modules[activeModuleIndex]?.id;

  useEffect(() => {
    if (!profile?.uid || !activeModuleId) return;
    const key = `btech_draft_${profile.uid}_${courseId}_${activeModuleId}`;
    try {
      const saved = localStorage.getItem(key);
      setUserAnswers(saved ? JSON.parse(saved) : {});
    } catch (e) {
      console.warn("[V3] Fallo al recuperar borrador de quiz desde localStorage:", e);
      setUserAnswers({});
    }
  }, [profile?.uid, activeModuleId, courseId]);

  const saveQuizDraft = useCallback((answers: Record<string, any>) => {
    if (!profile?.uid || !activeModuleId) return;
    const key = `btech_draft_${profile.uid}_${courseId}_${activeModuleId}`;
    try {
      localStorage.setItem(key, JSON.stringify(answers));
    } catch (e) {
      console.warn("[V3] Fallo al guardar borrador de quiz en localStorage:", e);
    }
  }, [profile?.uid, activeModuleId, courseId]);

  const handleSetUserAnswers = useCallback((answers: Record<string, any>) => {
    setUserAnswers(answers);
    saveQuizDraft(answers);
  }, [saveQuizDraft]);

  // 4. Cálculo memoizado de porcentaje de progreso del estudiante
  const progressPercent = useMemo(() => {
    if (!enrollment || modules.length === 0) return 0;
    
    const completedIds = enrollment.progress?.completedModules || [];
    const evaluations = enrollment.progress?.evaluations || {};
    
    let processedCount = 0;
    
    modules.forEach(mod => {
      const isCompleted = completedIds.includes(mod.id);
      const evaluation = evaluations[mod.id];
      const hasEvaluation = !!evaluation;
      const allowsRetries = mod.allowRetries !== false;
      const needsSupport = !!mod.enableSupportQuestions && (mod.supportQuestions?.length ?? 0) > 0;
      
      if (isCompleted) {
        // Si ya aprobó, cuenta como procesado
        processedCount++;
      } else if (hasEvaluation) {
        // Si reprobó, solo cuenta como procesado si:
        // 1. No permite reintentos Y (no necesita refuerzo o ya lo hizo)
        if (!allowsRetries) {
          if (!needsSupport || evaluation.isSupport) {
            processedCount++;
          }
        }
      }
    });
    
    return Math.round((processedCount / modules.length) * 100);
  }, [enrollment, modules]);

  return {
    course,
    mentorProfile,
    modules,
    enrollment,
    isLoading,
    activeModule: modules[activeModuleIndex],
    activeModuleIndex,
    setActiveModuleIndex,
    userAnswers,
    setUserAnswers: handleSetUserAnswers,
    saveQuizDraft,
    progressPercent
  };
}
