import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/dashboard/',
        '/mentoria/',
        '/tutor/', // Perfiles protegidos (puedes cambiar esto si quieres que se indexen)
      ],
    },
    sitemap: 'https://fastoria.com.ar/sitemap.xml',
  };
}
