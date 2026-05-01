
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const uid = process.argv[2];
    if (!uid) {
        console.error('Por favor, proporciona un UID.');
        process.exit(1);
    }

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
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
        console.log(`El usuario con UID ${uid} no existe.`);
    } else {
        console.log('--- PERFIL DE USUARIO ---');
        console.log(JSON.stringify(userDoc.data(), null, 2));
    }
}

main().catch(console.error);
