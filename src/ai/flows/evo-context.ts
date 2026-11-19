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

async function resolveUserUidAndRole(inputUid?: string, ctx?: any): Promise<{ uid: string; role: string }> {
  let uid = inputUid || ctx?.context?.uid || ai.currentContext()?.uid;
  let role = ctx?.context?.role || ai.currentContext()?.role || '';
  if (!uid) {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      uid = cookieStore.get('btech_uid')?.value || '';
      if (!role) {
        role = cookieStore.get('btech_role')?.value || '';
      }
    } catch {}
  }
  return { uid: uid || '', role: role || 'alumno' };
}

export const getMentorDataTool = ai.defineTool(
  {
    name: 'getMentorData',
    description: 'Consulta los cursos creados por el mentor actual y los alumnos inscritos en ellos. Úsalo cuando el usuario pregunte por sus cursos, alumnos o métricas como tutor.',
    inputSchema: z.object({
      mentorId: z.string().optional().describe('ID opcional del mentor. Si se omite, se obtiene automáticamente del contexto.')
    }),
    outputSchema: z.any(),
  },
  async ({ mentorId }: { mentorId?: string } = {}, ctx?: any) => {
    const { uid } = await resolveUserUidAndRole(mentorId, ctx);
    if (!uid) throw new Error('No autorizado. UID no encontrado en el contexto de Genkit ni cookies.');

    const coursesSnap = await adminDb
      .collection('courses')
      .where('mentorId', '==', uid)
      .get();

    // Consultar landings (salesPages)
    const landingsSnap = await adminDb
      .collection('salesPages')
      .where('mentorId', '==', uid)
      .get();

    const landings = landingsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Landing sin título',
        courseId: data.courseId || 'Ninguno',
        views: data.views || data.visits || 0
      };
    });

    const courses = coursesSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
    const courseIds = courses.map((c) => c.id);

    // Consolidar inscripciones de los cursos del mentor y las asociadas directamente por mentorId
    const enrollmentDocsMap = new Map<string, any>();

    if (courseIds.length > 0) {
      for (let i = 0; i < courseIds.length; i += 30) {
        const chunk = courseIds.slice(i, i + 30);
        const snap = await adminDb.collection('enrollments').where('courseId', 'in', chunk).get();
        snap.docs.forEach((doc) => enrollmentDocsMap.set(doc.id, doc.data()));
      }
    }

    // También buscar enrollments directas con mentorId == uid
    const directEnrollSnap = await adminDb
      .collection('enrollments')
      .where('mentorId', '==', uid)
      .get();
    directEnrollSnap.docs.forEach((doc) => enrollmentDocsMap.set(doc.id, doc.data()));

    const studentsByCourse: Record<string, Set<string>> = {};
    const allStudentIds = new Set<string>();

    for (const enroll of enrollmentDocsMap.values()) {
      const cId = enroll.courseId || enroll.productId;
      const studentIdentifier = enroll.studentId || enroll.inviteEmail || enroll.studentEmail || enroll.email;

      if (studentIdentifier) {
        allStudentIds.add(studentIdentifier);
        if (cId) {
          if (!studentsByCourse[cId]) studentsByCourse[cId] = new Set();
          studentsByCourse[cId].add(studentIdentifier);
        }
      }
    }

    return {
      totalCourses: courses.length,
      totalUniqueStudentsAcrossAllCourses: allStudentIds.size,
      totalUniqueStudents: allStudentIds.size,
      totalLandings: landings.length,
      courses: courses.map((course) => ({
        id: course.id,
        title: course.title || 'Sin título',
        status: course.status || 'desconocido',
        uniqueStudentsCount: studentsByCourse[course.id]?.size ?? 0,
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
    inputSchema: z.object({
      studentId: z.string().optional().describe('ID opcional del alumno. Si se omite, se infiere del contexto.')
    }),
    outputSchema: z.any(),
  },
  async ({ studentId }: { studentId?: string } = {}, ctx?: any) => {
    const { uid } = await resolveUserUidAndRole(studentId, ctx);
    if (!uid) throw new Error('No autorizado. UID no encontrado en el contexto de Genkit ni cookies.');

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
  async ({ collectionName, role: inputRole, limit }: any, ctx?: any) => {
    const resolved = await resolveUserUidAndRole(undefined, ctx);
    const uid = resolved.uid;
    const role = inputRole || resolved.role;
    if (!uid) throw new Error('No autorizado. UID no encontrado en el contexto de Genkit ni cookies.');

    let queryRef: any;

    try {
      if (role === 'mentor') {
        if (collectionName === 'tasks') {
          queryRef = adminDb.collectionGroup('individualTasks').where('mentorId', '==', uid);
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
      
      // Obtener conteo total para que Evo pueda dar el número exacto
      const countSnap = await queryRef.count().get();
      const totalCount = countSnap.data().count;

      const snap = await queryRef.limit(safeLimit).get();
      
      if (snap.empty) {
        return { message: `No hay registros en la colección ${collectionName}.`, totalCount: 0 };
      }

      const data = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      
      return {
        collection: collectionName,
        totalCount: totalCount,
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
    description: 'Herramienta para leer manuales y documentación de la plataforma. Usa esta herramienta cuando necesites saber cómo funciona algo en FastoriaAcademy.',
    inputSchema: z.object({
      filename: z.enum(['database_schema.md', 'app_routes.md', 'business_rules.md', 'tutor_manual.md']).describe('Nombre del archivo de documentación a leer'),
    }),
    outputSchema: z.any(),
  },
  async ({ filename }: any) => {
    try {
      const docsPath = path.join(process.cwd(), 'src', 'ai', 'docs', filename);
      const content = await fs.readFile(docsPath, 'utf-8');
      return { content };
    } catch (error: any) {
      return { error: `No se pudo leer el archivo ${filename}: ${error.message}` };
    }
  }
);

export const getStudentsProgressTool = ai.defineTool(
  {
    name: 'getStudentsProgress',
    description: 'Consulta los alumnos inscritos en los cursos del tutor y su porcentaje exacto de avance (% de progreso). Permite filtrar por nombre de curso (ej: "LANZAR", "ESCALAR") o rango de avance.',
    inputSchema: z.object({
      courseName: z.string().optional().describe('Nombre o título del curso a filtrar (ej: "LANZAR", "ESCALAR"). Si se omite, analiza todos los cursos del tutor.'),
      courseId: z.string().optional().describe('ID exacto del curso si se conoce.'),
      minProgress: z.number().optional().describe('Filtrar alumnos con progreso mayor o igual a este porcentaje (ej: 1 para los que tienen más del 0%).'),
      maxProgress: z.number().optional().describe('Filtrar alumnos con progreso menor o igual a este porcentaje.'),
      sortBy: z.enum(['progress_asc', 'progress_desc', 'name_asc']).optional().describe('Ordenar por progreso ascendente/descendente o por nombre.'),
      limit: z.number().optional().describe('Cantidad máxima de alumnos a retornar (defecto: 50)')
    }),
    outputSchema: z.any(),
  },
  async ({ courseName, courseId, minProgress, maxProgress, sortBy, limit }: any, ctx?: any) => {
    const { uid } = await resolveUserUidAndRole(undefined, ctx);
    if (!uid) throw new Error('No autorizado. UID no encontrado en el contexto de Genkit ni cookies.');

    // 1. Obtener cursos del tutor
    const coursesSnap = await adminDb.collection('courses').where('mentorId', '==', uid).get();
    if (coursesSnap.empty) return { message: 'No tienes cursos creados.', students: [] };
    
    let courses = coursesSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

    // Filtrar por courseId o courseName si fue especificado
    if (courseId) {
      courses = courses.filter(c => c.id === courseId);
    } else if (courseName) {
      const search = courseName.trim().toLowerCase();
      const matched = courses.filter(c => (c.title || '').toLowerCase().includes(search));
      if (matched.length > 0) {
        courses = matched;
      }
    }

    if (courses.length === 0) {
      return { 
        message: `No se encontraron cursos que coincidan con "${courseName || courseId}".`,
        availableCourses: coursesSnap.docs.map(d => d.data().title || d.id),
        students: [] 
      };
    }

    const courseIds = courses.map(c => c.id);
    const coursesMap: Record<string, string> = {};
    const courseModulesMap: Record<string, number> = {};
    courses.forEach(c => {
      coursesMap[c.id] = c.title || 'Sin título';
      courseModulesMap[c.id] = c.modulesCount ?? c.modules?.length ?? 0;
    });

    // 2. Obtener inscripciones de estos cursos y directas por mentorId
    const enrollmentDocsMap = new Map<string, any>();

    for (let i = 0; i < courseIds.length; i += 30) {
      const chunk = courseIds.slice(i, i + 30);
      const snap = await adminDb.collection('enrollments').where('courseId', 'in', chunk).get();
      snap.docs.forEach(doc => enrollmentDocsMap.set(doc.id, { id: doc.id, ...doc.data() }));
    }

    // Incluir inscripciones donde mentorId == uid
    const directEnrollSnap = await adminDb
      .collection('enrollments')
      .where('mentorId', '==', uid)
      .get();
    directEnrollSnap.docs.forEach(doc => {
      const data = doc.data();
      const cId = data.courseId || data.productId;
      if (cId && courseIds.includes(cId)) {
        enrollmentDocsMap.set(doc.id, { id: doc.id, ...data });
      }
    });

    const allEnrollments = Array.from(enrollmentDocsMap.values());
    if (allEnrollments.length === 0) {
      return { 
        message: `No hay alumnos inscritos en los cursos seleccionados (${courses.map(c => c.title).join(', ')}).`,
        students: [] 
      };
    }

    // 3. Obtener datos de usuarios registrados en Auth/Users
    const studentIds = [...new Set(allEnrollments.map(e => e.studentId).filter(Boolean))];
    const usersMap: Record<string, any> = {};
    for (let i = 0; i < studentIds.length; i += 30) {
      const chunk = studentIds.slice(i, i + 30);
      const snap = await adminDb.collection('users').where('__name__', 'in', chunk).get();
      snap.docs.forEach(doc => { usersMap[doc.id] = doc.data(); });
    }

    // 4. Mapear datos completos calculando el progreso real
    let results = allEnrollments.map(enroll => {
      const cId = enroll.courseId || enroll.productId;
      const totalModules = courseModulesMap[cId] || 0;

      // Cálculo del progreso respetando progressPercent de Firestore
      let progressPercent = 0;
      if (enroll.status === 'completed') {
        progressPercent = 100;
      } else if (enroll.progressPercent !== undefined && typeof enroll.progressPercent === 'number') {
        progressPercent = Math.round(enroll.progressPercent);
      } else if (typeof enroll.progress === 'number') {
        progressPercent = Math.round(enroll.progress);
      } else {
        const completedList = enroll.progress?.completedModules || enroll.completedModules || [];
        const completedCount = Array.isArray(completedList) ? completedList.length : 0;
        progressPercent = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
      }

      // Resolución exhaustiva de nombre
      const userDoc = usersMap[enroll.studentId] || {};
      const studentName = (
        enroll.studentName ||
        userDoc.displayName ||
        userDoc.name ||
        enroll.inviteEmail?.split('@')[0] ||
        enroll.studentEmail?.split('@')[0] ||
        userDoc.email?.split('@')[0] ||
        'Alumno'
      ).trim();

      const studentEmail = (
        enroll.inviteEmail ||
        enroll.studentEmail ||
        enroll.email ||
        userDoc.email ||
        'Sin correo'
      ).trim();

      const isTutorTest = 
        (enroll.studentId && enroll.studentId === uid) || 
        studentEmail.toLowerCase().includes('tutor.') ||
        studentName.toLowerCase().includes('tutor.');

      return {
        enrollmentId: enroll.id,
        studentId: enroll.studentId || null,
        studentName,
        studentEmail,
        courseId: cId,
        courseTitle: coursesMap[cId] || 'Curso sin título',
        progressPercent,
        status: enroll.status || 'activo',
        isTutorTest
      };
    });

    // 5. Filtros de progreso
    if (minProgress !== undefined) {
      results = results.filter(r => r.progressPercent >= minProgress);
    }
    if (maxProgress !== undefined) {
      results = results.filter(r => r.progressPercent <= maxProgress);
    }

    // 6. Ordenar
    if (sortBy === 'progress_asc') {
      results.sort((a, b) => a.progressPercent - b.progressPercent);
    } else if (sortBy === 'progress_desc') {
      results.sort((a, b) => b.progressPercent - a.progressPercent);
    } else if (sortBy === 'name_asc') {
      results.sort((a, b) => a.studentName.localeCompare(b.studentName));
    }

    // 7. Limitar
    const totalMatching = results.length;
    if (limit && limit > 0) {
      results = results.slice(0, limit);
    }

    return {
      totalAnalyzed: allEnrollments.length,
      totalMatching,
      returnedCount: results.length,
      filteredByCourse: courseName || courseId || 'Todos los cursos',
      courses: courses.map(c => ({ id: c.id, title: c.title })),
      students: results
    };
  }
);

export const getMentorAgendaTool = ai.defineTool(
  {
    name: 'getMentorAgenda',
    description: 'Consulta las sesiones agendadas de todos los seguimientos del tutor. Úsalo para responder cuántas horas tiene ocupadas, su agenda o próximas citas.',
    inputSchema: z.object({
      startDate: z.string().optional().describe('Fecha de inicio en formato YYYY-MM-DD (ej: 2026-08-25). Si se omite, trae desde hoy.'),
      endDate: z.string().optional().describe('Fecha de fin en formato YYYY-MM-DD. Si se omite, trae todas las futuras.')
    }),
    outputSchema: z.any(),
  },
  async ({ startDate, endDate }: any, ctx?: any) => {
    const { uid } = await resolveUserUidAndRole(undefined, ctx);
    if (!uid) throw new Error('No autorizado. UID no encontrado en el contexto de Genkit ni cookies.');

    try {
      // 1. Obtener todos los seguimientos del mentor
      const followupsSnap = await adminDb.collection('followups').where('mentorId', '==', uid).get();
      if (followupsSnap.empty) return { message: 'No tienes seguimientos creados.' };

      const followupDocs = followupsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
      // 2. Iterar por cada seguimiento y traer sus sesiones
      let allSessions: any[] = [];
      for (const fu of followupDocs) {
        const sessionsSnap = await adminDb.collection('followups').doc(fu.id).collection('sessions').get();
        sessionsSnap.docs.forEach(doc => {
          const sessionData = doc.data();
          const today = new Date().toISOString().split('T')[0];
          
          let status = 'Sin agendar';
          if (sessionData.status) {
            if (sessionData.status === 'completed') status = 'Completada';
            else if (sessionData.status === 'cancelled') status = 'Cancelada';
            else if (sessionData.status === 'no_show') status = 'No asistió';
            else if (sessionData.status === 'scheduled') {
              status = sessionData.date >= today ? 'Programada' : 'Vencida';
            } else if (sessionData.status === 'pending') {
              status = 'Sin agendar';
            } else {
              status = sessionData.status; // fallback por si hay otro string
            }
          } else {
            // Fallback para documentos antiguos
            if (sessionData.isCompleted) {
              status = 'Completada';
            } else if (sessionData.date) {
              status = sessionData.date >= today ? 'Programada' : 'Vencida';
            }
          }

          allSessions.push({
            followupId: fu.id,
            studentName: fu.studentName || 'Desconocido',
            title: fu.title || 'Seguimiento',
            date: sessionData.date || '',
            time: sessionData.time || '00:00',
            duration: sessionData.duration || 60,
            isCompleted: sessionData.isCompleted || false,
            status
          });
        });
      }

      if (allSessions.length === 0) return { message: 'No hay sesiones en tus seguimientos.' };

      // 3. Filtrar por fechas (solo aplica a sesiones con fecha si se envían filtros)
      if (startDate || endDate) {
        allSessions = allSessions.filter(s => {
          if (!s.date) return false; // Si piden un rango, omitimos las sin fecha
          if (startDate && s.date < startDate) return false;
          if (endDate && s.date > endDate) return false;
          return true;
        });
      }

      if (allSessions.length === 0) return { message: 'No hay sesiones agendadas en ese rango de fechas.' };

      // 4. Ordenar y calcular total
      allSessions.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
      const totalMinutes = allSessions.reduce((acc, curr) => acc + curr.duration, 0);
      const totalHours = (totalMinutes / 60).toFixed(1);

      return {
        totalSessions: allSessions.length,
        totalMinutesOccupied: totalMinutes,
        totalHoursOccupied: totalHours,
        sessions: allSessions
      };
    } catch (error: any) {
      return { error: `Fallo al consultar agenda: ${error.message}` };
    }
  }
);

