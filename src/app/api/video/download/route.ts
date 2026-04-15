import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy de descarga para evitar errores de CORS y asegurar el nombre del archivo.
 * Descarga el binario desde Google Drive y lo sirve con el Content-Disposition correcto.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');
  const fileName = searchParams.get('name') || 'video.mp4';
  const token = searchParams.get('token');

  if (!fileId || !token) {
    return NextResponse.json({ error: 'Faltan parámetros id o token' }, { status: 400 });
  }

  try {
    console.log(`[DownloadProxy:Start] Solicitud para: "${fileName}" (ID: ${fileId})`);
    console.log(`[DownloadProxy:Debug] Token recibido (fragmento): ${token.substring(0, 10)}...`);

    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!driveRes.ok) {
      const err = await driveRes.text();
      console.error(`[DownloadProxy:Error] Google Drive falló (${driveRes.status}): ${err}`);
      return NextResponse.json({ error: `Drive error: ${driveRes.status}` }, { status: driveRes.status });
    }

    const contentType = driveRes.headers.get('content-type') || 'video/mp4';
    const contentLength = driveRes.headers.get('content-length');
    
    console.log(`[DownloadProxy:Audit] Respuesta de Drive: ${driveRes.status} ${driveRes.statusText}`);
    console.log(`[DownloadProxy:Audit] Content-Type: ${contentType}`);
    console.log(`[DownloadProxy:Audit] Content-Length: ${contentLength}`);

    // Si Google nos devuelve HTML, es una página de error enmascarada
    if (contentType.includes('text/html')) {
        const htmlSnippet = await driveRes.text();
        console.error(`[DownloadProxy:Error] Google devolvió HTML en lugar de video: ${htmlSnippet.substring(0, 200)}...`);
        return NextResponse.json({ error: 'Google devolvió una página de error. Es posible que el archivo aún se esté procesando o que el token haya expirado.' }, { status: 403 });
    }

    console.log(`[DownloadProxy:Ready] Stream de video validado de Drive.`);

    // Obtener los datos como un stream
    const dataStream = driveRes.body;
    if (!dataStream) throw new Error("Stream vacío desde Drive");

    // Saneamiento estricto: Eliminar caracteres prohibidos y normalizar para el header
    const cleanFileName = fileName.replace(/[:\\/*?"<>|]/g, '_');
    const safeFileName = cleanFileName.replace(/[^\x20-\x7E]/g, '_'); 
    const encodedFileName = encodeURIComponent(cleanFileName); // Codificar la versión YA limpia

    console.log(`[DownloadProxy:Headers] Original: ${fileName}, Clean: ${cleanFileName}`);

    return new Response(dataStream, {
      headers: {
        'Content-Type': 'application/octet-stream', // Forzar flujo binario para descarga
        'Content-Disposition': `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`,
        'Content-Length': contentLength || '',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error: any) {
    console.error(`[DownloadProxy:Fatal] ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
