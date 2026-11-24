/** Las etapas macro que lleva el cronograma de la 5.2 (135). */
export const ETAPAS_DEL_CRONOGRAMA = [5, 6, 7, 8, 9, 10] as const;

export const NOMBRE_ETAPA: Record<number, string> = {
  5: 'Elaboración y publicación del proceso',
  6: 'Recepción y evaluación de ofertas',
  7: 'Adjudicación',
  8: 'Perfeccionamiento y legalización',
  9: 'Ejecución y supervisión',
  10: 'Seguimiento, control y liquidación',
};
