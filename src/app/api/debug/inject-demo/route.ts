import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(req: Request) {
  try {
    const db = getAdminFirestore();
    
    // Ruta absoluta del mock
    const mockFilePath = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\b30ea002-9f17-4af2-b26b-6599658a4630\\scratch\\atomic-result-formatted.json';
    
    const fileContent = fs.readFileSync(mockFilePath, 'utf-8');
    const result = JSON.parse(fileContent);

    // Array de imágenes profesionales para educación y tecnología
    const premiumImages = [
      "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"
    ];

    // Inyectar imágenes hermosas y habilitar videos en las secciones
    if (result.landings) {
      result.landings.forEach((landing: any) => {
        // Asignar un video al Hero (headline) si no lo tiene
        landing.videoUrl = "https://www.youtube.com/watch?v=1La4QzGeaaQ"; // Sample Fastoria/Tech video

        if (landing.sections) {
          landing.sections.forEach((section: any, idx: number) => {
            section.imageUrl = premiumImages[idx % premiumImages.length];
            // Habilitar video aleatoriamente en una de las secciones
            if (idx === 1) {
              section.videoUrl = "https://www.youtube.com/watch?v=1La4QzGeaaQ";
              section.hasVideo = true;
            } else {
              section.hasVideo = false;
            }
          });
        }
      });
    }
    
    const newCollection = {
      name: "Demo: FastoriaAcademy y sus ventajas",
      directives: "Generar demo estilo classic sobre ventajas de FastoriaAcademy",
      ownerId: "W7oR0f2q39bU0Ff10w4yv9FmZ6D3", 
      assets: result,
      designTokens: null,
      styleId: "classic",
      isDemo: true, // Special flag to hide from catalog
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docId = "demo-classic-style";
    
    // Guardar en templateCollections (para el catalog si no estuviera oculto)
    const collectionRef = db.collection('templateCollections').doc(docId);
    await collectionRef.set(newCollection);
    
    // Fetch a course to get modules for the syllabus
    const coursesQuery = db.collection('courses').where('mentorId', '==', "W7oR0f2q39bU0Ff10w4yv9FmZ6D3").limit(1);
    const coursesSnap = await coursesQuery.get();
    const courseId = !coursesSnap.empty ? coursesSnap.docs[0].id : null;

    // Guardar también en salesPages para que la ruta /v/[id] funcione
    const salesPageRef = db.collection('salesPages').doc(docId);
    await salesPageRef.set({
      isActive: true,
      mentorId: "W7oR0f2q39bU0Ff10w4yv9FmZ6D3",
      courseId: courseId, // <-- ESTO PERMITE CARGAR EL TEMARIO
      aiContent: result,
      price: 0,
      createdAt: new Date(),
    });
    
    return NextResponse.json({
      message: "Exito",
      docId,
      links: [
        `http://localhost:9002/v/${docId}?v=0`,
        `http://localhost:9002/v/${docId}?v=1`,
        `http://localhost:9002/v/${docId}?v=2`
      ]
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
