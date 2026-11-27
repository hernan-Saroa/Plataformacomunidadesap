import type { GraduadoData } from '../../services/api/graduados.service';

export type FieldKey =
  | 'identificacion'
  | 'estudiante'
  | 'titulo'
  | 'registro'
  | 'acta'
  | 'libro'
  | 'fechaRegistro'
  | 'anioGrado'
  | 'correo'
  | 'telefono'
  | 'territorial'
  | 'sede';

type FieldErrors = Partial<Record<FieldKey, string[]>>;

export type ParsedGraduateRow = {
  rowNumber: number;
  identificacion: string;
  estudiante: string;
  titulo: string;
  registro: string;
  acta: string;
  libro: string;
  fechaRegistro: string;
  anioGrado: string;
  correo: string;
  telefono: string;
  telefonoNormalizado: string;
  territorial: string;
  sede: string;
  errors: string[];
  fieldErrors: FieldErrors;
  payload?: Partial<GraduadoData>;
};

type Catalogs = {
  programsByKey: Map<string, string>;
};

export const FIELD_LABELS: Record<FieldKey, string> = {
  identificacion: 'IDENTIFICACION',
  estudiante: 'ESTUDIANTE',
  titulo: 'TITULO',
  registro: 'REGISTRO',
  acta: 'ACTA/FOLIO',
  libro: 'LIBRO',
  fechaRegistro: 'FECHAREGISTRO',
  anioGrado: 'AñoGrado',
  correo: 'CORREO',
  telefono: 'TELEFONO',
  territorial: 'TERRITORIAL',
  sede: 'SEDE',
};

export const GRADUATE_TEMPLATE_COLUMNS = [
  ['identificacion', 'IDENTIFICACION'],
  ['estudiante', 'ESTUDIANTE'],
  ['titulo', 'TITULO'],
  ['registro', 'REGISTRO'],
  ['acta', 'ACTA'],
  ['libro', 'LIBRO'],
  ['fechaRegistro', 'FECHAREGISTRO'],
  ['anioGrado', 'AñoGrado'],
  ['correo', 'CORREO'],
  ['telefono', 'TELEFONO'],
  ['territorial', 'TERRITORIAL'],
  ['sede', 'SEDE'],
] as const satisfies readonly (readonly [FieldKey, string])[];

export const getGraduateFieldErrors = (fieldErrors?: FieldErrors) =>
  Object.entries(fieldErrors ?? {}).flatMap(([field, messages]) =>
    (messages || []).map((message) => ({ label: FIELD_LABELS[field as FieldKey], message })),
  );

export const NUMERIC_FIELD_RULES: Record<
  'registro' | 'acta' | 'libro',
  { minLength: number; maxLength: number; label: string }
> = {
  registro: { minLength: 1, maxLength: 20, label: 'REGISTRO' },
  acta: { minLength: 1, maxLength: 10, label: 'ACTA/FOLIO' },
  libro: { minLength: 1, maxLength: 10, label: 'LIBRO' },
};

const PHONE_MIN_LENGTH = 7;
const PHONE_MAX_LENGTH = 10;
const STUDENT_NAME_MAX_LENGTH = 255;
const TITLE_MAX_LENGTH = 255;
const TERRITORIAL_MAX_LENGTH = 255;
const SEDE_MAX_LENGTH = 100;

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  identificacion: ['IDENTIFICACION', 'DOCUMENTO', 'CEDULA', 'NUMERO_DOCUMENTO'],
  estudiante: ['ESTUDIANTE', 'NOMBRE', 'NOMBRE_COMPLETO', 'GRADUADO'],
  titulo: ['TITULO', 'PROGRAMA', 'PROGRAMA_ACADEMICO', 'TITULO_OBTENIDO'],
  registro: ['REGISTRO', 'NUM_REGISTRO', 'NUMERO_REGISTRO'],
  acta: ['ACTA', 'NUM_ACTA', 'NUMERO_ACTA', 'FOLIO', 'NUM_FOLIO', 'NUMERO_FOLIO'],
  libro: ['LIBRO', 'NUM_LIBRO', 'NUMERO_LIBRO'],
  fechaRegistro: ['FECHAREGISTRO', 'FECHA_REGISTRO', 'FECHA DE REGISTRO', 'FECHA_GRADO'],
  anioGrado: ['AñoGrado', 'ANIOGRADO', 'ANO_GRADO', 'AÑO_GRADO', 'YEAR_GRADO'],
  correo: ['CORREO', 'EMAIL', 'CORREO_ELECTRONICO'],
  telefono: ['TELEFONO', 'TELÉFONO', 'CELULAR', 'PHONE'],
  territorial: ['TERRITORIAL', 'SECCIONAL', 'SECCIONAL_NAME'],
  sede: ['SEDE', 'CAMPUS', 'CETAP'],
};

export const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeHeader = (value: string) => normalizeKey(value).replace(/\s+/g, '');

const normalizeDisplayValue = (value: string) => value.trim().replace(/\s+/g, ' ');

export const uniqueSorted = (values: string[]) => {
  const byKey = new Map<string, string>();

  values.forEach((value) => {
    const cleaned = normalizeDisplayValue(value);
    const key = normalizeKey(cleaned);
    if (!key || byKey.has(key)) return;
    byKey.set(key, cleaned);
  });

  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, 'es'));
};

export const getTodayIso = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const NORMALIZED_FIELD_ALIASES = Object.entries(FIELD_ALIASES).map(
  ([field, aliases]) => [field as FieldKey, aliases.map(normalizeHeader)] as const,
);

export const getGraduateColumns = (headers: Record<string, unknown>) => {
  const entries = Object.entries(headers).map(
    ([column, label]) => [column, normalizeHeader(String(label ?? ''))] as const,
  );
  const columns: Partial<Record<FieldKey, string>> = {};
  for (const [field, aliases] of NORMALIZED_FIELD_ALIASES) {
    const match = entries.find(([, label]) => aliases.includes(label));
    if (match) columns[field] = match[0];
  }
  return columns;
};

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
  if (parts.length <= 1) {
    return { firstName: parts[0] || 'Graduado', lastName: '' };
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.slice(-1).join(' '),
  };
};

const inferProgramType = (title: string) => {
  const normalized = normalizeKey(title);
  if (normalized.includes('maestr')) return 'Maestría';
  if (normalized.includes('especial')) return 'Especialización';
  return 'Pregrado';
};

const parseDateToIso = (value: string, fallbackYear?: string) => {
  const trimmed = value.trim();
  if (trimmed) {
    const serial = Number(trimmed.replace(',', '.'));
    if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      return new Date(excelEpoch + serial * 86400000).toISOString().slice(0, 10);
    }

    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    const localMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (localMatch) {
      const day = Number(localMatch[1]);
      const month = Number(localMatch[2]);
      const rawYear = localMatch[3];
      const year = Number(rawYear.length === 2 ? `20${rawYear}` : rawYear);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    return '';
  }

  const year = Number((fallbackYear || '').replace(/\D/g, ''));
  if (Number.isInteger(year) && year >= 1900 && year <= 2100) {
    return `${year}-12-31`;
  }
  return '';
};

const validateEmail = (value: string) => {
  const email = value.trim().toLowerCase();
  if (!email) return true;
  if (email.length > 254 || /\s/.test(email)) return false;

  const parts = email.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domain] = parts;
  if (!localPart || !domain || localPart.length > 64) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return false;
  }
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)) {
    return false;
  }

  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }
  if (!/^[a-z0-9.-]+$/i.test(domain)) return false;

  const domainLabels = domain.split('.');
  if (domainLabels.length < 2) return false;

  const validDomainLabels = domainLabels.every((label) => {
    if (!label || label.length > 63) return false;
    return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label);
  });
  if (!validDomainLabels) return false;

  const tld = domainLabels[domainLabels.length - 1];
  return /^[a-z]{2,24}$/i.test(tld);
};

const validateName = (value: string) =>
  /^[\p{L}\s.'-]+$/u.test(value) && /\p{L}/u.test(value) && !/\d/.test(value);

const hasControlCharacters = (value: string) => /[\u0000-\u001F\u007F]/.test(value);

export const buildCatalogs = (programOptions: string[]): Catalogs => ({
  programsByKey: new Map(uniqueSorted(programOptions).map(program=>[normalizeKey(program),program])),
});

const resolveCatalogValue = (value: string, options: Map<string, string>) =>
  options.get(normalizeKey(value));

const addFieldError = (
  errors: string[],
  fieldErrors: FieldErrors,
  field: FieldKey,
  message: string,
) => {
  const label = FIELD_LABELS[field];
  errors.push(`${label}: ${message}`);
  fieldErrors[field] = [...(fieldErrors[field] || []), message];
};

const validateIdentificationNumber = (
  identificacion: string,
  addError: (field: FieldKey, message: string) => void,
) => {
  if (!identificacion) {
    addError('identificacion', 'es obligatoria.');
    return;
  }

  if (!/^\d{5,20}$/.test(identificacion)) {
    addError('identificacion', 'debe tener entre 5 y 20 dígitos.');
  }
};

const validateNumericControlField = (
  field: 'registro' | 'acta' | 'libro',
  value: string,
  addError: (field: FieldKey, message: string) => void,
) => {
  const rule = NUMERIC_FIELD_RULES[field];
  if (!value) {
    addError(
      field,
      `es obligatorio y debe tener entre ${rule.minLength} y ${rule.maxLength} dígitos.`,
    );
    return;
  }
  if (!/^\d+$/.test(value)) {
    addError(field, 'debe ser numérico, sin letras, guiones ni prefijos.');
    return;
  }
  if (/^0+$/.test(value)) {
    addError(field, 'no puede ser cero.');
    return;
  }
  if (value.length < rule.minLength || value.length > rule.maxLength) {
    addError(
      field,
      `debe tener entre ${rule.minLength} y ${rule.maxLength} dígitos.`,
    );
  }
};

export const buildParsedRow = (
  row: Record<string, unknown>,
  rowNumber: number,
  duplicateKeys: Set<string>,
  catalogs: Catalogs,
  columns: ReturnType<typeof getGraduateColumns>,
  today = getTodayIso(),
): ParsedGraduateRow => {
  const getValue = (field: FieldKey) => String(row[columns[field] ?? ''] ?? '').trim();
  const identificacion = getValue('identificacion');
  const estudiante = normalizeDisplayValue(getValue('estudiante'));
  const titulo = normalizeDisplayValue(getValue('titulo'));
  const registro = getValue('registro');
  const acta = getValue('acta');
  const libro = getValue('libro');
  const fechaRegistro = getValue('fechaRegistro');
  const anioGrado = getValue('anioGrado');
  const correo = getValue('correo').toLowerCase();
  const telefono = getValue('telefono');
  const telefonoNormalizado = telefono;
  const territorial = normalizeDisplayValue(getValue('territorial'));
  const sede = normalizeDisplayValue(getValue('sede'));
  const errors: string[] = [];
  const fieldErrors: FieldErrors = {};
  const addError = (field: FieldKey, message: string) =>
    addFieldError(errors, fieldErrors, field, message);

  if (identificacion && !/^\d+$/.test(identificacion)) {
    addError('identificacion', 'solo debe contener números, sin puntos, guiones, espacios ni letras.');
  } else if (/^0+$/.test(identificacion)) {
    addError('identificacion', 'no puede estar compuesta solo por ceros.');
  }
  validateIdentificationNumber(identificacion, addError);

  if (!estudiante) {
    addError('estudiante', 'es obligatorio.');
  } else if (!validateName(estudiante)) {
    addError('estudiante', 'solo debe contener letras, espacios, puntos, guiones o apóstrofes.');
  } else if (estudiante.length > STUDENT_NAME_MAX_LENGTH) {
    addError('estudiante', `no puede superar ${STUDENT_NAME_MAX_LENGTH} caracteres.`);
  } else if (hasControlCharacters(estudiante)) {
    addError('estudiante', 'contiene caracteres no permitidos.');
  }

  const resolvedTitle = titulo ? resolveCatalogValue(titulo, catalogs.programsByKey) : '';
  if (!titulo) {
    addError('titulo', 'es obligatorio.');
  } else if (catalogs.programsByKey.size > 0 && !resolvedTitle) {
    addError('titulo', 'no coincide con los títulos válidos de la hoja PARAMETROS.');
  } else if (titulo.length > TITLE_MAX_LENGTH) {
    addError('titulo', `no puede superar ${TITLE_MAX_LENGTH} caracteres.`);
  } else if (hasControlCharacters(titulo)) {
    addError('titulo', 'contiene caracteres no permitidos.');
  }

  validateNumericControlField('registro', registro, addError);
  validateNumericControlField('acta', acta, addError);
  validateNumericControlField('libro', libro, addError);

  const graduationDate = parseDateToIso(fechaRegistro, anioGrado);
  if (!fechaRegistro) {
    addError('fechaRegistro', 'es obligatoria.');
  } else if (!graduationDate) {
    addError('fechaRegistro', 'no tiene un formato válido.');
  } else if (graduationDate > today) {
    addError('fechaRegistro', 'no puede ser posterior a la fecha actual.');
  }

  if (!anioGrado) {
    addError('anioGrado', 'es obligatorio.');
  } else if (!/^\d{4}$/.test(anioGrado)) {
    addError('anioGrado', 'debe contener exactamente cuatro dígitos, sin letras ni símbolos.');
  } else if (Number(anioGrado) < 1900 || anioGrado > today.slice(0, 4)) {
    addError('anioGrado', 'debe ser un año válido y no puede ser futuro.');
  } else if (graduationDate && graduationDate.slice(0, 4) !== anioGrado) {
    addError('anioGrado', 'debe coincidir con el año de FECHAREGISTRO.');
  }

  if (!validateEmail(correo)) {
    addError('correo', 'debe tener usuario y dominio válidos; no puede terminar en punto.');
  }

  if (telefono) {
    if (!/^\d+$/.test(telefono)) {
      addError('telefono', 'solo debe contener números, sin espacios, letras, guiones ni paréntesis.');
    } else if (telefono.length < PHONE_MIN_LENGTH || telefono.length > PHONE_MAX_LENGTH) {
      addError('telefono', `debe tener entre ${PHONE_MIN_LENGTH} y ${PHONE_MAX_LENGTH} dígitos.`);
    }
  }

  if (!territorial) {
    addError('territorial', 'es obligatoria.');
  } else if (territorial.length > TERRITORIAL_MAX_LENGTH) {
    addError('territorial', `no puede superar ${TERRITORIAL_MAX_LENGTH} caracteres.`);
  } else if (hasControlCharacters(territorial)) {
    addError('territorial', 'contiene caracteres no permitidos.');
  }

  if (!sede) {
    addError('sede', 'es obligatoria.');
  } else if (sede.length > SEDE_MAX_LENGTH) {
    addError('sede', `no puede superar ${SEDE_MAX_LENGTH} caracteres.`);
  } else if (hasControlCharacters(sede)) {
    addError('sede', 'contiene caracteres no permitidos.');
  }

  const duplicateKey = `${identificacion}::${normalizeKey(resolvedTitle || titulo)}`;
  if (identificacion && titulo && duplicateKeys.has(duplicateKey)) {
    addError('titulo', 'está repetido para la misma IDENTIFICACION dentro del archivo.');
  }
  if (identificacion && titulo) {
    duplicateKeys.add(duplicateKey);
  }

  const finalTitle = resolvedTitle || titulo;
  const finalTerritorial = territorial;
  const finalSede = sede;
  const { firstName, lastName } = splitFullName(estudiante);
  const payload: Partial<GraduadoData> | undefined = errors.length
    ? undefined
    : {
        fullName: estudiante,
        firstName,
        lastName,
        idNumber: identificacion,
        email: correo || undefined,
        phone: telefonoNormalizado || undefined,
        programName: finalTitle,
        programType: inferProgramType(finalTitle),
        degreeTitle: finalTitle,
        enrollmentDate: graduationDate,
        graduationDate,
        ceremonyDate: graduationDate,
        actaNumber: acta,
        numActa: acta,
        numRegistro: registro,
        numFolio: acta,
        numLibro: libro,
        campus: finalSede,
        seccionalName: finalTerritorial,
        status: 'ACTIVE',
        isVerified: true,
      };

  return {
    rowNumber,
    identificacion,
    estudiante,
    titulo,
    registro,
    acta,
    libro,
    fechaRegistro,
    anioGrado,
    correo,
    telefono,
    telefonoNormalizado,
    territorial,
    sede,
    errors,
    fieldErrors,
    payload,
  };
};

