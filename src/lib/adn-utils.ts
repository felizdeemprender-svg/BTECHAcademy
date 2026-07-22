import path from 'path';
import fsPromises from 'fs/promises';
import fs from 'fs';

/**
 * Resuelve la ruta absoluta del directorio de ADNs garantizando un único punto de verdad.
 */
export async function getAdnsDir(): Promise<string> {
  let adnsDir = path.join(process.cwd(), 'public', 'adns');
  try {
    await fsPromises.stat(adnsDir);
    return adnsDir;
  } catch {
    // Fallback 1: Standalone build
    const fallback1 = path.join(process.cwd(), '..', '..', 'public', 'adns');
    try {
      await fsPromises.stat(fallback1);
      return fallback1;
    } catch {
      // Fallback 2: Fastoria Studio
      const fallback2 = path.join(process.cwd(), '..', 'btech-studio', 'public', 'adns');
      try {
        await fsPromises.stat(fallback2);
        return fallback2;
      } catch {
        throw new Error(`[ADN Utils] No se pudo encontrar el directorio de ADNs en ninguna de las rutas esperadas.`);
      }
    }
  }
}

/**
 * Carga un ADN completo (sea Modular 2.0 o Legacy 1.0)
 */
export async function loadAdnConfig(adnId: string): Promise<any> {
  const adnsDir = await getAdnsDir();
  const adnList = await fsPromises.readdir(adnsDir);
  const targetAdnName = adnList.find(f => f.startsWith(adnId || '01')) || '01_CINEMA';
  const targetPath = path.join(adnsDir, targetAdnName);
  
  const targetStat = await fsPromises.stat(targetPath);
  let adnConfig: any;

  if (targetStat.isDirectory()) {
    // CARGA MODULAR (Nuevo Sistema 2.0)
    const getJson = async (name: string) => {
      try {
        const p = path.join(targetPath, name);
        return JSON.parse(await fsPromises.readFile(p, 'utf-8'));
      } catch (e) {
        return {};
      }
    };

    const manifest = await getJson('manifest.json');
    const engine = await getJson('engine.json');
    const motion = await getJson('motion.json');
    const composition = await getJson('composition.json');
    const globalFx = await getJson('global-fx.json');
    const typography = await getJson('typography.json');
    const blueprint = await getJson('blueprint.json');

    // RECONSTRUCCIÓN LÓGICA (Bypass para compatibilidad con motor Legacy)
    const scenesRules: Record<string, any> = {};
    if (typography.segment_styles) {
      Object.entries(typography.segment_styles).forEach(([segment, styles]: [string, any]) => {
        scenesRules[segment] = {
          text_styling: {
            fontsize: styles.text?.fontSize || 64,
            color: styles.text?.primaryColor?.split('@')[0] || "#FFFFFF",
            uppercase: styles.text?.uppercase || false,
            font_path: styles.text?.fontName || "Inter-Black.ttf"
          }
        };
      });
      // Aseguramos un default
      scenesRules['default'] = scenesRules['GANCHO'] || Object.values(scenesRules)[0] || {};
    }

    adnConfig = {
      ...manifest,
      ...engine,
      ...motion,
      ...composition,
      ...globalFx,
      scenes_rules: scenesRules, 
      typography_engine: typography,
      default_blueprint: blueprint,
      slices: blueprint.slices || [], // Flatten slices to root for easy access
    };
  } else {
    // CARGA LEGACY (Archivo JSON único)
    adnConfig = JSON.parse(await fsPromises.readFile(targetPath, 'utf-8'));
  }

  return adnConfig;
}
