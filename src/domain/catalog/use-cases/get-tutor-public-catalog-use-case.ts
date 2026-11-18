import type { FirestoreGateway } from '@/data/firestore/gateway';
import type {
  CatalogOffer,
  CatalogOfferType,
  TutorCatalogResponse,
  CatalogPaymentMethodPrice,
} from '../tutor-catalog-api';

export interface GetTutorCatalogFilterOptions {
  types?: CatalogOfferType[];
  ids?: string[];
  limit?: number;
  baseUrl?: string;
}

export class GetTutorPublicCatalogUseCase {
  constructor(private readonly gateway: FirestoreGateway) {}

  async execute(
    tutorId: string,
    options: GetTutorCatalogFilterOptions = {},
  ): Promise<TutorCatalogResponse | null> {
    if (!tutorId) return null;

    // 1. Obtener perfil del tutor
    const userDoc = await this.gateway.getDoc('users', tutorId);
    if (!userDoc || !userDoc.exists) {
      return null;
    }
    const userData = userDoc.data() || {};
    const tutorName = (userData.displayName as string) || (userData.name as string) || (userData.email as string)?.split('@')[0] || 'Tutor';
    const tutorUsername = (userData.username as string) || null;

    // 2. Obtener todas las salesPages del mentor
    // Usamos queryByField para aislar las ofertas pertenecientes exclusivamente a este tutor
    const snap = await this.gateway.queryByField('salesPages', 'mentorId', tutorId);
    const docs = snap?.docs || [];

    const now = new Date();
    const offers: CatalogOffer[] = [];
    const baseUrl = (options.baseUrl || 'https://feliz.fastoria.com.ar').replace(/\/+$/, '');

    // Para evitar consultas N+1 repetidas de cursos, cacheamos
    const courseCache = new Map<string, Record<string, unknown> | null>();

    for (const doc of docs) {
      const data = doc.data() || {};

      // FILTRO 1: No mostrar ofertas de embajadores / afiliados
      if (data.referidoId || data.referidoName || data.landingType === 'referral') {
        continue;
      }

      // FILTRO 2: Solo ofertas activas / publicadas
      if (data.isActive === false) {
        continue;
      }

      // FILTRO 3: Vigencia temporal
      if (data.activeUntil) {
        const uVal = data.activeUntil as any;
        const untilDate = typeof uVal?.toDate === 'function' ? uVal.toDate() : new Date(uVal);
        if (now > untilDate) {
          // Oferta expirada
          continue;
        }
      }

      if (data.activeFrom) {
        const fVal = data.activeFrom as any;
        const fromDate = typeof fVal?.toDate === 'function' ? fVal.toDate() : new Date(fVal);
        if (now < fromDate) {
          // Oferta aún no disponible
          continue;
        }
      }

      // FILTRO 4: Filtro por IDs específicos si fue solicitado
      if (options.ids && options.ids.length > 0) {
        if (!options.ids.includes(doc.id)) {
          continue;
        }
      }

      // 3. Resolver tipo de oferta (curso, programa, mentoria)
      const resolvedType = this.resolveOfferType(data);

      // FILTRO 5: Filtro por tipo si fue solicitado
      if (options.types && options.types.length > 0) {
        if (!options.types.includes(resolvedType)) {
          continue;
        }
      }

      // 4. Si tiene courseId asociado y faltan datos (ej: imagen, descripción), intentamos enriquecer con el curso o mentoría
      let courseData: Record<string, unknown> | null = null;
      if (data.courseId && typeof data.courseId === 'string') {
        if (courseCache.has(data.courseId)) {
          courseData = courseCache.get(data.courseId) || null;
        } else {
          try {
            const courseDoc = await this.gateway.getDoc('courses', data.courseId);
            if (courseDoc && courseDoc.exists) {
              courseData = courseDoc.data() || null;
            } else if (resolvedType === 'mentoria') {
              const followupDoc = await this.gateway.getDoc('followups', data.courseId);
              if (followupDoc && followupDoc.exists) {
                const fData = followupDoc.data() || {};
                courseData = {
                  ...fData,
                  description: fData.goal || fData.description || null,
                };
              }
            }
            courseCache.set(data.courseId, courseData);
          } catch {
            courseCache.set(data.courseId, null);
          }
        }
      }

      // 5. Construir objeto de oferta canónico
      const heroSection = (data.content as any)?.sections?.find((s: any) => s.id?.startsWith('heroVideo'));
      const rawTitle = (data.title as string) || (heroSection?.title as string) || (courseData?.title as string) || 'Oferta de Formacion';
      const rawDesc = (data.description as string) || (heroSection?.subtitle as string) || (courseData?.description as string) || null;
      const rawImage = (data.imageUrl as string) || (heroSection?.imageUrl as string) || (courseData?.thumbnail as string) || (data.branding as any)?.logoUrl || null;

      const rawPrice = typeof data.price === 'number' ? data.price : (typeof courseData?.price === 'number' ? courseData.price : null);
      const isFree = rawPrice === 0;
      const currency = (data.currency as string) || (courseData?.currency as string) || 'ARS';
      const formattedPrice = isFree
        ? 'Gratis'
        : rawPrice !== null
          ? `$${rawPrice.toLocaleString('es-AR')} ${currency}`
          : 'Consultar';

      const paymentMethods = this.resolvePaymentMethods(data, courseData, rawPrice, currency, isFree);
      const duration = this.resolveDuration(data, courseData);

      let activeUntilStr: string | null = null;
      if (data.activeUntil) {
        const uVal = data.activeUntil as any;
        const u = typeof uVal?.toDate === 'function' ? uVal.toDate() : new Date(uVal);
        activeUntilStr = u.toISOString();
      }

      offers.push({
        id: doc.id,
        type: resolvedType,
        title: rawTitle,
        description: rawDesc,
        imageUrl: rawImage,
        price: {
          amount: rawPrice,
          currency,
          isFree,
          formatted: formattedPrice,
        },
        paymentMethods,
        duration,
        url: `${baseUrl}/v/${doc.id}`,
        status: 'published',
        activeUntil: activeUntilStr,
      });
    }

    // Limitar resultados
    const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 100) : 50;
    const paginatedOffers = offers.slice(0, limit);

    return {
      tutor: {
        id: tutorId,
        name: tutorName,
        username: tutorUsername,
      },
      total: paginatedOffers.length,
      offers: paginatedOffers,
    };
  }

  private resolveOfferType(data: Record<string, unknown>): CatalogOfferType {
    const rawType = String(data.productType || data.type || '').toLowerCase();
    if (rawType.includes('programa') || rawType.includes('program')) {
      return 'programa';
    }
    if (
      rawType.includes('mentoria') || 
      rawType.includes('mentoring') ||
      rawType.includes('followup')
    ) {
      return 'mentoria';
    }
    return 'curso';
  }

  private resolveDuration(
    data: Record<string, unknown>,
    courseData: Record<string, unknown> | null,
  ): CatalogOffer['duration'] {
    // Si viene en data o en courseData
    const dVal = (data.duration as any) || (courseData?.duration as any);
    if (!dVal) return null;

    if (typeof dVal === 'object' && dVal !== null) {
      const val = typeof dVal.value === 'number' ? dVal.value : null;
      const unit = typeof dVal.unit === 'string' ? dVal.unit : null;
      const label = dVal.label || (val && unit ? `${val} ${unit}` : null);
      return { value: val, unit, label };
    }

    if (typeof dVal === 'string') {
      const m = dVal.match(/^(\d+)\s*(.*)$/);
      if (m) {
        return {
          value: parseInt(m[1]),
          unit: m[2].trim() || null,
          label: dVal.trim(),
        };
      }
      return { value: null, unit: null, label: dVal.trim() };
    }

    if (typeof dVal === 'number') {
      return { value: dVal, unit: 'horas', label: `${dVal} horas` };
    }

    return null;
  }

  private resolvePaymentMethods(
    data: Record<string, unknown>,
    courseData: Record<string, unknown> | null,
    basePrice: number | null,
    baseCurrency: string,
    isFree: boolean,
  ): CatalogPaymentMethodPrice[] {
    if (isFree) {
      return [
        {
          id: 'free',
          label: 'Acceso Gratuito',
          amount: 0,
          currency: baseCurrency,
          isFree: true,
          formatted: 'Gratis',
        },
      ];
    }

    const GATEWAY_LABELS: Record<string, string> = {
      mercadopago: 'Mercado Pago',
      transfer: 'Transferencia Bancaria',
      bank_transfer: 'Transferencia Bancaria',
      getnet: 'Getnet',
      stripe: 'Stripe',
      paypal: 'PayPal',
      manual: 'Efectivo / Manual',
    };

    const methods: CatalogPaymentMethodPrice[] = [];
    const addedIds = new Set<string>();

    // 1. Precios por gateway estructurados en pricing.pricesByGateway
    const pricingObj = (data.pricing as any)?.pricesByGateway || (courseData?.pricing as any)?.pricesByGateway;
    if (pricingObj && typeof pricingObj === 'object') {
      for (const [gatewayId, cfg] of Object.entries(pricingObj)) {
        const config = cfg as any;
        if (config && config.isActive !== false && typeof config.amount === 'number') {
          const amt = config.amount;
          const curr = config.currency || (gatewayId === 'stripe' || gatewayId === 'paypal' ? 'USD' : 'ARS');
          methods.push({
            id: gatewayId,
            label: GATEWAY_LABELS[gatewayId] || gatewayId,
            amount: amt,
            currency: curr,
            isFree: amt === 0,
            formatted: amt === 0 ? 'Gratis' : `$${amt.toLocaleString('es-AR')} ${curr}`,
          });
          addedIds.add(gatewayId);
        }
      }
    }

    // 2. Precios por gateway en campos planos (priceMercadoPago, priceTransfer, etc.)
    const checkFlatGateway = (key: string, id: string, defaultCurrency: string) => {
      const val = (data[key] as number) || (courseData?.[key] as number);
      if (typeof val === 'number' && val > 0 && !addedIds.has(id)) {
        methods.push({
          id,
          label: GATEWAY_LABELS[id] || id,
          amount: val,
          currency: defaultCurrency,
          isFree: false,
          formatted: `$${val.toLocaleString('es-AR')} ${defaultCurrency}`,
        });
        addedIds.add(id);
      }
    };

    checkFlatGateway('priceMercadoPago', 'mercadopago', 'ARS');
    checkFlatGateway('priceTransfer', 'transfer', 'ARS');
    checkFlatGateway('priceGetnet', 'getnet', 'ARS');
    checkFlatGateway('priceStripe', 'stripe', 'USD');

    // 3. Fallback a allowedPaymentMethods con el precio base
    const allowed = (data.allowedPaymentMethods as string[]) || (courseData?.allowedPaymentMethods as string[]);
    if (Array.isArray(allowed) && allowed.length > 0) {
      for (const mId of allowed) {
        if (!addedIds.has(mId)) {
          const curr = (mId === 'stripe' || mId === 'paypal') ? 'USD' : baseCurrency;
          methods.push({
            id: mId,
            label: GATEWAY_LABELS[mId] || mId,
            amount: basePrice,
            currency: curr,
            isFree: basePrice === 0,
            formatted:
              basePrice === 0
                ? 'Gratis'
                : basePrice !== null
                  ? `$${basePrice.toLocaleString('es-AR')} ${curr}`
                  : 'Consultar',
          });
          addedIds.add(mId);
        }
      }
    }

    // 4. Si aún no hay métodos detectados, devolver el método general base
    if (methods.length === 0) {
      methods.push({
        id: 'standard',
        label: 'Pago General',
        amount: basePrice,
        currency: baseCurrency,
        isFree: basePrice === 0,
        formatted:
          basePrice === 0
            ? 'Gratis'
            : basePrice !== null
              ? `$${basePrice.toLocaleString('es-AR')} ${baseCurrency}`
              : 'Consultar',
      });
    }

    return methods;
  }
}
