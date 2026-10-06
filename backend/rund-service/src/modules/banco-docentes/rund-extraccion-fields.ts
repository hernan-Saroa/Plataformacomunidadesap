import { BadRequestException, ConflictException } from '@nestjs/common';

// Lista cerrada: el modelo nunca elige columnas SQL ni cambia identificadores,
// permisos, estados, horas derivadas o datos sin un soporte pertinente.
type ExtractionMatch = 'literal' | 'tokens' | 'documentNumber' | 'documentType' | 'gender' | 'biologicalSex';
type ExtractionField = { label: string; source: string; types: string[]; instruction: string; date?: boolean; match?: ExtractionMatch };

export const EXTRACTION_FIELDS: Record<string, ExtractionField> = {
  documentType: { label: 'Tipo de documento', source: 'tip_identificacion', types: ['documento_identidad','cedula_extranjeria','pasaporte'], match: 'documentType', instruction: 'Tipo del documento del titular. Devuelve solo CC, CE, PA o PEP. CC corresponde a CÉDULA DE CIUDADANÍA, CE a CÉDULA DE EXTRANJERÍA y PA a PASAPORTE.' },
  documentNumber: { label: 'Número de documento', source: 'num_identificacion', types: ['documento_identidad','cedula_extranjeria','pasaporte'], match: 'documentNumber', instruction: 'Número de identificación del titular. Devuélvelo sin puntos, espacios ni separadores, conservando letras si es pasaporte; no uses números de fechas, formularios o autoridades.' },
  nombreCompleto: { label: 'Nombre completo', source: 'nom_largo', types: ['documento_identidad','cedula_extranjeria','pasaporte'], match: 'tokens', instruction: 'Nombre completo del titular. Si el documento separa APELLIDOS y NOMBRES, devuelve primero todos los nombres y después todos los apellidos; nunca uses el nombre de un funcionario, firmante o acudiente.' },
  genero: { label: 'Género', source: 'gen_tercero', types: ['documento_identidad','cedula_extranjeria','pasaporte'], match: 'gender', instruction: 'Valor demográfico del titular sustentado por el marcador SEXO/GÉNERO: F devuelve Femenino y M devuelve Masculino. No lo deduzcas del nombre, la fotografía ni tratamientos.' },
  sexoBiologico: { label: 'Sexo biológico', source: 'sexoBiologico', types: ['documento_identidad','cedula_extranjeria','pasaporte'], match: 'biologicalSex', instruction: 'Sexo del titular indicado expresamente: F devuelve Mujer y M devuelve Hombre. No lo deduzcas del nombre, la fotografía ni tratamientos.' },
  fechaNacimiento: { label: 'Fecha de nacimiento', source: 'fec_nacimiento', types: ['documento_identidad','cedula_extranjeria','pasaporte'], instruction: 'Fecha de nacimiento del titular; no usar fecha de expedición ni vencimiento.', date: true },
  pregrado: { label: 'Pregrado', source: 'pregrado', types: ['diploma_pregrado','acta_grado_pregrado'], instruction: 'Nombre literal del título profesional de pregrado otorgado; no devolver la palabra Pregrado.' },
  especializacion: { label: 'Especialización', source: 'especializacion', types: ['diploma_especializacion','acta_grado_especializacion'], instruction: 'Nombre literal del título de especialización otorgado; no devolver solo Especialización.' },
  maestria: { label: 'Maestría', source: 'maestria', types: ['diploma_maestria','acta_grado_maestria'], instruction: 'Nombre literal del título de maestría otorgado; no devolver solo Maestría.' },
  doctorado: { label: 'Doctorado', source: 'doctorado', types: ['diploma_doctorado','acta_grado_doctorado'], instruction: 'Nombre literal del título de doctorado otorgado; no devolver solo Doctorado.' },
  posDoctorado: { label: 'Posdoctorado', source: 'posDoctorado', types: ['certificado_posdoctoral'], instruction: 'Nombre literal del programa o estancia posdoctoral certificada.' },
  perfilAcademico: { label: 'Perfil académico', source: 'perfilAcademico', types: ['hoja_vida_pro'], instruction: 'Áreas académicas o de docencia declaradas literalmente; no redactar ni resumir información nueva.' },
  actoAdministrativoVinculacion: { label: 'Acto administrativo', source: 'actoAdministrativoVinculacion', types: ['contrato','acto_administrativo_vinculacion'], instruction: 'Tipo, número y año del contrato, resolución o acto que vincula al titular; no usar actos citados como antecedentes.' },
  fechaInicioVinculacion: { label: 'Inicio de vinculación', source: 'fechaInicioVinculacion', types: ['contrato','acto_administrativo_vinculacion'], instruction: 'Fecha efectiva de inicio de la vinculación; no usar firma, expedición o publicación.', date: true },
  fechaFinVinculacion: { label: 'Fin de vinculación', source: 'fechaFinVinculacion', types: ['contrato','acto_administrativo_vinculacion'], instruction: 'Fecha efectiva de terminación de la vinculación; omitir si es indefinida o no aparece.', date: true },
  origenVinculacion: { label: 'Origen de vinculación', source: 'origenVinculacion', types: ['resolucion_convocatoria'], instruction: 'Fuente o modalidad de ingreso/vinculación expresamente indicada en la resolución.' },
  situacionAdministrativa: { label: 'Situación administrativa', source: 'situacionAdministrativa', types: ['acto_administrativo_situacion'], instruction: 'Situación del titular ordenada por el acto, por ejemplo servicio activo, comisión o licencia.' },
  escalafon: { label: 'Escalafón', source: 'escalafon', types: ['resolucion_escalafon'], instruction: 'Categoría o nivel de escalafón asignado expresamente al titular.' },
  nucleoTematico: { label: 'Núcleo temático', source: 'nucleoTematico', types: ['acto_asignacion_nucleo'], instruction: 'Nombre del núcleo temático asignado expresamente al titular.' },
  investigacion: { label: 'Investigación', source: 'investigacion', types: ['certificacion_investigacion'], instruction: 'Grupo, proyecto, línea o actividad de investigación que la certificación atribuye al titular.' },
  ultimaEvaluacion: { label: 'Última evaluación', source: 'ultimaEvaluacion', types: ['acta_evaluacion_desempeno'], instruction: 'Periodo y/o resultado de la evaluación docente correspondiente al titular.' },
};
export const EXTRACTION_FIELDS_BY_BLOCK: Record<string,string[]> = {
  IDENTIDAD: ['documentType','documentNumber','nombreCompleto','genero','sexoBiologico','fechaNacimiento'],
  CONTACTO: [],
  FORMACION: ['pregrado','especializacion','maestria','doctorado','posDoctorado','perfilAcademico'],
  VINCULACION: ['actoAdministrativoVinculacion','fechaInicioVinculacion','fechaFinVinculacion','origenVinculacion','situacionAdministrativa','escalafon'],
  ACADEMICO: ['nucleoTematico','investigacion','ultimaEvaluacion'],
  TRANSVERSAL: [],
};

const EXTRACTION_TEXT_LIMITS: Record<string,{ min:number; max:number }> = {
  pregrado:{min:3,max:300}, especializacion:{min:3,max:300}, maestria:{min:3,max:300}, doctorado:{min:3,max:300}, posDoctorado:{min:3,max:300},
  perfilAcademico:{min:3,max:1000}, actoAdministrativoVinculacion:{min:3,max:200}, origenVinculacion:{min:2,max:300},
  situacionAdministrativa:{min:2,max:300}, escalafon:{min:2,max:100}, nucleoTematico:{min:2,max:300},
  investigacion:{min:3,max:1000}, ultimaEvaluacion:{min:2,max:300},
};

/**
 * Contrato único de formato para una sugerencia OCR. Se usa tanto antes de
 * persistirla como justo antes de aplicarla, para que una fila manipulada o
 * generada por una versión anterior tampoco pueda llegar a la base de datos.
 */
export function extractionValueValidationError(fieldName:string, rawValue:unknown):string|null {
  const field=EXTRACTION_FIELDS[fieldName];
  const value=typeof rawValue==='string'?rawValue.trim():'';
  if(!field)return 'El campo no admite extracción automática.';
  if(!value)return 'El valor reconocido está vacío.';
  if(/[\u0000-\u001F\u007F-\u009F]/u.test(value))return 'El valor contiene caracteres de control no permitidos.';

  if(fieldName==='documentType')return ['CC','CE','PA','PEP'].includes(value)?null:'El tipo de documento debe ser CC, CE, PA o PEP.';
  if(fieldName==='documentNumber')return /^[A-Z0-9]{5,20}$/i.test(value)?null:'El número de documento debe tener entre 5 y 20 letras o dígitos, sin símbolos.';
  if(fieldName==='nombreCompleto')return value.length>=3&&value.length<=150&&/^[\p{L}\p{M}\s'-]+$/u.test(value)
    ?null:'El nombre debe tener entre 3 y 150 caracteres y contener solo letras, espacios, apóstrofes o guiones.';
  if(fieldName==='genero')return ['Femenino','Masculino'].includes(value)?null:'El género reconocido debe ser Femenino o Masculino.';
  if(fieldName==='sexoBiologico')return ['Mujer','Hombre'].includes(value)?null:'El sexo biológico reconocido debe ser Mujer u Hombre.';
  if(field.date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return 'La fecha debe tener el formato AAAA-MM-DD.';
    const parsed=new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value?null:'La fecha reconocida no existe en el calendario.';
  }

  const limit=EXTRACTION_TEXT_LIMITS[fieldName]||{min:1,max:1000};
  if(value.length<limit.min||value.length>limit.max)return `El valor debe tener entre ${limit.min} y ${limit.max} caracteres.`;
  if(['pregrado','especializacion','maestria','doctorado','posDoctorado'].includes(fieldName)
    && ['PREGRADO','ESPECIALIZACION','MAESTRIA','DOCTORADO','POSDOCTORADO','POS DOCTORADO'].includes(comparable(value)))
    return 'Debe indicarse el nombre del título, no solamente su nivel académico.';
  return null;
}

export const allowedExtractionFields = (type: string) => Object.keys(EXTRACTION_FIELDS).filter(key => EXTRACTION_FIELDS[key].types.includes(type));
export function extractionFieldsForDocument(document: any) {
  if (document.tipo_soporte) return allowedExtractionFields(document.tipo_soporte);
  const categories: Record<string,string[]> = {
    IDENTIDAD: ['documentType','documentNumber','nombreCompleto','genero','sexoBiologico','fechaNacimiento'],
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
const compactAlphanumeric = (value: any) => comparable(value).replace(/[^A-Z0-9]/g, '');
const words = (value: any): string[] => comparable(value).match(/[A-Z]{2,}/g) || [];

function normalizedValueIsGrounded(field: ExtractionField, value: string, quote: string): boolean {
  if (field.date) return true;
  if (!field.match || field.match === 'literal') return comparable(quote).includes(comparable(value));
  if (field.match === 'documentNumber') {
    const normalized = compactAlphanumeric(value);
    return normalized.length >= 5 && compactAlphanumeric(quote).includes(normalized);
  }
  if (field.match === 'tokens') {
    const tokens = words(value);
    const evidence = words(quote);
    return tokens.length >= 2 && tokens.every(token => evidence.includes(token));
  }
  if (field.match === 'documentType') {
    const normalized = comparable(value);
    const evidence = comparable(quote);
    const markers: Record<string, RegExp> = {
      CC: /CEDULA(?:\s+DE)?\s+CIUDADANIA/,
      CE: /CEDULA(?:\s+DE)?\s+EXTRANJERIA/,
      PA: /PASAPORTE/,
      PEP: /PERMISO(?:\s+ESPECIAL)?\s+DE\s+PERMANENCIA|\bPEP\b/,
    };
    return Boolean(markers[normalized]?.test(evidence));
  }
  const evidence = comparable(quote);
  const hasSexMarker = /\b(SEXO|GENERO)\b/.test(evidence);
  const female = /\bF\b|\bFEMENIN[AO]\b|\bMUJER\b/.test(evidence);
  const male = /\bM\b|\bMASCULIN[AO]\b|\bHOMBRE\b/.test(evidence);
  if (!hasSexMarker) return false;
  if (field.match === 'gender') return (comparable(value) === 'FEMENINO' && female) || (comparable(value) === 'MASCULINO' && male);
  return (comparable(value) === 'MUJER' && female) || (comparable(value) === 'HOMBRE' && male);
}

function normalizeCandidateValue(fieldName: string, value: string): string {
  const normalized = comparable(value);
  if (fieldName === 'documentType') return normalized;
  if (fieldName === 'documentNumber') return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (fieldName === 'genero') {
    if (['F', 'FEMENINO', 'FEMENINA', 'MUJER'].includes(normalized)) return 'Femenino';
    if (['M', 'MASCULINO', 'MASCULINA', 'HOMBRE'].includes(normalized)) return 'Masculino';
  }
  if (fieldName === 'sexoBiologico') {
    if (['F', 'FEMENINO', 'FEMENINA', 'MUJER'].includes(normalized)) return 'Mujer';
    if (['M', 'MASCULINO', 'MASCULINA', 'HOMBRE'].includes(normalized)) return 'Hombre';
  }
  return value.replace(/\s+/g, ' ').trim();
}

function compactIdentityEvidence(fieldName: string, pageText: string, value: string): string {
  const lines = pageText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const excerpt = (start: number, end: number) => lines.slice(Math.max(0, start), Math.min(lines.length, end + 1)).join('\n').slice(0, 600);
  if (!lines.length) return '';

  if (fieldName === 'documentType') {
    const index = lines.findIndex(line => /CEDULA(?:\s+DE)?\s+(?:CIUDADANIA|EXTRANJERIA)|PASAPORTE|PERMISO(?:\s+ESPECIAL)?\s+DE\s+PERMANENCIA|\bPEP\b/.test(comparable(line)));
    return index >= 0 ? excerpt(index - 1, index) : '';
  }
  if (fieldName === 'documentNumber') {
    const target = compactAlphanumeric(value);
    const candidates = lines.map((line, index) => ({ line, index, compact: compactAlphanumeric(line) }))
      .filter(item => item.compact.includes(target))
      .sort((a, b) => a.compact.length - b.compact.length);
    const match = candidates[0];
    if (!match) return '';
    const label = lines.findIndex((line, index) => Math.abs(index - match.index) <= 3 && /\b(NUMERO|DOCUMENTO|IDENTIFICACION)\b/.test(comparable(line)));
    return excerpt(label >= 0 ? Math.min(label, match.index) : match.index, label >= 0 ? Math.max(label, match.index) : match.index);
  }
  if (fieldName === 'nombreCompleto') {
    const tokens = new Set(words(value));
    const indexes = lines.map((line, index) => ({ index, tokens: words(line) }))
      .filter(item => item.tokens.some(token => tokens.has(token))).map(item => item.index);
    if (indexes.length < 2) return '';
    const start = Math.min(...indexes), lastValue = Math.max(...indexes);
    const end = /\b(NOMBRES?|APELLIDOS?)\b/.test(comparable(lines[lastValue + 1] || '')) ? lastValue + 1 : lastValue;
    return end - start <= 6 ? excerpt(start, end) : indexes.map(index => lines[index]).join('\n').slice(0, 600);
  }
  if (fieldName === 'genero' || fieldName === 'sexoBiologico') {
    const marker = lines.findIndex(line => /\b(SEXO|GENERO)\b/.test(comparable(line)));
    if (marker < 0) return '';
    const expected = ['FEMENINO', 'MUJER'].includes(comparable(value)) ? /^(F|FEMENIN[AO]|MUJER)$/ : /^(M|MASCULIN[AO]|HOMBRE)$/;
    const candidates = lines.map((line, index) => ({ index, value: comparable(line) }))
      .filter(item => expected.test(item.value) && Math.abs(item.index - marker) <= 5)
      .sort((a, b) => Math.abs(a.index - marker) - Math.abs(b.index - marker));
    const valueIndex = candidates[0]?.index;
    return valueIndex === undefined ? '' : excerpt(Math.min(valueIndex, marker), Math.max(valueIndex, marker));
  }
  return '';
}

export function validateCandidates(raw: any, pages: any[], allowed: string[]) {
  if (!raw || !Array.isArray(raw.sugerencias)) throw new Error('RESPUESTA_MODELO_INVALIDA');
  const used = new Set<string>();
  const candidates=raw.sugerencias.slice(0, 40).flatMap((item: any) => {
    const field = EXTRACTION_FIELDS[item?.campo];
    const page = pages.find(p => p.pagina === item?.pagina);
    const value = typeof item?.valor === 'string' ? normalizeCandidateValue(item.campo, item.valor.trim()) : '';
    let quote = typeof item?.evidencia === 'string' ? item.evidencia.trim() : '';
    if (!field || !allowed.includes(item.campo) || used.has(item.campo) || !page || extractionValueValidationError(item.campo,value)
      || quote.length < 3 || (!field.match && quote.length > 600)) return [];
    const compactQuote = field.match ? compactIdentityEvidence(item.campo, page.texto, value) : '';
    if (compactQuote && normalizedValueIsGrounded(field, value, compactQuote)) quote = compactQuote;
    else if (!comparable(page.texto).includes(comparable(quote))) return [];
    // No se presenta un valor que no esté sustentado por el fragmento OCR.
    const grounded = normalizedValueIsGrounded(field, value, quote);
    if (!grounded) return [];
    const confidence = Math.max(0, Math.min(1, Number(item.confianza) || 0, Number(page.confianza) || 0));
    used.add(item.campo);
    return [{ campo: item.campo, valor: value, pagina: page.pagina, evidencia: quote, confianza: confidence, baja_confianza: confidence < 0.85 }];
  });
  // Coherencia transversal equivalente al formulario manual: solo el
  // pasaporte admite letras; CC, CE y PEP deben conservar un número decimal.
  const documentType=candidates.find(item=>item.campo==='documentType')?.valor;
  return candidates.filter(item=>item.campo!=='documentNumber'||!documentType||documentType==='PA'||/^\d+$/.test(item.valor));
}

export async function extractionProfile(db: any, docenteId: string) {
  const [profile] = await db.query(`SELECT d.*, p.nom_largo, p.num_identificacion, p.tip_identificacion, p.gen_tercero, p.fec_nacimiento
    FROM rund."Docente" d JOIN auth.personas p ON p.id_person::text = d."personaId"::text
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
  await db.query('SELECT id FROM rund."Docente" WHERE id::text = $1 FOR UPDATE', [docenteId]);
  await db.query(`SELECT p.id_person FROM auth.personas p JOIN rund."Docente" d
    ON d."personaId"::text = p.id_person::text WHERE d.id::text = $1 FOR UPDATE OF p`, [docenteId]);
  const rows = await db.query(`SELECT s.*, d.estado AS documento_estado, j.estado AS trabajo_estado
    FROM rund."RundExtraccionSugerencia" s
    JOIN rund."RundExtraccionTrabajo" j ON j.id = s.trabajo_id
    JOIN rund."RundDocumentoPerfil" d ON d.id = j.documento_id
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
  for (const s of rows) await db.query(`UPDATE rund."RundExtraccionSugerencia"
    SET estado = $2, valor_confirmado = $3, revisado_por = $4, motivo = $5, revisado_en = now() WHERE id = $1`,
  [s.id, comparable(s.valor) === comparable(payload[s.campo]) ? 'APROBADA' : 'CORREGIDA', payload[s.campo].trim(), actorId, reason]);
}
