import { createHash } from 'crypto';
import { hasRundData } from './rund-evidence-data';

type DataField = { id: string; keys: string[]; types: string[]; required?: boolean; formal?: boolean };
const field = (id: string, keys: string[], type = '', required = false, formal = false): DataField => ({
  id, keys, types: type === 'documento_identidad' ? ['documento_identidad','cedula_extranjeria','pasaporte'] : type ? [type] : [], required, formal,
});
/** A source accredits only its own data. Identity is shared; titles are separate checkpoints. */
export const RUND_DATA_FIELDS: Record<string, DataField[]> = {
  IDENTIDAD: [
    field('DOCUMENTO_IDENTIDAD',['tip_identificacion','num_identificacion'],'documento_identidad',true),
    field('NOMBRE_COMPLETO',['nom_largo'],'documento_identidad',true), field('GENERO',['gen_tercero'],'documento_identidad',true),
    field('SEXO_BIOLOGICO',['sexoBiologico','gen_tercero'],'documento_identidad',true), field('FECHA_NACIMIENTO',['fec_nacimiento'],'documento_identidad',true),
  ],
  CONTACTO: [field('CORREO_INSTITUCIONAL',['correoInstitucional']),field('CORREO_ALTERNATIVO',['correoAlternativo']),field('TELEFONO',['tel_celular'])],
  FORMACION: [
    field('diploma_pregrado',['pregrado'],'diploma_pregrado',true),field('diploma_especializacion',['especializacion'],'diploma_especializacion'),
    field('diploma_maestria',['maestria'],'diploma_maestria'),field('diploma_doctorado',['doctorado'],'diploma_doctorado'),
    field('certificado_posdoctoral',['posDoctorado'],'certificado_posdoctoral'),
    field('convalidacion_men',['pregrado','especializacion','maestria','doctorado','posDoctorado'],'convalidacion_men',false,true),
    field('hoja_vida_pro',['perfilAcademicoPro','perfilAcademico'],'hoja_vida_pro',true),
  ],
  VINCULACION: [
    field('acto_administrativo_vinculacion',['tipoVinculacion','vinculacionDisplay'],'acto_administrativo_vinculacion',true),
    field('resolucion_convocatoria',['origenVinculacion'],'resolucion_convocatoria',true),
    field('ACTO_ADMINISTRATIVO',['actoAdministrativoVinculacion'],'contrato',true),
    field('FECHAS_VINCULACION',['fechaInicioVinculacion','fechaFinVinculacion'],'contrato',true),
    field('DEDICACION',['dedicacion','dedicacionDisplay'],'acto_administrativo_dedicacion',true),
    field('HORAS_PTA',['horasAsignables'],'acto_administrativo_dedicacion',true),
    field('acto_administrativo_situacion',['situacionAdministrativa'],'acto_administrativo_situacion',true),
    field('acto_adscripcion_territorial',['territorialId','territorialReportada','sedeId'],'acto_adscripcion_territorial',true),
    field('resolucion_escalafon',['escalafon'],'resolucion_escalafon',true),field('resolucion_puntaje_salarial',['puntajeSalarial'],'resolucion_puntaje_salarial',true),
  ],
  ACADEMICO: [field('acto_asignacion_nucleo',['nucleoTematico'],'acto_asignacion_nucleo',true),
    field('certificacion_investigacion',['investigacion'],'certificacion_investigacion'),field('acta_evaluacion_desempeno',['ultimaEvaluacion'],'acta_evaluacion_desempeno',true)],
  TRANSVERSAL: [field('OBSERVACIONES',['observaciones']),field('autorizacion_habeas_data',[],'autorizacion_habeas_data',true,true)],
};

export async function loadDataReviewProfile(db: {query: (...args: any[]) => Promise<any>}, docenteId: string) {
  const [profile] = await db.query(`SELECT d.*, p.num_identificacion, p.tip_identificacion, p.nom_largo, p.gen_tercero, p.fec_nacimiento, p.tel_celular
    FROM academic_work_plan."Docente" d LEFT JOIN auth.personas p ON p.id_person::text=d."personaId"::text WHERE d.id::text=$1`, [docenteId]);
  return profile;
}

export async function loadDataReviews(db: {query: (...args: any[]) => Promise<any>}, docenteId: string) {
  return db.query(`SELECT DISTINCT ON (bloque,metadata->>'campo') bloque,actor_id,observacion,metadata,"createdAt"
    FROM academic_work_plan."RundAprobacionLog" WHERE docente_id::text=$1 AND accion IN ('APROBAR_DATO','DEVOLVER_DATO')
    ORDER BY bloque,metadata->>'campo',"createdAt" DESC,id DESC`, [docenteId]);
}

/** No new table or overwritten audit history: decisions are immutable, versioned audit events. */
export function dataReviewContext(block: string, profile: any, supports: any[], reviews: any[], blockState?: string) {
  return Object.fromEntries((RUND_DATA_FIELDS[block] || []).map(def => {
    const relevant = supports.filter(s => def.types.includes(s.tipo_soporte));
    const admitted = relevant.filter(s => s.estado === 'Aprobado' && (s.documento_perfil_id ? s.estado_documento === 'ACTIVO' : !!s.documento_carpeta_id)
      && (!s.fecha_vencimiento || new Date(s.fecha_vencimiento).getTime() >= Date.now()));
    const values = Object.fromEntries(def.keys.map(key => [key, profile?.[key] ?? null]));
    // A start date is needed to review a period; an end date alone is insufficient.
    const hasValue = def.id === 'DOCUMENTO_IDENTIDAD' ? hasRundData(profile?.num_identificacion)
      : def.id === 'FECHAS_VINCULACION' ? hasRundData(profile?.fechaInicioVinculacion) : def.keys.some(key => hasRundData(profile?.[key]));
    const required = def.required || (def.formal ? relevant.length > 0 : hasValue);
    const refs = admitted.map(s => ({ id: String(s.id), version: s.documento_perfil_id || s.documento_carpeta_id, tipo: s.tipo_soporte }))
      .sort((a,b) => a.id.localeCompare(b.id));
    const huella = createHash('sha256').update(JSON.stringify({ campo:def.id, values, refs })).digest('hex');
    const previous = reviews.find(r => r.bloque === block && r.metadata?.campo === def.id);
    // Preserve historical approved blocks until their data or supporting files are reopened.
    const legacyApproved = blockState === 'Aprobado' && !previous;
    const valid = previous?.metadata?.huella === huella;
    return [def.id, {
      campo:def.id, huella, requiereRevision:required,
      // The authorized reviewer's decision is authoritative; documents are optional evidence.
      puedeValidar:def.formal || hasValue,
      estado:valid ? previous.metadata.estado : legacyApproved ? 'Aprobado' : 'Pendiente',
      observacion:valid ? previous.observacion : null, revisadoPor:valid ? previous.actor_id : null,
      fechaRevision:valid ? previous.createdAt : null, soportes:refs,
    }];
  }));
}

export function dataApprovalProblem(context: ReturnType<typeof dataReviewContext>) {
  const required = Object.values(context).filter(value => value.requiereRevision);
  if (Object.values(context).some(value => value.estado === 'Rechazado')) return 'Hay datos devueltos para corrección. Revise cada dato antes de aprobar el bloque.';
  if (required.some(value => value.estado !== 'Aprobado' || !value.puedeValidar)) return 'Valide individualmente los datos registrados antes de aprobar el bloque. Los soportes son opcionales.';
  return null;
}
