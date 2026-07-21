import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const isLive = process.argv.includes('--execute');
    const modeName = isLive ? 'LIVE (EJECUCIÓN REAL)' : 'DRY-RUN (SIMULACIÓN)';
    console.log(`\n=== SINCRONIZANDO PORCENTAJES DE PROGRESO EN MODO: ${modeName} ===\n`);

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

    // 1. Obtener todos los cursos y el conteo real de sus módulos
    console.log('Cargando cursos y contando sus módulos reales...');
    const coursesSnap = await db.collection('courses').get();
    const courseModulesCount: Record<string, number> = {};
    const courseTitles: Record<string, string> = {};

    for (const courseDoc of coursesSnap.docs) {
        const courseId = courseDoc.id;
        const data = courseDoc.data();
        courseTitles[courseId] = data.title || 'Curso sin título';

        // Contar módulos en la subcolección 'modules'
        const modulesSnap = await db.collection('courses').doc(courseId).collection('modules').get();
        const count = modulesSnap.size || data.modulesCount || 1; // evitar división por cero
        courseModulesCount[courseId] = count > 0 ? count : 1;
    }

    // 2. Obtener todas las inscripciones
    console.log('Cargando inscripciones...');
    const enrollmentsSnap = await db.collection('enrollments').get();
    let updatedCount = 0;

    console.log('\n--- VERIFICANDO INSCRIPCIONES ---');

    for (const doc of enrollmentsSnap.docs) {
        const enrollId = doc.id;
        const data = doc.data();
        const courseId = data.courseId;
        const studentEmail = data.inviteEmail || 'Email desconocido';
        const studentName = data.studentName || 'Alumno';

        if (!courseId) {
            console.log(`⚠️ Inscripción huérfana (sin courseId): Doc ID: ${enrollId}`);
            continue;
        }

        const totalModules = courseModulesCount[courseId] || 1;
        const completedModulesCount = data.progress?.completedModules?.length || 0;
        
        // Calcular porcentaje real
        const calculatedPercent = Math.min(100, Math.round((completedModulesCount / totalModules) * 100));
        const currentPercent = data.progressPercent;

        // Si difiere o no está definido, preparar actualización
        if (currentPercent === undefined || currentPercent !== calculatedPercent) {
            updatedCount++;
            const courseTitle = courseTitles[courseId] || courseId;
            console.log(`• Alumna: ${studentName} (${studentEmail})`);
            console.log(`  Curso: "${courseTitle}"`);
            console.log(`  - Módulos completados: ${completedModulesCount} / ${totalModules}`);
            console.log(`  - Porcentaje anterior: ${currentPercent === undefined ? 'undefined' : currentPercent}%`);
            console.log(`  - Porcentaje calculado: ${calculatedPercent}%`);
            
            if (isLive) {
                await db.collection('enrollments').doc(enrollId).update({
                    progressPercent: calculatedPercent
                });
                console.log(`  ✅ Actualizado en base de datos.`);
            }
            console.log('');
        }
    }

    console.log('=== RESUMEN ===');
    console.log(`Total de inscripciones analizadas: ${enrollmentsSnap.size}`);
    console.log(`Inscripciones que requerían corrección: ${updatedCount}`);

    if (!isLive && updatedCount > 0) {
        console.log('\n⚠️ ESTO FUE UNA SIMULACIÓN. Para guardar los cambios en la base de datos de Firestore, ejecuta:');
        console.log('   npx tsx scripts/sync_enrollments_progress.ts --execute');
    } else if (updatedCount === 0) {
        console.log('\n✅ Todos los porcentajes de progreso están perfectamente sincronizados.');
    } else {
        console.log('\n🎉 SINCRONIZACIÓN RETROACTIVA COMPLETADA CON ÉXITO.');
    }
}

main().catch(console.error);
