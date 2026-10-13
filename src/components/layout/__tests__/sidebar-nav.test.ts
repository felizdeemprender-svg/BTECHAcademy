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
});
