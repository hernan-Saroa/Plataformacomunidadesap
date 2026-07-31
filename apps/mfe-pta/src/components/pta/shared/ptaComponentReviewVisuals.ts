// Estilos de badge para el estado de REVISIÓN de un componente/subsección
// (etapa previa a la aprobación). Se mantiene separado de ptaStatusVisuals.ts
// porque ese archivo describe el estado GLOBAL del PTA, no el estado por
// componente que vive en PtaComponentReview.

export type ReviewEstado = 'pendiente' | 'revisado' | 'devuelto';

export interface ReviewVisual {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export const REVIEW_STATUS_VISUALS: Record<ReviewEstado, ReviewVisual> = {
  pendiente: { label: 'Pendiente de revisión', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  revisado: { label: 'Revisado', color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4' },
  devuelto: { label: 'Devuelto en revisión', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
};

/**
 * Estado agregado "En Revisión" para el componente completo (badge de lista /
 * popover), cuando falta al menos una sub-revisión requerida. Reutiliza la
 * misma familia de color morado que REVISION_DOCENTE_N1/N2 en
 * ptaStatusVisuals.ts para mantener consistencia visual.
 */
export const COMPONENT_ESTADO_EN_REVISION: ReviewVisual = {
  label: 'En Revisión',
  color: '#7E22CE',
  bg: '#FAF5FF',
  border: '#D8B4FE',
};

export function getReviewStatusVisual(estado: string | null | undefined): ReviewVisual {
  return REVIEW_STATUS_VISUALS[(estado as ReviewEstado) || 'pendiente'] || REVIEW_STATUS_VISUALS.pendiente;
}
