import { NextRequest, NextResponse } from 'next/server';
import { FirestoreVideoJobRepository } from '@/data/firestore/video-job-repo';
import { CheckJobStatusUseCase } from '@/domain/video/use-cases/check-job-status-use-case';

/**
 * GET /api/video/job-status?id=job_v2_123456
 * Retorna el estado actual del job de renderizado desde Firestore.
 * El frontend puede hacer polling a este endpoint cada 3 segundos.
 * Thin Controller: Delega todo al Use Case.
 */
export async function GET(req: NextRequest) {
  try {
    const jobId = req.nextUrl.searchParams.get('id');
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Falta el parámetro ?id=' }, { status: 400 });
    }

    const repo = new FirestoreVideoJobRepository();
    const useCase = new CheckJobStatusUseCase(repo);

    const result = await useCase.execute(jobId);

    if (!result) {
      return NextResponse.json({ success: false, error: 'Job no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(result);

  } catch (err: any) {
    console.error('[Job Status] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
