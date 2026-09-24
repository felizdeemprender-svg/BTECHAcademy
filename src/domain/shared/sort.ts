/**
 * Paso 0 — Ordenamiento por fecha de creación descendente.
 * Sin fecha van al final (igual que la UI actual con `|| 0`).
 */
export function sortByCreatedAtDesc<T extends { readonly createdAt?: Date }>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) => {
    const timeA = a.createdAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    const timeB = b.createdAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    return timeB - timeA;
  });
}
