import { describe, it, expect, vi, beforeEach } from 'vitest';
import { manualEnrollment, type ManualEnrollmentGateway, type ManualEnrollmentEmailService } from '../manual-enrollment';

describe('manualEnrollment Use Case', () => {
  let gateway: import('vitest').Mocked<ManualEnrollmentGateway>;
  let emails: import('vitest').Mocked<ManualEnrollmentEmailService>;

  beforeEach(() => {
    gateway = {
      getCourseInfo: vi.fn(),
      checkEnrollmentExists: vi.fn(),
      findOrCreateStudent: vi.fn(),
      createEnrollment: vi.fn(),
    };

    emails = {
      sendWelcomeEmail: vi.fn(),
    };
  });

  it('fails if input is invalid', async () => {
    const result = await manualEnrollment({ gateway, emails }, {
      mentorId: 'mentor1',
      // missing courseId
      studentEmail: 'invalid-email',
      studentName: '',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('fails if course is not found', async () => {
    gateway.getCourseInfo.mockResolvedValue(null);

    const result = await manualEnrollment({ gateway, emails }, {
      mentorId: 'mentor1',
      courseId: 'course1',
      studentEmail: 'student@example.com',
      studentName: 'Student Name',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('fails if mentor does not own the course', async () => {
    gateway.getCourseInfo.mockResolvedValue({
      id: 'course1',
      title: 'Course 1',
      mentorId: 'mentor2', // different mentor
    });

    const result = await manualEnrollment({ gateway, emails }, {
      mentorId: 'mentor1',
      courseId: 'course1',
      studentEmail: 'student@example.com',
      studentName: 'Student Name',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('returns alreadyEnrolled if enrollment exists', async () => {
    gateway.getCourseInfo.mockResolvedValue({
      id: 'course1',
      title: 'Course 1',
      mentorId: 'mentor1',
    });
    gateway.checkEnrollmentExists.mockResolvedValue(true);

    const result = await manualEnrollment({ gateway, emails }, {
      mentorId: 'mentor1',
      courseId: 'course1',
      studentEmail: 'student@example.com',
      studentName: 'Student Name',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.alreadyEnrolled).toBe(true);
      expect(gateway.createEnrollment).not.toHaveBeenCalled();
    }
  });

  it('creates enrollment and sends email successfully', async () => {
    gateway.getCourseInfo.mockResolvedValue({
      id: 'course1',
      title: 'Course 1',
      mentorId: 'mentor1',
    });
    gateway.checkEnrollmentExists.mockResolvedValue(false);
    gateway.findOrCreateStudent.mockResolvedValue({
      id: 'student123',
      name: 'Student Name',
    });

    const result = await manualEnrollment({ gateway, emails }, {
      mentorId: 'mentor1',
      courseId: 'course1',
      studentEmail: 'student@example.com',
      studentName: 'Student Name',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.alreadyEnrolled).toBe(false);
      expect(result.value.enrollmentId).toBe('enroll_course1_student_example_com');
      
      expect(gateway.createEnrollment).toHaveBeenCalledWith(expect.objectContaining({
        id: 'enroll_course1_student_example_com',
        courseId: 'course1',
        mentorId: 'mentor1',
        studentId: 'student123',
        source: 'manual',
      }));

      expect(emails.sendWelcomeEmail).toHaveBeenCalledWith({
        studentEmail: 'student@example.com',
        studentName: 'Student Name',
        courseTitle: 'Course 1',
      });
    }
  });
});
