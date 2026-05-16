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

    const files = await fs.readdir(adnsDir, { withFileTypes: true });
    
    const adns = await Promise.all(files.map(async (dirent) => {
      try {
        if (dirent.isDirectory()) {
          // ADN Modular 2.0
          const manifestPath = path.join(adnsDir, dirent.name, 'manifest.json');
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(manifestContent);
          
          // Cargar blueprint para inicialización automática
          const blueprintPath = path.join(adnsDir, dirent.name, 'blueprint.json');
          let blueprint = null;
          try { 
            const blueprintContent = await fs.readFile(blueprintPath, 'utf-8');
            blueprint = JSON.parse(blueprintContent);
          } catch {}

          return {
            ...manifest,
            id: dirent.name,
            isModular: true,
            defaultSlices: blueprint?.slices || [],
            hasBlueprint: !!blueprint
          };
        } else if (dirent.name.endsWith('.json')) {
          // ADN Legado 1.0
          const content = await fs.readFile(path.join(adnsDir, dirent.name), 'utf-8');
          const legacy = JSON.parse(content);
          return {
            ...legacy,
            isModular: false
          };
        }
        return null;
      } catch (e) {
        console.error(`[API:ADNS] Error processing ${dirent.name}:`, e);
        return null;
      }
    }));

    // Filtrar nulos y ordenar
    const validAdns = adns.filter(a => a !== null).sort((a, b) => a!.id.localeCompare(b!.id));

    return NextResponse.json({ success: true, adns: validAdns });
  } catch (error: any) {
    console.error("[API:ADNS] Error loading files:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
