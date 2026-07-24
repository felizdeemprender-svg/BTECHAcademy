import { NextResponse } from 'next/server';
import { generateLandingContent } from '@/ai/flows/generate-landing-content';
import { CLASSIC_STYLE_CONFIG } from '@/app/mentoria/marketing/templates/styles/classic-style-config';

export async function POST(req: Request) {
  try {
    const output = await generateLandingContent({
      courseTitle: "Fastoria Academy",
      courseDescription: "La plataforma definitiva para creadores. Lanza tus aplicaciones, gestiona tus mentorías y escala tu negocio digital sin tocar una sola línea de código.",
      mentorName: "Feliz de Emprender",
      mentorBio: "Emprendedor, creador de FastoriaAcademy",
      price: 97,
      mission: "venta",
      templateStructure: {
        minimal: { layout: CLASSIC_STYLE_CONFIG.layout, sectionCount: 3 },
        balanced: { layout: CLASSIC_STYLE_CONFIG.layout, sectionCount: 4 },
        detailed: { layout: CLASSIC_STYLE_CONFIG.layout, sectionCount: 5 }
      },
      targetAudience: "Emprendedores, coaches, tutores y creadores de contenido que quieren monetizar sus conocimientos sin conocimientos técnicos.",
      courseTags: ["no-code", "negocios digitales", "SaaS", "marca blanca"],
      styleId: "classic"
    });

    return NextResponse.json(output);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
