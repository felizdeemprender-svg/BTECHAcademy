import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { generateStyleDemos } from '@/ai/flows/generate-style-demos';

export async function GET() {
  try {
    const db = getAdminFirestore();
    const tp = await db.collection('templateCollections').get();
    
    const results = [];
    
    // Array de imágenes profesionales para inyectar
    const premiumImages = [
      "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80"
    ];

    for (const doc of tp.docs) {
      const data = doc.data();
      const landings = data.assets?.landings || [];
      
      // Si el primer landing NO tiene la propiedad "sections", significa que es viejo y está roto
      if (landings.length > 0 && !landings[0].sections) {
        console.log(`Migrando campaña antigua: ${data.name} (${doc.id})`);
        
        try {
          // Regenerar las landings con la nueva IA (usando los datos originales de la campaña)
          const newDemos = await generateStyleDemos({
            styleId: data.styleId || 'classic',
            collectionName: data.name,
            collectionDescription: data.directives || `Campaña sobre ${data.name}`,
            designTokens: data.designTokens || {
              primary: '#2563EB',
              secondary: '#1E40AF',
              accent: '#F59E0B',
              fontHeading: 'Inter',
              fontBody: 'Inter',
            },
            topic: data.directives || data.name,
          });

          // Inyectar imágenes premium y videos a las nuevas landings
          if (newDemos.demos) {
            newDemos.demos.forEach((landing: any) => {
              landing.videoUrl = "https://www.youtube.com/watch?v=1La4QzGeaaQ";
              if (landing.sections) {
                landing.sections.forEach((section: any, idx: number) => {
                  section.imageUrl = premiumImages[idx % premiumImages.length];
                  if (idx === 1) {
                    section.videoUrl = "https://www.youtube.com/watch?v=1La4QzGeaaQ";
                    section.hasVideo = true;
                  } else {
                    section.hasVideo = false;
                  }
                });
              }
            });
            
            // Actualizar el documento en Firestore preservando el resto de los assets (emails, ads, etc.)
            await doc.ref.update({
              "assets.landings": newDemos.demos,
              styleId: data.styleId || 'classic', // Asegurarnos de que tenga el estilo
            });
            
            results.push({ id: doc.id, name: data.name, status: "Migrated" });
          }
        } catch (e: any) {
          console.error(`Error migrando ${doc.id}:`, e);
          results.push({ id: doc.id, name: data.name, status: "Failed", error: e.message });
        }
      } else {
        results.push({ id: doc.id, name: data.name, status: "Skipped (Already has sections)" });
      }
    }
    
    return NextResponse.json({ success: true, results });
  } catch(e:any) {
    return NextResponse.json({ error: e.message });
  }
}
