import { NextResponse } from 'next/server';
import { getActiveRules, saveAutomationLog } from '@/lib/automations/db';
import { sendWhatsAppMessage } from '@/lib/automations/whatsapp-client';
// import { generateDynamicMessage } from '@/lib/ai/prompts'; // Placeholder para la IA

/**
 * Endpoint protegido para ejecutar el Motor de Reglas (Cron Job)
 * Puede ser llamado por Vercel Cron, un worker externo, o manualmente para pruebas.
 */
export async function GET(request: Request) {
  // 1. Verificación de seguridad básica para el Cron
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // 2. Obtener todas las reglas activas de la BD
    const rules = await getActiveRules();
    let processedCount = 0;
    
    // 3. Iterar sobre las reglas (En un sistema real, agruparíamos por trigger y haríamos batching)
    for (const rule of rules) {
      if (rule.trigger.type === 'inactivity') {
        // LÓGICA SIMULADA PARA INACTIVIDAD
        // - Buscar alumnos del tutor (rule.tutorId) que no se han logueado en X días
        // - Verificar que la "Hora de ejecución" coincida con la hora actual
        
        // Simulación: Encontramos un alumno que cumple la regla
        const dummyStudent = { id: 'std-123', name: 'Juan Pérez', phone: '5491100000000', daysInactive: 15 };
        
        if (rule.channels.whatsapp) {
          // Buscamos la acción dinámica
          const action = rule.actions.find(a => a.type === 'dynamic_message');
          
          if (action) {
            // Resolver Prompt con IA (simulado por ahora)
            // const aiMessage = await generateDynamicMessage(action.config, dummyStudent);
            const aiMessage = `Hola ${dummyStudent.name}, hemos notado que no ingresas hace ${dummyStudent.daysInactive} días. ¿Todo bien?`;
            
            // Despachar vía Evolution API
            const success = await sendWhatsAppMessage(rule.tutorId, dummyStudent.phone, aiMessage);
            
            // Guardar Log
            await saveAutomationLog({
              ruleId: rule.id as string,
              tutorId: rule.tutorId,
              studentId: dummyStudent.id,
              studentName: dummyStudent.name,
              actionType: 'dynamic_message',
              channel: 'whatsapp',
              status: success ? 'success' : 'failed',
              summary: success ? `Mensaje de inactividad enviado a ${dummyStudent.name}` : `Fallo al enviar mensaje a ${dummyStudent.name}`,
              timestamp: Date.now()
            });

            processedCount++;
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Cron ejecutado correctamente. Reglas procesadas: ${rules.length}. Acciones disparadas: ${processedCount}` 
    });

  } catch (error: any) {
    console.error('Error en el motor cron:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
