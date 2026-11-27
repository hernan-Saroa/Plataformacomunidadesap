/**
 * Cuándo el informe preliminar ya se le envió al área auditada.
 *
 * Antes se daba por enviado si ningún hallazgo seguía en borrador, y con cero hallazgos eso
 * siempre se cumple: una auditoría sin hallazgos aparecía con "Informe Preliminar ya terminado.
 * Área auditada notificada" aunque nadie lo hubiera subido.
 *
 * Ahora cuenta como enviado si:
 * - se subió el informe (marca del checklist que deja "Generar", o el documento guardado), o
 * - la auditoría tiene hallazgos y ya ninguno está en borrador. Así quedan bien las auditorías
 *   que se notificaron antes de que el sistema guardara el archivo del informe.
 */
export function informePreliminarYaEnviado(datos: {
  marcadoEnChecklist?: boolean;
  hayDocumento?: boolean;
  hallazgos: Array<{ estado?: string | null }>;
}): boolean {
  if (datos.marcadoEnChecklist || datos.hayDocumento) return true;
  const { hallazgos } = datos;
  return hallazgos.length > 0
    && !hallazgos.some((h) => String(h.estado || '').toLowerCase() === 'borrador');
}
