import { NextResponse } from 'next/server';
import { saveAutomationRule, getRulesByTutor, deleteRule } from '@/lib/automations/db';
import { AutomationRule } from '@/lib/automations/rules-schema';

const getMockTutorId = (req: Request) => {
  const url = new URL(req.url);
  return url.searchParams.get('tutorId') || 'ary-test';
};

// GET: Listar reglas del tutor
export async function GET(request: Request) {
  try {
    const tutorId = getMockTutorId(request);
    const rules = await getRulesByTutor(tutorId);
    return NextResponse.json({ success: true, data: rules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Crear o actualizar regla
export async function POST(request: Request) {
  try {
    const tutorId = getMockTutorId(request);
    const body = await request.json();
    
    // Inyectar el tutorId en la regla
    const rule: AutomationRule = {
      ...body,
      tutorId
    };

    const id = await saveAutomationRule(rule);
    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar regla
export async function DELETE(request: Request) {
  try {
    const tutorId = getMockTutorId(request);
    const url = new URL(request.url);
    const ruleId = url.searchParams.get('id');

    if (!ruleId) {
      return NextResponse.json({ success: false, error: 'Falta el ID de la regla' }, { status: 400 });
    }

    const success = await deleteRule(ruleId, tutorId);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
