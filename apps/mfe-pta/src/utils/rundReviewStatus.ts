export const RUND_REVIEW_BLOCKS = ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL',
  'EXPERIENCIA_DOCENTE', 'EXPERIENCIA_LABORAL', 'PRODUCTIVIDAD_ACADEMICA', 'SEGUNDA_LENGUA', 'FORMACION_NO_FORMAL', 'ESTUDIO_HOJA_VIDA', 'DOCUMENTOS_NO_VALIDOS'] as const;
// La activación del perfil no cambia con la codificación documental: siguen siendo estos cinco bloques (espejo del backend).
export const RUND_REQUIRED_BLOCKS = ['IDENTIDAD', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'] as const;

export function rundReviewStatus(completitud: Record<string, string> | null = {}) {
  completitud = completitud || {};
  const count = RUND_REQUIRED_BLOCKS.filter(block => completitud[block] === 'Aprobado').length;
  const returned = RUND_REVIEW_BLOCKS.some(block => completitud[block] === 'Devuelto');
  const approved = count === RUND_REQUIRED_BLOCKS.length && !returned;
  return { approved, count, total: RUND_REQUIRED_BLOCKS.length, returned,
    label: approved ? 'Perfil RUND aprobado' : returned ? 'Pendiente de corrección' : 'Pendiente de revisión',
    description: approved ? 'Las cinco secciones de datos del perfil están aprobadas.' : returned
      ? 'El revisor devolvió datos o un bloque para corregir. Consulta el motivo en el expediente.'
      : 'La revisión de los datos aún no ha finalizado. Adjuntar soportes es opcional.',
  };
}
