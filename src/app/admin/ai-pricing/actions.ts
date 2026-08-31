'use server';

import { getAdminFirestore } from '@/firebase/admin';

export async function saveAiPricingConfig(config: any) {
  try {
    const adminDb = getAdminFirestore();
    await adminDb.doc('config/ai_pricing').set(config, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error("[Admin Config] Error saving AI pricing:", error);
    return { success: false, error: error.message || 'Error desconocido al guardar configuración' };
  }
}

export async function getAiConsumptionData() {
  try {
    const adminDb = getAdminFirestore();
    const snap = await adminDb.collection('ai_audit_logs').orderBy('timestamp', 'asc').get();
    
    // Agrupar por fecha (YYYY-MM-DD)
    const grouped: Record<string, Record<string, any>> = {};
    
    snap.forEach(doc => {
      const data = doc.data();
      if (!data.timestamp) return;
      
      const date = data.timestamp.toDate();
      const dateStr = date.toISOString().split('T')[0]; // ej "2026-08-31"
      const action = data.action || 'otros';
      
      // Mapear actions a motores
      let engine = 'Otros';
      if (action.includes('image')) engine = 'Imágenes';
      else if (action.includes('video_omni') || action.includes('omni')) engine = 'Video (Omni)';
      else if (action.includes('video_render') || action.includes('video_carousel') || action.includes('ffmpeg')) engine = 'Video (FFmpeg)';
      else if (action.includes('generation') || action.includes('text') || action.includes('assistant') || action.includes('audit')) engine = 'Texto (Gemini)';
      else if (action.includes('embed')) engine = 'Embeddings';

      if (!grouped[dateStr]) {
        grouped[dateStr] = { date: dateStr, Total: 0 };
      }
      
      grouped[dateStr][engine] = (grouped[dateStr][engine] || 0) + (data.amount || 0);
      grouped[dateStr]['Total'] += (data.amount || 0);
    });

    return { success: true, data: Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date)) };
  } catch (error: any) {
    console.error("[Admin Config] Error fetching AI consumption:", error);
    return { success: false, error: error.message || 'Error al obtener consumos' };
  }
}

export async function getAiConsumption24h() {
  try {
    const adminDb = getAdminFirestore();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const snap = await adminDb.collection('ai_audit_logs')
      .where('timestamp', '>=', yesterday)
      .get();
      
    const totals = {
      'Texto (Gemini)': 0,
      'Video (Omni)': 0,
      'Video (FFmpeg)': 0,
      'Imágenes': 0,
      'Embeddings': 0,
      'Total': 0
    };
    
    const hourlyData: Record<string, Record<string, any>> = {};
    
    // Inicializar últimas 24hs para evitar huecos en el gráfico
    for (let i = 23; i >= 0; i--) {
      const d = new Date(Date.now() - i * 60 * 60 * 1000);
      const hStr = d.getHours().toString().padStart(2, '0') + ':00';
      const key = `${d.toISOString().split('T')[0]} ${hStr}`;
      hourlyData[key] = { hour: hStr, Total: 0 };
    }
    
    snap.forEach(doc => {
      const data = doc.data();
      const action = data.action || 'otros';
      const amount = data.amount || 0;
      
      let engine = 'Otros';
      if (action.includes('image')) engine = 'Imágenes';
      else if (action.includes('video_omni') || action.includes('omni')) engine = 'Video (Omni)';
      else if (action.includes('video_render') || action.includes('video_carousel') || action.includes('ffmpeg')) engine = 'Video (FFmpeg)';
      else if (action.includes('generation') || action.includes('text') || action.includes('assistant') || action.includes('audit')) engine = 'Texto (Gemini)';
      else if (action.includes('embed')) engine = 'Embeddings';
      
      if (engine !== 'Otros') {
        totals[engine as keyof typeof totals] += amount;
      }
      totals['Total'] += amount;
      
      if (data.timestamp) {
        const date = data.timestamp.toDate();
        const hStr = date.getHours().toString().padStart(2, '0') + ':00';
        const key = `${date.toISOString().split('T')[0]} ${hStr}`;
        if (!hourlyData[key]) hourlyData[key] = { hour: hStr, Total: 0 };
        hourlyData[key][engine] = (hourlyData[key][engine] || 0) + amount;
        hourlyData[key]['Total'] += amount;
      }
    });
    
    const chartData = Object.keys(hourlyData).sort().map(k => hourlyData[k]);
    
    return { success: true, data: totals, chartData };
  } catch (error: any) {
    console.error("[Admin Config] Error fetching 24h AI consumption:", error);
    return { success: false, error: error.message || 'Error al obtener consumos de 24h' };
  }
}
