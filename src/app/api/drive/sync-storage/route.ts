import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, adminStorage } from '@/firebase/admin';
import { uploadToDrive, getOrCreateFolder } from '@/lib/drive-utils';
import os from 'os';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await getAdminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 });
    }

    const body = await req.json();
    const { googleToken, storageUrl, marketingName } = body;

    if (!googleToken || !storageUrl) {
      return NextResponse.json({ success: false, error: 'Faltan parámetros googleToken o storageUrl' }, { status: 400 });
    }

    console.log(`[DriveSync] Iniciando migración de Storage a Drive para: ${marketingName}`);

    const safeBaseName = (marketingName || 'EvoAssetV2').replace(/[^a-zA-Z0-9]/g, '_');
    const rootFolderId = await getOrCreateFolder(googleToken, 'Fastoria');
    const campaignFolderId = await getOrCreateFolder(googleToken, `Pack_${safeBaseName}`, rootFolderId);

    const urls = storageUrl.split(',').map((u: string) => u.trim()).filter(Boolean);
    const driveLinks = [];
    const driveIds = [];
    const downloadUrls = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      let filePathInBucket = '';
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const bucketName = adminStorage.bucket().name;
        const pathPart = pathname.substring(pathname.indexOf(bucketName) + bucketName.length + 1);
        filePathInBucket = decodeURIComponent(pathPart);
      } catch(e) {
        const match = decodeURIComponent(url).match(/(campaigns\/videos\/.*\.mp4)/);
        if (match) filePathInBucket = match[1];
      }

      if (!filePathInBucket) {
        console.warn(`[DriveSync] No se pudo extraer el path para: ${url}`);
        continue;
      }

      const tempDir = path.join(os.tmpdir(), 'drive_sync_' + Date.now() + '_' + i);
      fs.mkdirSync(tempDir, { recursive: true });
      const localFilePath = path.join(tempDir, 'temp_video.mp4');

      console.log(`[DriveSync] Descargando desde Storage: ${filePathInBucket}`);
      await adminStorage.bucket().file(filePathInBucket).download({ destination: localFilePath });

      console.log(`[DriveSync] Subiendo a Google Drive...`);
      const suffix = urls.length > 1 ? `_parte_${i+1}` : '';
      
      const mainFile = await uploadToDrive(localFilePath, googleToken, `${safeBaseName}_sync${suffix}_${Date.now()}.mp4`, 'video/mp4', campaignFolderId);

      driveLinks.push(mainFile.webViewLink);
      driveIds.push(mainFile.id);
      downloadUrls.push(mainFile.webContentLink);

      try {
        await adminStorage.bucket().file(filePathInBucket).delete();
      } catch (delErr: any) {
        console.warn(`[DriveSync] No se pudo borrar de Storage (quizás ya se borró):`, delErr.message);
      }

      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
    }

    if (driveIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Ningún archivo pudo ser sincronizado' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      webViewLink: driveLinks.join(','),
      driveId: driveIds.join(','),
      downloadUrl: downloadUrls.join(',')
    });

  } catch (err: any) {
    console.error('🔥 [DriveSync] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}


