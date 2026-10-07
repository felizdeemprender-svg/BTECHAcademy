/**
 * Tests del dominio catálogo: estados, categorías, niveles,
 * módulos, cursos y sales pages. Dominio puro, sin Firebase.
 */
import { describe, expect, it } from 'vitest';

import {
  CourseStatusSchema,
  isCourseEditable,
  isCoursePublishedLike,
} from '../course-status';
import { CategorySchema } from '../category';
import { LevelSchema } from '../level';
import {
  ModuleSchema,
  hasMasterMaterial,
  isModuleReadyToSave,
  isVideoModule,
  moduleQuestionCount,
} from '../module';
import { CourseSchema, canEnrollInCourse } from '../course';
import {
  SalesPageSchema,
  countAssets,
  isCampaignPack,
  isLandingOnly,
  recommendedCampaignDays,
} from '../sales-page';

describe('course-status', () => {
  it('acepta los 5 estados observados', () => {
    for (const s of ['creating', 'draft', 'pending_terms', 'published', 'approved'] as const) {
      expect(CourseStatusSchema.parse(s)).toBe(s);
    }
  });

  it('rechaza estados desconocidos', () => {
    expect(() => CourseStatusSchema.parse('archived')).toThrow();
  });

  it('helpers de visibilidad y edición', () => {
    expect(isCoursePublishedLike('published')).toBe(true);
    expect(isCoursePublishedLike('approved')).toBe(true);
    expect(isCoursePublishedLike('draft')).toBe(false);
    expect(isCourseEditable('creating')).toBe(true);
    expect(isCourseEditable('draft')).toBe(true);
    expect(isCourseEditable('published')).toBe(false);
  });
});

describe('category y level', () => {
  it('parsean documentos válidos', () => {
    expect(CategorySchema.parse({ id: 'c1', name: 'Negocios' })).toEqual({
      id: 'c1',
      name: 'Negocios',
    });
    expect(LevelSchema.parse({ id: 'l1', name: 'Inicial', order: 0 })).toEqual({
      id: 'l1',
      name: 'Inicial',
      order: 0,
    });
  });

  it('rechazan nombre vacío y orden negativo', () => {
    expect(() => CategorySchema.parse({ id: 'c1', name: '' })).toThrow();
    expect(() => LevelSchema.parse({ id: 'l1', name: 'X', order: -1 })).toThrow();
  });
});

describe('module', () => {
  function baseModule(overrides: Record<string, unknown> = {}) {
    return { id: 'm1', title: 'Clase 1', contentType: 'text', ...overrides };
  }

  it('aplica defaults del formulario de creación', () => {
    const m = ModuleSchema.parse(baseModule());
    expect(m.content).toBe('');
    expect(m.videoUrl).toBe('');
    expect(m.supportMaterials).toEqual([]);
    expect(m.questions).toEqual([]);
    expect(m.minPassingScore).toBe(70);
    expect(m.allowRetries).toBe(true);
    expect(m.enableSupportQuestions).toBe(false);
    expect(m.order).toBe(0);
  });

  it('rechaza título vacío y puntaje fuera de rango', () => {
    expect(() => ModuleSchema.parse(baseModule({ title: '' }))).toThrow();
    expect(() => ModuleSchema.parse(baseModule({ minPassingScore: 101 }))).toThrow();
    expect(() => ModuleSchema.parse(baseModule({ contentType: 'audio' }))).toThrow();
  });

  it('helpers de video, guardado, preguntas y material maestro', () => {
    expect(isVideoModule({ contentType: 'video' })).toBe(true);
    expect(isVideoModule({ contentType: 'text' })).toBe(false);

    expect(isModuleReadyToSave({ contentType: 'text', title: 'A', videoUrl: '' })).toBe(true);
    expect(isModuleReadyToSave({ contentType: 'text', title: '  ', videoUrl: '' })).toBe(false);
    expect(isModuleReadyToSave({ contentType: 'video', title: 'A', videoUrl: '' })).toBe(false);
    expect(
      isModuleReadyToSave({ contentType: 'video', title: 'A', videoUrl: 'https://x' }),
    ).toBe(true);

    const m = ModuleSchema.parse(
      baseModule({
        questions: [{ id: 'q1', text: '¿?', type: 'multiple_choice' }],
        supportQuestions: [{ id: 'q2', text: '¿?', type: 'multiple_choice' }],
        supportMaterials: [{ id: 'f1', name: 'guia.pdf', url: 'https://x', isMaster: true }],
      }),
    );
    expect(moduleQuestionCount(m)).toBe(2);
    expect(hasMasterMaterial(m)).toBe(true);
    expect(hasMasterMaterial({ supportMaterials: [] })).toBe(false);
  });
});

describe('course', () => {
  function baseCourse(overrides: Record<string, unknown> = {}) {
    return {
      id: 'course1',
      mentorId: 'mentor1',
      title: 'Curso Test',
      categoryId: 'c1',
      status: 'draft',
      ...overrides,
    };
  }

  it('parsea alta mínima válida con defaults', () => {
    const c = CourseSchema.parse(baseCourse());
    expect(c.description).toBe('');
    expect(c.tags).toEqual([]);
    expect(c.modulesCount).toBe(0);
    expect(c.studentsCount).toBe(0);
  });

  it('rechaza sin título, sin categoría y mentor vacío', () => {
    expect(() => CourseSchema.parse(baseCourse({ title: '' }))).toThrow();
    expect(() => CourseSchema.parse(baseCourse({ categoryId: '' }))).toThrow();
    expect(() => CourseSchema.parse(baseCourse({ mentorId: '' }))).toThrow();
  });

  it('solo publicado/aprobado acepta inscripciones', () => {
    expect(canEnrollInCourse({ status: 'published' })).toBe(true);
    expect(canEnrollInCourse({ status: 'approved' })).toBe(true);
    expect(canEnrollInCourse({ status: 'draft' })).toBe(false);
    expect(canEnrollInCourse({ status: 'creating' })).toBe(false);
  });
});

describe('sales-page', () => {
  function basePage(overrides: Record<string, unknown> = {}) {
    return {
      id: 'p1',
      mentorId: 'mentor1',
      title: 'Lanzamiento X',
      type: 'campaign_pack',
      ...overrides,
    };
  }

  it('parsea pack con aiContent por defecto vacío', () => {
    const p = SalesPageSchema.parse(basePage());
    expect(p.aiContent).toEqual({ landings: [], socials: [], emails: [], ads: [] });
  });

  it('parsea landing_only con branding', () => {
    const p = SalesPageSchema.parse(
      basePage({
        type: 'landing_only',
        branding: { primaryColor: '#fff', logoUrl: 'https://x/logo.png' },
      }),
    );
    expect(isLandingOnly(p)).toBe(true);
    expect(isCampaignPack(p)).toBe(false);
  });

  it('isCampaignPack replica el filtro actual (!== landing_only)', () => {
    expect(isCampaignPack({ type: 'campaign_pack' })).toBe(true);
    expect(isCampaignPack({ type: 'landing_only' })).toBe(false);
  });

  it('countAssets suma las 4 listas', () => {
    const p = SalesPageSchema.parse(
      basePage({ aiContent: { socials: [1, 2], emails: [1], ads: [], landings: [1] } }),
    );
    expect(countAssets(p.aiContent)).toEqual({
      landings: 1,
      socials: 2,
      emails: 1,
      ads: 0,
      total: 4,
    });
  });

  it('recommendedCampaignDays replica la regla del builder', () => {
    expect(recommendedCampaignDays(0)).toBe(3);
    expect(recommendedCampaignDays(1)).toBe(3);
    expect(recommendedCampaignDays(2)).toBe(5);
    expect(recommendedCampaignDays(3)).toBe(7);
    expect(recommendedCampaignDays(10)).toBe(7);
  });

  it('rechaza sin título y tipos desconocidos', () => {
    expect(() => SalesPageSchema.parse(basePage({ title: '' }))).toThrow();
    expect(() => SalesPageSchema.parse(basePage({ type: 'desconocido' }))).toThrow();
  });
});
