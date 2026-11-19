import type { Metadata } from 'next';
import { cache } from 'react';
import { headers } from 'next/headers';
import { GetPublicSalesPageUseCase } from '@/domain/sales-pages/use-cases/get-public-sales-page-use-case';
import { getEffectiveLandingStatus } from '@/domain/sales-pages/landing-lifecycle';
import { getCurrencyRates } from '@/lib/currency/rates-service';
import { resolveGateway } from '@/lib/api/gateway';
import { FirestoreTutorRepository } from '@/data/firestore/tutor-repo';
import { getTutorById } from '@/domain/identity/use-cases/get-tutor-by-id';
import { FirestorePaymentMethodRepository } from '@/data/firestore/payment-method-repo';
import { listPaymentOptions } from '@/domain/commerce/use-cases/list-payment-options';
import { FALLBACK_RATES } from '@/lib/currency/types';
import { PublicSalesPageView } from './components/public-sales-page-view';

export const dynamic = 'force-dynamic';

/**
 * Deduplicación en el ciclo de vida del request HTTP:
 * Evita consultar Firestore dos veces (una en generateMetadata y otra en el componente Page).
 */
export const getCachedPublicSalesPage = cache(async (id: string, isPreview: boolean) => {
  const useCase = new GetPublicSalesPageUseCase();
  return useCase.execute(id, isPreview);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const result = await getCachedPublicSalesPage(id, false);
    if (!result || !result.page) {
      return { title: 'Página no disponible | Fastoria' };
    }
    const page: any = result.page;
    const course: any = result.course;
    const heroSection = page.content?.sections?.find((s: any) => s.id?.startsWith('heroVideo'));
    const title = heroSection?.title || page.title || course?.title || 'Fastoria';
    const description = heroSection?.subtitle || page.description || course?.description || '';
    const heroImg = heroSection?.imageUrl || course?.thumbnail || page.branding?.logoUrl || '';

    return {
      title: `${title} | Fastoria`,
      description,
      openGraph: {
        title,
        description,
        images: heroImg ? [{ url: heroImg }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: heroImg ? [heroImg] : [],
      },
    };
  } catch {
    return { title: 'Fastoria' };
  }
}

export default async function PublicSalesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPreview = sParams.preview === 'true';
  const variantIdx = parseInt((typeof sParams.v === 'string' ? sParams.v : '0') || '0');

  const headersList = await headers();
  const referer = headersList.get('referer') || '';
  const host = headersList.get('host') || '';

  // Determinar si la invocación proviene estrictamente de una navegación interna desde nuestro dominio
  // Si se pega la URL directamente en la barra de direcciones o viene de un enlace externo, el referer es vacío o ajeno.
  const isInternalReferer = Boolean(
    referer && (
      (host && referer.includes(host)) ||
      referer.includes('localhost:') ||
      referer.includes('127.0.0.1') ||
      referer.includes('fastoria.com.ar') ||
      referer.includes('bilon.pagarqr.ar') ||
      referer.includes('feliz-de-emprender')
    )
  );
  const isInternalDomainCall = isInternalReferer;

  // 1. Obtener la página de ventas y entidades relacionadas en el servidor (deduplicado con generateMetadata)
  const result = await getCachedPublicSalesPage(id, isPreview);

  if (!result || !result.page) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="font-bold text-muted-foreground uppercase tracking-widest">Página no disponible.</p>
      </div>
    );
  }

  const effectiveStatus = getEffectiveLandingStatus(result.page);
  const isPending = effectiveStatus === 'pendiente' || result.page.isActive === false;
  const isArchived = effectiveStatus === 'archivada';

  // Si está archivada, no está disponible
  if (isArchived) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="font-bold text-muted-foreground uppercase tracking-widest">Página no disponible.</p>
      </div>
    );
  }

  // Si está pendiente: SOLO se permite previsualizar si es invocada desde el dominio de la plataforma
  if (isPending && !isInternalDomainCall) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="font-bold text-muted-foreground uppercase tracking-widest">Página no disponible.</p>
      </div>
    );
  }

  // 2. Fetch en paralelo en el servidor: tasas de cambio, perfil del tutor y métodos de pago
  const gateway = await resolveGateway();
  const mentorId = result.page.mentorId;

  const [ratesData, tutorResult, paymentResult] = await Promise.all([
    getCurrencyRates().catch((err) => {
      console.warn('[SSR Landing] Error loading rates:', err);
      return null;
    }),
    mentorId
      ? getTutorById(new FirestoreTutorRepository(gateway), { id: mentorId }).catch((err) => {
          console.warn('[SSR Landing] Error loading tutor:', err);
          return null;
        })
      : null,
    mentorId
      ? listPaymentOptions(new FirestorePaymentMethodRepository(gateway), { mentorId }).catch((err) => {
          console.warn('[SSR Landing] Error loading payment methods:', err);
          return null;
        })
      : null,
  ]);

  const tutor = tutorResult && tutorResult.ok ? (tutorResult.value.tutor.data as any) : null;
  const mentorProfile = tutor
    ? {
        displayName: tutor.displayName || tutor.email?.split('@')[0] || 'Mentor',
        photoURL: tutor.photoURL || '',
        username: tutor.username || '',
        profile: {
          bio: tutor.profile?.bio || '',
          socials: tutor.profile?.socials || {},
        },
        branding: tutor.profile?.branding || {},
      }
    : null;

  // Si la landing se encuentra en estado pendiente, NO se habilitan pasarelas de pago
  let paymentMethods = (paymentResult && paymentResult.ok && !isPending) ? paymentResult.value.methods : [];
  if (
    !isPending &&
    result.page.allowedPaymentMethods &&
    Array.isArray(result.page.allowedPaymentMethods) &&
    result.page.allowedPaymentMethods.length > 0
  ) {
    paymentMethods = paymentMethods.filter((m: any) => result.page.allowedPaymentMethods.includes(m.type));
  }

  const rates = ratesData?.rates || FALLBACK_RATES;

  // Optimización de fuentes de Google sin bloqueo de render (@import)
  const tokens = (result.page.content as any)?.designTokens || {};
  const fontHeading = tokens.typography?.headingFont || tokens.fontHeading || 'Inter';
  const fontBody = tokens.typography?.bodyFont || tokens.fontBody || 'Inter';
  const fontsToLoad = Array.from(new Set([fontHeading, fontBody].filter((f: any) => f && f !== 'inherit' && typeof f === 'string')));
  const fontParam = fontsToLoad.map((f: any) => `family=${f.replace(/\s+/g, '+')}:wght@400;500;600;700;800;900`).join('&');
  const fontUrl = fontParam ? `https://fonts.googleapis.com/css2?${fontParam}&display=swap` : null;

  // Serialización segura de entidades para el Client Component
  const serializedPage = JSON.parse(JSON.stringify(result.page));
  const serializedCourse = result.course ? JSON.parse(JSON.stringify(result.course)) : null;
  const serializedModules = result.modules ? JSON.parse(JSON.stringify(result.modules)) : [];
  const serializedBundleProducts = result.bundleProducts ? JSON.parse(JSON.stringify(result.bundleProducts)) : [];

  return (
    <>
      {fontUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={fontUrl} />
        </>
      )}
      <PublicSalesPageView
        id={id}
        initialPage={serializedPage}
        initialCourse={serializedCourse}
        initialModules={serializedModules}
        initialBundleProducts={serializedBundleProducts}
        initialMentorProfile={mentorProfile}
        initialPaymentMethods={paymentMethods}
        initialRates={rates}
        variantIdx={variantIdx}
        isPreview={isPreview}
        isPendingPreview={isPending}
      />
    </>
  );
}
