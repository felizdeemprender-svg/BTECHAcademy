import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

describe('Middleware Routing and Subdomain Isolation', () => {
  it('does NOT redirect reserved /company/tutors to subdomain', async () => {
    const req = new NextRequest('http://localhost:9002/company/tutors', {
      headers: { host: 'localhost:9002' }
    });
    const res = await middleware(req);
    // NextResponse.next() returns a response without Location header redirect
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });

  it('recovers and redirects accidental company.localhost:9002/tutors to /company/tutors', async () => {
    const req = new NextRequest('http://company.localhost:9002/tutors', {
      headers: { host: 'company.localhost:9002' }
    });
    const res = await middleware(req);
    const location = res.headers.get('location');
    expect(location).toContain('localhost:9002/company/tutors');
  });

  it('does NOT redirect reserved /empresa/tutors to subdomain', async () => {
    const req = new NextRequest('http://localhost:9002/empresa/tutors', {
      headers: { host: 'localhost:9002' }
    });
    const res = await middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects valid tutor username /juan to juan.localhost:9002', async () => {
    const req = new NextRequest('http://localhost:9002/juan', {
      headers: { host: 'localhost:9002' }
    });
    const res = await middleware(req);
    const location = res.headers.get('location');
    expect(location).toBe('http://juan.localhost:9002/');
  });

  it('redirects valid tutor landing /juan/oferta to juan.localhost:9002/oferta', async () => {
    const req = new NextRequest('http://localhost:9002/juan/oferta', {
      headers: { host: 'localhost:9002' }
    });
    const res = await middleware(req);
    const location = res.headers.get('location');
    expect(location).toBe('http://juan.localhost:9002/oferta');
  });
});
