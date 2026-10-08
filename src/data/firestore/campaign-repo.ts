/**
 * Capa de datos — Repositorio de lectura de campañas (`campaigns`).
 * Misma colección y filtros que la UI actual (`mentorId ==`).
 * En listas, los documentos corruptos se omiten con warn para
 * no romper la vista (convivencia con datos viejos).
 */
import type {
  Campaign,
  CampaignPatch,
  CampaignRepository,
  ExecutionLog,
  NewCampaign,
} from '@/domain/marketing';

import { mapCampaignDoc } from './mappers';
import type { FirestoreGateway } from './gateway';

const COLLECTION = 'campaigns';

export class FirestoreCampaignRepository implements CampaignRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findById(id: string): Promise<Campaign | null> {
    const snap = await this.gateway.getDoc(COLLECTION, id);
    if (!snap) return null;
    const raw = snap.data();
    if (!raw) return null;
    return mapCampaignDoc(snap.id, raw);
  }

  async listByMentor(mentorId: string, limit?: number): Promise<Campaign[]> {
    let snap;
    if (mentorId === 'all') {
      snap = await this.gateway.queryByField(COLLECTION, 'isActive', true, limit);
    } else {
      snap = await this.gateway.queryByField(COLLECTION, 'mentorId', mentorId, limit);
    }
    const out: Campaign[] = [];
    for (const d of snap.docs) {
      const raw = d.data();
      if (!raw) continue;
      try {
        out.push(mapCampaignDoc(d.id, raw));
      } catch (e) {
        console.warn(`[campaign-repo] Documento corrupto omitido: ${d.id}`, e);
      }
    }
    return out;
  }

  async create(campaign: NewCampaign): Promise<void> {
    await this.gateway.createDoc(COLLECTION, campaign.id, {
      ...campaign,
      createdAt: this.gateway.serverTimestamp(),
    });
  }

  async update(id: string, patch: CampaignPatch): Promise<void> {
    await this.gateway.updateDoc(COLLECTION, id, {
      ...patch,
      updatedAt: this.gateway.serverTimestamp(),
    });
  }

  async remove(id: string): Promise<void> {
    await this.gateway.deleteDoc(COLLECTION, id);
  }

  async appendExecutionLogs(id: string, logs: ExecutionLog[]): Promise<void> {
    await this.gateway.updateDoc(COLLECTION, id, {
      executionLogs: this.gateway.arrayUnion(...logs),
      updatedAt: this.gateway.serverTimestamp(),
    });
  }
}
