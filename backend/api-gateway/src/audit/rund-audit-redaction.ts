export function isRundAuditUrl(url: string): boolean {
  return /\/(?:banco-docentes|macro-docente|docentes-disponibles|autogestion\/docentes)(?:\/|\?|$)/i.test(url);
}

/** Los logs de infraestructura conservan la operación, sin tokens, consultas ni cédulas en la URL. */
export function redactRundAuditUrl(url: string): string {
  if (!isRundAuditUrl(url)) return url;
  return url.split('?')[0]
    .replace(/\/(drafts|submit|me|externo)\/[^/]+/gi, '/$1/[REDACTED]')
    .replace(/\/banco-docentes\/(\d[\d.]{4,})(?=\/|$)/gi, '/banco-docentes/[DOCUMENTO]');
}
