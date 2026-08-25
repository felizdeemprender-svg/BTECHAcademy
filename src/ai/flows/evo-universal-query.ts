import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { adminDb } from '@/firebase/admin';
import * as admin from 'firebase-admin';

export const universalFirestoreQueryTool = ai.defineTool(
  {
    name: 'universalFirestoreQuery',
    description: 'Realiza consultas dinámicas, filtrados y matemáticas avanzadas sobre cualquier colección de la base de datos.',
    inputSchema: z.object({
      collection: z.string().describe('Nombre de la colección principal (ej: courses, enrollments, salesPages, followups, users, campaigns) o subcolección (individualTasks, sessions).'),
      isCollectionGroup: z.boolean().default(false).describe('True si quieres buscar en todas las subcolecciones con ese nombre en toda la DB (ej: buscar en TODAS las individualTasks o TODAS las sessions de todos los seguimientos).'),
      filters: z.array(z.object({
        field: z.string(),
        operator: z.enum(['==', '!=', '>', '<', '>=', '<=', 'in', 'array-contains', 'array-contains-any']),
        value: z.any()
      })).optional().describe('Filtros a aplicar.'),
      aggregation: z.enum(['none', 'count', 'sum', 'average']).default('none').describe('Operación matemática a realizar. Si es "none", se devuelve la lista de documentos.'),
      aggregationField: z.string().optional().describe('El campo sobre el que se aplicará sum o average (ej: "progressPercent", "duration", "views").'),
      orderByField: z.string().optional().describe('Campo para ordenar los resultados (ej: "createdAt", "views").'),
      orderByDirection: z.enum(['asc', 'desc']).default('desc').describe('Dirección del ordenamiento.'),
      limit: z.number().optional().describe('Límite de documentos a devolver (máximo sugerido 50 si aggregation es "none").')
    }),
    outputSchema: z.any(),
  },
  async ({ collection, isCollectionGroup, filters, aggregation, aggregationField, orderByField, orderByDirection, limit }) => {
    const context = ai.currentContext();
    const uid = context?.uid;
    const role = context?.role;

    if (!uid) throw new Error('No autorizado.');

    try {
      let queryRef: admin.firestore.Query = isCollectionGroup 
        ? adminDb.collectionGroup(collection) 
        : adminDb.collection(collection);

      // Si es mentor, FORZAR filtro de seguridad si está consultando colecciones globales
      if (role === 'mentor' && !isCollectionGroup) {
        // Algunas colecciones usan mentorId, otras userId.
        // Si no está en los filtros, obligamos a que lo tenga o avisamos.
        const hasSecurityFilter = filters?.some(f => (f.field === 'mentorId' || f.field === 'userId' || f.field === 'studentId') && f.value === uid);
        if (!hasSecurityFilter && !['users'].includes(collection)) {
          // Inyectar filtro por defecto para mentorId
          queryRef = queryRef.where('mentorId', '==', uid);
        }
      }

      // Aplicar filtros
      if (filters && filters.length > 0) {
        for (const f of filters) {
          queryRef = queryRef.where(f.field, f.operator as admin.firestore.WhereFilterOp, f.value);
        }
      }

      // Aplicar orden (solo si no es matemática)
      if (orderByField && aggregation === 'none') {
        queryRef = queryRef.orderBy(orderByField, orderByDirection);
      }

      // Ejecutar Agregaciones Matemáticas
      if (aggregation === 'count') {
        const snap = await queryRef.count().get();
        return { success: true, count: snap.data().count };
      } 
      else if (aggregation === 'sum' && aggregationField) {
        const { AggregateField } = require('@google-cloud/firestore');
        const snap = await queryRef.aggregate({ total: AggregateField.sum(aggregationField) }).get();
        return { success: true, sum: snap.data().total };
      } 
      else if (aggregation === 'average' && aggregationField) {
        const { AggregateField } = require('@google-cloud/firestore');
        const snap = await queryRef.aggregate({ avg: AggregateField.average(aggregationField) }).get();
        return { success: true, average: snap.data().avg };
      }
      
      // Ejecutar Lectura Normal (Lista de Docs)
      const safeLimit = Math.min(limit || 20, 50); // Nunca devolver más de 50 para no reventar el LLM
      const snap = await queryRef.limit(safeLimit).get();
      
      if (snap.empty) {
        return { success: true, message: `No se encontraron resultados en ${collection}.` };
      }

      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return {
        success: true,
        countReturned: data.length,
        data: data
      };
    } catch (error: any) {
      console.error('[Universal Query Error]', error);
      return { success: false, error: error.message };
    }
  }
);
