export function hasRundData(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  const text = String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  return !!text && !/^[-–—./\s]+$/.test(text) && !['no', 'no aplica', 'n/a', 'na', 'ninguno', 'ninguna', 'sin informacion', 'sin datos', 'sin dato', 'no registrado', 'no registrada', 'null', 'undefined'].includes(text);
}


const fields: Record<string, string[]> = {
  DOCUMENTO_IDENTIDAD: ['DOCUMENTO_IDENTIDAD'], NOMBRE_COMPLETO: ['NOMBRE_COMPLETO'], GENERO: ['GENERO'],
  SEXO_BIOLOGICO: ['SEXO_BIOLOGICO'], FECHA_NACIMIENTO: ['FECHA_NACIMIENTO'],
  ACTO_ADMINISTRATIVO: ['ACTO_ADMINISTRATIVO'], FECHAS_VINCULACION: ['INICIO_VINCULACION', 'FIN_VINCULACION'],
  DEDICACION: ['DEDICACION'], HORAS_PTA: ['HORAS_PTA'],
  diploma_pregrado: ['TITULO_PREGRADO'], diploma_especializacion: ['TITULO_ESPECIALIZACION'],
  diploma_maestria: ['TITULO_MAESTRIA'], diploma_doctorado: ['TITULO_DOCTORADO'], certificado_posdoctoral: ['TITULO_POSDOCTORADO'],
  convalidacion_men: ['TITULO_PREGRADO', 'TITULO_ESPECIALIZACION', 'TITULO_MAESTRIA', 'TITULO_DOCTORADO', 'TITULO_POSDOCTORADO'],
  hoja_vida_pro: ['PERFIL_ACADEMICO_PRO', 'PERFIL_ACADEMICO'],
  acto_administrativo_vinculacion: ['TIPO_VINCULACION'], resolucion_convocatoria: ['ORIGEN_VINCULACION'],
  acto_administrativo_situacion: ['SITUACION_ADMINISTRATIVA'], acto_adscripcion_territorial: ['TERRITORIAL'],
  resolucion_escalafon: ['CATEGORIA_ESCALAFON'], resolucion_puntaje_salarial: ['PUNTAJE_SALARIAL'],
  acto_asignacion_nucleo: ['NUCLEO_TEMATICO'], certificacion_investigacion: ['INVESTIGACION_ACTIVA'], acta_evaluacion_desempeno: ['ULTIMA_EVALUACION'],
};

export function canUploadRundField(block: string, field: { tipoSoporte: string; revisionId?: string }, tarjeta: any): boolean {
  if (!tarjeta?.docenteId || !field.tipoSoporte) return false;
  if (field.tipoSoporte === 'autorizacion_habeas_data') return true;
  const keys = fields[field.revisionId || field.tipoSoporte] || [];
  return (tarjeta.bloques?.[block]?.campos || []).some((item: any) => keys.includes(item.campo) && !item.restringido && hasRundData(item.valor));
}
