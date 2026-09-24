/**
 * F1.3 (TDD rojo) — UCs de commerce para influencers + payment-options:
 * `promoteInfluencer` (verificación mentor, búsqueda por email, asociación
 * con merge + arrayUnion, modo searchOnly) y `listReferrals` (referidos +
 * landings + leads con stats), más `listPaymentOptions` (sanitizado sin
 * secretos). Misma semántica que los routes legacy.
 */
import { describe, expect, it } from 'vitest';

import { promoteInfluencer } from '../promote-influencer';
import { listReferrals } from '../list-referrals';
import { listPaymentOptions } from '../list-payment-options';
import type {
  InfluencerRepository,
  InfluencerUserSnapshot,
  NewReferidoDoc,
  ReferidoLeadSnapshot,
  ReferidoPageSnapshot,
  ReferidoSnapshot,
} from '../../influencer-repository';
import type {
  PaymentMethodRepository,
  TutorPaymentMethodSnapshot,
} from '../../payment-method-repository';

function user(id: string, data: Record<string, unknown>): InfluencerUserSnapshot {
  return { id, data };
}

function stubInfluencers() {
  const saved: { mentorUid: string; targetUid: string; doc: NewReferidoDoc }[] = [];
  const roleAdds: { targetUid: string; mentorUid: string }[] = [];
  const repo: InfluencerRepository = {
    findMentorById: async (uid: string) =>
      uid === 'mentor-1' ? user('mentor-1', { roles: ['mentor'] }) : null,
    hasMentorRoleDocument: async (uid: string) => uid === 'mentor-1',
    findUserByEmail: async (email: string) =>
      email === 'ref@x.com' ? user('user-9', { displayName: 'Ref', email: 'ref@x.com', photoURL: null }) : null,
    findAssociation: async (mentorUid: string, targetUid: string) => {
      const found: ReferidoSnapshot | null =
        mentorUid === 'mentor-1' && targetUid === 'user-9'
          ? { id: 'user-9', data: { displayName: 'Ref' } }
          : null;
      return found;
    },
    saveAssociation: async (mentorUid: string, targetUid: string, doc: NewReferidoDoc) => {
      saved.push({ mentorUid, targetUid, doc });
    },
    addReferidoRole: async (targetUid: string, mentorUid: string) => {
      roleAdds.push({ targetUid, mentorUid });
    },
    listReferidos: async () => [{ id: 'user-9', data: { displayName: 'Ref', email: 'ref@x.com', photoURL: null } }],
    listSalesPagesByMentor: async (): Promise<ReferidoPageSnapshot[]> => [
      { id: 'page-1', mentorId: 'mentor-1', referidoId: 'user-9' },
      { id: 'page-2', mentorId: 'mentor-1', referidoId: null },
    ],
    listLeadsByLandingIds: async (): Promise<ReferidoLeadSnapshot[]> => [
      { referidoId: 'user-9', status: 'new' },
      { referidoId: 'user-9', status: 'converted' },
    ],
  };
  return { repo, saved, roleAdds };
}

function legacyBody(result: { ok: false; error: { details?: unknown } }): { status: number; body: Record<string, unknown> } {
  return result.error.details as { status: number; body: Record<string, unknown> };
}

describe('promoteInfluencer', () => {
  it('faltantes → 400 mentorUid and targetEmail are required', async () => {
    const { repo } = stubInfluencers();
    const result = await promoteInfluencer(repo, { mentorUid: '', targetEmail: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const { status, body } = legacyBody(result);
    expect(status).toBe(400);
    expect(body).toEqual({ error: 'mentorUid and targetEmail are required' });
  });

  it('mentor inexistente → 404 Mentor not found', async () => {
    const { repo } = stubInfluencers();
    const result = await promoteInfluencer(repo, { mentorUid: 'nadie', targetEmail: 'ref@x.com' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(legacyBody(result)).toEqual({ status: 404, body: { error: 'Mentor not found' } });
  });

  it('no-mentor → 403 Only mentors can promote influencers', async () => {
    const { repo } = stubInfluencers();
    const noMentor: InfluencerRepository = {
      ...repo,
      findMentorById: async (uid: string) => user(uid, { roles: ['student'] }),
      hasMentorRoleDocument: async () => false,
    };
    const result = await promoteInfluencer(noMentor, { mentorUid: 'user-1', targetEmail: 'ref@x.com' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(legacyBody(result)).toEqual({ status: 403, body: { error: 'Only mentors can promote influencers' } });
  });

  it('email inexistente → 404 No user found with that email (normaliza email)', async () => {
    const { repo } = stubInfluencers();
    const result = await promoteInfluencer(repo, { mentorUid: 'mentor-1', targetEmail: '  NADIE@x.com ' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(legacyBody(result)).toEqual({ status: 404, body: { error: 'No user found with that email' } });
  });

  it('searchOnly no escribe y reporta alreadyAssociated', async () => {
    const { repo, saved, roleAdds } = stubInfluencers();
    const result = await promoteInfluencer(repo, { mentorUid: 'mentor-1', targetEmail: 'ref@x.com', searchOnly: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      success: true,
      alreadyAssociated: true,
      user: { uid: 'user-9', displayName: 'Ref', email: 'ref@x.com', photoURL: null },
    });
    expect(saved).toEqual([]);
    expect(roleAdds).toEqual([]);
  });

  it('promote escribe asociación + rol y responde alreadyAssociated:false', async () => {
    const { repo, saved, roleAdds } = stubInfluencers();
    const result = await promoteInfluencer(repo, { mentorUid: 'mentor-1', targetEmail: ' REF@x.com ' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.success).toBe(true);
    expect(result.value.alreadyAssociated).toBe(false);
    expect(saved.length).toBe(1);
    expect(saved[0].doc.addedByMentorId).toBe('mentor-1');
    expect(roleAdds).toEqual([{ targetUid: 'user-9', mentorUid: 'mentor-1' }]);
  });
});

describe('listReferrals', () => {
  it('enriquece con landings asignadas + leads totales/convertidos', async () => {
    const { repo } = stubInfluencers();
    const result = await listReferrals(repo, { mentorUid: 'mentor-1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      influencers: [
        {
          uid: 'user-9',
          name: 'Ref',
          email: 'ref@x.com',
          photoURL: null,
          totalLeads: 2,
          convertedLeads: 1,
          assignedLandings: 1,
        },
      ],
    });
  });

  it('sin referidos → influencers:[]', async () => {
    const { repo } = stubInfluencers();
    const empty: InfluencerRepository = { ...repo, listReferidos: async () => [] };
    const result = await listReferrals(empty, { mentorUid: 'mentor-1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ influencers: [] });
  });

  it('sin mentorUid → 400 mentorUid is required', async () => {
    const { repo } = stubInfluencers();
    const result = await listReferrals(repo, { mentorUid: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(legacyBody(result)).toEqual({ status: 400, body: { error: 'mentorUid is required' } });
  });
});

function stubPayments(methods: TutorPaymentMethodSnapshot[]) {
  const payments: Pick<PaymentMethodRepository, 'listActiveTutorMethods'> = {
    listActiveTutorMethods: async () => methods,
  };
  return payments;
}

describe('listPaymentOptions', () => {
  it('sanitiza: MP solo publicKey, transfer solo alias/cbu/banco/titular', async () => {
    const payments = stubPayments([
      { id: 'm1', name: 'MP', type: 'mercadopago', isActive: true, config: { publicKey: 'pk', accessToken: 'SECRET' } },
      {
        id: 'm2',
        name: 'Transf',
        type: 'transfer',
        isActive: true,
        config: { alias: 'A', cbu: 'C', bankName: 'B', titularName: 'T', secret: 'X' },
      },
    ]);
    const result = await listPaymentOptions(payments, { mentorId: 'tutor-1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      methods: [
        { id: 'm1', name: 'MP', type: 'mercadopago', config: { publicKey: 'pk' } },
        { id: 'm2', name: 'Transf', type: 'transfer', config: { alias: 'A', cbu: 'C', bankName: 'B', titularName: 'T' } },
      ],
    });
  });

  it('sin mentorId → 400 mentorId requerido', async () => {
    const payments = stubPayments([]);
    const result = await listPaymentOptions(payments, { mentorId: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(legacyBody(result)).toEqual({ status: 400, body: { error: 'mentorId requerido' } });
  });
});
