import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// POST: Alta de ADN (Crea la carpeta y archivos básicos)
export async function POST(req: Request) {
  try {
    const { id, name, version, target_format } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "Falta ID" }, { status: 400 });

    const adnDir = path.join(process.cwd(), 'public', 'adns', id);
    
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

    await fs.writeFile(path.join(adnDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    return NextResponse.json({ success: true, message: "ADN creado correctamente" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminación física
export async function DELETE(req: Request) {
  try {
    const { adnId } = await req.json();
    if (!adnId) return NextResponse.json({ success: false, error: "Falta ID del ADN" }, { status: 400 });

    const adnsDir = path.join(process.cwd(), 'public', 'adns', adnId);
    
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
