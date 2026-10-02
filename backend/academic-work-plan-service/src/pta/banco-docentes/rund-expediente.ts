/** Carpetas físicas; independientes del catálogo y de los bloques de revisión. */
export const RUND_STANDARD_FOLDERS = [
  'IDENTIDAD', 'FORMACION', 'EXPERIENCIA', 'ACTOS_ADMINISTRATIVOS', 'EVALUACIONES',
] as const;

export function isTechnicalRundSupport(type?: string | null): boolean {
  return ['soporte_edicion_perfil', 'soporte_cambio_estado_perfil'].includes(type || '');
}

export function rundDocumentFolder(category: string, supportType?: string): string {
  if (isTechnicalRundSupport(supportType)) return 'ACTOS_ADMINISTRATIVOS';
  if (supportType === 'acta_evaluacion_desempeno') return 'EVALUACIONES';
  const mapping: Record<string, string> = {
    IDENTIDAD: 'IDENTIDAD', TITULOS: 'FORMACION', FORMACION: 'FORMACION',
    EXPERIENCIA: 'EXPERIENCIA', EVALUACIONES: 'EVALUACIONES',
    CONTRATOS: 'ACTOS_ADMINISTRATIVOS', RESOLUCIONES: 'ACTOS_ADMINISTRATIVOS',
    ACTOS_ADMINISTRATIVOS: 'ACTOS_ADMINISTRATIVOS',
  };
  // Las categorías complementarias conservan su identidad; no se adivina la
  // clasificación de certificados históricos que pueden tener varias finalidades.
  return mapping[category] || category;
}
