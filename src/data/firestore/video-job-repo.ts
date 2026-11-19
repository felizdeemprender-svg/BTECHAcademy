import { adminDb } from '@/firebase/admin';

export interface VideoJobRecord {
  jobId: string;
  uid: string;
  role: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  engine: string;
  branch: string;
  format: string;
  adnId: string;
  cursoId: string;
  marketingName: string;
  sceneCount: number;
  createdAt: string;
  updatedAt: string;
  result?: Record<string, any> | null;
  error?: string | null;
  expiresAt?: Date | string;
}

export class FirestoreVideoJobRepository {
  async createJob(job: VideoJobRecord): Promise<void> {
    const expiresAt = job.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días TTL
    await adminDb.collection('video_jobs').doc(job.jobId).set({
      ...job,
      expiresAt
    }, { merge: true });
  }

  async updateJob(jobId: string, data: Partial<VideoJobRecord>): Promise<void> {
    await adminDb.collection('video_jobs').doc(jobId).update({
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  async getJob(jobId: string): Promise<VideoJobRecord | null> {
    const snap = await adminDb.collection('video_jobs').doc(jobId).get();
    if (!snap.exists) return null;
    return snap.data() as VideoJobRecord;
  }
}
