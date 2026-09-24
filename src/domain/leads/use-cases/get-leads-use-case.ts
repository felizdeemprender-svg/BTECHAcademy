import { AdminLeadRepository, Lead } from '@/data/firestore/admin-lead-repo';

interface GetLeadsRequest {
  uid: string;
  isAdmin: boolean;
  isMentor: boolean;
  mentorId?: string; // Si un admin quiere ver los de un mentor en particular
}

export class GetLeadsUseCase {
  constructor(private readonly repo: AdminLeadRepository) {}

  async execute(request: GetLeadsRequest): Promise<Lead[]> {
    if (!request.isAdmin && !request.isMentor) {
      throw new Error('Unauthorized: Only Admins and Mentors can view leads');
    }

    if (request.isAdmin) {
      if (request.mentorId) {
        return await this.repo.getLeadsByMentor(request.mentorId);
      }
      return await this.repo.getLeads();
    }

    // Si es mentor, forzosamente solo ve sus propios leads
    return await this.repo.getLeadsByMentor(request.uid);
  }
}
