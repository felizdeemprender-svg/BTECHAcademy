import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getAdminAuth } from '@/firebase/admin';
import { spawn } from 'child_process';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Verificar Firebase ID Token (Authorization: Bearer <token>)
// ─────────────────────────────────────────────────────────────────────────────
async function verifyAuth(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return null;
    }

    const decoded = await getAdminAuth().verifyIdToken(token);
    if (!decoded.admin) {
      return null;
    }
    return decoded.uid;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Ejecutar ffmpeg -filters SIN shell (seguro contra inyección)
// ─────────────────────────────────────────────────────────────────────────────
async function getFFmpegFilters(ffmpegPath: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(ffmpegPath, ['-filters'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false, // CRÍTICO: sin shell = sin inyección
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        resolve(`Error (code ${code}): ${stderr}`);
      }
    });

    child.on('error', (err) => {
      resolve(`Spawn error: ${err.message}`);
    });

    // Timeout de seguridad (5s)
    setTimeout(() => {
      child.kill('SIGTERM');
      resolve('Timeout ejecutando ffmpeg');
    }, 5000);
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dir = searchParams.get('dir') || process.cwd();

  try {
    const adminUid = await verifyAuth(req);
    if (!adminUid) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let ffmpegFilters = null;
    if (searchParams.get('check_ffmpeg') === 'true') {
      try {
        const exeName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
        const customPath = path.join(process.cwd(), 'node_modules', 'custom-ffmpeg-build', exeName);
        const ffmpegPathFromStatic = require('ffmpeg-static');
        
        let ffmpegPath = ffmpegPathFromStatic || exeName;
        if (require('fs').existsSync(customPath)) {
          ffmpegPath = customPath;
        }
        
        // Verificar que el path existe y es archivo
        if (!require('fs').existsSync(ffmpegPath)) {
          ffmpegFilters = 'ffmpeg no encontrado en: ' + ffmpegPath;
        } else {
          const output = await getFFmpegFilters(ffmpegPath);
          
          const hasDrawtext = output.includes('drawtext');
          const hasZoompan = output.includes('zoompan');
          
          const results = [];
          if (hasDrawtext) results.push('DRAWTEXT: SI'); else results.push('DRAWTEXT: NO');
          if (hasZoompan) results.push('ZOOMPAN: SI'); else results.push('ZOOMPAN: NO');
          
          ffmpegFilters = results.join(' | ');
        }
      } catch (err: any) {
        ffmpegFilters = 'Error comprobando ffmpeg: ' + err.message;
      }
    }

    return NextResponse.json({
      success: true,
      currentDir: dir,
      ffmpegFilters: ffmpegFilters ? ffmpegFilters.substring(0, 1000) + '...' : null
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      attemptedDir: dir 
    }, { status: 500 });
  }
}