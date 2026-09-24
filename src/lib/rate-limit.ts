import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';

interface RateLimitOptions {
  interval: number; // ms
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
}

// 1. Configuramos Redis usando la variable de entorno, si no existe usamos un fallback local.
// En producción, REDIS_URL debería apuntar a `fastoria-redis`.
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
// Lazy initialization para no romper el build si no hay Redis disponible en el server component
let redisClient: Redis | null = null;

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null; // No reintentar indefinidamente
      return Math.min(times * 50, 2000);
    }
  });
} catch (e) {
  console.warn('⚠️ Error initializing Redis for Rate Limiting. Falling back to memory.', e);
}

// Fallback en memoria si Redis falla
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const memoryStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiter distribuido apoyado en Redis (con fallback en memoria)
 */
export function rateLimit(options: RateLimitOptions) {
  const { interval, maxRequests, keyGenerator } = options;

  return async function rateLimitMiddleware(req: NextRequest): Promise<NextResponse | null> {
    const keyPrefix = 'rate-limit:';
    const key = keyPrefix + (keyGenerator ? keyGenerator(req) : getClientIp(req) || 'anonymous');
    const now = Date.now();

    if (redisClient && redisClient.status === 'ready') {
      try {
        const pipeline = redisClient.pipeline();
        pipeline.incr(key);
        pipeline.pttl(key);
        const results = await pipeline.exec();

        if (results && results[0] && results[1]) {
          const count = results[0][1] as number;
          const ttl = results[1][1] as number;

          if (count === 1) {
            // Primer request, setear expiración
            await redisClient.pexpire(key, interval);
          }

          if (count > maxRequests) {
            const retryAfter = Math.ceil(ttl / 1000);
            return buildRateLimitResponse(retryAfter, maxRequests);
          }
          return null; // Permitir
        }
      } catch (err) {
        console.warn('⚠️ Redis rate limit check failed, falling back to memory', err);
      }
    }

    // --- FALLBACK EN MEMORIA ---
    const entry = memoryStore.get(key);
    
    if (!entry || now > entry.resetAt) {
      memoryStore.set(key, { count: 1, resetAt: now + interval });
      return null; // Permitir
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return buildRateLimitResponse(retryAfter, maxRequests);
    }

    entry.count++;
    return null; // Permitir
  };
}

function buildRateLimitResponse(retryAfter: number, maxRequests: number) {
  return NextResponse.json(
    { error: 'Demasiadas peticiones', retryAfter },
    { 
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + retryAfter),
      }
    }
  );
}

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || null;
}

/**
 * Configuraciones predefinidas
 */
export const rateLimitConfigs = {
  // Endpoints públicos generales
  public: rateLimit({ interval: 60_000, maxRequests: 100 }), // 100 req/min
  
  // Endpoints de autenticación (más estricto)
  auth: rateLimit({ interval: 60_000, maxRequests: 10 }), // 10 req/min
  
  // Webhooks (permisivo pero con límite)
  webhook: rateLimit({ interval: 60_000, maxRequests: 200 }), // 200 req/min
  
  // Video generation (costoso)
  video: rateLimit({ interval: 60_000, maxRequests: 5 }), // 5 req/min
  
  // Admin (moderado)
  admin: rateLimit({ interval: 60_000, maxRequests: 50 }), // 50 req/min
};

/**
 * Middleware combinado que aplica rate limit según el path
 */
export async function applyRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const pathname = req.nextUrl.pathname;
  
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/login')) {
    return rateLimitConfigs.auth(req);
  }
  if (pathname.startsWith('/api/webhooks')) {
    return rateLimitConfigs.webhook(req);
  }
  if (pathname.startsWith('/api/video/generate') || pathname.startsWith('/api/video/token')) {
    return rateLimitConfigs.video(req);
  }
  if (pathname.startsWith('/api/admin')) {
    return rateLimitConfigs.admin(req);
  }
  if (pathname.startsWith('/api/')) {
    return rateLimitConfigs.public(req);
  }
  return null;
}