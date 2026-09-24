import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { validateAdnId, getSafeAdnDir } from '@/lib/adn-utils';

export async function POST(req: Request) {
  const adminUid = await verifyAdmin(req);
  if (!adminUid) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id, name, version, target_format } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "Falta ID" }, { status: 400 });

    if (!validateAdnId(id)) {
      return NextResponse.json({ success: false, error: "ID inválido: solo letras, números, _ y -" }, { status: 400 });
    }

    const adnDir = getSafeAdnDir(id);
    
    // Crear carpeta
    await fs.mkdir(adnDir, { recursive: true });

    // Crear manifest básico
    const manifest = {
      id,
      name,
      version,
      target_format,
      engine_requirements: {
        ffmpeg_build: "ffmpeg 6.1-master",
        features: ["xfade", "sidechain", "loudnorm"]
      },
      ai_prompts: {
        instruction: `Genera contenido para el estilo ${name}`
      }
    };

    await fs.writeFile(`${adnDir}/manifest.json`, JSON.stringify(manifest, null, 2));

    return NextResponse.json({ success: true, message: "ADN creado correctamente" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const adminUid = await verifyAdmin(req);
  if (!adminUid) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { adnId } = await req.json();
    if (!adnId) return NextResponse.json({ success: false, error: "Falta ID del ADN" }, { status: 400 });

    if (!validateAdnId(adnId)) {
      return NextResponse.json({ success: false, error: "ID inválido: solo letras, números, _ y -" }, { status: 400 });
    }

    const adnsDir = getSafeAdnDir(adnId);
    
    try {
      await fs.rm(adnsDir, { recursive: true, force: true });
      return NextResponse.json({ success: true, message: "ADN eliminado correctamente" });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: `Error al eliminar: ${e.message}` }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}