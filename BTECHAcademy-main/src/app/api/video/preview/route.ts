import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  const file = searchParams.get('file') || 'final_render.mp4';

  if (!jobId) {
    return NextResponse.json({ error: 'Faltan parámetros jobId' }, { status: 400 });
  }

  const baseRenderPath = path.join(os.tmpdir(), 'render_jobs_v2');
  const filePath = path.join(baseRenderPath, jobId, file);

  if (!fs.existsSync(filePath)) {
    console.error(`[Preview:Error] Archivo no encontrado: ${filePath}`);
    return NextResponse.json({ error: 'Archivo no encontrado o ya fue eliminado por la Bomba de Humo.' }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.get('range');

  const contentType = file.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream';

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    // @ts-ignore - ReadableStream conversion
    return new Response(fileStream, {
      status: 206,
      headers: head,
    });
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
    const fileStream = fs.createReadStream(filePath);
    // @ts-ignore
    return new Response(fileStream, {
      status: 200,
      headers: head,
    });
  }
}
