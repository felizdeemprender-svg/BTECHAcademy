const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FFMPEG_URL = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2025-02-28-13-02/ffmpeg-n6.1.2-25-g39cac587c4-linux64-gpl-6.1.tar.xz';
const TARGET_DIR = path.join(__dirname, '..', 'node_modules', 'custom-ffmpeg-build');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const targetFile = path.join(TARGET_DIR, 'ffmpeg.tar.xz');
const ffmpegBin = path.join(TARGET_DIR, 'ffmpeg');

if (fs.existsSync(ffmpegBin)) {
  console.log('[download-ffmpeg] FFmpeg binario ya existe, omitiendo descarga.');
  process.exit(0);
}

if (process.platform === 'linux') {
  try {
    console.log(`[download-ffmpeg] Descargando FFmpeg con soporte FreeType (BtbN) desde ${FFMPEG_URL}...`);
    execSync(`curl -L -o ${targetFile} ${FFMPEG_URL}`, { stdio: 'inherit' });
    
    console.log('[download-ffmpeg] Extrayendo...');
    // BtbN release tarballs usually have a folder like: ffmpeg-n6.1.1-linux64-gpl/
    execSync(`tar -xf ${targetFile} -C ${TARGET_DIR} --strip-components=1`, { stdio: 'inherit' });
    
    // Mover el binario desde bin/ffmpeg a ffmpeg (o buscar en la raíz)
    const possiblePaths = [
      path.join(TARGET_DIR, 'bin', 'ffmpeg'),
      path.join(TARGET_DIR, 'ffmpeg'),
    ];
    let found = false;
    for (const p of possiblePaths) {
      if (fs.existsSync(p) && p !== ffmpegBin) {
        fs.renameSync(p, ffmpegBin);
        found = true;
        break;
      } else if (p === ffmpegBin && fs.existsSync(p)) {
        found = true;
        break;
      }
    }
    if (!found) {
       // Si no se encuentra, buscar en subcarpetas (algunos tars tienen una carpeta intermedia)
       const dirs = fs.readdirSync(TARGET_DIR).filter(d => fs.statSync(path.join(TARGET_DIR, d)).isDirectory());
       for (const d of dirs) {
         const p = path.join(TARGET_DIR, d, 'bin', 'ffmpeg');
         const p2 = path.join(TARGET_DIR, d, 'ffmpeg');
         if (fs.existsSync(p)) { fs.renameSync(p, ffmpegBin); found = true; break; }
         if (fs.existsSync(p2)) { fs.renameSync(p2, ffmpegBin); found = true; break; }
       }
    }
    
    console.log('[download-ffmpeg] Limpiando archivo temporal...');
    if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
    // Eliminar la carpeta bin residual si existe
    if (fs.existsSync(path.join(TARGET_DIR, 'bin'))) fs.rmSync(path.join(TARGET_DIR, 'bin'), { recursive: true, force: true });
    
    // Asignar permisos de ejecución en Linux
    if (process.platform === 'linux') {
      execSync(`chmod +x ${ffmpegBin}`);
    }
    
    console.log(`[download-ffmpeg] FFmpeg personalizado listo en ${ffmpegBin}`);
    // Verificar versión para el log
    try {
      const version = execSync(`${ffmpegBin} -version`).toString().split('\n')[0];
      console.log(`[download-ffmpeg] Versión detectada: ${version}`);
    } catch (vErr) {
      console.warn(`[download-ffmpeg] No se pudo verificar la versión: ${vErr.message}`);
    }
  } catch (err) {
    console.error('[download-ffmpeg] Error durante la descarga/extracción:', err.message);
    process.exit(1);
  }
} else {
  console.log('[download-ffmpeg] Plataforma local (' + process.platform + '), se usará ffmpeg-static por defecto.');
}
