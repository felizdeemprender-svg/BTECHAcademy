import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const dir = searchParams.get('dir') || process.cwd();

  // Simple security check
  if (secret !== 'evo-debug-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let ffmpegFilters = null;
    if (searchParams.get('check_ffmpeg') === 'true') {
      try {
        const exeName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
        const ffmpegPathFromStatic = require('ffmpeg-static');
        const ffmpegPath = ffmpegPathFromStatic || exeName;
        
        const { execSync } = require('child_process');
        try {
           const hasDrawtext = execSync(`${ffmpegPath} -filters | grep drawtext`).toString();
           const hasZoompan = execSync(`${ffmpegPath} -filters | grep zoompan`).toString();
           ffmpegFilters = 'DRAWTEXT ESTÁ INSTALADO: ' + hasDrawtext + ' | ZOOMPAN ESTÁ INSTALADO: ' + hasZoompan;
        } catch (e) {
           ffmpegFilters = 'Filtro(s) NO ENCONTRADO en los filtros.';
        }
      } catch (err: any) {
        ffmpegFilters = 'Error running ffmpeg: ' + err.message;
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
