import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

export const executeBigQuerySQLTool = ai.defineTool(
  {
    name: 'executeBigQuerySQL',
    description: 'Ejecuta una consulta SQL en BigQuery para responder preguntas analíticas complejas (conteo, sumas, cruces de datos). Solo usar consultas SELECT de lectura.',
    inputSchema: z.object({
      sqlQuery: z.string().describe('La consulta SQL a ejecutar. Debes usar la sintaxis de Google Standard SQL y hacer referencia a las tablas del dataset de Firestore exportado.'),
      rationale: z.string().optional().describe('Explicación breve de por qué se armó la consulta de esta manera.'),
    }),
    outputSchema: z.any(),
  },
  async ({ sqlQuery, rationale }) => {
    const context = ai.currentContext();
    const uid = context?.uid;
    const role = context?.role;
    
    if (!uid || role !== 'mentor') {
      throw new Error('No autorizado para ejecutar consultas analíticas avanzadas.');
    }

    try {
      console.log(`[Evo BigQuery] Ejecutando consulta SQL para mentor ${uid}:\n${sqlQuery}`);
      
      const upperSql = sqlQuery.toUpperCase();
      if (upperSql.includes('DROP ') || upperSql.includes('DELETE ') || upperSql.includes('UPDATE ') || upperSql.includes('INSERT ')) {
        throw new Error('Solo se permiten consultas SELECT.');
      }

      const options = {
        query: sqlQuery,
        location: 'US', // Ajustar si el dataset está en otra región
      };

      const [job] = await bigquery.createQueryJob(options);
      const [rows] = await job.getQueryResults();

      return {
        success: true,
        rowsReturned: rows.length,
        data: rows
      };
    } catch (error: any) {
      console.error('[Evo BigQuery Error]', error);
      return { 
        success: false, 
        error: error.message || 'Error al ejecutar la consulta SQL.' 
      };
    }
  }
);
