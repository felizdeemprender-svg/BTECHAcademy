'use server';
/**
 * @fileOverview Función para crear landings de ejemplo para un estilo
 * Genera 3 landings reales usando IA y las guarda en Firestore asociadas al estilo
 */

import { generateStyleDemos } from './generate-style-demos';
import admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

// Función server-side para inicializar Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    // En desarrollo, usar emulador o configuración local
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseConfig.projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      // Fallback a emulador si está disponible
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
  }
  return admin.firestore();
}

interface CreateStyleExamplesInput {
  styleId: string;
  topic: string;
  designTokens?: {
    primary: string;
    secondary: string;
    accent: string;
    fontHeading: string;
    fontBody: string;
  };
}

/**
 * Crea 3 landings de ejemplo para un estilo específico
 * Si ya existen, no las regenera
 */
export async function createStyleExamples(input: CreateStyleExamplesInput) {
  // Inicializar Firebase Admin SDK
  const db = initializeFirebaseAdmin();
  
  // Usar templateCollections para guardar la demo del estilo
  const collectionId = `demo-${input.styleId}-style`;
  const styleExamplesRef = db.collection('templateCollections').doc(collectionId);
  const existingExamples = await styleExamplesRef.get();
  
  if (existingExamples.exists) {
    console.log(`[StyleExamples] Ejemplos ya existen para el estilo ${input.styleId}`);
    // Mapear de templateCollections al formato esperado por el frontend
    const data = existingExamples.data();
    return {
      styleId: input.styleId,
      topic: input.topic,
      designTokens: data?.designTokens,
      examples: data?.assets?.landings || [],
    };
  }
  
  console.log(`[StyleExamples] Generando ejemplos para el estilo ${input.styleId} con tema: ${input.topic}`);
  
  // Generar las 3 landings de ejemplo usando IA
  const demosResult = await generateStyleDemos({
    styleId: input.styleId,
    collectionName: input.styleId,
    collectionDescription: `Ejemplos del estilo ${input.styleId}`,
    designTokens: input.designTokens || {
      primary: '#2563EB',
      secondary: '#1E40AF',
      accent: '#F59E0B',
      fontHeading: 'Inter',
      fontBody: 'Inter',
    },
    topic: input.topic,
  });

  // Array de imágenes profesionales
  const premiumImages = [
    "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"
  ];

  // Inyectar imágenes premium y videos a la respuesta de IA
  if (demosResult.demos) {
    demosResult.demos.forEach((landing: any) => {
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
  }
  
  // Guardar las landings de ejemplo en templateCollections (Atomizado)
  await styleExamplesRef.set({
    id: collectionId,
    name: `Demo: ${input.topic}`,
    directives: `Generar demo estilo ${input.styleId}`,
    ownerId: "W7oR0f2q39bU0Ff10w4yv9FmZ6D3",
    assets: { landings: demosResult.demos },
    designTokens: input.designTokens,
    styleId: input.styleId,
    isDemo: true, // Ocultar del catálogo
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  console.log(`[StyleExamples] Ejemplos guardados exitosamente para el estilo ${input.styleId}`);
  
  return {
    styleId: input.styleId,
    topic: input.topic,
    designTokens: input.designTokens,
    examples: demosResult.demos,
  };
}

/**
 * Obtiene los ejemplos de un estilo específico
 */
export async function getStyleExamples(styleId: string) {
  const db = initializeFirebaseAdmin();
  const collectionId = `demo-${styleId}-style`;
  const styleExamplesRef = db.collection('templateCollections').doc(collectionId);
  const docSnap = await styleExamplesRef.get();
  
  if (docSnap.exists) {
    const data = docSnap.data();
    if (!data) return null;
    
    // Mapear de templateCollections al formato que espera el UI
    const mappedData = {
      styleId: data.styleId,
      topic: data.name,
      designTokens: data.designTokens,
      examples: data.assets?.landings || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };

    // Sanitizar Timestamps para evitar errores de serialización en Server Actions (Next.js)
    if (mappedData.createdAt && typeof mappedData.createdAt.toDate === 'function') {
      mappedData.createdAt = mappedData.createdAt.toDate().toISOString();
    }
    if (mappedData.updatedAt && typeof mappedData.updatedAt.toDate === 'function') {
      mappedData.updatedAt = mappedData.updatedAt.toDate().toISOString();
    }
    
    return mappedData;
  }
  
  return null;
}
