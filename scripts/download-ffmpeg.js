const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ambos orígenes contienen exactamente el mismo archivo verificado:
// BtbN FFmpeg n6.1.2 GPL con soporte FreeType y libass (Linux x86_64).
// 1. Espejo primario en Google Cloud Storage (intra-datacenter, veloz, sin rate limit).
// 2. Origen secundario oficial en GitHub Releases de BtbN.
const CANDIDATE_URLS = [
  'https://firebasestorage.googleapis.com/v0/b/btechacademy-8b329.firebasestorage.app/o/binaries%2Fffmpeg-n6.1.2-25-g39cac587c4-linux64-gpl-6.1.tar.xz?alt=media&token=43be14b7-5818-4599-865e-b2d71d2fca2b',
  'https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2025-02-28-13-02/ffmpeg-n6.1.2-25-g39cac587c4-linux64-gpl-6.1.tar.xz'
];
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
    let downloaded = false;
    for (const url of CANDIDATE_URLS) {
      console.log(`[download-ffmpeg] Intentando descargar FFmpeg 6.1.2 GPL desde ${url.substring(0, 80)}...`);
      try {
        if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
        execSync(`curl -f -L --retry 2 --retry-delay 2 --max-time 90 -A "Mozilla/5.0 (X11; Linux x86_64)" -o "${targetFile}" "${url}"`, { stdio: 'inherit' });
        if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 15 * 1024 * 1024) {
          console.log(`[download-ffmpeg] Archivo descargado correctamente (${Math.round(fs.statSync(targetFile).size / 1024 / 1024)} MB).`);
          downloaded = true;
          break;
        } else {
          console.warn('[download-ffmpeg] Descarga incompleta o archivo corrupto (<15MB). Probando siguiente fuente...');
          if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
        }
      } catch (dlErr) {
        console.warn(`[download-ffmpeg] Fallo al descargar desde ${url.substring(0, 80)}: ${dlErr.message}`);
        if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
      }
    }

    if (!downloaded || !fs.existsSync(targetFile)) {
      console.warn('[download-ffmpeg] AVISO: No se pudo obtener el binario FFmpeg GPL externo.');
      console.warn('[download-ffmpeg] El build continuara sin interrupcion utilizando ffmpeg-static por defecto.');
      process.exit(0);
    }

    console.log('[download-ffmpeg] Extrayendo...');
    execSync(`tar -xf "${targetFile}" -C "${TARGET_DIR}" --strip-components=1`, { stdio: 'inherit' });

    // Mover el binario desde bin/ffmpeg a ffmpeg (o buscar en la raiz)
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
      const dirs = fs.readdirSync(TARGET_DIR).filter(d => {
        try { return fs.statSync(path.join(TARGET_DIR, d)).isDirectory(); } catch { return false; }
      });
      for (const d of dirs) {
        const p = path.join(TARGET_DIR, d, 'bin', 'ffmpeg');
        const p2 = path.join(TARGET_DIR, d, 'ffmpeg');
        if (fs.existsSync(p)) { fs.renameSync(p, ffmpegBin); found = true; break; }
        if (fs.existsSync(p2)) { fs.renameSync(p2, ffmpegBin); found = true; break; }
      }
    }

    console.log('[download-ffmpeg] Limpiando archivo temporal...');
    if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
    if (fs.existsSync(path.join(TARGET_DIR, 'bin'))) {
      fs.rmSync(path.join(TARGET_DIR, 'bin'), { recursive: true, force: true });
    }

    if (fs.existsSync(ffmpegBin)) {
      execSync(`chmod +x "${ffmpegBin}"`);
      console.log(`[download-ffmpeg] FFmpeg personalizado listo en ${ffmpegBin}`);
      try {
        const version = execSync(`"${ffmpegBin}" -version`).toString().split('\n')[0];
        console.log(`[download-ffmpeg] Version detectada: ${version}`);
      } catch (vErr) {
        console.warn(`[download-ffmpeg] No se pudo verificar la version: ${vErr.message}`);
      }
    } else {
      console.warn('[download-ffmpeg] No se pudo ubicar el binario ffmpeg extraido. Se usara ffmpeg-static.');
    }
  } catch (err) {
    console.warn('[download-ffmpeg] Advertencia no critica durante la descarga/extraccion:', err.message);
    console.warn('[download-ffmpeg] Se usara ffmpeg-static como fallback. El build continuara normalmente.');
    if (fs.existsSync(targetFile)) {
      try { fs.unlinkSync(targetFile); } catch {}
    }
    process.exit(0);
  }
} else {
  console.log('[download-ffmpeg] Plataforma local (' + process.platform + '), se usara ffmpeg-static por defecto.');
}
