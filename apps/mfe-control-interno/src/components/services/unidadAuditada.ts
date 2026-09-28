/**
 * Cómo se nombra a la unidad auditada en los oficios del informe (EFDS-1090).
 *
 * Vive aparte del servicio de PDF porque ese se carga en diferido y el mapeo de
 * datos de la etapa de Comunicación necesita el nombre desde el primer render.
 */

/** Si la auditoría es de una territorial y no de Sede Central o de un área institucional */
export function esAuditoriaTerritorial(territorial?: string): boolean {
  const terr = (territorial || '').trim();
  return !!terr && !/^sede\b/i.test(terr);
}

/**
 * Nombre completo de la territorial: "Antioquia" y "Territorial Antioquia" se
 * escriben "Dirección Territorial Antioquia" en el destinatario, el asunto y el
 * cuerpo del oficio.
 */
export function nombreDireccionTerritorial(territorial?: string): string {
  const texto = (territorial || '').trim();
  if (!texto) return '';
  if (/^direcci[oó]n\s+territorial\b/i.test(texto)) return texto;
  if (/^sede\b/i.test(texto)) return texto;
  return `Dirección Territorial ${texto.replace(/^territorial\s+/i, '')}`;
}

/**
 * Nombre de la unidad auditada. Solo se completa cuando el texto es el de la
 * territorial de la auditoría; Sede Central y las áreas institucionales
 * (Gestión Financiera, Talento Humano…) se dejan como están.
 */
export function nombreUnidadAuditada(valor?: string, territorial?: string): string {
  const texto = (valor || '').trim();
  const terr = (territorial || '').trim();
  if (!texto) return '';
  if (/^sede\b/i.test(texto)) return texto;
  const esTerritorial =
    /^(direcci[oó]n\s+)?territorial\s+/i.test(texto) ||
    (!!terr && texto.localeCompare(terr, 'es', { sensitivity: 'base' }) === 0);
  return esTerritorial ? nombreDireccionTerritorial(texto) : texto;
}
