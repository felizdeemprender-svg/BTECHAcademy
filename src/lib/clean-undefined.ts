export const cleanUndefined = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(v => v === undefined ? null : cleanUndefined(v));
  if (obj && typeof obj === 'object') {
    // Evitar objetos del sistema de Firebase, Fechas y Elementos React
    if (obj.constructor && obj.constructor.name === 'Timestamp') return obj;
    if (obj.constructor && obj.constructor.name === 'FieldValue') return obj;
    if (obj.$$typeof) return obj;
    if (obj instanceof Date) return obj;

    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanUndefined(v)])
    );
  }
  return obj;
};
