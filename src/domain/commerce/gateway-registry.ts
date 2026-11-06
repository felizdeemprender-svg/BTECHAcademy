import type { IPaymentGatewayAdapter } from './gateway-adapter';
import {
  MercadoPagoAdapter,
  GetnetAdapter,
  BankTransferAdapter,
  StripeAdapter,
  PayPalAdapter,
} from './adapters';

export interface FilterEligibleParams {
  readonly tutorCountry: string;
  readonly buyerCountry: string;
  readonly activeTutorGatewayIds: readonly string[];
}

export interface FilteredGatewaysResult {
  readonly local: readonly IPaymentGatewayAdapter[];
  readonly global: readonly IPaymentGatewayAdapter[];
  readonly all: readonly IPaymentGatewayAdapter[];
  readonly hasCompatibleGateway: boolean;
}

export class PaymentGatewayRegistry {
  private readonly adapters = new Map<string, IPaymentGatewayAdapter>();
  private readonly aliases = new Map<string, string>();

  register(adapter: IPaymentGatewayAdapter, aliases: readonly string[] = []): this {
    const canonicalId = adapter.id.toLowerCase();
    this.adapters.set(canonicalId, adapter);
    for (const alias of aliases) {
      this.aliases.set(alias.toLowerCase(), canonicalId);
    }
    return this;
  }

  get(id: string): IPaymentGatewayAdapter | undefined {
    const key = id.toLowerCase();
    const canonicalId = this.aliases.get(key) ?? key;
    return this.adapters.get(canonicalId);
  }

  has(id: string): boolean {
    const key = id.toLowerCase();
    const canonicalId = this.aliases.get(key) ?? key;
    return this.adapters.has(canonicalId);
  }

  getAll(): readonly IPaymentGatewayAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Resuelve y clasifica las pasarelas elegibles para una transacción,
   * según el país de origen del tutor, el país del comprador y los métodos
   * activos configurados por el tutor.
   */
  filterEligibleGateways(params: FilterEligibleParams): FilteredGatewaysResult {
    const tutorCountry = (params.tutorCountry || 'AR').trim().toUpperCase();
    const buyerCountry = (params.buyerCountry || tutorCountry).trim().toUpperCase();
    const activeIds = params.activeTutorGatewayIds || [];

    const localList: IPaymentGatewayAdapter[] = [];
    const globalList: IPaymentGatewayAdapter[] = [];
    const isSameCountry = buyerCountry === tutorCountry;
    const visitedCanonicalIds = new Set<string>();

    for (const rawId of activeIds) {
      const adapter = this.get(rawId);
      if (!adapter) continue;

      const canonicalId = adapter.id.toLowerCase();
      if (visitedCanonicalIds.has(canonicalId)) {
        continue;
      }
      visitedCanonicalIds.add(canonicalId);

      if (adapter.scope === 'LOCAL') {
        // Métodos locales solo aplican si tutor y alumno están en el mismo país
        if (isSameCountry && adapter.isEligible(tutorCountry, buyerCountry)) {
          localList.push(adapter);
        }
      } else if (adapter.scope === 'GLOBAL') {
        // Métodos globales aplican siempre que el adaptador sea elegible
        if (adapter.isEligible(tutorCountry, buyerCountry)) {
          globalList.push(adapter);
        }
      }
    }

    const all = isSameCountry ? [...localList, ...globalList] : [...globalList];

    return {
      local: localList,
      global: globalList,
      all,
      hasCompatibleGateway: all.length > 0,
    };
  }
}

/**
 * Registro predeterminado con los adaptadores oficiales del sistema.
 */
export function createDefaultGatewayRegistry(): PaymentGatewayRegistry {
  const registry = new PaymentGatewayRegistry();
  registry.register(new MercadoPagoAdapter(), ['mp']);
  registry.register(new GetnetAdapter());
  registry.register(new BankTransferAdapter('transfer'), ['bank_transfer', 'transferencia']);
  registry.register(new StripeAdapter());
  registry.register(new PayPalAdapter());
  return registry;
}

export const defaultGatewayRegistry = createDefaultGatewayRegistry();
