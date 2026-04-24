
'use client';

import { useState, useEffect, useMemo } from 'react';
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

  useEffect(() => {
    if (!courseId || !db) return;
    
    const unsubCourse = onSnapshot(doc(db, 'courses', courseId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setCourse(data);
        if (data.mentorId) {
          onSnapshot(doc(db, 'users', data.mentorId), (mSnap) => {
            if (mSnap.exists()) setMentorProfile(mSnap.data());
          }, (err) => console.warn("⚠️ [V3] Error mentor profile:", err));
        }
      }
    }, (err) => console.error("❌ [V3] Error curso:", err));

    const qMods = query(collection(db, 'courses', courseId, 'modules'), orderBy('order', 'asc'));
    const unsubMods = onSnapshot(qMods, (snap) => {
      // Usando funciones tradicionales para evitar errores de codificación
      const modsData = snap.docs.map(function(d) {
        return { id: d.id, ...d.data() };
      });
      setModules(modsData);
    }, (err) => console.error("❌ [V3] Error módulos:", err));

    return () => {
      unsubCourse();
      unsubMods();
    };
  }, [courseId, db]);

  useEffect(() => {
    if (!courseId || !profile?.uid || !profile?.email || !db) return;

    const qEnroll = query(
      collection(db, 'enrollments'),
      and(
        where('courseId', '==', courseId),
        or(
          where('studentId', '==', profile.uid),
          where('inviteEmail', '==', profile.email.toLowerCase().trim())
        )
      )
    );

    const unsubEnroll = onSnapshot(qEnroll, (snap) => {
      if (!snap.empty) {
        const docData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setEnrollment(docData);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("❌ [V3] Error inscripción:", err);
      setIsLoading(false);
    });

    return () => unsubEnroll();
  }, [courseId, profile?.uid, profile?.email, db]);

  useEffect(() => {
    if (!profile?.uid || !modules[activeModuleIndex]?.id) return;
    const key = "btech_draft_" + profile.uid + "_" + courseId + "_" + modules[activeModuleIndex].id;
    const saved = localStorage.getItem(key);
    setUserAnswers(saved ? JSON.parse(saved) : {});
  }, [profile?.uid, activeModuleIndex, modules, courseId]);

  const saveQuizDraft = (answers: Record<string, any>) => {
    if (!profile?.uid || !modules[activeModuleIndex]?.id) return;
    const key = "btech_draft_" + profile.uid + "_" + courseId + "_" + modules[activeModuleIndex].id;
    localStorage.setItem(key, JSON.stringify(answers));
  };

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
      const needsSupport = mod.enableSupportQuestions && mod.supportQuestions?.length > 0;
      
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
    setUserAnswers: function(a) {
      setUserAnswers(a);
      saveQuizDraft(a);
    },
    saveQuizDraft,
    progressPercent
  };
}
