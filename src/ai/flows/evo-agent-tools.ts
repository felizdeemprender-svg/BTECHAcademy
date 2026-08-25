'use server';
/**
 * @fileOverview Herramientas de Ejecución Activa (Fase 2)
 * Funciones de mutación para que Evo actúe como un Agente verdadero.
 */

import { adminDb } from '@/firebase/admin';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { FieldValue } from 'firebase-admin/firestore';

export const enrollStudentTool = ai.defineTool(
  {
    name: 'enrollStudent',
    description: 'Matricula a un alumno (existente) en un curso del tutor. Úsalo cuando te pidan dar de alta a un estudiante.',
    inputSchema: z.object({
      studentEmail: z.string().describe('Correo del alumno a matricular'),
      courseId: z.string().describe('ID del curso'),
    }),
    outputSchema: z.any(),
  },
  async ({ studentEmail, courseId }) => {
    const context = ai.currentContext();
    const uid = context?.uid;
    if (!uid) throw new Error('No autorizado.');

    try {
      // 1. Validar si el curso es del tutor
      const courseSnap = await adminDb.collection('courses').doc(courseId).get();
      if (!courseSnap.exists || courseSnap.data()?.mentorId !== uid) {
        return { success: false, message: 'El curso no existe o no te pertenece.' };
      }

      // 2. Buscar al alumno por email
      const userSnap = await adminDb.collection('users').where('email', '==', studentEmail).limit(1).get();
      if (userSnap.empty) {
        return { success: false, message: `No se encontró ningún usuario con el correo ${studentEmail}.` };
      }
      const studentId = userSnap.docs[0].id;

      // 3. Crear inscripción
      const enrollmentRef = adminDb.collection('enrollments').doc(`${studentId}_${courseId}`);
      const checkSnap = await enrollmentRef.get();
      
      if (checkSnap.exists) {
        return { success: false, message: 'El alumno ya está inscrito en este curso.' };
      }

      await enrollmentRef.set({
        studentId,
        courseId,
        enrolledAt: FieldValue.serverTimestamp(),
        progress: 0,
        status: 'activo'
      });

      return { success: true, message: `Alumno ${studentEmail} matriculado exitosamente en el curso.` };
    } catch (e: any) {
      return { success: false, message: `Error: ${e.message}` };
    }
  }
);

export const formatCrmNotesTool = ai.defineTool(
  {
    name: 'formatCrmNotes',
    description: 'Guarda una nota o seguimiento en el CRM (colección followups) para un alumno o prospecto.',
    inputSchema: z.object({
      studentNameOrEmail: z.string().describe('Nombre o correo del alumno al que le pertenece la nota'),
      noteContent: z.string().describe('El texto de la nota estructurada'),
    }),
    outputSchema: z.any(),
  },
  async ({ studentNameOrEmail, noteContent }) => {
    const context = ai.currentContext();
    const uid = context?.uid;
    if (!uid) throw new Error('No autorizado.');

    try {
      await adminDb.collection('followups').add({
        mentorId: uid,
        target: studentNameOrEmail,
        content: noteContent,
        createdAt: FieldValue.serverTimestamp(),
        type: 'ai_formatted_note'
      });
      return { success: true, message: 'Nota estructurada y guardada en el CRM con éxito.' };
    } catch (e: any) {
      return { success: false, message: `Error guardando la nota: ${e.message}` };
    }
  }
);
