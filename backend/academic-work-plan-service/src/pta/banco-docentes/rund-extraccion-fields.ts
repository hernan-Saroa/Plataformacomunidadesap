import { BadRequestException, ConflictException } from '@nestjs/common';

// Lista cerrada: el modelo nunca elige columnas SQL ni cambia identificadores,
// permisos, estados, horas derivadas o datos sin un soporte pertinente.
export const EXTRACTION_FIELDS: Record<string, { label: string; source: string; types: string[]; date?: boolean }> = {
  nombreCompleto: { label: 'Nombre completo', source: 'nom_largo', types: ['documento_identidad','cedula_extranjeria','pasaporte'] },
  fechaNacimiento: { label: 'Fecha de nacimiento', source: 'fec_nacimiento', types: ['documento_identidad','cedula_extranjeria','pasaporte'], date: true },
  pregrado: { label: 'Pregrado', source: 'pregrado', types: ['diploma_pregrado','acta_grado_pregrado'] },
  especializacion: { label: 'Especialización', source: 'especializacion', types: ['diploma_especializacion','acta_grado_especializacion'] },
  maestria: { label: 'Maestría', source: 'maestria', types: ['diploma_maestria','acta_grado_maestria'] },
  doctorado: { label: 'Doctorado', source: 'doctorado', types: ['diploma_doctorado','acta_grado_doctorado'] },
  posDoctorado: { label: 'Posdoctorado', source: 'posDoctorado', types: ['certificado_posdoctoral'] },
  perfilAcademico: { label: 'Perfil académico', source: 'perfilAcademico', types: ['hoja_vida_pro'] },
  actoAdministrativoVinculacion: { label: 'Acto administrativo', source: 'actoAdministrativoVinculacion', types: ['contrato','acto_administrativo_vinculacion'] },
  fechaInicioVinculacion: { label: 'Inicio de vinculación', source: 'fechaInicioVinculacion', types: ['contrato','acto_administrativo_vinculacion'], date: true },
  fechaFinVinculacion: { label: 'Fin de vinculación', source: 'fechaFinVinculacion', types: ['contrato','acto_administrativo_vinculacion'], date: true },
  origenVinculacion: { label: 'Origen de vinculación', source: 'origenVinculacion', types: ['resolucion_convocatoria'] },
  situacionAdministrativa: { label: 'Situación administrativa', source: 'situacionAdministrativa', types: ['acto_administrativo_situacion'] },
  escalafon: { label: 'Escalafón', source: 'escalafon', types: ['resolucion_escalafon'] },
  nucleoTematico: { label: 'Núcleo temático', source: 'nucleoTematico', types: ['acto_asignacion_nucleo'] },
  investigacion: { label: 'Investigación', source: 'investigacion', types: ['certificacion_investigacion'] },
  ultimaEvaluacion: { label: 'Última evaluación', source: 'ultimaEvaluacion', types: ['acta_evaluacion_desempeno'] },
};
export const allowedExtractionFields = (type: string) => Object.keys(EXTRACTION_FIELDS).filter(key => EXTRACTION_FIELDS[key].types.includes(type));
export function extractionFieldsForDocument(document: any) {
  if (document.tipo_soporte) return allowedExtractionFields(document.tipo_soporte);
  const categories: Record<string,string[]> = {
    IDENTIDAD: ['nombreCompleto','fechaNacimiento'],
    TITULOS: ['pregrado','especializacion','maestria','doctorado','posDoctorado'],
    CONTRATOS: ['actoAdministrativoVinculacion','fechaInicioVinculacion','fechaFinVinculacion'],
    RESOLUCIONES: ['actoAdministrativoVinculacion','fechaInicioVinculacion','fechaFinVinculacion','origenVinculacion','situacionAdministrativa','escalafon','nucleoTematico'],
    CERTIFICADOS: ['investigacion','ultimaEvaluacion','perfilAcademico'],
    OTROS: Object.keys(EXTRACTION_FIELDS),
  };
  return categories[document.categoria_codigo] || [];
}
export const extractionValue = (value: any) => value == null ? '' : value instanceof Date ? value.toISOString().slice(0,10) : String(value).trim();
export const comparable = (value: any) => extractionValue(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toUpperCase();

export function validateCandidates(raw: any, pages: any[], allowed: string[]) {
  if (!raw || !Array.isArray(raw.sugerencias)) throw new Error('RESPUESTA_MODELO_INVALIDA');
  const used = new Set<string>();
  return raw.sugerencias.slice(0, 40).flatMap((item: any) => {
    const field = EXTRACTION_FIELDS[item?.campo];
    const page = pages.find(p => p.pagina === item?.pagina);
    const value = typeof item?.valor === 'string' ? item.valor.trim() : '';
    const quote = typeof item?.evidencia === 'string' ? item.evidencia.trim() : '';
    if (!field || !allowed.includes(item.campo) || used.has(item.campo) || !page || !value || value.length > 1000
      || quote.length < 3 || quote.length > 600 || !comparable(page.texto).includes(comparable(quote))) return [];
    // No se presenta un valor que no esté sustentado por el fragmento OCR.
    const grounded = comparable(quote).includes(comparable(value));
    if (!grounded && !field.date) return [];
    if (['pregrado','especializacion','maestria','doctorado','posDoctorado'].includes(item.campo)
      && ['PREGRADO','ESPECIALIZACION','MAESTRIA','DOCTORADO','POSDOCTORADO','POS DOCTORADO'].includes(comparable(value))) return [];
    if (field.date && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))
      || new Date(value).toISOString().slice(0, 10) !== value)) return [];
    const confidence = Math.max(0, Math.min(1, Number(item.confianza) || 0, Number(page.confianza) || 0, grounded ? 1 : 0.5));
    used.add(item.campo);
    return [{ campo: item.campo, valor: value, pagina: page.pagina, evidencia: quote, confianza: confidence, baja_confianza: confidence < 0.85 }];
  });
}

export async function extractionProfile(db: any, docenteId: string) {
  const [profile] = await db.query(`SELECT d.*, p.nom_largo, p.fec_nacimiento
    FROM academic_work_plan."Docente" d JOIN auth.personas p ON p.id_person::text = d."personaId"::text
    WHERE d.id::text = $1`, [docenteId]);
  if (!profile) throw new BadRequestException('Perfil docente no encontrado.');
  return Object.fromEntries(Object.entries(EXTRACTION_FIELDS).map(([key, def]) => [key, extractionValue(profile[def.source])]));
}

export function extractionIds(input: any): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length < 1 || input.length > 20
    || input.some(id => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    || new Set(input).size !== input.length) throw new BadRequestException('Selección de sugerencias inválida.');
  return input;
}

/** Se ejecuta en la MISMA transacción que la edición manual validada del perfil. */
export async function lockExtractionSuggestions(db: any, docenteId: string, ids: string[], payload: any) {
  await db.query('SELECT id FROM academic_work_plan."Docente" WHERE id::text = $1 FOR UPDATE', [docenteId]);
  await db.query(`SELECT p.id_person FROM auth.personas p JOIN academic_work_plan."Docente" d
    ON d."personaId"::text = p.id_person::text WHERE d.id::text = $1 FOR UPDATE OF p`, [docenteId]);
  const rows = await db.query(`SELECT s.*, d.estado AS documento_estado, j.estado AS trabajo_estado
    FROM academic_work_plan."RundExtraccionSugerencia" s
    JOIN academic_work_plan."RundExtraccionTrabajo" j ON j.id = s.trabajo_id
    JOIN academic_work_plan."RundDocumentoPerfil" d ON d.id = j.documento_id
    WHERE s.id = ANY($1::uuid[]) AND j.docente_id::text = $2 FOR UPDATE OF s, d`, [ids, docenteId]);
  if (rows.length !== ids.length || new Set(rows.map((s: any) => s.campo)).size !== ids.length) throw new ConflictException('Las sugerencias no corresponden a este perfil o repiten un campo.');
  const profile = await extractionProfile(db, docenteId);
  for (const s of rows) {
    if (s.estado !== 'PENDIENTE' || s.documento_estado !== 'ACTIVO' || s.trabajo_estado !== 'COMPLETADO') throw new ConflictException('La sugerencia ya fue revisada o su PDF dejó de estar vigente. Actualice el expediente.');
    if (!EXTRACTION_FIELDS[s.campo] || typeof payload[s.campo] !== 'string' || !payload[s.campo].trim()) throw new BadRequestException('Revise el valor del campo sugerido antes de confirmar.');
    if (comparable(profile[s.campo]) !== comparable(s.valor_previo)) throw new ConflictException('El dato del perfil cambió desde la extracción. Descarte esta sugerencia y vuelva a procesar el documento.');
  }
  return rows;
}

export async function confirmExtractionSuggestions(db: any, rows: any[], payload: any, actorId: string, reason: string) {
  for (const s of rows) await db.query(`UPDATE academic_work_plan."RundExtraccionSugerencia"
    SET estado = $2, valor_confirmado = $3, revisado_por = $4, motivo = $5, revisado_en = now() WHERE id = $1`,
  [s.id, comparable(s.valor) === comparable(payload[s.campo]) ? 'APROBADA' : 'CORREGIDA', payload[s.campo].trim(), actorId, reason]);
}
