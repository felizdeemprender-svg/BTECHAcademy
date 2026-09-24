/**
 * Capa de datos — Repositorio de órdenes de transferencia (F0.2).
 * Misma colección y campos que el route legacy
 * (`transferOrders` doc(orderId); `FieldValue.serverTimestamp()`
 * vía `gateway.serverTimestamp()`).
 */
import type {
  TransferOrderCreateInput,
  TransferOrderRepository,
  TransferOrderSnapshot,
} from '@/domain/commerce/transfer-order-repository';

import type { FirestoreGateway } from './gateway';

const COLLECTION = 'transferOrders';

export class FirestoreTransferOrderRepository implements TransferOrderRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findById(orderId: string): Promise<TransferOrderSnapshot | null> {
    const snap = await this.gateway.getDoc(COLLECTION, orderId);
    if (!snap) return null;
    const raw = snap.data() ?? {};
    return {
      id: snap.id,
      pageId: raw.pageId,
      studentEmail: raw.studentEmail,
      studentName: raw.studentName,
      mentorId: raw.mentorId,
      referidoId: raw.referidoId,
      status: raw.status,
      enrollmentId: raw.enrollmentId,
    };
  }

  async create(input: TransferOrderCreateInput): Promise<void> {
    await this.gateway.createDoc(COLLECTION, input.id, {
      ...input,
      createdAt: this.gateway.serverTimestamp(),
      updatedAt: this.gateway.serverTimestamp(),
    });
  }

  async markRejected(orderId: string): Promise<void> {
    await this.gateway.updateDoc(COLLECTION, orderId, {
      status: 'rejected',
      updatedAt: this.gateway.serverTimestamp(),
      rejectedAt: this.gateway.serverTimestamp(),
    });
  }

  async markApproved(orderId: string, enrollmentId: string | null): Promise<void> {
    await this.gateway.updateDoc(COLLECTION, orderId, {
      status: 'approved',
      updatedAt: this.gateway.serverTimestamp(),
      approvedAt: this.gateway.serverTimestamp(),
      enrollmentId,
    });
  }
}
