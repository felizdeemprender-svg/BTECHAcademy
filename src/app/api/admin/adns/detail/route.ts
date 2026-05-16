import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { loadAdnConfig } from '@/lib/adn-utils';

export async function POST(req: Request) {
  try {
    const { adnId } = await req.json();
    if (!adnId) return NextResponse.json({ success: false, error: "Falta ID del ADN" }, { status: 400 });

    try {
      const blueprint = await loadAdnConfig(adnId);
      
      // Resumir el blueprint
      const slices = blueprint.slices || blueprint.default_blueprint?.slices || [];
      const summary = {
        name: blueprint.name || "Sin nombre",
        description: blueprint.description || "Sin descripción",
        totalSlices: slices.length,
        narrative: slices.map((s: any) => s.segment_label || "FRAGMENTO"),
        hasHook: slices.some((s: any) => s.segment_label === 'GANCHO'),
        hasCTA: slices.some((s: any) => s.segment_label === 'CTA'),
        totalDuration: slices.reduce((acc: number, s: any) => acc + (s.duration || 0), 0)
      };

      return NextResponse.json({ success: true, summary });
    } catch {
      return NextResponse.json({ success: false, error: "Blueprint no encontrado o inválido" }, { status: 404 });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
