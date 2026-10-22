import { describe, expect, it } from 'vitest';
import { getNavigationSections } from '../sidebar-nav';

describe('SidebarNav Menu Structure', () => {
  it('incluye la sección "Gestión de Cuenta"', () => {
    const sections = getNavigationSections();
    const accountSection = sections.find((s) => s.label === 'Gestión de Cuenta');
    expect(accountSection).toBeDefined();
    expect(accountSection?.items.length).toBeGreaterThan(0);
  });

  it('contiene la entrada "Avatares de Marca" apuntando a /settings/avatars', () => {
    const sections = getNavigationSections();
    const accountSection = sections.find((s) => s.label === 'Gestión de Cuenta');
    const avatarItem = accountSection?.items.find((item) => item.name === 'Avatares de Marca');

    expect(avatarItem).toBeDefined();
    expect(avatarItem?.href).toBe('/settings/avatars');
    expect(avatarItem?.roles).toContain('mentor');
    expect(avatarItem?.roles).toContain('admin');
    expect(avatarItem?.roles).toContain('marketing');
    expect(avatarItem?.roles).toContain('alumno');
    expect(avatarItem?.icon).toBeDefined();
  });

  it('mantiene todas las entradas requeridas en "Gestión de Cuenta" apuntando a /settings/*', () => {
    const sections = getNavigationSections();
    const accountSection = sections.find((s) => s.label === 'Gestión de Cuenta');
    const items = accountSection?.items || [];
    const itemMap = new Map(items.map((i) => [i.name, i.href]));

    expect(itemMap.get('Evo')).toBe('/settings/evo');
    expect(itemMap.get('Mi Perfil')).toBe('/settings/profile');
    expect(itemMap.get('Avatares de Marca')).toBe('/settings/avatars');
    expect(itemMap.get('Mi Plan y Facturación')).toBe('/settings/plan');
    expect(itemMap.get('Métodos de Cobro')).toBe('/settings/payment-methods');
    expect(itemMap.get('Transferencias')).toBe('/settings/transfers');
    expect(itemMap.get('Motores de Publicación')).toBe('/settings/publishing-engines');
  });

  it('incluye la sección "Empresa" con "Tutores de Empresa" apuntando a /company/tutors', () => {
    const sections = getNavigationSections();
    const companySection = sections.find((s) => s.label === 'Empresa');
    expect(companySection).toBeDefined();

    const tutorsItem = companySection?.items.find((item) => item.name === 'Tutores de Empresa');
    expect(tutorsItem).toBeDefined();
    expect(tutorsItem?.href).toBe('/company/tutors');
    expect(tutorsItem?.roles).toContain('empresa');
    expect(tutorsItem?.roles).toContain('admin');
  });

  it('permite acceso al rol empresa en Gestión Académica y Alumnos', () => {
    const sections = getNavigationSections();
    const adminCoursesSection = sections.find((s) => s.label === 'Admin de Cursos');
    expect(adminCoursesSection).toBeDefined();

    const coursesManage = adminCoursesSection?.items.find((i) => i.href === '/courses/manage');
    expect(coursesManage?.roles).toContain('empresa');

    const students = adminCoursesSection?.items.find((i) => i.href === '/mentoria/alumnos');
    expect(students?.roles).toContain('empresa');
  });

  it('filtra opciones administradas por la empresa en Gestión de Cuenta para tutores de empresa', () => {
    const corporateTutorProfile = {
      uid: 'tutor_123',
      email: 'tutor@empresa.com',
      roles: ['mentor', 'marketing'],
      companyRole: 'tutor',
      companyId: 'company_abc',
    };

    const sections = getNavigationSections(corporateTutorProfile);
    const accountSection = sections.find((s) => s.label === 'Gestión de Cuenta');
    expect(accountSection).toBeDefined();

    const itemHrefs = (accountSection?.items || []).map((i) => i.href);

    // Solo conserva "Mi Perfil"
    expect(itemHrefs).toContain('/settings/profile');
    expect(itemHrefs.length).toBe(1);

    // Opciones restringidas administradas por la empresa
    expect(itemHrefs).not.toContain('/settings/evo');
    expect(itemHrefs).not.toContain('/settings/avatars');
    expect(itemHrefs).not.toContain('/settings/plan');
    expect(itemHrefs).not.toContain('/settings/payment-methods');
    expect(itemHrefs).not.toContain('/settings/transfers');
    expect(itemHrefs).not.toContain('/settings/publishing-engines');
  });

  it('mantiene todas las opciones de Gestión de Cuenta para mentores independientes y dueños de empresa', () => {
    const independentMentor = {
      uid: 'mentor_indep',
      email: 'mentor@independiente.com',
      roles: ['mentor'],
    };

    const sections = getNavigationSections(independentMentor);
    const accountSection = sections.find((s) => s.label === 'Gestión de Cuenta');
    expect(accountSection).toBeDefined();

    const itemHrefs = (accountSection?.items || []).map((i) => i.href);
    expect(itemHrefs).toContain('/settings/evo');
    expect(itemHrefs).toContain('/settings/profile');
    expect(itemHrefs).toContain('/settings/avatars');
    expect(itemHrefs).toContain('/settings/plan');
    expect(itemHrefs).toContain('/settings/payment-methods');
    expect(itemHrefs).toContain('/settings/transfers');
    expect(itemHrefs).toContain('/settings/publishing-engines');
  });
});
