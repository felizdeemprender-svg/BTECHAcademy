import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Escanea recursivamente un objeto (estado/json) buscando strings que comiencen con "data:image/".
 * Si encuentra uno, lo convierte a Blob, lo sube físicamente a Firebase Storage en la ruta indicada,
 * y reemplaza ese Base64 con la URL pública devuelta por Firebase.
 *
 * @param obj El objeto a escanear (mutará sus propiedades directamente).
 * @param storage La instancia de Firebase Storage.
 * @param basePath La carpeta base en Storage donde se guardarán (ej. "courses/123/marketing").
 * @returns El mismo objeto (por conveniencia), ya mutado con URLs reales.
 */
export const uploadPendingImagesInObject = async (
  obj: any,
  storage: any,
  basePath: string
): Promise<any> => {
  if (typeof obj !== 'object' || obj === null) return obj;

  const promises: Promise<void>[] = [];

  const walkAndUpload = (currentObj: any, pathMemo = '') => {
    if (typeof currentObj !== 'object' || currentObj === null) return;

    for (const key in currentObj) {
      if (Object.prototype.hasOwnProperty.call(currentObj, key)) {
        const val = currentObj[key];

        // Si es un Base64 de imagen pendiente de subir
        if (typeof val === 'string' && val.startsWith('data:image/')) {
          const uploadPromise = async () => {
            try {
              // Convertir Data URI a Blob
              const base64Parts = val.split(',');
              const mimeType = base64Parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
              const base64Data = base64Parts[1];
              
              const byteCharacters = atob(base64Data);
              const byteArray = new Uint8Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteArray[i] = byteCharacters.charCodeAt(i);
              }
              const blob = new Blob([byteArray], { type: mimeType });

              // Generar nombre único
              const ext = mimeType.split('/')[1] || 'jpg';
              const fileName = `ai_final_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
              const fullPath = `${basePath}/${fileName}`;

              // Subir a Firebase
              const storageRef = ref(storage, fullPath);
              const snapshot = await uploadBytes(storageRef, blob);
              const publicUrl = await getDownloadURL(snapshot.ref);

              // Reemplazar el valor original en el objeto por la URL real
              currentObj[key] = publicUrl;
              console.log(`[Upload Base64] Subida completada: ${fullPath}`);
            } catch (err) {
              console.error(`[Upload Base64] Error subiendo imagen en ${pathMemo}.${key}:`, err);
              // Si falla, lo dejamos como Base64 (podría romper si excede lim de Firestore, pero minimiza perdida de data)
            }
          };

          promises.push(uploadPromise());
        } else if (typeof val === 'object') {
          // Es un array o objeto anidado, lo recorremos recursivamente
          walkAndUpload(val, `${pathMemo}.${key}`);
        }
      }
    }
  };

  walkAndUpload(obj);

  // Esperar a que se suban todas las imágenes encontradas
  await Promise.all(promises);

  return obj;
};
