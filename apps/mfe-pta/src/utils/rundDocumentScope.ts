export const RUND_BLOCK_LABELS: Record<string, string> = {
  IDENTIDAD: 'Identidad', CONTACTO: 'Contacto', FORMACION: 'Formación Académica',
  VINCULACION: 'Vinculación', ACADEMICO: 'Académico', TRANSVERSAL: 'Transversal',
};

const supportBlocks: Record<string, string> = {
  documento_identidad: 'IDENTIDAD', cedula_extranjeria: 'IDENTIDAD', pasaporte: 'IDENTIDAD',
  diploma_pregrado: 'FORMACION', acta_grado_pregrado: 'FORMACION',
  diploma_especializacion: 'FORMACION', acta_grado_especializacion: 'FORMACION',
  diploma_maestria: 'FORMACION', acta_grado_maestria: 'FORMACION',
  diploma_doctorado: 'FORMACION', acta_grado_doctorado: 'FORMACION',
  certificado_posdoctoral: 'FORMACION', convalidacion_men: 'FORMACION', hoja_vida_pro: 'FORMACION',
  contrato: 'VINCULACION', acto_administrativo_vinculacion: 'VINCULACION',
  resolucion_convocatoria: 'VINCULACION', acto_administrativo_dedicacion: 'VINCULACION',
  acto_administrativo_situacion: 'VINCULACION', acto_adscripcion_territorial: 'VINCULACION',
  resolucion_escalafon: 'VINCULACION', resolucion_puntaje_salarial: 'VINCULACION',
  acto_asignacion_nucleo: 'ACADEMICO', certificacion_investigacion: 'ACADEMICO', acta_evaluacion_desempeno: 'ACADEMICO',
  autorizacion_habeas_data: 'TRANSVERSAL', soporte_edicion_perfil: 'TRANSVERSAL', soporte_cambio_estado_perfil: 'TRANSVERSAL',
};

/** La pertenencia registrada prevalece; la categoría de un anexo no lo convierte en soporte de una sección. */
export function rundDocumentBlock(document: { bloque?: string | null; tipoSoporte?: string | null; tipo_soporte?: string | null }): string | null {
  const block = String(document.bloque || '').trim().toUpperCase();
  if (RUND_BLOCK_LABELS[block]) return block;
  const type = String(document.tipoSoporte || document.tipo_soporte || '').trim().toLowerCase();
  return supportBlocks[type] || null;
}
