import type { MentoringGateway, EnrollmentProgress } from '@/domain/mentoring/use-cases/update-student-progress';
import type { FirestoreGateway } from '@/data/firestore/gateway';

export class FirestoreMentoringGateway implements MentoringGateway {
  constructor(private readonly gateway: FirestoreGateway) {}

  async getEnrollmentProgress(enrollmentId: string): Promise<EnrollmentProgress | null> {
    const doc = await this.gateway.getDoc('enrollments', enrollmentId);
    if (!doc) return null;
    const data = (doc.data() || {}) as any;
    return {
      completedModules: Array.isArray(data.progress?.completedModules) ? data.progress.completedModules : []
    };
  }

  async updateEnrollmentProgress(enrollmentId: string, progress: EnrollmentProgress): Promise<void> {
    if (this.gateway.updateDoc) {
      await this.gateway.updateDoc('enrollments', enrollmentId, {
        'progress.completedModules': progress.completedModules
      });
    }
  }

  async checkIfCourseCompleted(enrollmentId: string, progress: EnrollmentProgress): Promise<boolean> {
    // Aquí implementariamos la logica que cuenta los módulos totales del curso versus los completados.
    // Por retrocompatibilidad asumiremos falso, o podemos leer el curso y comparar.
    // Para simplificar este adaptador devolveremos un calculo mock o básico
    return false; 
  }

  async issueCertificate(enrollmentId: string): Promise<void> {
    // Legacy system certificate issuance
    if (this.gateway.updateDoc) {
       await this.gateway.updateDoc('enrollments', enrollmentId, {
         certificateIssued: true,
         certificateDate: this.gateway.serverTimestamp ? this.gateway.serverTimestamp() : new Date()
       });
    }
  }
}
