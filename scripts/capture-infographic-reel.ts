import { chromium } from '@playwright/test';
import ffmpeg from 'ffmpeg-static';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('[Capture] Iniciando proceso de grabación de infografía web...');

  const tmpDir = path.resolve('tmp/recordings');
  const outDir = path.resolve('public/reels');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: tmpDir,
      size: { width: 1080, height: 1920 },
    },
  });

  const page = await context.newPage();

  const targetUrl = 'http://localhost:9002/render/infographics/mockup-showcase';
  console.log(`[Capture] Navegando a ${targetUrl}...`);

  await page.goto(targetUrl, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(500);

  // Esperar 4.2 segundos para capturar la secuencia completa animada
  console.log('[Capture] Grabando animación de 4.2 segundos...');
  await page.waitForTimeout(4200);

  // Cerrar página para sellar el video grabado por Chromium
  await page.close();
  const video = page.video();
  const rawVideoPath = await video?.path();

  await browser.close();

  if (!rawVideoPath || !fs.existsSync(rawVideoPath)) {
    throw new Error('No se generó el archivo de video en Playwright');
  }

  console.log('[Capture] Video crudo capturado:', rawVideoPath, 'Tamaño:', fs.statSync(rawVideoPath).size);

  const finalMp4Path = path.join(outDir, 'infografia-demo.mp4');

  // Procesar y codificar con FFmpeg a formato MP4 H.264 Instagram Reel estándar
  console.log('[FFmpeg] Codificando a MP4 estándar H.264...');
  const ffmpegCmd = `"${ffmpeg}" -y -i "${rawVideoPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -movflags +faststart "${finalMp4Path}"`;
  execSync(ffmpegCmd);

  console.log('[FFmpeg] Video MP4 generado con éxito:', finalMp4Path, 'Tamaño:', fs.statSync(finalMp4Path).size);

  // Extraer fotogramas clave en segundos 1, 2.5 y 3.8 para validación visual
  console.log('[FFmpeg] Extrayendo fotogramas de validación...');
  execSync(`"${ffmpeg}" -y -i "${finalMp4Path}" -ss 00:00:01 -vframes 1 infografia_frame_1.png`);
  execSync(`"${ffmpeg}" -y -i "${finalMp4Path}" -ss 00:00:02.5 -vframes 1 infografia_frame_2.png`);
  execSync(`"${ffmpeg}" -y -i "${finalMp4Path}" -ss 00:00:03.8 -vframes 1 infografia_frame_3.png`);

  console.log('[Done] Proceso finalizado.');
}

main().catch((err) => {
  console.error('[Error en captura]:', err);
  process.exit(1);
});
