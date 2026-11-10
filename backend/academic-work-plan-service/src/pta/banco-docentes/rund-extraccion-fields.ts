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
  const field=Object.prototype.hasOwnProperty.call(EXTRACTION_FIELDS,fieldName)?EXTRACTION_FIELDS[fieldName]:undefined;
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
    && ['PREGRADO','ESPECIALIZACION','MAESTRIA','DOCTORADO','POSDOCTORADO','POS DOCTORADO',
      'LICENCIADO','LICENCIADA','MAGISTER','MASTER','DOCTOR','DOCTORA','BACHELOR','ESPECIALISTA','PHD','PH.D.'].includes(comparable(value)))
    return 'Debe indicarse el nombre del título, no solamente su nivel académico.';
  return null;
}

export const allowedExtractionFields = (type: string) => Object.keys(EXTRACTION_FIELDS).filter(key => EXTRACTION_FIELDS[key].types.includes(type));
/**
 * Fields a document may propose. An evidence linked to a checkpoint only proposes the rows of
 * its support type (and therefore of its tab). A general attachment is limited to its category;
 * "Otros" accredits no profile row, so it is not analyzed.
 */
export function extractionFieldsForDocument(document: any) {
  if (document.tipo_soporte) return allowedExtractionFields(document.tipo_soporte);
  const categories: Record<string,string[]> = {
    IDENTIDAD: ['documentType','documentNumber','nombreCompleto','genero','sexoBiologico','fechaNacimiento'],
    TITULOS: ['pregrado','especializacion','maestria','doctorado','posDoctorado'],
    CONTRATOS: ['actoAdministrativoVinculacion','fechaInicioVinculacion','fechaFinVinculacion'],
    RESOLUCIONES: ['actoAdministrativoVinculacion','fechaInicioVinculacion','fechaFinVinculacion','origenVinculacion','situacionAdministrativa','escalafon','nucleoTematico'],
    CERTIFICADOS: ['investigacion','ultimaEvaluacion','perfilAcademico'],
  };
  return categories[document.categoria_codigo] || [];
}
/** A suggestion is applicable only when its source document can accredit that row. */
export const extractionFieldInScope = (document: any, campo: string) => extractionFieldsForDocument(document).includes(campo);
export const extractionValue = (value: any) => value == null ? '' : value instanceof Date ? value.toISOString().slice(0,10) : String(value).trim();
export const comparable = (value: any) => extractionValue(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toUpperCase();
/** Compara códigos del perfil con los valores legibles del asistente. */
export function extractionComparisonValue(field: string, value: unknown): string {
  const normalized = comparable(value);
  const aliases: Record<string, Record<string, string>> = {
    genero: { M: 'MASCULINO', F: 'FEMENINO' },
    sexoBiologico: { M: 'HOMBRE', MASCULINO: 'HOMBRE', F: 'MUJER', FEMENINO: 'MUJER' },
  };
  return aliases[field]?.[normalized] || normalized;
}
const compactAlphanumeric = (value: any) => comparable(value).replace(/[^A-Z0-9]/g, '');
const words = (value: any): string[] => comparable(value).match(/[A-Z]{2,}/g) || [];
const extractionMonths=['ENERO|ENE|JANUARY|JAN','FEBRERO|FEB|FEBRUARY','MARZO|MAR|MARCH','ABRIL|ABR|APRIL|APR','MAYO|MAY','JUNIO|JUN|JUNE','JULIO|JUL|JULY','AGOSTO|AGO|AUGUST|AUG','SEPTIEMBRE|SETIEMBRE|SEP|SEPT|SEPTEMBER','OCTUBRE|OCT|OCTOBER','NOVIEMBRE|NOV|NOVEMBER','DICIEMBRE|DIC|DECEMBER|DEC'];
function explicitDateCells(text:string):string|undefined {
  const dates=new Set<string>();
  const cells=/\b(?:DIA|DAY)\s*[:\[\]()]*\s*([\d\s.,|/\[\]()-]+?)\s*(?:MES|MONTH)\s*[:\[\]()]*\s*([\d\s.,|/\[\]()-]+?)\s*(?:ANO|YEAR)\s*[:\[\]()]*\s*([\d\s.,|/\[\]()-]+)/g;
  for(const match of comparable(text).matchAll(cells)){
    const [day,month,year]=match.slice(1).map(value=>value.replace(/\D/g,''));
    if(/^\d{1,2}$/.test(day)&&/^\d{1,2}$/.test(month)&&/^\d{4}$/.test(year))dates.add(`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`);
  }
  return dates.size===1?[...dates][0]:undefined;
}
export const MIN_EXTRACTION_CONFIDENCE = 0.85;
const academicFields = new Set(['pregrado','especializacion','maestria','doctorado','posDoctorado']);
const confidenceValue = (value: unknown) => {
  const number = typeof value === 'number' || typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : 0;
};
const literalValueIndex = (quote: string, value: string) => {
  const text = comparable(quote), target = comparable(value);
  if (!target) return -1;
  for (let index = text.indexOf(target); index >= 0; index = text.indexOf(target, index + 1)) {
    if (!/[\p{L}\p{N}]/u.test(text[index - 1] || '') && !/[\p{L}\p{N}]/u.test(text[index + target.length] || '')) return index;
  }
  return -1;
};

/** Conservative checks on OCR proposals, separate from validation of a human correction. */
export function extractionSuggestionQualityError(suggestion: any): string | null {
  if (!suggestion || typeof suggestion !== 'object') return 'La lectura no contiene un dato válido.';
  const { campo, valor, evidencia } = suggestion;
  if (extractionValueValidationError(campo, valor)) return 'El texto reconocido no tiene un formato válido para este dato.';
  if (confidenceValue(suggestion.confianza) < MIN_EXTRACTION_CONFIDENCE) return 'La lectura no tiene suficiente confianza para proponer este dato.';
  if (typeof evidencia !== 'string' || evidencia.trim().length < 3 || evidencia.length > 600
    || !normalizedValueIsGrounded(EXTRACTION_FIELDS[campo], valor, evidencia)) return 'No hay un fragmento legible que respalde el valor propuesto.';
  if (!academicFields.has(campo)) return null;
  const tokens = words(valor);
  if(/\b(?:FACULTAD|UNIVERSIDAD|ACTA|RECTOR|SECRETARIA|REPUBLICA|CONSIDERANDO)\b/.test(comparable(valor))) {
    return 'El texto corresponde a un encabezado o autoridad, no a un título académico.';
  }
  // Do not turn merged OCR lines, identifiers or an unreadable seal into an academic title.
  if (!tokens.length || /[\d\uFFFD_<>|]/u.test(valor) || tokens.some(token => token.length > 24 || /^[BCDFGHJKLMNPQRSTVWXYZ]{5,}$/.test(token))
    || tokens.length === 1 && (tokens[0].length > 18 || !/[AEIOUY]/.test(tokens[0]))) {
    return 'El título reconocido contiene texto incoherente o unido por el OCR.';
  }
  const index = literalValueIndex(evidencia, valor);
  const before = comparable(evidencia).slice(Math.max(0, index - 120), index);
  const title = comparable(valor);
  const award = /\b(?:TITULO(?:\s+(?:PROFESIONAL|ACADEMICO|UNIVERSITARIO))?|GRADO(?:\s+ACADEMICO)?|DIPLOMA|DEGREE)\s*(?:(?:DE|EN|OF|IN|COMO|A|:|["'«»“”])\s*)*$/.test(before);
  const level: Record<string, RegExp> = {
    pregrado: /^(?:LICENCIAD[OA]|BACHELOR)\b/,
    especializacion: /^(?:ESPECIALISTA|ESPECIALIZACION|SPECIALIST)\b/,
    maestria: /^(?:MAGISTER|MAESTR[OA]|MAESTRIA|MASTER)\b/,
    doctorado: /^(?:DOCTOR(?:A)?\s+(?:EN|OF|IN)|DOCTORADO|PH\.?D\.?)\b/,
    posDoctorado: /\b(?:POSDOCTORAL|POSTDOCTORAL|POSDOCTORADO|POSTDOCTORADO|POST[- ]DOCTORAL)\b/,
  };
  if (!award && !level[campo].test(title)) return 'No se pudo identificar un título otorgado o un programa certificado en el fragmento reconocido.';
  const detectedLevels = Object.entries(level).filter(([, pattern]) => pattern.test(title)).map(([name]) => name);
  if (detectedLevels.some(name => name !== campo) || campo !== 'pregrado' && !detectedLevels.includes(campo)) {
    return 'El título reconocido no corresponde de forma inequívoca al nivel académico de este dato.';
  }
  return null;
}

function documentTypeFromEvidence(text: string): string | undefined {
  // El OCR puede unir palabras de una etiqueta pequeña. Solo se ignoran
  // separadores: siguen siendo obligatorias las palabras del tipo documental.
  const compact = compactAlphanumeric(text);
  const matches = new Set([
    /CEDULA(?:DE)?[CG]IUDADANIA/.test(compact) && 'CC',
    /CEDULA(?:DE)?EXTRANJERIA/.test(compact) && 'CE',
    /PASAPORTE|PASSPORT/.test(compact) && 'PA',
    (/PERMISO(?:ESPECIAL)?DEPERMANENCIA/.test(compact) || /\bPEP\b/.test(comparable(text))) && 'PEP',
    /\bC\.?\s*C\.?\s*\(\s*[X✓✔]\s*\)/i.test(text) && 'CC',
    /\bC\.?\s*E\.?\s*\(\s*[X✓✔]\s*\)/i.test(text) && 'CE',
    /\bPAS\.?\s*\(\s*[X✓✔]\s*\)/i.test(text) && 'PA',
  ].filter(Boolean));
  const explicit=/\b(?:CON|TIPO\s+(?:DE\s+)?DOCUMENTO|CEDULA)\s*:?\s*(C\.?\s*C\.?|C\.?\s*E\.?|PA|PEP)\b/i.exec(text);
  if(explicit)matches.add(explicit[1].replace(/[^A-Z]/gi,'').toUpperCase());
  return matches.size === 1 ? [...matches][0] as string : undefined;
}

function normalizedValueIsGrounded(field: ExtractionField, value: string, quote: string): boolean {
  if (field.date) {
    const [year, month, day] = value.split('-');
    const text = comparable(quote);
    if (literalValueIndex(text, value) >= 0) return true;
    if(explicitDateCells(quote)===value)return true;
    if(new RegExp(`\\b0?${Number(day)}(?:[\\s./-]+|\\s+DE\\s+)(?:0?${Number(month)}|${extractionMonths[Number(month) - 1]})(?:[\\s./-]+|\\s+DE\\s+)${year}\\b`).test(text))return true;
    return new RegExp(`\\b(?:DIA|DAY)\\s+0?${Number(day)}\\s+(?:MES|MONTH)\\s+0?${Number(month)}\\s+(?:ANO|YEAR)\\s+${year}\\b`)
      .test(text.replace(/[\[\](){}:]/g,' ').replace(/\s+/g,' '));
  }
  if (!field.match || field.match === 'literal') return literalValueIndex(quote, value) >= 0;
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
    return documentTypeFromEvidence(quote) === comparable(value);
  }
  const evidence = identityMarkerText(quote);
  const joined=new Set([...evidence.matchAll(/\b(?:SEXO|GENERO)([FM])\b/g)].map(match=>match[1]));
  const hasSexMarker = /\b(SEXO|GENERO)\b/.test(evidence)||joined.size>0;
  const marked=new Set([...evidence.matchAll(/\b([FM])\s*\(\s*[X✓✔]\s*\)/g)].map(match=>match[1]));
  if(marked.size>1||joined.size>1)return false;
  const female = marked.size?marked.has('F'):joined.size?joined.has('F'):/\bF\b|\bFEMENIN[AO]\b|\bMUJER\b/.test(evidence);
  const male = marked.size?marked.has('M'):joined.size?joined.has('M'):/\bM\b|\bMASCULIN[AO]\b|\bHOMBRE\b/.test(evidence);
  if (!hasSexMarker || female === male) return false;
  if (field.match === 'gender') return (comparable(value) === 'FEMENINO' && female) || (comparable(value) === 'MASCULINO' && male);
  return (comparable(value) === 'MUJER' && female) || (comparable(value) === 'HOMBRE' && male);
}

/** Normalize spacing in fixed form labels only, never in personal values. */
export function identityMarkerText(text: string): string {
  return comparable(text).replace(/\bS\s+E\s+X\s+O\b/g, 'SEXO')
    .replace(/\bG\s+E\s+N\s+E\s+R\s+O\b/g, 'GENERO');
}

function normalizeCandidateValue(fieldName: string, value: string): string {
  const normalized = comparable(value);
  if(EXTRACTION_FIELDS[fieldName]?.date&&!/^\d{4}-\d{2}-\d{2}$/.test(value)){
    const cells=explicitDateCells(value);
    if(cells)return cells;
    const date=/^(\d{1,2})(?:[\s./-]+|\s+DE\s+)([A-Z]+|\d{1,2})(?:[\s./-]+|\s+DE\s+)(\d{4})$/.exec(normalized);
    if(date){
      const month=/^\d+$/.test(date[2])?Number(date[2]):extractionMonths.findIndex(names=>names.split('|').includes(date[2]))+1;
      if(month>=1&&month<=12)return `${date[3]}-${String(month).padStart(2,'0')}-${date[1].padStart(2,'0')}`;
    }
  }
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
  return value.normalize('NFC').replace(/\s+/g, ' ').trim();
}

function compactIdentityEvidence(fieldName: string, pageText: string, value: string): string {
  const lines = pageText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const excerpt = (start: number, end: number) => lines.slice(Math.max(0, start), Math.min(lines.length, end + 1)).join('\n').slice(0, 600);
  if (!lines.length) return '';

  if (fieldName === 'documentType') {
    for (let index = 0; index < lines.length; index++) for (let count = 1; count <= 3; count++) {
      const quote = excerpt(index, index + count - 1);
      if (documentTypeFromEvidence(quote) === comparable(value)) return quote;
    }
    return '';
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
    return end - start <= 6 ? excerpt(start, end) : '';
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

/** Locate the actual source span, including when the model quotes only part of an OCR line. */
function evidenceConfidence(page: any, quote: string, bestIdentityOccurrence=false): number {
  if (!Array.isArray(page.lineas)) return confidenceValue(page.confianza);
  const text = comparable(page.texto), target = comparable(quote);
  if (!target) return 0;
  const spans: { start: number; end: number; confidence: number }[] = [];
  let cursor = 0;
  for (const line of page.lineas) {
    const value = comparable(line.texto);
    const start = value ? text.indexOf(value, cursor) : -1;
    if (start < 0) return 0;
    cursor = start + value.length;
    spans.push({ start, end: cursor, confidence: confidenceValue(line.confianza) });
  }
  let confidence = bestIdentityOccurrence?0:1, found = false, lineIndex = 0;
  for (let start = text.indexOf(target); start >= 0; start = text.indexOf(target, start + 1)) {
    const end = start + target.length;
    let occurrenceConfidence=1,occurrenceFound=false;
    while (lineIndex < spans.length && spans[lineIndex].end <= start) lineIndex++;
    for (let index = lineIndex; index < spans.length && spans[index].start < end; index++) {
      occurrenceConfidence = Math.min(occurrenceConfidence, spans[index].confidence);
      occurrenceFound = true;
    }
    if(occurrenceFound){confidence=bestIdentityOccurrence?Math.max(confidence,occurrenceConfidence):Math.min(confidence,occurrenceConfidence);found=true;}
  }
  return found ? confidence : 0;
}

export type ExtractionCandidate = {
  campo:string; valor:string; pagina:number; evidencia:string; confianza:number; baja_confianza:boolean;
};

export function validateCandidates(raw: any, pages: any[], allowed: string[]):ExtractionCandidate[] {
  if (!raw || !Array.isArray(raw.sugerencias)) throw new Error('RESPUESTA_MODELO_INVALIDA');
  const used = new Set<string>();
  const candidates:ExtractionCandidate[]=raw.sugerencias.slice(0, 40).flatMap((item: any) => {
    const field = Object.prototype.hasOwnProperty.call(EXTRACTION_FIELDS,item?.campo)?EXTRACTION_FIELDS[item.campo]:undefined;
    const page = pages.find(p => p.pagina === item?.pagina);
    const value = typeof item?.valor === 'string' ? normalizeCandidateValue(item.campo, item.valor.trim()) : '';
    let quote = typeof item?.evidencia === 'string' ? item.evidencia.trim() : '';
    if (!field || !allowed.includes(item.campo) || used.has(item.campo) || !page || typeof item.confianza !== 'number' || extractionValueValidationError(item.campo,value)
      || quote.length < 3 || (!field.match && quote.length > 600)) return [];
    const compactQuote = field.match ? compactIdentityEvidence(item.campo, page.texto, value) : '';
    if (compactQuote && normalizedValueIsGrounded(field, value, compactQuote)) quote = compactQuote;
    if (literalValueIndex(page.texto, quote) < 0) return [];
    // No se presenta un valor que no esté sustentado por el fragmento OCR.
    const grounded = normalizedValueIsGrounded(field, value, quote);
    if (!grounded) return [];
    // An average page score must not lend confidence to an unreadable title line.
    const confidence = Math.min(confidenceValue(item.confianza), evidenceConfidence(page, quote,Boolean(field.match)));
    if (extractionSuggestionQualityError({ campo: item.campo, valor: value, evidencia: quote, confianza: confidence })) return [];
    used.add(item.campo);
    return [{ campo: item.campo, valor: value, pagina: page.pagina, evidencia: quote, confianza: confidence, baja_confianza: confidence < 0.85 }];
  });
  // Coherencia transversal equivalente al formulario manual: solo el
  // pasaporte admite letras; CC, CE y PEP deben conservar un número decimal.
  return coherentIdentityCandidates(candidates);
}

/** Recheck after merging native OCR and visual fields, not only within each pass. */
export function coherentIdentityCandidates<T extends { campo:string; valor:string }>(candidates:T[]):T[] {
  const documentType=candidates.find(item=>item.campo==='documentType')?.valor;
  return candidates.filter(item=>item.campo!=='documentNumber'||!documentType||documentType==='PA'||/^\d+$/.test(item.valor));
}

export async function extractionProfile(db: any, docenteId: string) {
  const [profile] = await db.query(`SELECT d.*, p.nom_largo, p.num_identificacion, p.tip_identificacion, p.gen_tercero, p.fec_nacimiento
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
export async function lockExtractionSuggestions(db: any, docenteId: string, ids: string[], payload: any, humanCorrection = false) {
  await db.query('SELECT id FROM academic_work_plan."Docente" WHERE id::text = $1 FOR UPDATE', [docenteId]);
  await db.query(`SELECT p.id_person FROM auth.personas p JOIN academic_work_plan."Docente" d
    ON d."personaId"::text = p.id_person::text WHERE d.id::text = $1 FOR UPDATE OF p`, [docenteId]);
  const rows = await db.query(`SELECT s.*, d.estado AS documento_estado, j.estado AS trabajo_estado, d.tipo_soporte, d.categoria_codigo
    FROM academic_work_plan."RundExtraccionSugerencia" s
    JOIN academic_work_plan."RundExtraccionTrabajo" j ON j.id = s.trabajo_id
    JOIN academic_work_plan."RundDocumentoPerfil" d ON d.id = j.documento_id
    WHERE s.id = ANY($1::uuid[]) AND j.docente_id::text = $2 FOR UPDATE OF s, d`, [ids, docenteId]);
  if (rows.length !== ids.length || new Set(rows.map((s: any) => s.campo)).size !== ids.length) throw new ConflictException('Las sugerencias no corresponden a este perfil o repiten un campo.');
  const profile = await extractionProfile(db, docenteId);
  for (const s of rows) {
    if (s.estado !== 'PENDIENTE' || s.documento_estado !== 'ACTIVO' || s.trabajo_estado !== 'COMPLETADO') throw new ConflictException('La sugerencia ya fue revisada o su PDF dejó de estar vigente. Actualice el expediente.');
    if (!Object.prototype.hasOwnProperty.call(EXTRACTION_FIELDS,s.campo) || typeof payload[s.campo] !== 'string' || !payload[s.campo].trim()) throw new BadRequestException('Revise el valor del campo sugerido antes de confirmar.');
    // Older analyses of general attachments could propose rows the document does not accredit.
    if ((s.tipo_soporte || s.categoria_codigo) && !extractionFieldInScope(s, s.campo)) throw new ConflictException('Este documento no acredita ese dato. Rechace la sugerencia.');
    if (!humanCorrection && comparable(payload[s.campo]) === comparable(s.valor) && extractionSuggestionQualityError(s)) {
      throw new ConflictException('La lectura OCR no es fiable. Revise el PDF y corrija el dato con su motivo o vuelva a analizar el archivo.');
    }
    if (comparable(profile[s.campo]) !== comparable(s.valor_previo)) throw new ConflictException('El dato del perfil cambió desde la extracción. Descarte esta sugerencia y vuelva a procesar el documento.');
  }
  return rows;
}

export async function confirmExtractionSuggestions(db: any, rows: any[], payload: any, actorId: string, reason: string) {
  for (const s of rows) await db.query(`UPDATE academic_work_plan."RundExtraccionSugerencia"
    SET estado = $2, valor_confirmado = $3, revisado_por = $4, motivo = $5, revisado_en = now() WHERE id = $1`,
  [s.id, comparable(s.valor) === comparable(payload[s.campo]) ? 'APROBADA' : 'CORREGIDA', payload[s.campo].trim(), actorId, reason]);
}
