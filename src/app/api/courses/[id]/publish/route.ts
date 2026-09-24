import { NextRequest } from 'next/server';
import { resolveGateway } from '@/lib/api/gateway';
import { handlePublishCourse } from '@/lib/api/catalog-handlers';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => ({}));
  return handlePublishCourse(await resolveGateway(), params.id, body);
}
