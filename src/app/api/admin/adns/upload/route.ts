import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import { ADNValidator } from '@/validation/adn-validator';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No se subió ningún archivo" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // 1. Validar presencia física de los 7 archivos esperados
    const expectedFilesMap: Record<string, string> = {
      'manifest.json': 'manifest.json',
      'blueprint.json': 'blueprint.json',
      'composition.json': 'composition.json',
      'engine.json': 'engine.json',
      'global-fx.json': 'global-fx.json',
      'motion.json': 'motion.json',
      'typography.json': 'typography.json'
    };

    const entriesNames = zipEntries.map(e => e.entryName.toLowerCase());
    const missingFiles = Object.values(expectedFilesMap).filter(f => !entriesNames.includes(f));

    if (missingFiles.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Estructura incompleta. Faltan los archivos: ${missingFiles.join(', ')}` 
      }, { status: 400 });
    }

    // 2. Reconstruir objeto ADN para validación profunda
    const adnParts: any = {};
    
    try {
      const getJson = (name: string) => {
        const entry = zipEntries.find(e => e.entryName.toLowerCase() === name);
        if (!entry) throw new Error(`Archivo ${name} no encontrado en el ZIP`);
        return JSON.parse(entry.getData().toString('utf-8'));
      };

      const manifest = getJson('manifest.json');
      const engine = getJson('engine.json');
      const motion = getJson('motion.json');
      const composition = getJson('composition.json');
      const globalFx = getJson('global-fx.json');
      const typography = getJson('typography.json');
      const blueprint = getJson('blueprint.json');

      // Ensamblar objeto ADN virtual respetando la jerarquía del Schema
      const virtualAdn = {
        ...manifest,
        ...engine,      // Aporta audio_engine y engine_requirements
        ...motion,      // Aporta camera y transitions
        ...composition, // Aporta composition y logic_segments
        ...globalFx,    // Aporta global_fx
        typography_engine: typography, // El archivo typography.json es el motor íntegro
        default_blueprint: blueprint
      };

      // 3. VALIDACIÓN PROFUNDA (Lógica migrada de BTECH Studio)
      const validation = ADNValidator.validate(virtualAdn);
      
      if (!validation.isValid) {
        return NextResponse.json({ 
          success: false, 
          error: "Validación de esquema fallida",
          details: validation.errors 
        }, { status: 400 });
      }

      // 4. Si es válido, guardar físicamente
      const adnId = manifest.id;
      const targetDir = path.join(process.cwd(), 'public', 'adns', adnId);
      await fs.mkdir(targetDir, { recursive: true });
      
      // Extraer los 7 archivos validados
      Object.values(expectedFilesMap).forEach(fileName => {
        const entry = zipEntries.find(e => e.entryName.toLowerCase() === fileName);
        if (entry) {
          zip.extractEntryTo(entry, targetDir, false, true);
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: `ADN "${manifest.name}" validado y cargado correctamente.`,
        adnId 
      });

    } catch (parseError: any) {
      return NextResponse.json({ 
        success: false, 
        error: `Error de formato JSON: ${parseError.message}` 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error("[API:ADMIN:ADNS:UPLOAD] Error crítico:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
