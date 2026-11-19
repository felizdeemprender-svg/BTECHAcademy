import { describe, it, expect } from 'vitest';
import nextConfig from '../../../next.config';

describe('Optimizador de Imágenes — Configuración y Seguridad (Punto 4)', () => {
  const images = nextConfig.images;

  it('debe tener el optimizador de imágenes activo (unoptimized !== true)', () => {
    expect(images).toBeDefined();
    expect(images?.unoptimized).toBeFalsy();
  });

  it('debe soportar formatos modernos AVIF y WebP para reducción de 70-85% de peso', () => {
    expect(images?.formats).toEqual(expect.arrayContaining(['image/avif', 'image/webp']));
  });

  it('debe configurar un TTL de caché de al menos 24 horas (86400s) para amortiguar CPU', () => {
    expect(images?.minimumCacheTTL).toBeGreaterThanOrEqual(86400);
  });

  it('debe autorizar exhaustivamente todos los dominios de Firebase Storage y Google Cloud', () => {
    const patterns = images?.remotePatterns || [];
    const hostnames = patterns.map((p) => p.hostname);

    expect(hostnames).toContain('firebasestorage.googleapis.com');
    expect(hostnames).toContain('*.firebasestorage.app');
    expect(hostnames).toContain('storage.googleapis.com');
  });

  it('debe autorizar fotos de perfil y avatares de Google Auth', () => {
    const patterns = images?.remotePatterns || [];
    const hostnames = patterns.map((p) => p.hostname);

    expect(hostnames).toContain('lh3.googleusercontent.com');
    expect(hostnames).toContain('*.googleusercontent.com');
  });

  it('debe autorizar bancos de imágenes y placeholders de cursos/campañas', () => {
    const patterns = images?.remotePatterns || [];
    const hostnames = patterns.map((p) => p.hostname);

    expect(hostnames).toContain('images.unsplash.com');
    expect(hostnames).toContain('plus.unsplash.com');
    expect(hostnames).toContain('placehold.co');
    expect(hostnames).toContain('via.placeholder.com');
    expect(hostnames).toContain('picsum.photos');
    expect(hostnames).toContain('loremflickr.com');
    expect(hostnames).toContain('i.pravatar.cc');
  });

  it('debe autorizar los dominios oficiales de Fastoria y App Hosting', () => {
    const patterns = images?.remotePatterns || [];
    const hostnames = patterns.map((p) => p.hostname);

    expect(hostnames).toContain('fastoria.com.ar');
    expect(hostnames).toContain('*.fastoria.com.ar');
    expect(hostnames).toContain('*.hosted.app');
  });

  it('debe verificar que la librería sharp esté disponible para optimización nativa en Node', async () => {
    const sharp = await import('sharp');
    expect(sharp.default).toBeDefined();
    expect(typeof sharp.default).toBe('function');
  });

  describe('Evaluación de Errores 400 por Dominios No Autorizados (SSRF y Compatibilidad)', () => {
    function matchesRemotePattern(urlStr: string, pattern: { protocol?: string; hostname: string }): boolean {
      try {
        const url = new URL(urlStr);
        if (pattern.protocol && `${pattern.protocol}:` !== url.protocol) return false;
        if (pattern.hostname.startsWith('*.')) {
          const suffix = pattern.hostname.slice(2);
          return url.hostname.endsWith(`.${suffix}`) || url.hostname === suffix;
        }
        return url.hostname === pattern.hostname;
      } catch {
        return false;
      }
    }

    function isAuthorized(urlStr: string): boolean {
      const patterns = images?.remotePatterns || [];
      return patterns.some((p) => matchesRemotePattern(urlStr, p as any));
    }

    it('no debe arrojar error 400 en URLs reales de Firebase Storage (Testing y Producción)', () => {
      const storageUrls = [
        'https://firebasestorage.googleapis.com/v0/b/feliz-de-emprender.appspot.com/o/courses%2Fcover.png?alt=media',
        'https://firebasestorage.googleapis.com/v0/b/btechacademy-8b329.appspot.com/o/profiles%2Favatar.jpg',
        'https://feliz-de-emprender.firebasestorage.app/v0/b/feliz-de-emprender.firebasestorage.app/o/avatar.jpg',
        'https://btechacademy-8b329.firebasestorage.app/o/sample.png',
        'https://storage.googleapis.com/btechacademy-8b329/video-poster.jpg',
      ];

      for (const url of storageUrls) {
        expect(isAuthorized(url), `Fallo en URL autorizada: ${url}`).toBe(true);
      }
    });

    it('no debe arrojar error 400 en fotos de perfil de Google de alumnos y tutores', () => {
      const googleUrls = [
        'https://lh3.googleusercontent.com/a/ACg8ocL123=s96-c',
        'https://lh4.googleusercontent.com/a/default-user=s120-c',
        'https://lh5.googleusercontent.com/photo.jpg',
      ];

      for (const url of googleUrls) {
        expect(isAuthorized(url), `Fallo en Google avatar: ${url}`).toBe(true);
      }
    });

    it('no debe arrojar error 400 en Unsplash y repositorios de placeholders', () => {
      const sampleUrls = [
        'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800',
        'https://plus.unsplash.com/premium_photo-1661764393655-1dbffee8c0ce?w=800',
        'https://placehold.co/600x400/png',
        'https://via.placeholder.com/800x400',
        'https://picsum.photos/400/300',
        'https://loremflickr.com/200/200/person',
        'https://i.pravatar.cc/150?u=a042581f4e29026704d',
        'https://fastoria.com.ar/og-image.png',
        'https://feliz.fastoria.com.ar/banner.webp',
        'https://btechacademy-pro--btechacademy-8b329.us-central1.hosted.app/logo.png',
      ];

      for (const url of sampleUrls) {
        expect(isAuthorized(url), `Fallo en placeholder/dominio oficial: ${url}`).toBe(true);
      }
    });

    it('debe rechazar dominios no autorizados o maliciosos para prevenir ataques SSRF en el proxy de imágenes', () => {
      const untrustedUrls = [
        'https://evil-hacker.com/malicious.jpg',
        'https://phishing-site.xyz/fake.png',
        'https://attacker.net/exploit.svg',
        'http://insecure-domain.org/image.png',
      ];

      for (const url of untrustedUrls) {
        expect(isAuthorized(url), `Dominio no autorizado no fue bloqueado: ${url}`).toBe(false);
      }
    });
  });
});
