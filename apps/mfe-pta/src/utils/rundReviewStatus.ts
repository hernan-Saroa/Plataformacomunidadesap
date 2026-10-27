export const RUND_REVIEW_BLOCKS = ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'] as const;
export const RUND_REQUIRED_BLOCKS = RUND_REVIEW_BLOCKS.filter(block => block !== 'CONTACTO');

export function rundReviewStatus(completitud: Record<string, string> = {}) {
  const count = RUND_REQUIRED_BLOCKS.filter(block => completitud[block] === 'Aprobado').length;
  const returned = RUND_REVIEW_BLOCKS.some(block => completitud[block] === 'Devuelto');
  const approved = count === RUND_REQUIRED_BLOCKS.length && !returned;
  return { approved, count, total: RUND_REQUIRED_BLOCKS.length, returned,
    label: approved ? 'Perfil RUND aprobado' : returned ? 'Pendiente de corrección' : 'Pendiente de aprobación' };
}
