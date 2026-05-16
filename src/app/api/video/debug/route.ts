import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function GET(req: NextRequest) {
  const customBin = path.join(process.cwd(), 'node_modules', 'custom-ffmpeg-build', 'ffmpeg');
  const staticBin = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  
  const results: any = {
    platform: process.platform,
    cwd: process.cwd(),
    binaries: {
      custom: { path: customBin, exists: fs.existsSync(customBin) },
      static: { path: staticBin, exists: fs.existsSync(staticBin) }
    }
  };

  const checkVersion = (bin: string) => new Promise((resolve) => {
    if (!fs.existsSync(bin)) return resolve('N/A');
    const proc = spawn(bin, ['-version']);
    let out = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.on('close', () => resolve(out.split('\n')[0]));
    proc.on('error', e => resolve('Error: ' + e.message));
    setTimeout(() => resolve('Timeout'), 2000);
  });

  results.versions = {
    custom: await checkVersion(customBin),
    static: await checkVersion(staticBin)
  };

  // Check fonts
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  results.fonts = {
    path: fontsDir,
    exists: fs.existsSync(fontsDir),
    files: fs.existsSync(fontsDir) ? fs.readdirSync(fontsDir) : []
  };

  return NextResponse.json(results);
}
