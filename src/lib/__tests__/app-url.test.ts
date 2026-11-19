import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { getAppBaseUrl } from '../app-url';

describe('getAppBaseUrl', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    delete process.env.GOOGLE_CLOUD_PROJECT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses NEXT_PUBLIC_APP_URL when present', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://custom-domain.com/';
    expect(getAppBaseUrl()).toBe('https://custom-domain.com');
  });

  it('detects testing environment via project id when APP_URL is unset', () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'feliz-de-emprender';
    expect(getAppBaseUrl()).toBe('https://btechacademy-test--feliz-de-emprender.us-central1.hosted.app');
  });

  it('detects production environment via project id when APP_URL is unset', () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'btechacademy-8b329';
    expect(getAppBaseUrl()).toBe('https://fastoria.com.ar');
  });

  it('ignores legacy app.fastoria.com and resolves by project id', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.fastoria.com';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'btechacademy-8b329';
    expect(getAppBaseUrl()).toBe('https://fastoria.com.ar');
  });

  it('defaults to localhost:9002 in development when no env vars match', () => {
    expect(getAppBaseUrl()).toBe('http://localhost:9002');
  });
});

