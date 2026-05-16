import { adminStorage, adminDb } from '../src/firebase/admin';
import { firebaseConfig } from '../src/firebase/config';

async function analyzeStorage() {
  console.log('Iniciando análisis de Firebase Storage...');
  try {
    const bucket = adminStorage.bucket('btechacademy-8b329.firebasestorage.app');
    const [files] = await bucket.getFiles();

    console.log(`\nSe encontraron ${files.length} archivos en total.`);

    const folders: Record<string, { count: number; sizeBytes: number }> = {};
    let totalSize = 0;

    for (const file of files) {
      const size = parseInt(file.metadata.size as string || '0', 10);
      totalSize += size;

      // Extraer la ruta principal (primer nivel del directorio)
      const parts = file.name.split('/');
      const rootFolder = parts.length > 1 ? parts[0] : 'root (sin carpeta)';

      if (!folders[rootFolder]) {
        folders[rootFolder] = { count: 0, sizeBytes: 0 };
      }
      folders[rootFolder].count++;
      folders[rootFolder].sizeBytes += size;
    }

    console.log('\n=== REPORTE POR DIRECTORIO ===');
    for (const [folder, data] of Object.entries(folders)) {
      const sizeMB = (data.sizeBytes / (1024 * 1024)).toFixed(2);
      console.log(`- /${folder}: ${data.count} archivos | ${sizeMB} MB`);
    }

    const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`\nTamaño total aproximado: ${totalMB} MB`);

    // Análisis de carpetas temporales
    if (folders['render_tmp']) {
      console.log('\n⚠️ Atención: Se detectó la carpeta "render_tmp" que suele contener basura temporal.');
    }

  } catch (error) {
    console.error('Error al analizar Storage:', error);
  }
}

analyzeStorage();
