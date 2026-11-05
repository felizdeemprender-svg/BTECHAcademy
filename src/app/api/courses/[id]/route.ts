import { NextRequest } from 'next/server';
import { resolveGateway } from '@/lib/api/gateway';
import { handleUpdateCourse, handleDeleteCourse } from '@/lib/api/catalog-handlers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return handleUpdateCourse(await resolveGateway(), id, body);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return handleDeleteCourse(await resolveGateway(), id, body);
}
