/**
 * API — Handlers testeables de tutores (F1.3).
 * Rutas PÚBLICAS por contrato legacy: SIN `authenticateCaller`
 * (`tutors/*` nunca exigió token). Firma `(gateway, ...args)` como el
 * resto de handlers. Status y bodies legacy exactos (sin envelope
 * `{ data }`). `buildTutorResponse` se mueve TAL CUAL desde el route
 * (usa `getLandingStyle`/`resolveStyleBrand` locales; el style remoto
 * se lee por `TutorRepository`, solo cuando el registro local falla,
 * igual que antes).
 */
import { NextResponse } from 'next/server';

import { FirestoreCourseRepository } from '@/data/firestore/course-repo';
import { FirestorePaymentMethodRepository } from '@/data/firestore/payment-method-repo';
import { FirestoreTutorRepository } from '@/data/firestore/tutor-repo';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import { getTutorStatus } from '@/domain/identity/use-cases/get-tutor-status';
import { listFeaturedTutors } from '@/domain/identity/use-cases/list-featured';
import { getTutorById } from '@/domain/identity/use-cases/get-tutor-by-id';
import { listPaymentOptions } from '@/domain/commerce/use-cases/list-payment-options';
import type { DomainError } from '@/domain/shared/errors';
import { getLandingStyle, resolveStyleBrand } from '@/lib/landing-styles';

function legacyDetails(error: DomainError): { status: number; body: Record<string, unknown> } | null {
  const details = error.details as { status?: unknown; body?: unknown } | undefined;
  if (details && typeof details.status === 'number' && typeof details.body === 'object' && details.body !== null) {
    return { status: details.status, body: details.body as Record<string, unknown> };
  }
  return null;
}

/** GET /api/tutors/[username]/status. `adminPath` replica `hasAdminCredentials()`. */
export async function handleGetTutorStatus(
  gateway: FirestoreGateway,
  username: string,
  adminPath = true,
): Promise<NextResponse> {
  try {
    const tutors = new FirestoreTutorRepository(gateway);
    const courses = new FirestoreCourseRepository(gateway);
    const result = await getTutorStatus(tutors, courses, { username, adminPath });
    if (!result.ok) {
      const { code } = result.error;
      const reason = (result.error.details as { reason?: string } | undefined)?.reason;
      if (code === 'NOT_FOUND' || code === 'VALIDATION') {
        return NextResponse.json({ error: 'Tutor not found', available: false, reason: 'not_found' }, { status: 404 });
      }
      if (code === 'FORBIDDEN' && reason === 'subscription_inactive') {
        return NextResponse.json(
          { error: 'Tutor subscription is not active', available: false, reason: 'subscription_inactive' },
          { status: 403 },
        );
      }
      if (code === 'FORBIDDEN' && reason === 'profile_private') {
        return NextResponse.json(
          { error: 'Tutor profile is not public', available: false, reason: 'profile_private' },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: 'Failed to check tutor status', details: result.error.message, available: false, reason: 'server_error' },
        { status: 500 },
      );
    }

    const { tutorId, tutor, coursesCount } = result.value;
    return NextResponse.json({
      available: true,
      tutor: await buildTutorResponse(tutorId, tutor.data, coursesCount, async (styleId) => {
        const style = await tutors.findLandingStyleById(styleId);
        return style ? style.data : null;
      }),
    });
  } catch (error: unknown) {
    if (!adminPath) {
      return NextResponse.json(
        {
          error: 'No se puede consultar el perfil del tutor localmente sin service-account.json',
          available: false,
          reason: 'server_error',
        },
        { status: 412 },
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to check tutor status', details: message, available: false, reason: 'server_error' },
      { status: 500 },
    );
  }
}

/** GET /api/tutors/[username]/payment-options (`username` = mentorId/UID). */
export async function handleGetPaymentOptions(
  gateway: FirestoreGateway,
  mentorId: string,
): Promise<NextResponse> {
  if (!mentorId) {
    return NextResponse.json({ error: 'mentorId requerido' }, { status: 400 });
  }
  try {
    const payments = new FirestorePaymentMethodRepository(gateway);
    const result = await listPaymentOptions(payments, { mentorId });
    if (!result.ok) {
      const details = legacyDetails(result.error);
      if (details) return NextResponse.json(details.body, { status: details.status });
      return NextResponse.json({ error: 'Error interno', methods: [] }, { status: 500 });
    }
    return NextResponse.json({ methods: result.value.methods });
  } catch (error: unknown) {
    console.error('[PaymentOptions] Error:', error);
    return NextResponse.json({ error: 'Error interno', methods: [] }, { status: 500 });
  }
}

/** GET /api/tutors/featured. */
export async function handleListFeaturedTutors(gateway: FirestoreGateway): Promise<NextResponse> {
  try {
    const tutors = new FirestoreTutorRepository(gateway);
    const result = await listFeaturedTutors(tutors, {});
    if (!result.ok) {
      return NextResponse.json({ error: 'Failed to fetch featured subscriptions' }, { status: 500 });
    }
    return NextResponse.json({
      subscriptions: result.value.subscriptions.map((s) => ({
        id: s.id,
        tutorName: s.tutorName,
        ...s.subscription,
      })),
    });
  } catch (error: unknown) {
    console.error('Error fetching featured tutors:', error);
    return NextResponse.json({ error: 'Failed to fetch featured subscriptions' }, { status: 500 });
  }
}

/** GET /api/tutors/by-id/[id]. Solo info pública de branding. */
export async function handleGetTutorById(gateway: FirestoreGateway, id: string): Promise<NextResponse> {
  try {
    const tutors = new FirestoreTutorRepository(gateway);
    const result = await getTutorById(tutors, { id });
    if (!result.ok) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tutor: any = result.value.tutor.data;
    return NextResponse.json({
      displayName: tutor.displayName || tutor.email?.split('@')[0] || 'Mentor',
      photoURL: tutor.photoURL || '',
      username: tutor.username || '',
      profile: {
        bio: tutor.profile?.bio || '',
        socials: tutor.profile?.socials || {},
      },
      branding: tutor.profile?.branding || {},
    });
  } catch (error: unknown) {
    console.error('[API Tutor By ID] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildTutorResponse(tutorId: string, tutor: any, coursesCount: number, fetchStyle: (styleId: string) => Promise<any | null>) {
  const websiteConfig = tutor.profile?.websiteConfig || null;
  const styleId = websiteConfig?.styleId || 'classic';
  const brandName = websiteConfig?.brandName || null;

  // Brands propios del tutor (privados, solo para su web personal)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownBrands: any[] = Array.isArray(tutor.profile?.brands) ? tutor.profile.brands : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeOwnBrand = ownBrands.find((b: any) => b?.name === tutor.profile?.activeBrandName) || ownBrands[0] || null;

  // Resolver style + brand desde el sistema landingStyles (DTCG)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let style: any = getLandingStyle(styleId) || null;
  if (!style) {
    try {
      style = await fetchStyle(styleId);
    } catch { /* no-critical */ }
  }
  const systemBrand = resolveStyleBrand(style as never, brandName);

  const brand = activeOwnBrand || systemBrand;

  const layoutMode = brand?.tokens?.themeMode === 'dark' || brand?.tokens?.themeMode === 'glass'
    ? 'dark'
    : (tutor.profile?.branding?.layoutMode || 'light');

  return {
    id: tutorId,
    username: tutor.username,
    displayName: tutor.displayName || tutor.email?.split('@')[0],
    photo: tutor.photoURL || `https://loremflickr.com/200/200/person,professional?lock=${tutorId}`,
    bio: tutor.profile?.bio || '',
    expertise: tutor.expertise || [],
    location: tutor.location || '',
    email: tutor.email || '',
    socialLinks: {
      website: tutor.profile?.socials?.website || '',
      linkedin: tutor.profile?.socials?.linkedin || '',
      twitter: tutor.profile?.socials?.twitter || '',
      instagram: tutor.profile?.socials?.instagram || '',
      youtube: tutor.profile?.socials?.youtube || '',
      tiktok: tutor.profile?.socials?.tiktok || '',
      whatsapp: tutor.profile?.socials?.whatsapp || '',
      phone: tutor.profile?.socials?.phone || '',
      calendly: tutor.profile?.socials?.calendly || '',
    },
    stats: {
      totalStudents: tutor.stats?.totalStudents || 0,
      totalCourses: coursesCount,
      avgRating: tutor.stats?.avgRating || 4.5,
      totalHours: tutor.stats?.totalHours || 0
    },
    subscription: tutor.subscription || { status: 'active', plan: 'free' },
    publicProfile: (tutor.profile as any)?.publicProfile || {
      enabled: true,
      showStats: true,
      showContact: true,
      allowPublicCourses: true
    },
    branding: {
      primaryColor: brand?.palette?.primary || tutor.profile?.branding?.primaryColor || '#3B2D86',
      logoUrl: tutor.profile?.branding?.logoUrl || '',
      layoutMode
    },
    brand: brand || null,
    ownBrands,
    activeBrandName: tutor.profile?.activeBrandName || (ownBrands[0]?.name || ''),
    styleId,
    websiteConfig: websiteConfig
  };
}
