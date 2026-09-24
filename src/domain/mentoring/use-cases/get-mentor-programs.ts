/**
 * Mentoría — Caso de uso: programas de un mentor.
 * Lista por mentor, ordena por creación y marca si está activo.
 * Repositorio inyectado.
 */
import { err, ok, type Result } from '@/domain/shared/result';
import { validationError, type DomainError } from '@/domain/shared/errors';
import { sortByCreatedAtDesc } from '@/domain/shared/sort';

import { isProgramActive, type MentoringProgram } from '../program';
import type { MentoringProgramRepository } from '../program-repository';

export interface ProgramSummary {
  readonly program: MentoringProgram;
  readonly active: boolean;
}

export interface GetMentorProgramsInput {
  readonly mentorId: string;
}

export async function getMentorPrograms(
  repo: MentoringProgramRepository,
  input: GetMentorProgramsInput,
): Promise<Result<ProgramSummary[], DomainError>> {
  if (input.mentorId.trim() === '') {
    return err(validationError('mentorId vacío'));
  }
  const programs = await repo.listByMentor(input.mentorId);
  return ok(toSummaries(programs));
}

/** Todos los programas (solo admin). */
export async function listAllPrograms(
  repo: MentoringProgramRepository,
  limit?: number,
): Promise<Result<ProgramSummary[], DomainError>> {
  const programs = await repo.listAll(limit);
  return ok(toSummaries(programs));
}

function toSummaries(programs: MentoringProgram[]): ProgramSummary[] {
  return sortByCreatedAtDesc(programs).map((program) => ({
    program,
    active: isProgramActive(program),
  }));
}
