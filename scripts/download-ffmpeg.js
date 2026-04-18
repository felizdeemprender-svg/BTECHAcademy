const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FFMPEG_URL = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz';
const TARGET_DIR = path.join(__dirname, '..', 'node_modules', '.custom-ffmpeg');

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
    console.log(`[download-ffmpeg] Descargando FFmpeg con soporte FreeType desde ${FFMPEG_URL}...`);
    execSync(`curl -L -o ${targetFile} ${FFMPEG_URL}`, { stdio: 'inherit' });
    
    console.log('[download-ffmpeg] Extrayendo...');
    // Extraer solo el binario ffmpeg ignorando el resto de la estructura
    execSync(`tar -xf ${targetFile} -C ${TARGET_DIR} --strip-components=1 --wildcards "*/ffmpeg"`, { stdio: 'inherit' });
    
    console.log('[download-ffmpeg] Limpiando archivo temporal...');
    fs.unlinkSync(targetFile);
    
    console.log('[download-ffmpeg] Asignando permisos de ejecución...');
    execSync(`chmod +x ${ffmpegBin}`);
    
    console.log('[download-ffmpeg] FFmpeg personalizado listo en public/bin/ffmpeg');
  } catch (err) {
    console.error('[download-ffmpeg] Error durante la descarga/extracción:', err.message);
  }
} else {
  console.log('[download-ffmpeg] Plataforma local (' + process.platform + '), se usará ffmpeg-static por defecto.');
}
