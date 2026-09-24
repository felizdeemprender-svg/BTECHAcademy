import { NextResponse } from 'next/server';
import { TrackSalesPageViewUseCase } from '@/domain/sales-pages/use-cases/track-sales-page-view-use-case';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { channel = 'direct', source = 'direct' } = body;

    const useCase = new TrackSalesPageViewUseCase();
    await useCase.execute(id, channel, source);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking sales page view:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
