
'use client';

import { useState } from 'react';

export function useCourseProgress(courseId: string) {
  return {
    course: { title: 'Cargando...' },
    mentorProfile: null,
    modules: [],
    enrollment: { id: 'mock' },
    isLoading: false,
    activeModule: null,
    activeModuleIndex: 0,
    setActiveModuleIndex: () => {},
    userAnswers: {},
    setUserAnswers: () => {},
    saveQuizDraft: async () => {},
    progressPercent: 0
  };
}
