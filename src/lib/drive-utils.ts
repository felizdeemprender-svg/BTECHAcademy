import fs from 'fs';
import { readFile, stat } from 'fs/promises';

/**
 * Busca una carpeta por nombre. Si no existe, la crea.
 * Si se proporciona parentId, la busca/crea dentro de esa carpeta.
 */
export async function getOrCreateFolder(token: string, folderName: string, parentId?: string): Promise<string> {
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  } else {
    query += ` and 'root' in parents`;
  }
  
  const encodedQuery = encodeURIComponent(query);
  console.log(`[Drive:Folder] Buscando o creando carpeta: ${folderName} (Parent: ${parentId || 'root'})`);

  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodedQuery}&fields=files(id, name)`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!searchRes.ok) {
    const err = await searchRes.text();
    throw new Error(`Drive Folder Search Failed: ${err}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    console.log(`[Drive:Folder] Carpeta encontrada: ${searchData.files[0].id}`);
    return searchData.files[0].id;
  }

  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) metadata.parents = [parentId];

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Drive Folder Creation Failed: ${err}`);
  }

  const createData = await createRes.json();
  console.log(`[Drive:Folder] Carpeta creada exitosamente: ${createData.id}`);
  return createData.id;
}

/**
 * Opción B: Creación de Metadata + Patch de Media Binario.
 * Paso 1: POST a /drive/v3/files para crear el objeto con metadata y obtener un fileId.
 * Paso 2: PATCH a /upload/drive/v3/files/{fileId}?uploadType=media con el binario crudo.
 * Paso 3: GET para obtener links definitivos (con anti-latencia de indexación).
 */

/**
 * Concede permiso de lectura pública al archivo ("Anyone with the link can view").
 */
export async function shareFilePublicly(fileId: string, token: string) {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
    if (!res.ok) {
      console.error(`[Drive:Share] Error al compartir archivo ${fileId}:`, await res.text());
    }
  } catch (e) {
    console.error(`[Drive:Share] Fallo crítico al compartir ${fileId}:`, e);
  }
}

export async function uploadToDrive(
  filePath: string,
  token: string,
  name: string,
  mimeType: string = 'video/mp4',
  folderId?: string
): Promise<any> {
  const fileBuffer = await readFile(filePath);
  const fileStats = await stat(filePath);
  const fileSize = fileStats.size;

  console.log(`[Drive:Upload] Iniciando Opción B para: ${name} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

  // PASO 1: Crear el objeto con metadata y obtener fileId definitivo
  const metadataMap: any = { name, mimeType };
  if (folderId) metadataMap.parents = [folderId];

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadataMap)
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Fallo creando objeto en Drive: ${errText}`);
  }

  const { id: fileId } = await createRes.json();
  if (!fileId) throw new Error('Google Drive no devolvió fileId en el paso 1.');

  console.log(`[Drive:Upload] Objeto creado (ID: ${fileId}). Subiendo binario (${fileSize} bytes)...`);

  // PASO 2: Patch del binario crudo sobre el fileId obtenido
  const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token.trim()}`,
      'Content-Type': mimeType
    },
    body: fileBuffer
  });

  if (!patchRes.ok) {
    const errText = await patchRes.text();
    throw new Error(`Fallo subiendo binario a Drive: ${errText}`);
  }

  // REPARACIÓN AUTOMÁTICA POST-UPLOAD
  try {
    const checkRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,md5Checksum`, {
      headers: { 'Authorization': `Bearer ${token.trim()}` }
    });
    if (checkRes.ok) {
        const metaData = await checkRes.json();
        if (!metaData.md5Checksum || metaData.mimeType !== mimeType) {
            console.log(`[Drive:Repair] Corrigiendo integridad de ${name}...`);
            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token.trim()}`,
                    'Content-Type': mimeType
                },
                body: fileBuffer
            });
        }
    }
  } catch (e) {}

  console.log(`[Drive:Upload] Binario subido. Esperando indexación de Drive...`);

  // PASO 3: Anti-latencia y Permisos
  await Promise.all([
    new Promise(resolve => setTimeout(resolve, 800)),
    shareFilePublicly(fileId, token)
  ]);

  const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink,webContentLink,mimeType,size`, {
    headers: { 'Authorization': `Bearer ${token.trim()}` }
  });

  if (!metaRes.ok) {
    throw new Error(`Error obteniendo links de Drive: ${await metaRes.text()}`);
  }

  const result = await metaRes.json();
  console.log(`[Drive:Upload] ✅ Completado: ${result.name} (ID: ${result.id})`);
  return result;
}
