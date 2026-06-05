import { NextRequest, NextResponse } from 'next/server';
import { generateTutorProfile } from '@/ai/flows/generate-tutor-profile';

export async function POST(req: NextRequest) {
  try {
    const { name, bio, socials } = await req.json();

    let extendedBio = bio;

    // Si hay una web, intentamos "scrapear" algo de info para ayudar a la IA
    if (socials?.website && socials.website.startsWith('http')) {
      try {
        const webRes = await fetch(socials.website);
        if (webRes.ok) {
          const html = await webRes.text();
          // Extraer texto básico (eliminando scripts y estilos)
          const textContent = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gms, '')
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gms, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .substring(0, 3000); // Tomar los primeros 3k caracteres
          
          extendedBio = `[INFO EXTRAÍDA DE SU WEB]: ${textContent}\n\n[BIO ORIGINAL]: ${bio}`;
        }
      } catch (e) {
        console.warn('No se pudo scrapear la web del tutor:', e);
      }
    }

    const config = await generateTutorProfile(name, extendedBio, socials);
    
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('[Tutor Profile Gen Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
