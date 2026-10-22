import { NextRequest, NextResponse } from 'next/server';
import { getRootDomain, getSubdomain } from '@/lib/utils';

const RESERVED_PATHS = [
  'admin', 'api', 'auth', 'courses', 'dashboard', 'mentoria', 
  'my-courses', 'settings', 'v', 
  'about', 'services', 'privacy', 'terms', 'privacidad', 'terminos', 'favicon.ico', 
  'globals.css', 'tutor-access-denied', 'upgrade-required', 'ai-assistant', 'alumnos',
  'tutor', 'planes', 'evo', 'styles-demo', 'preview-style', 'marketing', 'automations', 'referidos',
  'company', 'empresa' // Rutas reservadas corporativas / multi-tenant
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host') || '';
  const hostname = forwardedHost || hostHeader;

  const segments = pathname.split('/').filter(Boolean);

  // Detectar cualquier dominio gestionado por Firebase o Google Cloud
  const isFirebaseDefault = hostname.endsWith('.hosted.app') || 
                            hostname.endsWith('.web.app') || 
                            hostname.endsWith('.firebaseapp.com') ||
                            hostname.endsWith('.run.app') ||
                            hostname.endsWith('.cloudfunctions.net') ||
                            hostname.includes('.hosted.app') ||
                            hostname.includes('.firebaseapp.com') ||
                            hostname.includes('.run.app');
  
  // Solo permitimos lógica de subdominios en localhost o en dominios personalizados con wildcard DNS
  const supportsSubdomains = hostname.includes('localhost') || !isFirebaseDefault;

  let subdomain = null;

  if (supportsSubdomains) {
    subdomain = getSubdomain(hostname);
  }

  // 1. Recuperación automática de subdominio reservado accidental (ej: company.localhost:9002/tutors -> localhost:9002/company/tutors)
  if (subdomain && RESERVED_PATHS.includes(subdomain.toLowerCase())) {
    const url = request.nextUrl.clone();
    const mainHost = getRootDomain(hostname);
    url.host = mainHost;
    url.pathname = `/${subdomain.toLowerCase()}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }

  // 2. Redirección de Rutas Internas: /tutor/[username] en localhost -> subdominio
  // En producción (Firebase Hosting) NO redirigimos: la ruta /tutor/[username] funciona directamente.
  if (hostname.includes('localhost') && !subdomain && pathname.startsWith('/tutor/')) {
    const username = segments[1]?.toLowerCase();
    if (username && !RESERVED_PATHS.includes(username)) {
      const url = request.nextUrl.clone();
      const mainHost = getRootDomain(hostname);
      url.host = `${username}.${mainHost}`;
      url.pathname = segments.length > 2 ? `/${segments.slice(2).join('/')}` : '/';
      return NextResponse.redirect(url);
    }
  }

  // 3. Saltamos si es una ruta reservada, API o archivo estático
  if (
    pathname.includes('.') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/_next') ||
    (segments.length > 0 && RESERVED_PATHS.includes(segments[0].toLowerCase()))
  ) {
    return NextResponse.next();
  }

  // 4. Lógica de Enmascaramiento por Subdominio
  // Nota: Permitimos 'tutor' y 'admin' como subdominios aunque estén en RESERVED_PATHS como ruta
  if (subdomain && (subdomain === 'tutor' || subdomain === 'admin' || !RESERVED_PATHS.includes(subdomain.toLowerCase()))) {
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

  // 5. Lógica de Enmascaramiento por Ruta: Redirigir a Subdominio (Forzar Limpieza)
  // /juan -> juan.dominio.com
  // SOLO si soporta subdominios y NO es una ruta reservada.
  if (supportsSubdomains && segments.length === 1 && !RESERVED_PATHS.includes(segments[0].toLowerCase())) {
    const url = request.nextUrl.clone();
    const username = segments[0].toLowerCase();
    
    // Construir la URL del subdominio
    const mainHost = getRootDomain(hostname);
    url.host = `${username}.${mainHost}`;
    
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // /juan/oferta -> juan.dominio.com/oferta
  if (supportsSubdomains && segments.length === 2 && !RESERVED_PATHS.includes(segments[0].toLowerCase())) {
    const url = request.nextUrl.clone();
    const username = segments[0].toLowerCase();
    
    const mainHost = getRootDomain(hostname);
    url.host = `${username}.${mainHost}`;
    
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
