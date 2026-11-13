/**
 * Resolves the canonical base URL according to the active environment:
 * - Local: http://localhost:9002
 * - Testing (feliz-de-emprender): https://btechacademy-test--feliz-de-emprender.us-central1.hosted.app
 * - Production (btechacademy-8b329): https://fastoria.com.ar
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  const envUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
  if (envUrl && !envUrl.includes('app.fastoria.com')) {
    return envUrl.replace(/\/$/, '');
  }

  const projectId = (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    ''
  ).trim();

  if (projectId === 'feliz-de-emprender') {
    return 'https://btechacademy-test--feliz-de-emprender.us-central1.hosted.app';
  }

  if (projectId === 'btechacademy-8b329') {
    return 'https://fastoria.com.ar';
  }

  return 'http://localhost:9002';
}

