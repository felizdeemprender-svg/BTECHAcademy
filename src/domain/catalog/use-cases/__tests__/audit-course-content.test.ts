import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditCourseContent, type AuditCourseGateway } from '../audit-course-content';
import type { AiAuditingGateway } from '@/domain/auditing/use-cases/log-ai-interaction';

describe('auditCourseContent Use Case', () => {
  let gateway: import('vitest').Mocked<AuditCourseGateway>;
  let ai: import('vitest').Mocked<AiAuditingGateway>;

  beforeEach(() => {
    gateway = {
      getCourseData: vi.fn(),
      flagCourse: vi.fn(),
      markCourseSafe: vi.fn(),
    };

    ai = {
      hasSufficientCredits: vi.fn(),
      deductCredits: vi.fn(),
      logAuditRecord: vi.fn(),
      scanContentForSensitiveTopics: vi.fn(),
    };
  });

  it('fails if input is invalid', async () => {
    const result = await auditCourseContent({ gateway, ai }, {
      mentorId: '',
      courseId: '',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('fails if course is not found', async () => {
    gateway.getCourseData.mockResolvedValue(null);

    const result = await auditCourseContent({ gateway, ai }, {
      mentorId: 'mentor1',
      courseId: 'course1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('fails if mentor does not own the course', async () => {
    gateway.getCourseData.mockResolvedValue({
      id: 'course1',
      title: 'Course 1',
      description: 'Desc',
      mentorId: 'mentor2', // different mentor
      modules: []
    });

    const result = await auditCourseContent({ gateway, ai }, {
      mentorId: 'mentor1',
      courseId: 'course1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('marks course as safe if AI returns safe', async () => {
    gateway.getCourseData.mockResolvedValue({
      id: 'course1',
      title: 'Course Safe',
      description: 'A very safe description.',
      mentorId: 'mentor1',
      modules: [{ title: 'Module 1', content: 'Normal content' }]
    });

    ai.scanContentForSensitiveTopics.mockResolvedValue({ isSafe: true });

    const result = await auditCourseContent({ gateway, ai }, {
      mentorId: 'mentor1',
      courseId: 'course1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isSafe).toBe(true);
      expect(gateway.markCourseSafe).toHaveBeenCalledWith('course1');
      expect(gateway.flagCourse).not.toHaveBeenCalled();
    }
  });

  it('flags course if AI returns unsafe', async () => {
    gateway.getCourseData.mockResolvedValue({
      id: 'course1',
      title: 'Course Unsafe',
      description: 'Estafa asegurada',
      mentorId: 'mentor1',
      modules: []
    });

    ai.scanContentForSensitiveTopics.mockResolvedValue({ isSafe: false, reason: 'Contiene palabra: estafa' });

    const result = await auditCourseContent({ gateway, ai }, {
      mentorId: 'mentor1',
      courseId: 'course1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isSafe).toBe(false);
      expect(result.value.reason).toBe('Contiene palabra: estafa');
      expect(gateway.flagCourse).toHaveBeenCalledWith('course1', 'Contiene palabra: estafa');
      expect(gateway.markCourseSafe).not.toHaveBeenCalled();
      expect(ai.logAuditRecord).toHaveBeenCalledWith(expect.objectContaining({
        courseId: 'course1',
        status: 'flagged'
      }));
    }
  });
});
