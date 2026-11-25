import { describe, expect, it, vi } from 'vitest';
import type { FirestoreGateway } from '@/data/firestore/gateway';

describe('Cross-Journey Administración de Usuarios: Ciclo Integral y Matriz de Operaciones', () => {
  const superAdminEmail = 'felizdeemprender@gmail.com';
  const superAdminUid = 'super_admin_001';
  const targetUserUid = 'user_target_555';
  const companyOwnerUid = 'empresa_owner_88';
  const companyId = 'company_acme_corp';

  function createUsersStore() {
    const users = new Map<string, any>([
      [superAdminUid, {
        id: superAdminUid,
        email: superAdminEmail,
        displayName: 'Super Admin',
        roles: ['admin'],
        isActive: true,
      }],
      [companyOwnerUid, {
        id: companyOwnerUid,
        email: 'ceo@acme.com',
        displayName: 'CEO Acme',
        roles: ['empresa'],
        companyId,
        companyRole: 'owner',
        isActive: true,
      }],
    ]);

    const gateway: FirestoreGateway = {
      getDoc: vi.fn().mockImplementation(async (col: string, id: string) => {
        if (col !== 'users') return null;
        const u = users.get(id);
        if (!u) return null;
        return { exists: true, id, data: () => u };
      }),
      createDoc: vi.fn().mockImplementation(async (col: string, id: string, data: any) => {
        users.set(id, { id, ...data });
      }),
      updateDoc: vi.fn().mockImplementation(async (col: string, id: string, patch: any) => {
        const u = users.get(id);
        if (!u) throw new Error('User not found');
        users.set(id, { ...u, ...patch });
      }),
      deleteDoc: vi.fn().mockImplementation(async (col: string, id: string) => {
        users.delete(id);
      }),
      queryByField: vi.fn().mockImplementation(async (col: string, field: string, value: any) => {
        const docs: any[] = [];
        for (const [id, doc] of users.entries()) {
          if (doc[field] === value) docs.push({ exists: true, id, data: () => doc });
        }
        return { docs };
      }),
      serverTimestamp: vi.fn().mockImplementation(() => new Date()),
    } as unknown as FirestoreGateway;

    return { gateway, users };
  }

  it('Valida cada una de las operaciones posibles sobre un usuario en la plataforma', async () => {
    const { gateway, users } = createUsersStore();

    // =========================================================================
    // 1. ALTA MANUAL DE USUARIO (Creación)
    // =========================================================================
    const initialUserData = {
      email: 'carlos.tutor@gmail.com',
      displayName: 'Carlos Nuevo',
      roles: ['alumno'],
      isActive: true,
      createdAt: new Date().toISOString(),
      createdVia: 'admin_panel',
    };

    await gateway.createDoc('users', targetUserUid, initialUserData);

    const userDoc = users.get(targetUserUid);
    expect(userDoc).toBeDefined();
    expect(userDoc.roles).toEqual(['alumno']);
    expect(userDoc.isActive).toBe(true);

    // =========================================================================
    // 2. PROMOCIÓN DE ROL Y ASIGNACIÓN DE SUB-PERMISOS GRANULARES
    // =========================================================================
    // Ascender de alumno a mentor con sub-permisos académicos y de marketing
    const academicPermissions = ['academic_management', 'mentor_challenges', 'students_view', 'followups_management'];
    const marketingPermissions = ['marketing_campaigns', 'video_creation'];
    const fullMentorPermissions = [...academicPermissions, ...marketingPermissions];

    await gateway.updateDoc('users', targetUserUid, {
      roles: ['mentor'],
      mentorPermissions: fullMentorPermissions,
      updatedAt: new Date().toISOString(),
    });

    const upgradedUser = users.get(targetUserUid);
    expect(upgradedUser.roles).toContain('mentor');
    expect(upgradedUser.mentorPermissions).toHaveLength(6);
    expect(upgradedUser.mentorPermissions).toContain('mentor_challenges');
    expect(upgradedUser.mentorPermissions).toContain('video_creation');

    // =========================================================================
    // 3. ASIGNACIÓN A ORGANIZACIÓN / EMPRESA
    // =========================================================================
    await gateway.updateDoc('users', targetUserUid, {
      companyId,
      companyRole: 'member',
      assignedBy: companyOwnerUid,
    });

    const companyUser = users.get(targetUserUid);
    expect(companyUser.companyId).toBe(companyId);
    expect(companyUser.companyRole).toBe('member');

    // =========================================================================
    // 4. SUSPENSIÓN (BLOQUEO) Y REACTIVACIÓN OPERATIVA
    // =========================================================================
    // 4.1 Bloqueo temporal por mora o infracción
    await gateway.updateDoc('users', targetUserUid, {
      isActive: false,
      suspendedReason: 'Revisión administrativa preventiva',
    });
    expect(users.get(targetUserUid).isActive).toBe(false);

    // 4.2 Reactivación de la cuenta
    await gateway.updateDoc('users', targetUserUid, {
      isActive: true,
      suspendedReason: null,
    });
    expect(users.get(targetUserUid).isActive).toBe(true);

    // =========================================================================
    // 5. ASIGNACIÓN Y GESTIÓN DEL PLAN DE FACTURACIÓN / SUSCRIPCIÓN
    // =========================================================================
    await gateway.updateDoc('users', targetUserUid, {
      subscription: {
        planId: 'pro',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        gateway: 'mercadopago',
      },
    });

    const userWithPlan = users.get(targetUserUid);
    expect(userWithPlan.subscription?.planId).toBe('pro');
    expect(userWithPlan.subscription?.status).toBe('active');

    // =========================================================================
    // 6. GOBERNANZA DE SEGURIDAD Y BAJA (ELIMINACIÓN)
    // =========================================================================
    // Simulación de control de autorización: Solo super admin puede eliminar
    const canDeleteUser = (callerEmail: string) => callerEmail.toLowerCase() === superAdminEmail.toLowerCase();

    expect(canDeleteUser('otro.usuario@test.com')).toBe(false);
    expect(canDeleteUser(superAdminEmail)).toBe(true);

    // Ejecución de borrado administrativo
    await gateway.deleteDoc('users', targetUserUid);
    expect(users.has(targetUserUid)).toBe(false);
  });

  // =========================================================================
  // SALIDAS POR ERRORES ESPERADOS (Negative Paths)
  // =========================================================================

  it('(-) Error Esperado 4.1: Anti-Escalamiento: Usuario común intentando auto-adjudicarse rol "admin" debe ser bloqueado', () => {
    const callerRoles = ['mentor'];
    const requestedRoles = ['mentor', 'admin'];

    const validateRoleAssignment = (callerRoleList: string[], targetRoleList: string[]) => {
      const isCallerSuperAdmin = callerRoleList.includes('admin');
      if (targetRoleList.includes('admin') && !isCallerSuperAdmin) {
        throw new Error('No autorizado: Solo el Super Admin puede asignar el rol admin');
      }
    };

    expect(() => validateRoleAssignment(callerRoles, requestedRoles)).toThrow(
      'No autorizado: Solo el Super Admin puede asignar el rol admin'
    );
  });

  it('(-) Error Esperado 4.2: Usuario con isActive: false (Suspendido) debe ser bloqueado en operaciones operativas', async () => {
    const { gateway, users } = createUsersStore();
    const suspendedUid = 'user_suspended_101';
    await gateway.createDoc('users', suspendedUid, {
      email: 'suspendido@test.com',
      isActive: false,
      roles: ['mentor'],
    });

    const checkUserOperational = (userData: any) => {
      if (userData?.isActive === false) {
        throw new Error('Cuenta suspendida temporalmente por administración');
      }
    };

    const doc = users.get(suspendedUid);
    expect(() => checkUserOperational(doc)).toThrow('Cuenta suspendida temporalmente');
  });
});
