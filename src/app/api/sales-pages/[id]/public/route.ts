import { NextResponse } from 'next/server';
import { GetPublicSalesPageUseCase } from '@/domain/sales-pages/use-cases/get-public-sales-page-use-case';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const isPreview = url.searchParams.get('preview') === 'true';

  try {
    const useCase = new GetPublicSalesPageUseCase();
    const result = await useCase.execute(id, isPreview);

    if (!result || !result.page) {
      return NextResponse.json({ error: 'Sales page not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching public sales page:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
