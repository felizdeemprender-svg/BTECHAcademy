const fs = require('fs');
const path = require('path');

const STANDALONE_DIR = path.join(__dirname, '..', '.next', 'standalone');
const SOURCE_BIN = path.join(__dirname, '..', 'node_modules', 'custom-ffmpeg-build', 'ffmpeg');
const TARGET_DIR = path.join(STANDALONE_DIR, 'node_modules', 'custom-ffmpeg-build');
const TARGET_BIN = path.join(TARGET_DIR, 'ffmpeg');

if (!fs.existsSync(STANDALONE_DIR)) {
  console.log('[copy-ffmpeg] No se encontró .next/standalone — saltando copia.');
  process.exit(0);
}

if (!fs.existsSync(SOURCE_BIN)) {
  console.warn('[copy-ffmpeg] ADVERTENCIA: El binario personalizado no existe en', SOURCE_BIN);
  console.warn('[copy-ffmpeg] El postinstall falló o no se ejecutó. El video rendering usará ffmpeg-static (sin drawtext).');
  process.exit(0);
}

// Crear directorio destino si no existe
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Copiar el binario
fs.copyFileSync(SOURCE_BIN, TARGET_BIN);

// Asignar permisos de ejecución en Linux
if (process.platform === 'linux') {
  const { execSync } = require('child_process');
  execSync(`chmod +x ${TARGET_BIN}`);
}

const sizeKb = Math.round(fs.statSync(TARGET_BIN).size / 1024);
console.log(`[copy-ffmpeg] ✅ FFmpeg personalizado copiado exitosamente a ${TARGET_BIN} (${sizeKb} KB)`);

// Copiar public/ al standalone (Next.js NO lo hace automáticamente)
const PUBLIC_SRC = path.join(__dirname, '..', 'public');
const PUBLIC_DEST = path.join(STANDALONE_DIR, 'public');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(PUBLIC_SRC)) {
  copyDirRecursive(PUBLIC_SRC, PUBLIC_DEST);
  console.log(`[copy-ffmpeg] ✅ Carpeta public/ copiada al standalone (incluye fuentes y ADNs)`);
} else {
  console.warn('[copy-ffmpeg] ⚠️ No se encontró la carpeta public/ en el proyecto.');
}
