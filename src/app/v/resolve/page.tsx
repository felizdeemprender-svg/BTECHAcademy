import type { Metadata } from 'next';
import { resolveGateway } from '@/lib/api/gateway';
import { FirestoreTutorRepository } from '@/data/firestore/tutor-repo';
import { FirestoreMarketplaceRepository } from '@/data/firestore/marketplace-repo';
import { resolveSalesPage } from '@/domain/catalog/use-cases/resolve-sales-page';
import PublicSalesPage, { generateMetadata as generateLandingMetadata } from '../[id]/page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const sParams = searchParams ? await searchParams : {};
  const username = typeof sParams.u === 'string' ? sParams.u : null;
  const slug = typeof sParams.s === 'string' ? sParams.s : null;

  if (!username || !slug) return { title: 'Página no disponible | Fastoria' };

  try {
    const gateway = await resolveGateway();
    const tutors = new FirestoreTutorRepository(gateway);
    const pages = new FirestoreMarketplaceRepository(gateway);
    const result = await resolveSalesPage(tutors, pages, { username, slug });

    if (!result.ok) return { title: 'Página no encontrada | Fastoria' };

    return generateLandingMetadata({ params: Promise.resolve({ id: result.value.id }) });
  } catch {
    return { title: 'Fastoria' };
  }
}

export default async function ResolverPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sParams = searchParams ? await searchParams : {};
  const username = typeof sParams.u === 'string' ? sParams.u : null;
  const slug = typeof sParams.s === 'string' ? sParams.s : null;

  if (!username || !slug) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted">
        <div className="text-center space-y-6 p-8 max-w-md">
          <h1 className="text-2xl font-bold text-foreground">URL mal formada</h1>
          <p className="text-muted-foreground">Faltan parámetros requeridos.</p>
        </div>
      </div>
    );
  }

  const gateway = await resolveGateway();
  const tutors = new FirestoreTutorRepository(gateway);
  const pages = new FirestoreMarketplaceRepository(gateway);
  const result = await resolveSalesPage(tutors, pages, { username, slug });

  if (!result.ok) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted">
        <div className="text-center space-y-6 p-8 max-w-md">
          <div className="w-20 h-20 bg-danger/15 rounded-3xl flex items-center justify-center mx-auto text-danger">
            <span className="text-3xl font-bold">!</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Página no encontrada</h1>
          <p className="text-muted-foreground">Parece que la página que buscas ya no existe o el enlace es incorrecto.</p>
        </div>
      </div>
    );
  }

  return <PublicSalesPage params={Promise.resolve({ id: result.value.id })} searchParams={searchParams} />;
}
