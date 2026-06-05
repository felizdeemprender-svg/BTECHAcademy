import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { adnId } = await req.json();
    if (!adnId) return NextResponse.json({ success: false, error: "Falta ID del ADN" }, { status: 400 });

    const adnsDir = path.join(process.cwd(), 'public', 'adns', adnId);
    
    // 1. Verificar existencia de carpeta
    try {
      await fs.access(adnsDir);
    } catch {
      return NextResponse.json({ success: false, error: "Carpeta de ADN no encontrada" }, { status: 404 });
    }

    const report: any = {
      adnId,
      timestamp: new Date().toISOString(),
      checks: {
        manifest: false,
        blueprint: false,
        motion: false,
        typography: false,
        global_fx: false,
        engine_compatibility: false
      },
      errors: []
    };

    // 2. Verificar Manifest
    try {
      const manifestPath = path.join(adnsDir, 'manifest.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);
      report.checks.manifest = true;
      
      // 3. Verificar Engine Requirements
      const isModular = manifest.version === '2.0' || Number(manifest.version) === 2.0;
      
      if (manifest.engine_requirements) {
        const reqs = manifest.engine_requirements;
        if (reqs.ffmpeg_build.includes('6.1') || reqs.ffmpeg_build.includes('master')) {
          report.checks.engine_compatibility = true;
        } else {
          report.errors.push(`Versión de FFmpeg no recomendada: ${reqs.ffmpeg_build}. Se requiere 6.1+`);
        }
      } else if (isModular) {
        // Auto-validación para modulares si falta la sección (Cierre de circuito)
        report.checks.engine_compatibility = true;
        report.errors.push("Nota: Se asume compatibilidad 6.1 por ser ADN Modular (v2.0)");
      } else {
        report.errors.push("Falta sección engine_requirements en manifest.json");
      }
    } catch (e) {
      report.errors.push("Error leyendo o parseando manifest.json");
    }

    // 4. Verificar Blueprint
    try {
      await fs.access(path.join(adnsDir, 'blueprint.json'));
      report.checks.blueprint = true;
    } catch {
      report.errors.push("Falta blueprint.json");
    }

    // 5. Otros archivos modulares (Opcionales pero recomendados para 2.0)
    const modules = ['motion.json', 'typography.json', 'global_fx.json'];
    for (const mod of modules) {
      try {
        await fs.access(path.join(adnsDir, mod));
        (report.checks as any)[mod.replace('.json', '')] = true;
      } catch {}
    }

    const isHealthy = report.checks.manifest && report.checks.blueprint && report.checks.engine_compatibility;

    return NextResponse.json({ 
      success: true, 
      isHealthy,
      report 
    });

  } catch (error: any) {
    console.error("[API:ADMIN:ADNS:VERIFY] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
