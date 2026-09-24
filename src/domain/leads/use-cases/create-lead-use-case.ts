import { AdminLeadRepository, Lead } from '@/data/firestore/admin-lead-repo';

interface CreateLeadRequest {
  email: string;
  name?: string;
  mentorId?: string;
}

export class CreateLeadUseCase {
  constructor(private readonly repo: AdminLeadRepository) {}

  async execute(request: CreateLeadRequest): Promise<string> {
    if (!request.email || !request.email.includes('@')) {
      throw new Error('Invalid email provided');
    }

    // Este endpoint es público, por lo que NO hay verificación de uid/roles.
    // Esto es para que las landing pages puedan capturar leads libremente.

    return await this.repo.create({
      email: request.email.trim(),
      name: request.name?.trim(),
      mentorId: request.mentorId,
    });
  }
}
