import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const backupFile = process.argv[2];
    if (!backupFile) {
        console.error('Error: Debes proporcionar la ruta al archivo JSON de respaldo.');
        console.log('Uso: npx tsx scripts/restore_enrollments.ts ./backups/enrollments_backup_xxxx.json');
        process.exit(1);
    }

    const backupPath = path.resolve(backupFile);
    if (!fs.existsSync(backupPath)) {
        console.error(`Error: No se encontró el archivo de respaldo en la ruta: ${backupPath}`);
        process.exit(1);
    }

    console.log(`\n=== INICIANDO RESTAURACIÓN DESDE RESPALDO: ${backupFile} ===\n`);

    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
    if (!fs.existsSync(serviceAccountPath)) {
        console.error('No se encontró service-account.json');
        process.exit(1);
    }
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (!getApps().length) {
        initializeApp({
            credential: cert(serviceAccount)
        });
    }
    const db = getFirestore();

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8')) as any[];
    console.log(`Leídos ${backupData.length} registros para restaurar.`);

    for (const record of backupData) {
        if (record.action === 'before_modification_or_deletion' && record.document) {
            const docData = { ...record.document };
            const docId = docData.id;
            delete docData.id; // Remover campo id interno de Firestore si no es necesario (se guarda con docId en la ref)
            
            console.log(`Restaurando documento: ${docId} (courseId: ${docData.courseId}, studentId: ${docData.studentId})...`);
            
            // Volver a escribir el documento exacto a Firestore
            await db.collection('enrollments').doc(docId).set(docData);
            console.log(`  ✅ Restaurado con éxito.`);
        }
    }

    console.log('\n🎉 RESTAURACIÓN COMPLETADA CON ÉXITO.');
}

main().catch(console.error);
