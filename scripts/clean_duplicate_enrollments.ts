import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const isLive = process.argv.includes('--execute');
    const modeName = isLive ? 'LIVE (EJECUCIÓN REAL)' : 'DRY-RUN (SIMULACIÓN)';
    console.log(`\n=== INICIANDO SANEAMIENTO DE INSCRIPCIONES EN MODO: ${modeName} ===\n`);

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

    // 1. Obtener todos los usuarios para mapear emails a UIDs reales
    const usersSnap = await db.collection('users').get();
    const emailToUser: Record<string, { uid: string; displayName: string }> = {};
    usersSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.email) {
            emailToUser[data.email.toLowerCase().trim()] = {
                uid: doc.id,
                displayName: data.displayName || data.email.split('@')[0]
            };
        }
    });

    // 2. Obtener todos los enrollments
    const enrollmentsSnap = await db.collection('enrollments').get();
    const allEnrollments = enrollmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as any));

    // 3. Agrupar por (email normalizado, courseId)
    const groups: Record<string, any[]> = {};
    allEnrollments.forEach(enroll => {
        const courseId = enroll.courseId;
        let email = '';
        if (enroll.inviteEmail) {
            email = enroll.inviteEmail.toLowerCase().trim();
        } else if (enroll.studentId && enroll.studentId.includes('_')) {
            // Reconstruir email de ID temporal si no hay inviteEmail
            email = enroll.studentId.replace(/_/g, '.'); // aproximación burda
        }

        // Si tenemos el UID real de studentId, buscar email
        if (!email && enroll.studentId) {
            const foundEmail = Object.keys(emailToUser).find(k => emailToUser[k].uid === enroll.studentId);
            if (foundEmail) email = foundEmail;
        }

        if (!email) email = (enroll.studentId || 'unknown').toLowerCase().trim();

        const key = `${email} || ${courseId}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(enroll);
    });

    const backupData: any[] = [];
    const updates: { docId: string; data: any }[] = [];
    const deletions: string[] = [];

    console.log('--- PROCESANDO GRUPOS ---');

    for (const key of Object.keys(groups)) {
        const list = groups[key];
        const [email, courseId] = key.split(' || ');
        const realUser = emailToUser[email];

        if (list.length > 1) {
            // Caso de DUPLICADOS
            console.log(`\n[Duplicados] Grupo: ${email} | Curso: ${courseId} (${list.length} registros)`);
            
            // Guardar original en backup antes de tocar
            list.forEach(enroll => {
                backupData.push({ action: 'before_modification_or_deletion', document: enroll });
            });

            // Elegir principal: Preferimos la que ya tiene el UID real, o la más antigua si ninguna lo tiene
            let primary = list.find(enroll => realUser && enroll.studentId === realUser.uid);
            if (!primary) {
                // Si no hay ninguno con el UID real, elegimos el que tenga más progreso o el primero
                primary = list.reduce((best, curr) => {
                    const bestCompleted = best.progress?.completedModules?.length || 0;
                    const currCompleted = curr.progress?.completedModules?.length || 0;
                    return currCompleted >= bestCompleted ? curr : best;
                }, list[0]);
            }

            console.log(`  -> Seleccionado como PRINCIPAL: Doc ID: ${primary.id} (studentId actual: "${primary.studentId}")`);

            // Fusionar progresos de las secundarias en la principal
            const mergedCompletedModules = new Set<string>(primary.progress?.completedModules || []);
            const mergedEvaluations = { ...(primary.progress?.evaluations || {}) };
            let earliestEnrolledAt = primary.enrolledAt;

            list.forEach(enroll => {
                if (enroll.id === primary.id) return;

                console.log(`  -> Identificado como SECUNDARIO (se eliminará): Doc ID: ${enroll.id}`);
                deletions.push(enroll.id);

                // Fusionar completedModules
                if (enroll.progress?.completedModules) {
                    enroll.progress.completedModules.forEach((mId: string) => mergedCompletedModules.add(mId));
                }

                // Fusionar evaluations
                if (enroll.progress?.evaluations) {
                    Object.keys(enroll.progress.evaluations).forEach(modId => {
                        const existingEval = mergedEvaluations[modId];
                        const newEval = enroll.progress.evaluations[modId];
                        if (!existingEval) {
                            mergedEvaluations[modId] = newEval;
                        } else {
                            // Si ambos tienen evaluación para el mismo módulo, nos quedamos con la de mayor nota
                            const scoreExisting = existingEval.score || 0;
                            const scoreNew = newEval.score || 0;
                            if (scoreNew > scoreExisting) {
                                mergedEvaluations[modId] = newEval;
                            }
                        }
                    });
                }

                // Mantener fecha de inscripción más antigua
                if (enroll.enrolledAt && earliestEnrolledAt) {
                    const enrollSec = enroll.enrolledAt._seconds || 0;
                    const enrollPrim = earliestEnrolledAt._seconds || 0;
                    if (enrollSec < enrollPrim) {
                        earliestEnrolledAt = enroll.enrolledAt;
                    }
                } else if (enroll.enrolledAt && !earliestEnrolledAt) {
                    earliestEnrolledAt = enroll.enrolledAt;
                }
            });

            // Preparar actualización del principal con datos fusionados y UID real si existe
            const updateFields: any = {
                progress: {
                    completedModules: Array.from(mergedCompletedModules),
                    evaluations: mergedEvaluations
                }
            };

            if (realUser) {
                updateFields.studentId = realUser.uid;
                updateFields.studentName = realUser.displayName;
            }
            if (earliestEnrolledAt) {
                updateFields.enrolledAt = earliestEnrolledAt;
            }

            updates.push({ docId: primary.id, data: updateFields });
            console.log(`  -> Fusionando progreso en principal: ${mergedCompletedModules.size} módulos completados.`);
            if (realUser && primary.studentId !== realUser.uid) {
                console.log(`  -> Actualizando studentId a UID real: "${realUser.uid}"`);
            }

        } else if (list.length === 1) {
            // Caso de REGISTRO ÚNICO (solo verificar si tiene ID temporal y corregirlo)
            const enroll = list[0];
            const isTempId = enroll.studentId && (enroll.studentId.includes('_') || enroll.studentId.includes('@'));
            
            if (isTempId && realUser) {
                console.log(`\n[Único temporal] Doc ID: ${enroll.id} | Email: ${email} | Curso: ${courseId}`);
                console.log(`  -> Actualizando studentId temporal "${enroll.studentId}" al UID real "${realUser.uid}"`);
                
                backupData.push({ action: 'before_modification_or_deletion', document: enroll });
                updates.push({
                    docId: enroll.id,
                    data: {
                        studentId: realUser.uid,
                        studentName: realUser.displayName
                    }
                });
            }
        }
    }

    console.log('\n--- RESUMEN DE CAMBIOS ---');
    console.log(`Inscripciones a actualizar/corregir: ${updates.length}`);
    console.log(`Inscripciones duplicadas a eliminar: ${deletions.length}`);

    if (updates.length === 0 && deletions.length === 0) {
        console.log('\n✅ Todo está limpio. No se requiere realizar modificaciones.');
        return;
    }

    // 4. Escribir Respaldo si es LIVE
    if (isLive) {
        if (!fs.existsSync('./backups')) {
            fs.mkdirSync('./backups');
        }
        const timestamp = Date.now();
        const backupPath = path.join(process.cwd(), 'backups', `enrollments_backup_${timestamp}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
        console.log(`\n💾 Respaldo escrito exitosamente en: ${backupPath}`);

        console.log('\nAplicando cambios en Firestore...');
        
        // Ejecutar las actualizaciones
        for (const update of updates) {
            await db.collection('enrollments').doc(update.docId).update(update.data);
            console.log(`  ✅ Actualizado: Doc ID: ${update.docId}`);
        }

        // Ejecutar las eliminaciones
        for (const docId of deletions) {
            await db.collection('enrollments').doc(docId).delete();
            console.log(`  ✅ Eliminado duplicado: Doc ID: ${docId}`);
        }

        console.log('\n🎉 SANEAMIENTO COMPLETADO CON ÉXITO.');
    } else {
        console.log('\n⚠️ ESTO FUE UNA SIMULACIÓN. Para aplicar los cambios reales en Firestore, ejecuta la herramienta pasándole la bandera `--execute`:');
        console.log('   npx tsx scripts/clean_duplicate_enrollments.ts --execute');
    }
}

main().catch(console.error);
