import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';

// POST /api/admin/migrate-v2
export async function POST(req: Request) {
  try {
    // IMPORTANTE: En un entorno de producción, aquí debería haber una validación
    // de seguridad (ej: verificar un token de admin o session).
    // Por simplicidad para el script de migración, se asume que se invoca de forma segura.

    const salesPagesRef = adminDb.collection('salesPages');
    const snapshot = await salesPagesRef.get();

    const batch = adminDb.batch();
    let migratedCount = 0;
    const migratedIds: string[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Chequear si es un documento de V1:
      // Si ya tiene content.sections, es V2, no tocar.
      if (data.content && Array.isArray(data.content.sections)) {
        continue;
      }

      // Si no tiene la estructura vieja en aiContent.landings o aiContent.landing, no podemos migrar
      let v1Data = null;
      if (data.aiContent?.landings && Array.isArray(data.aiContent.landings) && data.aiContent.landings.length > 0) {
        v1Data = data.aiContent.landings[0];
      } else if (data.aiContent?.landing) {
        v1Data = data.aiContent.landing;
      } else if (data.aiContent) {
        // Fallback a aiContent directo si tiene headline
        if (data.aiContent.headline) {
           v1Data = data.aiContent;
        }
      }

      if (!v1Data) {
        continue; // No es un documento V1 válido
      }

      // 1. Extraer Branding 
      const primaryColor = data.branding?.primaryColor || '#3B2D86';
      const secondaryColor = data.branding?.secondaryColor || '#F1F5F9';
      const accentColor = data.branding?.accentColor || '#FACC15';

      // 2. Mapear a la nueva estructura content.sections
      const sections = [];

      // Hero Video
      if (v1Data.headline || v1Data.subheadline || v1Data.videoUrl) {
        sections.push({
          id: 'heroVideo_1',
          title: v1Data.headline || '',
          content: v1Data.subheadline || '',
          ctaText: v1Data.ctaText || 'Inscribirme ahora',
          videoUrl: v1Data.videoUrl || ''
        });
      }

      // Secciones Narrativas
      if (v1Data.sections && Array.isArray(v1Data.sections)) {
        v1Data.sections.forEach((sec: any, index: number) => {
          sections.push({
            id: `narrativeSections_${index + 1}`,
            title: sec.title || '',
            content: sec.paragraph || '',
            bullets: sec.microBullets || []
          });
        });
      }

      // Beneficios
      if (v1Data.benefits && Array.isArray(v1Data.benefits) && v1Data.benefits.length > 0) {
        sections.push({
          id: 'benefits_1',
          title: 'Beneficios del Programa',
          bullets: v1Data.benefits
        });
      }

      // Mentor Profile
      if (v1Data.aboutMentor) {
        sections.push({
          id: 'mentorProfile_1',
          title: 'Conoce al Mentor',
          content: v1Data.aboutMentor
        });
      }

      // Footer
      sections.push({
        id: 'footer_1'
      });

      // 3. Crear el nuevo objeto content
      const newContent = {
        designTokens: {
          primary: primaryColor,
          secondary: secondaryColor,
          accent: accentColor,
          fontHeading: 'Inter',
          fontBody: 'Inter',
          styleTokens: {
            themeMode: 'light'
          }
        },
        sections: sections,
        themeMode: 'light'
      };

      // 4. Agregarlo al Batch
      // Se actualiza el 'content' y se setea 'styleId' a 'classic'
      batch.update(doc.ref, {
        content: newContent,
        styleId: data.styleId || 'classic' // Asegurar que tenga styleId para V2
      });

      migratedCount++;
      migratedIds.push(doc.id);
    }

    // Ejecutar el Batch Update en Firestore
    if (migratedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `Migración completada. ${migratedCount} documentos migrados a V2.`,
      migratedCount,
      migratedIds
    });

  } catch (error: any) {
    console.error('Error during V1 to V2 migration:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
