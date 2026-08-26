import { NextRequest, NextResponse } from 'next/server';

const RESERVED_PATHS = [
  'admin', 'api', 'auth', 'courses', 'dashboard', 'mentoria', 
  'my-courses', 'seguimientos', 'settings', 'tasks', 'v', 
  'about', 'services', 'privacy', 'terms', 'favicon.ico', 
  'globals.css', 'tutor-access-denied', 'upgrade-required', 'abonos', 'ai-assistant', 'alumnos',
  'tutor', 'planes', 'evo', 'v3', 'landing1' // Rutas reservadas oficiales
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host') || '';
  const hostname = forwardedHost || hostHeader;

  // 0. REDIRECCIÓN DE DOMINIOS LEGACY (Firebase Hosting -> App Hosting)
  if (hostname.endsWith('.web.app') || hostname.endsWith('.firebaseapp.com')) {
    const proUrl = request.nextUrl.clone();
    proUrl.host = 'btechacademy-pro--btechacademy-8b329.us-central1.hosted.app';
    return NextResponse.redirect(proUrl);
  }

  // 0.5. Si es Vercel, no interferir con ninguna redirección
  if (hostname.includes('vercel.app')) {
    return NextResponse.next();
  }
  const segments = pathname.split('/').filter(Boolean);

  const hostParts = hostname.split('.');
  // Detectar cualquier dominio gestionado por Firebase, Google Cloud o Vercel default
  const isFirebaseDefault = hostname.endsWith('.hosted.app') || 
                            hostname.endsWith('.web.app') || 
                            hostname.endsWith('.firebaseapp.com') ||
                            hostname.endsWith('.run.app') ||
                            hostname.endsWith('.cloudfunctions.net') ||
                            hostname.endsWith('.vercel.app') ||
                            hostname.includes('.hosted.app') ||
                            hostname.includes('.firebaseapp.com') ||
                            hostname.includes('.vercel.app') ||
                            hostname.includes('.run.app');
  
  // Solo permitimos lógica de subdominios en localhost o en dominios personalizados con wildcard DNS
  const supportsSubdomains = hostname.includes('localhost') || !isFirebaseDefault;

  
  let subdomain = null;

  if (supportsSubdomains) {
    if (hostParts.length > 2 && !hostname.includes('localhost')) {
      subdomain = hostParts[0] !== 'www' ? hostParts[0] : null;
    } else if (hostParts.length > 1 && hostname.includes('localhost')) {
      subdomain = hostParts[0];
    }
  }

  // 2. Redirección de Rutas Internas: /tutor/[username] en localhost -> subdominio
  // En producción (Firebase Hosting) NO redirigimos: la ruta /tutor/[username] funciona directamente.
  if (hostname.includes('localhost') && !subdomain && pathname.startsWith('/tutor/')) {
    const username = segments[1]?.toLowerCase();
    if (username) {
      const url = request.nextUrl.clone();
      url.host = `${username}.localhost:9002`;
      url.pathname = segments.length > 2 ? `/${segments.slice(2).join('/')}` : '/';
      return NextResponse.redirect(url);
    }
  }

  // 3. Saltamos si es una ruta reservada, API o archivo estático
  // Las rutas /landing* son landings públicos (ej: /landing2) y no se enmascaran
  if (
    pathname.includes('.') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    (segments[0] && segments[0].startsWith('landing')) ||
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
  // SOLO si soporta subdominios.
  if (supportsSubdomains && segments.length === 1) {
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
  if (supportsSubdomains && segments.length === 2) {
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
