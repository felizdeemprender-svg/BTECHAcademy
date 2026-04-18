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
        const customPath = path.join(process.cwd(), 'node_modules', 'custom-ffmpeg-build', exeName);
        const ffmpegPathFromStatic = require('ffmpeg-static');
        
        let ffmpegPath = ffmpegPathFromStatic || exeName;
        if (require('fs').existsSync(customPath)) {
          ffmpegPath = customPath;
        }
        
        const { execSync } = require('child_process');
        let filterCheckResults = [];
        try {
           const hasDrawtext = execSync(`${ffmpegPath} -filters | grep drawtext`).toString();
           filterCheckResults.push('DRAWTEXT: SI');
        } catch(e) {
           filterCheckResults.push('DRAWTEXT: NO');
        }
        
        try {
           const hasZoompan = execSync(`${ffmpegPath} -filters | grep zoompan`).toString();
           filterCheckResults.push('ZOOMPAN: SI');
        } catch(e) {
           filterCheckResults.push('ZOOMPAN: NO');
        }
        
        ffmpegFilters = filterCheckResults.join(' | ');
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
