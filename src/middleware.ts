import { NextRequest, NextResponse } from 'next/server';

const RESERVED_PATHS = [
  'admin', 'api', 'auth', 'courses', 'dashboard', 'mentoria', 
  'my-courses', 'seguimientos', 'settings', 'tasks', 'v', 
  'about', 'services', 'privacy', 'terms', 'favicon.ico', 
  'globals.css', 'tutor-access-denied', 'upgrade-required', 'abonos', 'ai-assistant', 'alumnos',
  'tutor' // Ruta reservada para perfiles de tutor /tutor/[username]
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const segments = pathname.split('/').filter(Boolean);

  // 1. Detección de Subdominio
  // localhost:9002 -> no subdomain
  // juan.localhost:9002 -> subdomain 'juan'
  // btechacademy.com -> no subdomain
  // juan.btechacademy.com -> subdomain 'juan'
  const hostParts = hostname.split('.');
  let subdomain = null;

  if (hostParts.length > 2 && !hostname.includes('localhost')) {
    // btechacademy.com (2 parts) -> no subdomain
    subdomain = hostParts[0] !== 'www' ? hostParts[0] : null;
  } else if (hostParts.length > 1 && hostname.includes('localhost')) {
    // localhost (1 part) -> no subdomain
    subdomain = hostParts[0];
  }

  // 2. Redirección de Rutas Internas Forzadas (Evitar /tutor/usuario y /v/resolver)
  if (!subdomain && (pathname.startsWith('/tutor/') || pathname.startsWith('/v/'))) {
    const username = segments[1]?.toLowerCase();
    if (username) {
      const url = request.nextUrl.clone();
      if (hostname.includes('localhost')) {
        url.host = `${username}.localhost:9002`;
      } else {
        const hostParts = hostname.split('.');
        const mainHost = hostParts.length > 2 ? hostParts.slice(-2).join('.') : hostname;
        url.host = `${username}.${mainHost}`;
      }
      url.pathname = segments.length > 2 ? `/${segments.slice(2).join('/')}` : '/';
      return NextResponse.redirect(url);
    }
  }

  // 3. Saltamos si es una ruta reservada, API o archivo estático
  if (
    pathname.includes('.') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/_next') ||
    RESERVED_PATHS.includes(segments[0])
  ) {
    return NextResponse.next();
  }

  // 3. Lógica de Enmascaramiento por Subdominio
  // Nota: Permitimos 'tutor' y 'admin' como subdominios aunque estén en RESERVED_PATHS como ruta
  if (subdomain && (subdomain === 'tutor' || subdomain === 'admin' || !RESERVED_PATHS.includes(subdomain))) {
    const url = request.nextUrl.clone();
    
    // juan.dominio.com/ -> /tutor/juan (Perfil)
    if (segments.length === 0) {
      url.pathname = `/tutor/${subdomain}`;
      return NextResponse.rewrite(url);
    }
    
    // juan.dominio.com/oferta -> /v/resolve?u=juan&s=oferta (Landing)
    if (segments.length === 1) {
      url.pathname = `/v/resolve`;
      url.searchParams.set('u', subdomain);
      url.searchParams.set('s', segments[0]);
      return NextResponse.rewrite(url);
    }
  }

  // 4. Lógica de Enmascaramiento por Ruta: Redirigir a Subdominio (Forzar Limpieza)
  // /juan -> juan.dominio.com
  if (segments.length === 1) {
    const url = request.nextUrl.clone();
    const username = segments[0].toLowerCase();
    
    // Construir la URL del subdominio
    if (hostname.includes('localhost')) {
      const parts = hostname.split('.');
      const base = parts.includes('localhost') ? 'localhost:9002' : parts.slice(-1)[0];
      url.host = `${username}.${base}`;
    } else {
      const hostParts = hostname.split('.');
      const mainHost = hostParts.length > 2 ? hostParts.slice(-2).join('.') : hostname;
      url.host = `${username}.${mainHost}`;
    }
    
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // /juan/oferta -> juan.dominio.com/oferta
  if (segments.length === 2) {
    const url = request.nextUrl.clone();
    const username = segments[0].toLowerCase();
    
    if (hostname.includes('localhost')) {
      const parts = hostname.split('.');
      const base = parts.includes('localhost') ? 'localhost:9002' : parts.slice(-1)[0];
      url.host = `${username}.${base}`;
    } else {
      const hostParts = hostname.split('.');
      const mainHost = hostParts.length > 2 ? hostParts.slice(-2).join('.') : hostname;
      url.host = `${username}.${mainHost}`;
    }
    
    url.pathname = `/${segments[1]}`;
    return NextResponse.redirect(url);
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
