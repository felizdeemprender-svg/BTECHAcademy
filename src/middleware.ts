import { NextRequest, NextResponse } from 'next/server';

const RESERVED_PATHS = [
  'admin', 'api', 'auth', 'courses', 'dashboard', 'mentoria', 
  'my-courses', 'seguimientos', 'settings', 'tasks', 'v', 
  'about', 'services', 'privacy', 'terms', 'favicon.ico', 
  'globals.css', 'tutor-access-denied', 'upgrade-required', 'abonos', 'ai-assistant', 'alumnos'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);

  // 0. Localización de Rutas Principales
  if (pathname === '/catalogo') {
    return NextResponse.rewrite(new URL('/courses', request.url));
  }

  // Skip if it's an internal Next.js request, an API request, or a reserved path
  if (
    pathname.includes('.') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/_next') ||
    RESERVED_PATHS.includes(segments[0])
  ) {
    return NextResponse.next();
  }

  // 1. Enmascaramiento de Perfil de Tutor: /juan -> /tutor/juan
  if (segments.length === 1) {
    const url = request.nextUrl.clone();
    url.pathname = `/tutor/${segments[0]}`;
    return NextResponse.rewrite(url);
  }

  // 2. Enmascaramiento de Landing de Venta: /juan/oferta -> /v/resolve (dynamic resolve)
  // Requerirá que la lógica de resolución sepa buscar por tutor + slug
  if (segments.length === 2) {
    const url = request.nextUrl.clone();
    // Reescritura interna a una ruta de resolución que buscará el ID real
    url.pathname = `/v/resolve`;
    url.searchParams.set('u', segments[0]);
    url.searchParams.set('s', segments[1]);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
