/** Las consultas RUND se revalidan con el servidor y el rol de la sesión actual. */
export function isRundRequest(url: string): boolean {
  return /\/(banco-docentes|macro-docente|docentes-disponibles)(\/|\?|$)/i.test(url);
}

export function excludesRundCache(url: string, data?: unknown): boolean {
  if (isRundRequest(url)) return true;
  // Solo inspeccionar canales que pueden incluir perfiles o documentos RUND.
  if (!/\/(pta|auth)\/api\//i.test(url)) return false;
  const visit = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(visit);
    return Object.entries(value).some(([key, nested]) => {
      const normalized = key.replace(/[^a-z]/gi, '').toLowerCase();
      if (['protecciondatos', 'rundsoporteid', 'documentoidentidad', 'documentnumber',
        'numidentificacion', 'puntajesalarial', 'docenteidentificacion', 'identificacion'].includes(normalized) && nested != null) return true;
      return ((key === 'origen' || key === 'categoria') && String(nested).toLowerCase() === 'rund') || visit(nested);
    });
  };
  return visit(data);
}
