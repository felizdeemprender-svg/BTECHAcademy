import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { middleware } from '@/middleware';
import { getNavigationSections } from '@/components/layout/sidebar-nav';

const SRC_DIR = path.resolve(process.cwd(), 'src');
const APP_DIR = path.join(SRC_DIR, 'app');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

interface RoutePattern {
  pattern: string;
  regex: RegExp;
  isDynamic: boolean;
}

interface DiscoveredLink {
  file: string;
  line: number;
  rawHref: string;
  normalizedPath: string;
  isTemplate: boolean;
}

function walkFiles(dir: string, predicate: (fullPath: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, predicate));
    } else if (predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

function toRoutePattern(pageFile: string): RoutePattern {
  const relDir = path.relative(APP_DIR, path.dirname(pageFile));
  const rawSegments = relDir ? relDir.split(path.sep) : [];
  // Route groups like (public) do not appear in the URL
  const urlSegments = rawSegments.filter((seg) => !(seg.startsWith('(') && seg.endsWith(')')));
  const pattern = '/' + urlSegments.join('/');
  const isDynamic = urlSegments.some((seg) => seg.startsWith('['));

  if (urlSegments.length === 0) {
    return { pattern: '/', regex: /^\/$/, isDynamic: false };
  }

  const regexParts = urlSegments.map((seg) => {
    if (seg.startsWith('[[...') && seg.endsWith(']]')) {
      return '(?:/.*)?';
    }
    if (seg.startsWith('[...') && seg.endsWith(']')) {
      return '/.+';
    }
    if (seg.startsWith('[') && seg.endsWith(']')) {
      return '/[^/]+';
    }
    return '/' + seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });

  // Handle optional catch-all cleanly, normal segments start with /
  const regexStr = '^' + regexParts.join('') + '$';
  return { pattern, regex: new RegExp(regexStr), isDynamic };
}

function loadAppRoutes(): RoutePattern[] {
  const pageFiles = walkFiles(APP_DIR, (full) => {
    const base = path.basename(full);
    return base === 'page.tsx' || base === 'page.ts' || base === 'page.jsx' || base === 'page.js';
  });
  return pageFiles.map(toRoutePattern);
}

function normalizeTargetPath(raw: string): string {
  // Replace template interpolations ${...} with placeholder segment
  let cleaned = raw.replace(/\$\{[^}]+\}/g, '__param__');
  // Strip hash and query string
  cleaned = cleaned.split('#')[0].split('?')[0].trim();
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned || '/';
}

function matchesAppRoute(targetPath: string, routes: RoutePattern[]): boolean {
  return routes.some((r) => r.regex.test(targetPath));
}

function isPublicStaticAsset(targetPath: string): boolean {
  const rel = targetPath.replace(/^\/+/, '');
  if (!rel) return false;
  return fs.existsSync(path.join(PUBLIC_DIR, rel));
}

function extractInternalLinks(): DiscoveredLink[] {
  const sourceFiles = walkFiles(SRC_DIR, (full) => {
    if (!/\.(ts|tsx|js|jsx)$/.test(full)) return false;
    if (full.includes(`${path.sep}__tests__${path.sep}`)) return false;
    if (full.endsWith('.test.ts') || full.endsWith('.test.tsx') || full.endsWith('.bak')) return false;
    return true;
  });

  const links: DiscoveredLink[] = [];
  const patterns: Array<{ regex: RegExp; isTemplate: boolean }> = [
    // href="/foo" or href='/foo'
    { regex: /\bhref\s*=\s*["'](\/[^"']*)["']/g, isTemplate: false },
    // href={"/foo"} or href={'/foo'}
    { regex: /\bhref\s*=\s*\{\s*["'](\/[^"']*)["']\s*\}/g, isTemplate: false },
    // href={`/foo/${id}`}
    { regex: /\bhref\s*=\s*\{\s*`(\/[^`]*)`\s*\}/g, isTemplate: true },
    // router.push('/foo') / router.replace('/foo')
    { regex: /\brouter\.(?:push|replace)\(\s*["'](\/[^"']*)["']\s*\)/g, isTemplate: false },
    // router.push(`/foo/${id}`)
    { regex: /\brouter\.(?:push|replace)\(\s*`(\/[^`]*)`\s*\)/g, isTemplate: true },
  ];

  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      for (const { regex, isTemplate } of patterns) {
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(lineText)) !== null) {
          const rawHref = match[1];
          // Skip protocol-relative URLs (//...) and API/Next internal paths
          if (rawHref.startsWith('//')) continue;
          const normalizedPath = normalizeTargetPath(rawHref);
          if (
            normalizedPath.startsWith('/api/') ||
            normalizedPath === '/api' ||
            normalizedPath.startsWith('/_next')
          ) {
            continue;
          }
          // Skip template paths whose first segment itself is dynamic (e.g. `/${username}`)
          if (isTemplate && normalizedPath.startsWith('/__param__')) continue;

          links.push({
            file: path.relative(process.cwd(), file),
            line: i + 1,
            rawHref,
            normalizedPath,
            isTemplate,
          });
        }
      }
    }
  }

  return links;
}

describe('Integridad de Rutas del Sistema', () => {
  const appRoutes = loadAppRoutes();
  const discoveredLinks = extractInternalLinks();

  it('todas las rutas estáticas de src/app están protegidas y no se redirigen a subdominios en localhost', async () => {
    const staticRoutes = appRoutes.filter((r) => !r.isDynamic && r.pattern !== '/');
    const hijacked: string[] = [];

    for (const route of staticRoutes) {
      const req = new NextRequest(`http://localhost:9002${route.pattern}`, {
        headers: { host: 'localhost:9002' },
      });
      const res = await middleware(req);
      const location = res.headers.get('location');
      if (location) {
        const dest = new URL(location);
        if (dest.host !== 'localhost:9002') {
          hijacked.push(`${route.pattern} -> ${location}`);
        }
      }
    }

    expect(hijacked).toEqual([]);
  });

  it('todas las entradas del menú lateral (SidebarNav) apuntan a rutas reales y no son capturadas como subdominio', async () => {
    const profiles = [
      { uid: 'a1', roles: ['alumno'] },
      { uid: 'm1', roles: ['mentor'] },
      { uid: 'ad1', roles: ['admin'] },
      { uid: 'mk1', roles: ['marketing'] },
      { uid: 'e1', roles: ['empresa'] },
    ];

    const invalidMenuItems: string[] = [];

    for (const profile of profiles) {
      const sections = getNavigationSections(profile);
      for (const section of sections) {
        for (const item of section.items) {
          const cleanPath = normalizeTargetPath(item.href);
          if (!matchesAppRoute(cleanPath, appRoutes)) {
            invalidMenuItems.push(`${item.name} (${item.href}) no tiene page.tsx`);
          }
          const req = new NextRequest(`http://localhost:9002${cleanPath}`, {
            headers: { host: 'localhost:9002' },
          });
          const res = await middleware(req);
          const location = res.headers.get('location');
          if (location && new URL(location).host !== 'localhost:9002') {
            invalidMenuItems.push(`${item.name} (${item.href}) redirige a subdominio ${location}`);
          }
        }
      }
    }

    expect(invalidMenuItems).toEqual([]);
  });

  it('todos los enlaces internos (Link href y router.push) resuelven a una ruta válida y no a <ruta>.localhost', async () => {
    const brokenLinks: string[] = [];

    for (const link of discoveredLinks) {
      if (isPublicStaticAsset(link.normalizedPath)) continue;

      const req = new NextRequest(`http://localhost:9002${link.normalizedPath}`, {
        headers: { host: 'localhost:9002' },
      });
      const res = await middleware(req);
      const location = res.headers.get('location');

      if (location) {
        const dest = new URL(location);
        // En localhost, /tutor/[username] redirige intencionalmente a <username>.localhost
        const isIntentionalTutorSubdomain =
          link.normalizedPath.startsWith('/tutor/') &&
          dest.host.endsWith('.localhost:9002');

        if (!isIntentionalTutorSubdomain && dest.host !== 'localhost:9002') {
          brokenLinks.push(
            `${link.file}:${link.line} "${link.rawHref}" redirige accidentalmente a subdominio ${location}`
          );
          continue;
        }

        if (dest.host === 'localhost:9002') {
          const redirectTarget = normalizeTargetPath(dest.pathname);
          if (!matchesAppRoute(redirectTarget, appRoutes)) {
            brokenLinks.push(
              `${link.file}:${link.line} "${link.rawHref}" redirige a ruta inexistente ${redirectTarget}`
            );
          }
          continue;
        }
      }

      if (!matchesAppRoute(link.normalizedPath, appRoutes)) {
        brokenLinks.push(
          `${link.file}:${link.line} "${link.rawHref}" (${link.normalizedPath}) no existe en src/app`
        );
      }
    }

    expect(brokenLinks).toEqual([]);
  });
});

