import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Esta API ha sido deprecada en favor de operaciones directas desde el cliente
  // para aprovechar el contexto de autenticación del Tutor (reglas de Firestore).
  return NextResponse.json({ 
    error: 'API Deprecated', 
    message: 'Por favor, use la lógica de cliente para inscripciones.' 
  }, { status: 410 });
}



