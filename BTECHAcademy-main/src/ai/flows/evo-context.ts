'use server';
/**
 * @fileOverview Herramientas de Genkit para que Evo consulte la BD autónomamente.
 * Usa las cookies para garantizar la seguridad del UID.
 */

import { adminDb } from '@/firebase/admin';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fs from 'fs/promises';
import path from 'path';

export const getMentorDataTool = ai.defineTool(
  {
    name: 'getMentorData',
    description: 'Consulta los cursos creados por el mentor actual y los alumnos inscritos en ellos. Úsalo cuando el usuario pregunte por sus cursos, alumnos o métricas como tutor.',
    inputSchema: z.object({}),
    outputSchema: z.any(),
  },
  async () => {
    const context = ai.currentContext();
    const uid = context?.uid;
    if (!uid) throw new Error('No autorizado. UID no encontrado en el contexto de Genkit.');

    const coursesSnap = await adminDb
      .collection('courses')
      .where('mentorId', '==', uid)
      .get();

    // Consultar landings (salesPages)
    const landingsSnap = await adminDb
      .collection('salesPages')
      .where('mentorId', '==', uid)
      .get();

    const landings = landingsSnap.docs.map((doc) => ({
      id: doc.id,
      title: doc.data().title || 'Landing sin título',
      courseId: doc.data().courseId || 'Ninguno'
    }));

    if (coursesSnap.empty && landingsSnap.empty) {
      return { message: 'El mentor no tiene cursos ni landings creados aún.' };
    }

    const courses = coursesSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
    const courseIds = courses.map((c) => c.id);

    const allEnrollments: any[] = [];
    if (courseIds.length > 0) {
      for (let i = 0; i < courseIds.length; i += 30) {
        const chunk = courseIds.slice(i, i + 30);
        const snap = await adminDb.collection('enrollments').where('courseId', 'in', chunk).get();
        snap.docs.forEach((doc) => allEnrollments.push(doc.data()));
      }
    }

    const studentsByCourse: Record<string, Set<string>> = {};
    const allStudentIds = new Set<string>();

    for (const enroll of allEnrollments) {
      if (!studentsByCourse[enroll.courseId]) studentsByCourse[enroll.courseId] = new Set();
      if (enroll.studentId) {
        studentsByCourse[enroll.courseId].add(enroll.studentId);
        allStudentIds.add(enroll.studentId);
      }
    }

    return {
      totalCourses: courses.length,
      totalUniqueStudents: allStudentIds.size,
      totalLandings: landings.length,
      courses: courses.map((course) => ({
        id: course.id,
        title: course.title || 'Sin título',
        status: course.status || 'desconocido',
        studentsCount: studentsByCourse[course.id]?.size ?? 0,
      })),
      landings: landings
    };
  }
);

export const getStudentDataTool = ai.defineTool(
  {
    name: 'getStudentData',
    description: 'Consulta los cursos en los que el alumno actual está inscrito y su progreso. Úsalo cuando el usuario pregunte por sus inscripciones o avance de estudio.',
    inputSchema: z.object({}),
    outputSchema: z.any(),
  },
  async () => {
    const context = ai.currentContext();
    const uid = context?.uid;
    if (!uid) throw new Error('No autorizado. UID no encontrado en el contexto de Genkit.');

    const enrollSnap = await adminDb
      .collection('enrollments')
      .where('studentId', '==', uid)
      .get();

    if (enrollSnap.empty) {
      return { message: 'El alumno no está inscripto en ningún curso aún.' };
    }

    const enrollments = enrollSnap.docs.map((doc) => doc.data() as any);
    const courseIds = [...new Set(enrollments.map((e) => e.courseId).filter(Boolean))];

    const coursesMap: Record<string, any> = {};
    for (let i = 0; i < courseIds.length; i += 30) {
      const chunk = courseIds.slice(i, i + 30);
      const snap = await adminDb
        .collection('courses')
        .where('__name__', 'in', chunk)
        .get();
      snap.docs.forEach((doc) => { coursesMap[doc.id] = { id: doc.id, ...doc.data() }; });
    }

    return {
      totalEnrolledCourses: enrollments.length,
      enrollments: enrollments.map((enroll) => {
        const course = coursesMap[enroll.courseId];
        return {
          courseId: enroll.courseId,
          title: course?.title || enroll.courseId,
          progressPercent: enroll.progress ?? 0,
          status: enroll.status || 'activo'
        };
      })
    };
  }
);

export const queryPlatformDataTool = ai.defineTool(
  {
    name: 'queryPlatformData',
    description: 'Herramienta universal para consultar otras colecciones de la plataforma (leads, seguimientos, tareas, campañas, etc). NO usar para contar alumnos (usa getMentorData).',
    inputSchema: z.object({
      collectionName: z.enum(['leads', 'followups', 'campaigns', 'tasks', 'salesPages', 'referidos']).describe('Nombre de la colección a consultar'),
      role: z.enum(['mentor', 'student']).describe('Tu rol para aplicar los filtros de seguridad correctos'),
      limit: z.number().optional().describe('Cantidad de resultados a devolver (máximo 50, defecto 20)'),
    }),
    outputSchema: z.any(),
  },
  async ({ collectionName, role, limit }) => {
    const context = ai.currentContext();
    const uid = context?.uid;
    if (!uid) throw new Error('No autorizado. UID no encontrado en el contexto de Genkit.');

    let queryRef: any;

    try {
      if (role === 'mentor') {
        if (collectionName === 'tasks') {
          queryRef = adminDb.collection('users').doc(uid).collection('individualTasks');
        } else if (collectionName === 'referidos') {
          queryRef = adminDb.collection('mentorInfluencers').doc(uid).collection('referidos');
        } else {
          // leads, followups, campaigns, salesPages tienen mentorId
          queryRef = adminDb.collection(collectionName).where('mentorId', '==', uid);
        }
      } else {
        // student
        if (collectionName === 'tasks') {
          queryRef = adminDb.collection('users').doc(uid).collection('individualTasks');
        } else if (collectionName === 'followups') {
          // Los followups pueden tener studentId en subcolecciones, pero dejemos una consulta simple
          queryRef = adminDb.collection(collectionName).where('studentId', '==', uid);
        } else {
          queryRef = adminDb.collection(collectionName).where('userId', '==', uid);
        }
      }

      const safeLimit = Math.min(limit || 20, 50);
      const snap = await queryRef.limit(safeLimit).get();
      
      if (snap.empty) {
        return { message: `No hay registros en la colección ${collectionName}.` };
      }

      const data = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      
      return {
        collection: collectionName,
        countReturned: data.length,
        data: data
      };
    } catch (error: any) {
      return { error: `Fallo al consultar ${collectionName}: ${error.message}` };
    }
  }
);

export const readDocumentationTool = ai.defineTool(
  {
    name: 'readDocumentation',
    description: 'Herramienta para leer manuales y documentación de la plataforma. Usa esta herramienta cuando necesites saber cómo funciona algo en BTECHAcademy.',
    inputSchema: z.object({
      filename: z.enum(['database_schema.md', 'app_routes.md', 'business_rules.md']).describe('Nombre del archivo de documentación a leer'),
    }),
    outputSchema: z.any(),
  },
  async ({ filename }) => {
    try {
      const docsPath = path.join(process.cwd(), 'src', 'ai', 'docs', filename);
      const content = await fs.readFile(docsPath, 'utf-8');
      return { content };
    } catch (error: any) {
      return { error: `No se pudo leer el archivo ${filename}: ${error.message}` };
    }
  }
);
