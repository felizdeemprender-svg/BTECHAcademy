// src/app/api/ai/coordination-plan/route.ts

import { NextResponse } from 'next/server';
import { generateCoordinationPlan } from '@/ai/flows/generate-coordination-plan';
import type { CoordinationInput } from '@/domain/marketing/coordination-plan';

/**
 * POST /api/ai/coordination-plan
 * Recibe JSON con los datos de la campaña y devuelve el plan de coordinación.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CoordinationInput;
    const result = await generateCoordinationPlan(body);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error('Error en coordination‑plan API:', err);
    return NextResponse.json({ error: 'Invalid request or internal error' }, { status: 400 });
  }
}

/**
 * GET para pruebas rápidas – devuelve un ejemplo estático.
 */
export async function GET() {
  return NextResponse.json({ message: 'Coordination‑plan API alive' }, { status: 200 });
}
