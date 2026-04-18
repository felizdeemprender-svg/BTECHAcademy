const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FFMPEG_URL = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz';
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
    // BtbN tiene la estructura: ffmpeg-master-latest-linux64-gpl/bin/ffmpeg
    execSync(`tar -xf ${targetFile} -C ${TARGET_DIR} --strip-components=1`, { stdio: 'inherit' });
    
    // Mover el binario desde bin/ffmpeg a ffmpeg
    const binPath = path.join(TARGET_DIR, 'bin', 'ffmpeg');
    if (fs.existsSync(binPath)) {
      fs.renameSync(binPath, ffmpegBin);
    }
    
    console.log('[download-ffmpeg] Limpiando archivo temporal...');
    if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
    // Eliminar la carpeta bin residual si existe
    if (fs.existsSync(path.join(TARGET_DIR, 'bin'))) fs.rmSync(path.join(TARGET_DIR, 'bin'), { recursive: true, force: true });
    
    console.log('[download-ffmpeg] Asignando permisos de ejecución...');
    execSync(`chmod +x ${ffmpegBin}`);
    
    console.log('[download-ffmpeg] FFmpeg personalizado listo en node_modules/custom-ffmpeg-build/ffmpeg');
  } catch (err) {
    console.error('[download-ffmpeg] Error durante la descarga/extracción:', err.message);
    process.exit(1); // Fail the build to prevent silent fallback
  }
} else {
  console.log('[download-ffmpeg] Plataforma local (' + process.platform + '), se usará ffmpeg-static por defecto.');
}
