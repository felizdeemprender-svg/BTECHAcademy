import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    let adnsDir = path.join(process.cwd(), 'public', 'adns');
    
    // Fallback para Next.js Standalone (en App Hosting)
    try {
      await fs.access(adnsDir);
    } catch {
      // Intentar subir dos niveles desde .next/standalone
      const standaloneFallback = path.join(process.cwd(), '..', '..', 'public', 'adns');
      try {
        await fs.access(standaloneFallback);
        adnsDir = standaloneFallback;
      } catch {
        // Si aún no se encuentra, dejar el original para que el error sea claro
      }
    }

    const files = await fs.readdir(adnsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const adns = await Promise.all(jsonFiles.map(async (f) => {
      const content = await fs.readFile(path.join(adnsDir, f), 'utf-8');
      return JSON.parse(content);
    }));

    // Ordenar por ID para consistencia
    adns.sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({ success: true, adns });
  } catch (error: any) {
    console.error("[API:ADNS] Error loading files:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
