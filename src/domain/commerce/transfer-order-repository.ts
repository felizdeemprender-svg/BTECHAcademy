/**
 * Comercio — Contrato de órdenes de transferencia (F0.2).
 * Misma colección y campos que el route legacy
 * (`transferOrders` doc(orderId), estados
 * `pending | approved | rejected`, `rejectedAt`/`approvedAt`/
 * `enrollmentId`). Sin cambios de storage.
 */

export interface TransferOrderBankDetails {
  readonly alias: string;
  readonly cbu: string;
  readonly bankName: string;
  readonly titularName: string;
}

export interface TransferOrderCreateInput {
  readonly id: string;
  readonly pageId: string;
  readonly pageTitle: string;
  readonly mentorId: string;
  readonly mentorEmail: string;
  readonly studentEmail: string;
  readonly studentName: string;
  readonly amount: number;
  readonly bankDetails: TransferOrderBankDetails;
  readonly referenceCode: string;
  readonly referidoId: string | null;
  readonly status: 'pending';
}

/** Lectura cruda tal como la usa el route (comparaciones directas). */
export interface TransferOrderSnapshot {
  readonly id: string;
  readonly pageId?: unknown;
  readonly studentEmail?: unknown;
  readonly studentName?: unknown;
  readonly mentorId?: unknown;
  readonly referidoId?: unknown;
  readonly status?: unknown;
  readonly enrollmentId?: unknown;
}

export interface TransferOrderRepository {
  /** Lee `transferOrders` doc(orderId). `null` si no existe. */
  findById(orderId: string): Promise<TransferOrderSnapshot | null>;
  /** Crea `transferOrders` doc(orderId) con `createdAt`/`updatedAt`. */
  create(input: TransferOrderCreateInput): Promise<void>;
  /** `status: 'rejected'` + `updatedAt` + `rejectedAt` (shape legacy). */
  markRejected(orderId: string): Promise<void>;
  /** `status: 'approved'` + `updatedAt` + `approvedAt` + `enrollmentId`. */
  markApproved(orderId: string, enrollmentId: string | null): Promise<void>;
}
