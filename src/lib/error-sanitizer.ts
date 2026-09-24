import { NextResponse } from 'next/server';

/**
 * Sanitiza errores para respuesta al cliente
 * Nunca expone stack traces, detalles internos o info sensible
 */
export function sanitizeError(error: unknown, context?: string): { message: string; status: number } {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Error conocido con status
  if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
    return {
      message: (error as any).message || 'Error interno',
      status: error.status
    };
  }

  // Error de validación conocido
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as any).code;
    if (code === 'P2002' || code === 'P2003') { // Prisma unique constraint / foreign key
      return { message: 'Datos duplicados o referencia inválida', status: 400 };
    }
    if (code === 'auth/id-token-expired' || code === 'auth/argument-error') {
      return { message: 'Token inválido o expirado', status: 401 };
    }
  }

  // Error genérico
  const message = error instanceof Error ? error.message : 'Error interno del servidor';
  
  // En producción: mensaje genérico
  // En desarrollo: mensaje real para debugging
  const safeMessage = isProduction 
    ? 'Error interno del servidor' 
    : (context ? `[${context}] ${message}` : message);

  return {
    message: safeMessage,
    status: 500
  };
}

/**
 * Wrapper para handlers de API que sanitiza errores automáticamente
 */
export function withErrorSanitization<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  context?: string
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error: any) {
      console.error(`[${context || 'API'}] Error:`, error);
      const { message, status } = sanitizeError(error, context);
      return NextResponse.json({ error: message }, { status });
    }
  };
}