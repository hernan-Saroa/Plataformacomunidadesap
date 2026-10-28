import * as XLSX from 'xlsx';
import { sanitizeText } from './textSanitizer';
import { OFFICIAL_TERRITORIALES_ESAP } from '../../shared/territoriales-cetaps-esap';
import {
  BANCO_DOCENTES_COLUMNS,
  buildBancoDocentesWorkbook,
  bancoDocentesWorkbookToBlob,
  currentBancoDocentesPeriodo,
  saveBlobAs,
  type BancoDocentesCellValue,
} from './bancoDocentesWorkbook';

export const BANCO_DOCENTES_HEADERS: readonly string[] = BANCO_DOCENTES_COLUMNS.map((column) => column.header);

type PreviewStatus = 'valido' | 'advertencia' | 'invalido';
type PreviewAction = 'insert' | 'update' | 'no_change';
type ApplyStatus = 'pendiente' | 'procesado' | 'fallido' | 'omitido';

export interface BancoDocentePreviewRow {
  id: string;
  fila: number;
  identificador: string;
  nombre: string;
  estado: PreviewStatus;
  accion: PreviewAction;
  mensajes: string[];
  errores: string[];
  advertencias: string[];
  datos: Record<string, unknown> | null;
  resultadoAplicacion: ApplyStatus;
  mensajeAplicacion: string | null;
}

export interface ParseBancoDocentesContext {
  existingDocuments?: Set<string>;
  existingInstitutionalEmails?: Map<string, string>;
}

type NormalizedInputRow = Record<string, unknown>;

const REQUIRED_FIELDS = [
  { key: 'documentNumber', label: 'documento de identidad' },
  { key: 'nombreCompleto', label: 'nombre completo' },
  { key: 'genero', label: 'género' },
  { key: 'fechaNacimiento', label: 'fecha de nacimiento' },
  { key: 'correoInstitucional', label: 'correo institucional' },
  { key: 'vinculacion', label: 'vinculación' },
  { key: 'territorial', label: 'territorial' },
  { key: 'dedicacion', label: 'dedicación' },
  { key: 'categoria', label: 'categoría de escalafón' },
  { key: 'fechaInicioVinculacion', label: 'inicio de vinculación' },
  { key: 'actoAdministrativoVinculacion', label: 'acto administrativo' },
  { key: 'nivelFormacion', label: 'nivel de formación' },
  { key: 'pregrado', label: 'título de pregrado' },
  { key: 'nucleoTematico', label: 'núcleo temático' },
  { key: 'perfilAcademico', label: 'perfil académico' },
] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const TERRITORIALES_OFICIALES = OFFICIAL_TERRITORIALES_ESAP.map((territorial) => ({
  codigo: territorial.codigo,
  nombre: territorial.nombre,
}));

const TERRITORIAL_ALIAS_ENTRIES: Array<[string, string[]]> = OFFICIAL_TERRITORIALES_ESAP.map((territorial) => [
  territorial.nombre,
  territorial.aliases,
]);

const HEADER_ALIASES = {
  orderIndex: ['0', 'orden', 'ordenlistado', 'item', 'numero', 'indice'],
  documentNumber: ['documentodeidentidad', 'documento', 'documentoidentidad', 'numerodedocumento', 'nrodocumento', 'cedula', 'identificacion'],
  documentType: ['tipodocumento', 'tipoidentificacion', 'documenttype'],
  nombreCompleto: ['nombrecompleto', 'nombredocente', 'nombre', 'nombrecomp'],
  primerNombre: ['primernombre', 'primer_nombre'],
  segundoNombre: ['segundonombre', 'segundo_nombre'],
  primerApellido: ['primerapellido', 'primer_apellido'],
  segundoApellido: ['segundoapellido', 'segundo_apellido'],
  territorial: ['territorial', 'territorialvinculacion', 'sedeterritorial', 'territorialasignada'],
  codigoTerritorial: ['codigoterritorial', 'codigoterritorialvinculacion'],
  vinculacion: ['vinculacion', 'formavinculacion', 'tipovinculacion', 'tipodevinculacion'],
  categoria: ['categoria', 'categoriaescalafon', 'escalafon'],
  nucleoTematico: ['nucleotematico', 'nucleotematicodevinculacion', 'areadeespecializacion'],
  nivelFormacion: ['niveldeformacion', 'nivelformacion'],
  perfilAcademicoPro: ['perfilacademicopro', 'perfilacademicoprofesional'],
  perfilAcademico: ['perfilacademico'],
  pregrado: ['pregrado', 'titulopregrado'],
  especializacion: ['especializacion', 'tituloespecializacion'],
  maestria: ['maestria', 'maestriadoctorado', 'titulomaestria'],
  doctorado: ['doctorado', 'titulodoctorado'],
  posDoctorado: ['posdoctorado', 'tituloposdoctorado'],
  investigacion: ['investigacion2025', 'investigacion', 'investigacionactiva'],
  origenVinculacion: ['origendevinculacion', 'origenvinculacion'],
  actoAdministrativoVinculacion: ['actoadministrativodevinculacion', 'actoadministrativovinculacion', 'actoadministrativo'],
  correoInstitucional: ['correoinstitucional', 'emailinstitucional'],
  correoAlternativo: ['correopersonal', 'correoalternativo', 'correopersonalalternativo'],
  telefono: ['telefono', 'celular', 'numerocelular'],
  ultimaEvaluacion: ['ultimaevaluacion'],
  dedicacion: ['dedicacion', 'tipodedicacion'],
  situacionAdministrativa: ['situacionadministrativa'],
  fechaInicioVinculacion: ['iniciodevinculacion', 'iniciovinculacion', 'fechainiciovinculacion'],
  fechaFinVinculacion: ['findevinculacion', 'finvinculacion', 'fechafinvinculacion'],
  puntajeSalarial: ['puntajesalarial'],
  genero: ['genero'],
  fechaNacimiento: ['nacimiento', 'fechadenacimiento', 'fechanacimiento'],
  edad: ['edad'],
  rangoEdad: ['rangodeedad'],
  regimenNormativo: ['regimennormativo'],
  sexoBiologico: ['sexobiologico'],
  horasAsignables: ['horasaprogramar', 'horasprogramables', 'horasasignables', 'horaspta'],
  dedicacionHorasSemana: ['dedicacionhorassemana', 'horassemanales'],
  situacionCategoria: ['situacioncategoria'],
  observaciones: ['observaciones'],
  idRund: ['idrund'],
  periodoAplicacion: ['periodoaplicacion', 'periodo'],
  estadoRegistro: ['estadoregistro', 'estadodocente', 'estado'],
} as const;

const HEADER_KEYS = new Set<string>([
  ...Object.values(HEADER_ALIASES).flat(),
  ...BANCO_DOCENTES_HEADERS.map((header) => normalizeHeaderKey(header)),
]);

function normalizeHeaderKey(value: string): string {
  return sanitizeText(String(value))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function toCleanString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = sanitizeText(String(value)).trim();
  return normalized === '' ? null : normalized;
}

/** Celdas con varios correos ("a@x.co;b@x.co"): el backend conserva el primero. */
function extractFirstEmail(value: unknown): string | null {
  const text = toCleanString(value);
  if (!text) return null;
  return text.match(/[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+/)?.[0] ?? text;
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (value) return value;
  }
  return null;
}

function normalizeDocumentNumber(value: unknown): string | null {
  const text = toCleanString(value);
  if (!text) return null;
  return text.replace(/[\s.-]+/g, '');
}

function formatDateOnlyUtc(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function parseExcelDate(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return formatDateOnlyUtc(value);

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0));
    return formatDateOnlyUtc(date);
  }

  const text = String(value).trim();
  if (!text) return null;

  const ddmmyyyyMatch = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (ddmmyyyyMatch) {
    const date = new Date(Date.UTC(Number(ddmmyyyyMatch[3]), Number(ddmmyyyyMatch[2]) - 1, Number(ddmmyyyyMatch[1])));
    return formatDateOnlyUtc(date);
  }

  const yyyymmddMatch = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (yyyymmddMatch) {
    const date = new Date(Date.UTC(Number(yyyymmddMatch[1]), Number(yyyymmddMatch[2]) - 1, Number(yyyymmddMatch[3])));
    return formatDateOnlyUtc(date);
  }

  const parsed = new Date(text);
  return formatDateOnlyUtc(parsed);
}

function parseNumeric(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.includes(',') && raw.includes('.')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(',', '.');
  const parsed = Number(normalized.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatExportDate(value: unknown): string {
  const iso = parseExcelDate(value);
  if (!iso) return '';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return sanitizeText(String(iso));
  }

  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

function buildNormalizedHeaderRow(row: Record<string, unknown>): NormalizedInputRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeaderKey(key), value]),
  );
}

function getRowValue(row: NormalizedInputRow, aliases: readonly string[]): unknown {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, alias)) {
      return row[alias];
    }
  }
  return null;
}

function findBancoDocentesHeaderIndex(matrix: unknown[][]): number {
  return matrix.findIndex((row) => {
    const keys = new Set((row || []).map((cell) => normalizeHeaderKey(String(cell || ''))));
    return (keys.has('documentoidentidad') || keys.has('documento') || keys.has('documentodeidentidad'))
      && (keys.has('nombrecompleto') || keys.has('nombre'))
      && (keys.has('vinculacion') || keys.has('tipovinculacion'));
  });
}

function sheetToBancoDocenteRows(sheet: XLSX.WorkSheet): { rows: Record<string, unknown>[]; firstDataRowNumber: number } {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
  const headerIndex = findBancoDocentesHeaderIndex(matrix);
  if (headerIndex < 0) {
    return {
      rows: XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true }),
      firstDataRowNumber: 2,
    };
  }

  const headers = (matrix[headerIndex] || []).map((header) => toCleanString(header) || '');
  const rows = matrix.slice(headerIndex + 1)
    .filter((row) => (row || []).some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? null]).filter(([header]) => header)));

  return { rows, firstDataRowNumber: headerIndex + 2 };
}

function joinNameParts(parts: Array<string | null>): string | null {
  const fullName = parts.filter(Boolean).join(' ').trim();
  return fullName || null;
}

function normalizeLookupText(value: string | null): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function resolveTerritorialName(value: string | null): string | null {
  if (!value) return null;
  const lookup = normalizeLookupText(value);
  if (!lookup) return null;

  const exact = TERRITORIALES_OFICIALES.find((item) => normalizeLookupText(item.nombre) === lookup);
  if (exact) return exact.nombre;

  if (lookup === 'nortesantander') return 'Norte de Santander';

  const alias = TERRITORIAL_ALIAS_ENTRIES.find(([, aliases]) => aliases.includes(lookup));
  if (alias) return alias[0];

  // Igual que el backend: "BOLÍVAR" resuelve a "Bolívar-Córdoba-Sucre".
  if (lookup.length < 4) return null;
  const partial = TERRITORIALES_OFICIALES.find((item) => {
    const name = normalizeLookupText(item.nombre);
    return name.includes(lookup) || lookup.includes(name);
  });
  return partial?.nombre || null;
}

function normalizeDedicacionLabel(value: string | null): string | null {
  const lookup = normalizeLookupText(value);
  if (!lookup) return null;
  if (lookup === 'tc' || lookup.includes('tiempocompleto')) return 'Tiempo Completo';
  if (lookup === 'mt' || lookup.includes('mediotiempo')) return 'Medio Tiempo';
  return null;
}

function normalizeVinculacionLabel(value: string | null): string | null {
  const lookup = normalizeLookupText(value);
  if (!lookup) return null;
  if (lookup === 'carrera1') return 'Carrera1';
  if (lookup === 'carrera2') return 'Carrera2';
  if (lookup.includes('carrera')) return 'Carrera';
  if (lookup.includes('prueba')) return 'Periodo de Prueba';
  if (lookup.includes('ocasional')) return 'Ocasional';
  if (lookup.includes('visitante')) return 'Visitante';
  if (lookup.includes('especial')) return 'Especial';
  if (lookup.includes('catedra')) return 'Hora Cátedra';
  return null;
}

function computeEdad(fechaNacimientoIso: string | null, edadFallback: number | null): number | null {
  if (!fechaNacimientoIso) return edadFallback;

  const fecha = new Date(fechaNacimientoIso);
  if (Number.isNaN(fecha.getTime())) return edadFallback;

  const today = new Date();
  let age = today.getUTCFullYear() - fecha.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - fecha.getUTCMonth();
  const dayDiff = today.getUTCDate() - fecha.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age >= 0 ? age : edadFallback;
}

function computeRangoEdad(edad: number | null, fallback?: string | null): string | null {
  if (edad === null) return fallback || null;
  if (edad <= 35) return 'Menor de 35 a\u00f1os';
  if (edad <= 45) return 'De 36 a 45 a\u00f1os';
  if (edad <= 55) return 'De 46 a 55 a\u00f1os';
  if (edad <= 65) return 'De 56 a 65 a\u00f1os';
  return 'Mayor de 65 a\u00f1os';
}
function deriveHorasAsignables(dedicacion: string | null, explicitValue: number | null): number | null {
  if (explicitValue !== null && explicitValue >= 0) return Math.trunc(explicitValue);
  if (dedicacion === 'Medio Tiempo') return 400;
  if (dedicacion === 'Tiempo Completo') return 800;
  return null;
}

function normalizeExcelDocenteRow(rawRow: Record<string, unknown>) {
  const row = buildNormalizedHeaderRow(rawRow);
  const primerNombre = toCleanString(getRowValue(row, HEADER_ALIASES.primerNombre));
  const segundoNombre = toCleanString(getRowValue(row, HEADER_ALIASES.segundoNombre));
  const primerApellido = toCleanString(getRowValue(row, HEADER_ALIASES.primerApellido));
  const segundoApellido = toCleanString(getRowValue(row, HEADER_ALIASES.segundoApellido));
  const nombreCompleto = firstNonEmpty(
    toCleanString(getRowValue(row, HEADER_ALIASES.nombreCompleto)),
    joinNameParts([primerNombre, segundoNombre, primerApellido, segundoApellido]),
  );

  const dedicacionRaw = toCleanString(getRowValue(row, HEADER_ALIASES.dedicacion));
  const vinculacionRaw = toCleanString(getRowValue(row, HEADER_ALIASES.vinculacion));
  const territorialRaw = toCleanString(getRowValue(row, HEADER_ALIASES.territorial));
  const fechaNacimientoRaw = getRowValue(row, HEADER_ALIASES.fechaNacimiento);
  const fechaInicioRaw = getRowValue(row, HEADER_ALIASES.fechaInicioVinculacion);
  const fechaFinCell = getRowValue(row, HEADER_ALIASES.fechaFinVinculacion);
  const fechaFinRaw = normalizeLookupText(toCleanString(fechaFinCell)) === 'indefinido' ? null : fechaFinCell;

  const fechaNacimiento = parseExcelDate(fechaNacimientoRaw);
  const edad = computeEdad(fechaNacimiento, parseNumeric(getRowValue(row, HEADER_ALIASES.edad)));
  const dedicacion = normalizeDedicacionLabel(dedicacionRaw) || dedicacionRaw;

  return {
    ordenListado: parseNumeric(getRowValue(row, HEADER_ALIASES.orderIndex)),
    documentNumber: normalizeDocumentNumber(getRowValue(row, HEADER_ALIASES.documentNumber)),
    documentType: toCleanString(getRowValue(row, HEADER_ALIASES.documentType)) || 'CC',
    nombreCompleto,
    primer_nombre: primerNombre,
    segundo_nombre: segundoNombre,
    primer_apellido: primerApellido,
    segundo_apellido: segundoApellido,
    vinculacion: normalizeVinculacionLabel(vinculacionRaw) || vinculacionRaw,
    territorial: resolveTerritorialName(territorialRaw) || territorialRaw,
    codigoTerritorial: toCleanString(getRowValue(row, HEADER_ALIASES.codigoTerritorial)),
    categoria: toCleanString(getRowValue(row, HEADER_ALIASES.categoria)),
    nucleoTematico: toCleanString(getRowValue(row, HEADER_ALIASES.nucleoTematico)),
    nivelFormacion: toCleanString(getRowValue(row, HEADER_ALIASES.nivelFormacion)),
    perfilAcademicoPro: toCleanString(getRowValue(row, HEADER_ALIASES.perfilAcademicoPro)),
    perfilAcademico: toCleanString(getRowValue(row, HEADER_ALIASES.perfilAcademico)),
    pregrado: toCleanString(getRowValue(row, HEADER_ALIASES.pregrado)),
    especializacion: toCleanString(getRowValue(row, HEADER_ALIASES.especializacion)),
    maestria: toCleanString(getRowValue(row, HEADER_ALIASES.maestria)),
    doctorado: toCleanString(getRowValue(row, HEADER_ALIASES.doctorado)),
    posDoctorado: toCleanString(getRowValue(row, HEADER_ALIASES.posDoctorado)),
    investigacion: toCleanString(getRowValue(row, HEADER_ALIASES.investigacion)),
    origenVinculacion: toCleanString(getRowValue(row, HEADER_ALIASES.origenVinculacion)),
    actoAdministrativoVinculacion: toCleanString(getRowValue(row, HEADER_ALIASES.actoAdministrativoVinculacion)),
    correoInstitucional: extractFirstEmail(getRowValue(row, HEADER_ALIASES.correoInstitucional))?.toLowerCase() || null,
    correoAlternativo: extractFirstEmail(getRowValue(row, HEADER_ALIASES.correoAlternativo))?.toLowerCase() || null,
    telefono: toCleanString(getRowValue(row, HEADER_ALIASES.telefono)),
    ultimaEvaluacion: toCleanString(getRowValue(row, HEADER_ALIASES.ultimaEvaluacion)),
    regimenNormativo: toCleanString(getRowValue(row, HEADER_ALIASES.regimenNormativo)),
    dedicacion,
    dedicacionHorasSemana: parseNumeric(getRowValue(row, HEADER_ALIASES.dedicacionHorasSemana)),
    situacionAdministrativa: toCleanString(getRowValue(row, HEADER_ALIASES.situacionAdministrativa)),
    situacionCategoria: toCleanString(getRowValue(row, HEADER_ALIASES.situacionCategoria)),
    fechaInicioVinculacion: parseExcelDate(fechaInicioRaw),
    fechaFinVinculacion: parseExcelDate(fechaFinRaw),
    puntajeSalarial: parseNumeric(getRowValue(row, HEADER_ALIASES.puntajeSalarial)),
    genero: toCleanString(getRowValue(row, HEADER_ALIASES.genero)),
    sexoBiologico: toCleanString(getRowValue(row, HEADER_ALIASES.sexoBiologico)),
    fechaNacimiento,
    edad,
    rangoEdad: toCleanString(getRowValue(row, HEADER_ALIASES.rangoEdad)) || computeRangoEdad(edad),
    horasAsignables: deriveHorasAsignables(dedicacion, parseNumeric(getRowValue(row, HEADER_ALIASES.horasAsignables))),
    periodoAplicacion: toCleanString(getRowValue(row, HEADER_ALIASES.periodoAplicacion)),
    estadoRegistro: toCleanString(getRowValue(row, HEADER_ALIASES.estadoRegistro)),
    observaciones: toCleanString(getRowValue(row, HEADER_ALIASES.observaciones)),
    idRund: toCleanString(getRowValue(row, HEADER_ALIASES.idRund)),
    _raw: {
      territorial: territorialRaw,
      vinculacion: vinculacionRaw,
      dedicacion: dedicacionRaw,
      fechaNacimiento: toCleanString(fechaNacimientoRaw),
      fechaInicioVinculacion: toCleanString(fechaInicioRaw),
      fechaFinVinculacion: toCleanString(fechaFinRaw),
    },
  };
}

function buildPreviewMessages(
  docente: ReturnType<typeof normalizeExcelDocenteRow>,
  existingDocuments: Set<string>,
  existingInstitutionalEmails: Map<string, string>,
  documentCounts: Map<string, number>,
  institutionalEmailCounts: Map<string, number>,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (!docente[field.key]) {
      errors.push(`Falta ${field.label}.`);
    }
  }

  if (docente.documentNumber) {
    if (!/^[a-zA-Z0-9]+$/.test(docente.documentNumber)) {
      errors.push('El documento de identidad solo debe contener letras y números.');
    }
    if ((documentCounts.get(docente.documentNumber) || 0) > 1) {
      errors.push('Documento de identidad duplicado dentro del archivo.');
    }
    if (existingDocuments.has(docente.documentNumber)) {
      errors.push('El documento de identidad ya existe en el Banco de Docentes.');
    }
  }

  if (normalizeLookupText(docente.documentType) === 'porverificar') {
    warnings.push('El tipo de documento está por verificar; confirme si es CC, CE, PA o PEP.');
  }

  if (docente.territorial && !resolveTerritorialName(docente.territorial)) {
    errors.push('La territorial no coincide con el catálogo oficial ESAP.');
  }

  if (docente.vinculacion && !normalizeVinculacionLabel(docente.vinculacion)) {
    errors.push('La vinculación no corresponde a una opción reconocida.');
  }

  if (docente.dedicacion && !normalizeDedicacionLabel(docente.dedicacion)) {
    errors.push('La dedicación debe ser Tiempo Completo o Medio Tiempo.');
  }

  if (docente.correoInstitucional) {
    if (!EMAIL_REGEX.test(docente.correoInstitucional)) {
      errors.push('El correo institucional no tiene un formato válido.');
    }

    if ((institutionalEmailCounts.get(docente.correoInstitucional) || 0) > 1) {
      errors.push('Correo institucional duplicado dentro del archivo.');
    }

    const ownerDocument = existingInstitutionalEmails.get(docente.correoInstitucional);
    if (ownerDocument && ownerDocument !== docente.documentNumber) {
      errors.push(`El correo institucional ya está asociado al documento ${ownerDocument}.`);
    }
  }

  if (docente.correoAlternativo && !EMAIL_REGEX.test(docente.correoAlternativo)) {
    warnings.push('El correo personal no tiene un formato válido.');
  }

  if (docente._raw.fechaInicioVinculacion && !docente.fechaInicioVinculacion) {
    errors.push('La fecha de inicio de vinculación no es válida.');
  }

  if (docente._raw.fechaFinVinculacion && !docente.fechaFinVinculacion) {
    errors.push('La fecha de fin de vinculación no es válida.');
  }

  if (docente.fechaInicioVinculacion && docente.fechaFinVinculacion) {
    const fechaInicio = new Date(docente.fechaInicioVinculacion);
    const fechaFin = new Date(docente.fechaFinVinculacion);
    if (fechaInicio.getTime() > fechaFin.getTime()) {
      errors.push('La fecha de inicio de vinculación debe ser anterior a la fecha de fin.');
    }
  }

  if (docente._raw.fechaNacimiento && !docente.fechaNacimiento) {
    warnings.push('La fecha de nacimiento no es válida.');
  }

  if (docente.edad !== null && (docente.edad < 22 || docente.edad > 75)) {
    warnings.push(`La edad ${docente.edad} está fuera del rango esperado (22-75 años).`);
  }

  if (!docente.correoInstitucional && !docente.correoAlternativo) warnings.push('No se encontró correo institucional ni personal.');
  if (!docente.telefono) warnings.push('No se encontró teléfono.');

  return {
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
  };
}

function buildFullName(user: any, bancoDocente: any): string {
  return (
    toCleanString(bancoDocente?.nombre_completo) ||
    toCleanString(user?.nombre_completo) ||
    toCleanString(user?.nombre) ||
    [
      toCleanString(user?.primer_nombre),
      toCleanString(user?.segundo_nombre),
      toCleanString(user?.primer_apellido),
      toCleanString(user?.segundo_apellido),
    ].filter(Boolean).join(' ') ||
    'Sin nombre'
  );
}

function buildExportRow(user: any, index: number) {
  const bancoDocente = user?.banco_docente || user?.docente?.banco_docente || {};

  return {
    '0': bancoDocente?.orden_listado ?? index + 1,
    'Documento de identidad': normalizeDocumentNumber(bancoDocente?.documento_identidad || user?.identificacion || user?.documento || user?.document) || '',
    'Vinculación': toCleanString(bancoDocente?.vinculacion || user?.tipoVinculacion_label) || '',
    'Nombre completo': buildFullName(user, bancoDocente),
    'Territorial': toCleanString(bancoDocente?.territorial || user?.territorial_nombre) || '',
    'Categoría': toCleanString(bancoDocente?.categoria || user?.categoria_escalafon || user?.escalafon) || '',
    'Núcleo Temático': toCleanString(bancoDocente?.nucleo_tematico) || '',
    'Nivel de Formación': toCleanString(bancoDocente?.nivel_formacion) || '',
    'Perfil académico PRO': toCleanString(bancoDocente?.perfil_academico_pro) || '',
    'Perfil académico': toCleanString(bancoDocente?.perfil_academico) || '',
    'Pregrado': toCleanString(bancoDocente?.pregrado) || '',
    'Especialización': toCleanString(bancoDocente?.especializacion) || '',
    'Maestría': toCleanString(bancoDocente?.maestria) || '',
    'Doctorado': toCleanString(bancoDocente?.doctorado) || '',
    'PosDoctorado': toCleanString(bancoDocente?.posdoctorado) || '',
    'Investigación 2025': toCleanString(bancoDocente?.investigacion) || '',
    'Origen de vinculación': toCleanString(bancoDocente?.origen_vinculacion) || '',
    'Acto Administrativo de Vinculación ': toCleanString(bancoDocente?.acto_administrativo_vinculacion) || '',
    'Correo Institucional': toCleanString(bancoDocente?.correo_institucional || user?.correo_institucional || user?.email) || '',
    'Correo personal': toCleanString(bancoDocente?.correo_personal || user?.correo_alternativo) || '',
    'Telefono': toCleanString(bancoDocente?.telefono || user?.telefono || user?.phone) || '',
    'Última Evaluación': toCleanString(bancoDocente?.ultima_evaluacion) || '',
    'Dedicación': toCleanString(bancoDocente?.dedicacion || user?.dedicacion_label) || '',
    'Situación Administrativa': toCleanString(bancoDocente?.situacion_administrativa) || '',
    'Inicio de Vinculación': formatExportDate(bancoDocente?.inicio_vinculacion),
    'Fin de Vinculación': formatExportDate(bancoDocente?.fin_vinculacion),
    'Puntaje Salarial': parseNumeric(bancoDocente?.puntaje_salarial) ?? '',
    'Género': toCleanString(bancoDocente?.genero || user?.genero) || '',
    'Nacimiento': formatExportDate(bancoDocente?.nacimiento || user?.fecha_nacimiento),
    'Edad': parseNumeric(bancoDocente?.edad) ?? '',
    'Rango de edad': toCleanString(bancoDocente?.rango_edad) || '',
  };
}

function buildOfficialExportRow(user: any, index: number) {
  const bancoDocente = user?.banco_docente || user?.docente?.banco_docente || user || {};
  const documentNumber = normalizeDocumentNumber(bancoDocente?.documento_identidad || user?.identificacion || user?.documento || user?.document) || '';
  const dedicacion = toCleanString(bancoDocente?.dedicacion || user?.dedicacion_label) || '';
  const estadoDocente = toCleanString(bancoDocente?.estado || (user?.activo === false ? 'INACTIVO' : 'ACTIVO')) || '';

  return {
    DOCUMENTO_IDENTIDAD: documentNumber,
    TIPO_DOCUMENTO: toCleanString(bancoDocente?.tipo_documento || user?.tipo_identificacion) || '',
    NOMBRE_COMPLETO: buildFullName(user, bancoDocente),
    GENERO: toCleanString(bancoDocente?.genero || user?.genero) || '',
    SEXO_BIOLOGICO: toCleanString(bancoDocente?.sexo_biologico) || '',
    FECHA_NACIMIENTO: formatExportDate(bancoDocente?.nacimiento || user?.fecha_nacimiento),
    EDAD: parseNumeric(bancoDocente?.edad) ?? '',
    RANGO_EDAD: toCleanString(bancoDocente?.rango_edad) || '',
    CORREO_INSTITUCIONAL: toCleanString(bancoDocente?.correo_institucional || user?.correo_institucional || user?.email) || '',
    CORREO_PERSONAL: toCleanString(bancoDocente?.correo_personal || user?.correo_alternativo) || '',
    TELEFONO: toCleanString(bancoDocente?.telefono || user?.telefono || user?.phone) || '',
    VINCULACION: toCleanString(bancoDocente?.vinculacion || user?.tipoVinculacion_label) || '',
    REGIMEN_NORMATIVO: toCleanString(bancoDocente?.regimen_normativo || bancoDocente?.regimenNormativo) || '',
    HORAS_PTA: parseNumeric(bancoDocente?.horas_programables) ?? '',
    TERRITORIAL: toCleanString(bancoDocente?.territorial || user?.territorial_nombre) || '',
    DEDICACION: dedicacion,
    DEDICACION_HORAS_SEMANA: parseNumeric(bancoDocente?.dedicacion_horas_semana) ?? '',
    CATEGORIA_ESCALAFON: toCleanString(bancoDocente?.categoria || user?.categoria_escalafon || user?.escalafon) || '',
    INICIO_VINCULACION: formatExportDate(bancoDocente?.inicio_vinculacion),
    FIN_VINCULACION: formatExportDate(bancoDocente?.fin_vinculacion),
    ESTADO_DOCENTE: estadoDocente,
    ACTO_ADMINISTRATIVO: toCleanString(bancoDocente?.acto_administrativo_vinculacion) || '',
    ORIGEN_VINCULACION: toCleanString(bancoDocente?.origen_vinculacion) || '',
    PUNTAJE_SALARIAL: parseNumeric(bancoDocente?.puntaje_salarial) ?? '',
    SITUACION_ADMINISTRATIVA: toCleanString(bancoDocente?.situacion_administrativa) || '',
    SITUACION_CATEGORIA: toCleanString(bancoDocente?.situacion_categoria) || '',
    NIVEL_FORMACION: toCleanString(bancoDocente?.nivel_formacion) || '',
    TITULO_PREGRADO: toCleanString(bancoDocente?.pregrado) || '',
    TITULO_ESPECIALIZACION: toCleanString(bancoDocente?.especializacion) || '',
    TITULO_MAESTRIA: toCleanString(bancoDocente?.maestria) || '',
    TITULO_DOCTORADO: toCleanString(bancoDocente?.doctorado) || '',
    TITULO_POSDOCTORADO: toCleanString(bancoDocente?.posdoctorado) || '',
    NUCLEO_TEMATICO: toCleanString(bancoDocente?.nucleo_tematico) || '',
    PERFIL_ACADEMICO: toCleanString(bancoDocente?.perfil_academico) || '',
    INVESTIGACION_ACTIVA: toCleanString(bancoDocente?.investigacion) || '',
    ULTIMA_EVALUACION: toCleanString(bancoDocente?.ultima_evaluacion) || '',
    OBSERVACIONES: toCleanString(bancoDocente?.observaciones) || '',
    ID_RUND: toCleanString(bancoDocente?.id_rund || bancoDocente?.idRund) || '',
  };
}

export async function parseBancoDocentesFile(
  file: File,
  contextOrExistingDocuments: ParseBancoDocentesContext | Set<string> = {},
) {
  const context = contextOrExistingDocuments instanceof Set
    ? { existingDocuments: contextOrExistingDocuments, existingInstitutionalEmails: new Map<string, string>() }
    : {
        existingDocuments: contextOrExistingDocuments.existingDocuments || new Set<string>(),
        existingInstitutionalEmails: contextOrExistingDocuments.existingInstitutionalEmails || new Map<string, string>(),
      };

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const { rows, firstDataRowNumber } = sheetToBancoDocenteRows(sheet);

  if (!rows.length) {
    throw new Error('El archivo no contiene registros.');
  }

  const firstRowHeaders = Object.keys(rows[0] || {});
  const normalizedHeaders = new Set(firstRowHeaders.map((header) => normalizeHeaderKey(header)));
  const hasAnyRecognizedHeader = Array.from(normalizedHeaders).some((header) => HEADER_KEYS.has(header));
  if (!hasAnyRecognizedHeader) {
    throw new Error('El archivo no corresponde a una plantilla reconocida del Banco de Docentes.');
  }

  const unknownHeaders = firstRowHeaders.filter((header) => !HEADER_KEYS.has(normalizeHeaderKey(header)));
  const normalizedRows = rows.map((row) => normalizeExcelDocenteRow(row));
  const documentCounts = new Map<string, number>();
  const institutionalEmailCounts = new Map<string, number>();

  for (const docente of normalizedRows) {
    if (docente.documentNumber) {
      documentCounts.set(docente.documentNumber, (documentCounts.get(docente.documentNumber) || 0) + 1);
    }
    if (docente.correoInstitucional) {
      institutionalEmailCounts.set(docente.correoInstitucional, (institutionalEmailCounts.get(docente.correoInstitucional) || 0) + 1);
    }
  }

  const previewRows: BancoDocentePreviewRow[] = normalizedRows.map((docente, index) => {
    const { errors, warnings } = buildPreviewMessages(
      docente,
      context.existingDocuments || new Set<string>(),
      context.existingInstitutionalEmails || new Map<string, string>(),
      documentCounts,
      institutionalEmailCounts,
    );

    if (index === 0 && unknownHeaders.length > 0) {
      warnings.unshift(`Se ignorarán columnas no reconocidas: ${unknownHeaders.join(', ')}.`);
    }

    const estado: PreviewStatus = errors.length > 0 ? 'invalido' : warnings.length > 0 ? 'advertencia' : 'valido';
    const accion: PreviewAction = errors.length > 0 ? 'no_change' : 'insert';

    const { _raw, ...payload } = docente;
    const rowId = `preview-${index + 1}`;

    return {
      id: rowId,
      fila: firstDataRowNumber + index,
      identificador: docente.documentNumber || `fila-${firstDataRowNumber + index}`,
      nombre: docente.nombreCompleto || 'Sin nombre',
      estado,
      mensajes: [...errors, ...warnings],
      errores: errors,
      advertencias: warnings,
      accion,
      datos: errors.length > 0 ? null : { ...payload, __previewId: rowId, __sourceRowNumber: firstDataRowNumber + index },
      resultadoAplicacion: errors.length > 0 ? 'omitido' : 'pendiente',
      mensajeAplicacion: null,
    };
  });

  return previewRows;
}

export async function downloadBancoDocentesTemplate(periodo?: string) {
  const periodoPlantilla = periodo || currentBancoDocentesPeriodo();
  const workbook = await buildBancoDocentesWorkbook({ periodo: periodoPlantilla });
  saveBlobAs(await bancoDocentesWorkbookToBlob(workbook), `CargaDocentes_RUND_${periodoPlantilla}_PLANTILLA.xlsx`);
}

function toExportCellValue(header: string, value: unknown): BancoDocentesCellValue {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number') return value;
  if (header === 'DOCUMENTO_IDENTIDAD' && /^[1-9]\d{0,14}$/.test(String(value))) return Number(value);
  return String(value);
}

export async function downloadBancoDocentesExport(users: any[], fileName?: string, periodo?: string) {
  const orderedUsers = [...users].sort((left, right) => {
    const leftBanco = left?.banco_docente || left?.docente?.banco_docente || {};
    const rightBanco = right?.banco_docente || right?.docente?.banco_docente || {};

    const leftOrder = parseNumeric(leftBanco?.orden_listado);
    const rightOrder = parseNumeric(rightBanco?.orden_listado);
    if (leftOrder !== null && rightOrder !== null && leftOrder !== rightOrder) return leftOrder - rightOrder;
    if (leftOrder !== null) return -1;
    if (rightOrder !== null) return 1;
    return buildFullName(left, leftBanco).localeCompare(buildFullName(right, rightBanco), 'es');
  });

  const rows = orderedUsers.map((user, index) => {
    const official = buildOfficialExportRow(user, index) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(official).map(([header, value]) => [header, toExportCellValue(header, value)]));
  });
  const stamp = new Date();
  const safeFileName = fileName || `BANCO_DOCENTES_ESAP_${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, '0')}-${String(stamp.getDate()).padStart(2, '0')}.xlsx`;
  const workbook = await buildBancoDocentesWorkbook({ rows, periodo, emptyRows: 1 });
  saveBlobAs(await bancoDocentesWorkbookToBlob(workbook), safeFileName);
}
