import { NextRequest, NextResponse } from 'next/server';
import { authenticateCaller } from '@/lib/api/mentor-auth';
import { adminStorage, saveBufferAndGetPublicUrl } from '@/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No se subió ningún archivo' }, { status: 400 });
    }

    const mimeType = file.type || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'El archivo debe ser una imagen válida (JPG, PNG, WebP)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name ? file.name.split('.').pop() || 'jpg' : 'jpg';
    const destination = `avatars/${caller.uid}/${Date.now()}_custom_avatar.${ext}`;

    const bucket = adminStorage.bucket();
    const imageUrl = await saveBufferAndGetPublicUrl(bucket, destination, buffer, mimeType);

    return NextResponse.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error('[API:Avatars:Upload] Error subiendo imagen de avatar:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
