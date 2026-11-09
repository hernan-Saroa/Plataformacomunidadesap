import { BadRequestException } from '@nestjs/common';

/** CC, CE y pasaporte acreditan las mismas filas de identidad y comparten un solo punto de control. */
export const IDENTITY_TYPES = ['documento_identidad', 'cedula_extranjeria', 'pasaporte'];
/**
 * Soportes de la codificación documental del GGP que no acreditan un campo del perfil RUND: son opcionales,
 * no exigen dato previo y no entran en las reglas de obligatoriedad de los bloques ya aprobados.
 */
export const STANDALONE_SUPPORT_TYPES: Record<string, string[]> = {
  IDENTIDAD: ['tarjeta_profesional', 'hoja_vida'],
  FORMACION: ['diploma_bachiller'],
  ACADEMICO: ['experiencia_docente', 'experiencia_laboral', 'experiencia_investigativa', 'productividad_academica', 'dominio_segunda_lengua', 'formacion_no_formal', 'estudio_hoja_vida'],
};
/** Categoría documental de cada soporte de la codificación; todas existen en el catálogo (migraciones 422, 665 y 678). */
export function standaloneSupportCategory(type?: string | null): string | null {
  if (['tarjeta_profesional', 'hoja_vida'].includes(type || '')) return 'IDENTIDAD';
  if (type === 'diploma_bachiller') return 'TITULOS';
  if (['experiencia_docente', 'experiencia_laboral', 'experiencia_investigativa'].includes(type || '')) return 'EXPERIENCIA';
  if (['productividad_academica', 'dominio_segunda_lengua', 'formacion_no_formal', 'estudio_hoja_vida'].includes(type || '')) return 'CERTIFICADOS';
  return null;
}
export const isStandaloneSupport = (type?: string | null) => Object.values(STANDALONE_SUPPORT_TYPES).some(types => types.includes(type || ''));

export function hasRundData(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  const text = String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  return !!text && !/^[-–—./\s]+$/.test(text) && !['no', 'no aplica', 'n/a', 'na', 'ninguno', 'ninguna', 'sin informacion', 'sin datos', 'sin dato', 'no registrado', 'no registrada', 'null', 'undefined'].includes(text);
}

const identity = {
  DOCUMENTO_IDENTIDAD: ['num_identificacion'], NOMBRE_COMPLETO: ['nom_largo'],
  GENERO: ['gen_tercero'], SEXO_BIOLOGICO: ['sexoBiologico', 'gen_tercero'], FECHA_NACIMIENTO: ['fec_nacimiento'],
};
const titles = ['pregrado', 'especializacion', 'maestria', 'doctorado', 'posDoctorado'];
const fields: Record<string, Record<string, string[]>> = {
  documento_identidad: identity, cedula_extranjeria: identity, pasaporte: identity,
  diploma_pregrado: { diploma_pregrado: ['pregrado'] }, acta_grado_pregrado: { acta_grado_pregrado: ['pregrado'] },
  diploma_especializacion: { diploma_especializacion: ['especializacion'] }, acta_grado_especializacion: { acta_grado_especializacion: ['especializacion'] },
  diploma_maestria: { diploma_maestria: ['maestria'] }, acta_grado_maestria: { acta_grado_maestria: ['maestria'] },
  diploma_doctorado: { diploma_doctorado: ['doctorado'] }, acta_grado_doctorado: { acta_grado_doctorado: ['doctorado'] },
  certificado_posdoctoral: { certificado_posdoctoral: ['posDoctorado'] },
  convalidacion_men: { convalidacion_men: titles },
  hoja_vida_pro: { hoja_vida_pro: ['perfilAcademicoPro', 'perfilAcademico'] },
  acto_administrativo_vinculacion: { acto_administrativo_vinculacion: ['vinculacionDisplay', 'tipoVinculacion'] },
  resolucion_convocatoria: { resolucion_convocatoria: ['origenVinculacion'] },
  contrato: { ACTO_ADMINISTRATIVO: ['actoAdministrativoVinculacion'], FECHAS_VINCULACION: ['fechaInicioVinculacion', 'fechaFinVinculacion'] },
  acto_administrativo_dedicacion: { DEDICACION: ['dedicacionDisplay', 'dedicacion'], HORAS_PTA: ['horasAsignables'] },
  acto_administrativo_situacion: { acto_administrativo_situacion: ['situacionAdministrativa'] },
  acto_adscripcion_territorial: { acto_adscripcion_territorial: ['territorialReportada', 'territorialId'] },
  resolucion_escalafon: { resolucion_escalafon: ['escalafon'] },
  resolucion_puntaje_salarial: { resolucion_puntaje_salarial: ['puntajeSalarial'] },
  acto_asignacion_nucleo: { acto_asignacion_nucleo: ['nucleoTematico'] },
  certificacion_investigacion: { certificacion_investigacion: ['investigacion'] },
  acta_evaluacion_desempeno: { acta_evaluacion_desempeno: ['ultimaEvaluacion'] },
};

export async function assertRundEvidenceData(query: { query: (...args: any[]) => Promise<any> }, docenteId: string, type?: string, campo?: string) {
  // General attachments and workflow documents do not represent a profile-data row.
  if (!type || isStandaloneSupport(type) || ['autorizacion_habeas_data', 'soporte_edicion_perfil', 'soporte_cambio_estado_perfil'].includes(type)) return;
  const rows = fields[type];
  if (!rows || (campo && !rows[campo])) throw new BadRequestException('El soporte no corresponde a una fila válida.');
  const [profile] = await query.query(`SELECT d.*, p.num_identificacion, p.nom_largo, p.gen_tercero, p.fec_nacimiento
    FROM academic_work_plan."Docente" d LEFT JOIN auth.personas p ON p.id_person = d."personaId"
    WHERE d.id::text = $1`, [docenteId]);
  const keys = campo ? rows[campo] : Object.values(rows).flat();
  if (!profile || !keys.some(key => hasRundData(profile[key]))) {
    throw new BadRequestException('Registre primero el dato de la fila antes de cargar o reemplazar su soporte.');
  }
}
