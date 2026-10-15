import { BadRequestException } from '@nestjs/common';
import { AuthIdentityClient } from '../../common/auth-identity.client';

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

export async function assertRundEvidenceData(query: { query: (...args: any[]) => Promise<any> }, docenteId: string,
  identities: Pick<AuthIdentityClient, 'fichaPorPersona'>, type?: string, campo?: string) {
  // General attachments and workflow documents do not represent a profile-data row.
  if (!type || ['autorizacion_habeas_data', 'soporte_edicion_perfil', 'soporte_cambio_estado_perfil'].includes(type)) return;
  const rows = fields[type];
  if (!rows || (campo && !rows[campo])) throw new BadRequestException('El soporte no corresponde a una fila válida.');
  const [profile] = await query.query(`SELECT d.* FROM rund."Docente" d WHERE d.id::text = $1`, [docenteId]);
  const keys = campo ? rows[campo] : Object.values(rows).flat();
  const identityFields = ['num_identificacion', 'nom_largo', 'gen_tercero', 'fec_nacimiento'] as const;
  if (profile && keys.some(key => (identityFields as readonly string[]).includes(key))) {
    const persona = await identities.fichaPorPersona(profile.personaId);
    // La ausencia confirmada conserva el LEFT JOIN; los fallos del propietario se propagan.
    for (const field of identityFields) profile[field] = persona?.[field] ?? null;
  }
  if (!profile || !keys.some(key => hasRundData(profile[key]))) {
    throw new BadRequestException('Registre primero el dato de la fila antes de cargar o reemplazar su soporte.');
  }
}
