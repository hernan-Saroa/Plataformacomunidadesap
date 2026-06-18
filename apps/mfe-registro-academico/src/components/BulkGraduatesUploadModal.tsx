import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@esap-mfe/shared-ui/dialog';
import { Badge } from '@esap-mfe/shared-ui/badge';
import graduadosService, {
  BulkCreateGraduadosResponse,
  GraduadoData,
} from '../../services/api/graduados.service';

type SedeTerritorialOption = {
  territorial: string;
  sede: string;
};

type BulkGraduatesUploadModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (graduates: GraduadoData[]) => void;
  createdBy?: string;
  programOptions: string[];
  territorialOptions: string[];
  sedeTerritorialOptions: SedeTerritorialOption[];
  programsPeriod?: string;
  structurePeriod?: string;
};

type FieldKey =
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

type ParsedGraduateRow = {
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
  territorialByKey: Map<string, string>;
  sedeByKey: Map<string, string>;
  territorialSedePairs: Set<string>;
};

const TEMPLATE_HEADERS = [
  'IDENTIFICACION',
  'ESTUDIANTE',
  'TITULO',
  'REGISTRO',
  'ACTA',
  'LIBRO',
  'FECHAREGISTRO',
  'AñoGrado',
  'CORREO',
  'TELEFONO',
  'TERRITORIAL',
  'SEDE',
] as const;

const FIELD_LABELS: Record<FieldKey, string> = {
  identificacion: 'IDENTIFICACION',
  estudiante: 'ESTUDIANTE',
  titulo: 'TITULO',
  registro: 'REGISTRO',
  acta: 'ACTA',
  libro: 'LIBRO',
  fechaRegistro: 'FECHAREGISTRO',
  anioGrado: 'AñoGrado',
  correo: 'CORREO',
  telefono: 'TELEFONO',
  territorial: 'TERRITORIAL',
  sede: 'SEDE',
};

const MAX_ROWS = 1000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const NUMERIC_FIELD_RULES: Record<
  'registro' | 'acta' | 'libro',
  { maxLength: number; label: string }
> = {
  registro: { maxLength: 3, label: 'REGISTRO' },
  acta: { maxLength: 2, label: 'ACTA' },
  libro: { maxLength: 2, label: 'LIBRO' },
};

const PHONE_MIN_LENGTH = 7;
const PHONE_MAX_LENGTH = 10;
const STUDENT_NAME_MAX_LENGTH = 255;
const TITLE_MAX_LENGTH = 255;
const TERRITORIAL_MAX_LENGTH = 255;
const SEDE_MAX_LENGTH = 100;

const PREVIEW_COLUMNS: Array<{
  key: FieldKey;
  label: string;
  className: string;
  getValue: (row: ParsedGraduateRow) => string;
}> = [
  {
    key: 'identificacion',
    label: 'Identificación',
    className: 'min-w-[8.25rem]',
    getValue: (row) => row.identificacion,
  },
  {
    key: 'estudiante',
    label: 'Estudiante',
    className: 'min-w-[13rem]',
    getValue: (row) => row.estudiante,
  },
  {
    key: 'titulo',
    label: 'Título',
    className: 'min-w-[16rem]',
    getValue: (row) => row.titulo,
  },
  {
    key: 'registro',
    label: 'Registro',
    className: 'min-w-[5.75rem]',
    getValue: (row) => row.registro,
  },
  {
    key: 'acta',
    label: 'Acta',
    className: 'min-w-[5rem]',
    getValue: (row) => row.acta,
  },
  {
    key: 'libro',
    label: 'Libro',
    className: 'min-w-[5rem]',
    getValue: (row) => row.libro,
  },
  {
    key: 'fechaRegistro',
    label: 'Fecha registro',
    className: 'min-w-[8.5rem]',
    getValue: (row) => row.fechaRegistro,
  },
  {
    key: 'anioGrado',
    label: 'Año grado',
    className: 'min-w-[6.75rem]',
    getValue: (row) => row.anioGrado,
  },
  {
    key: 'correo',
    label: 'Correo',
    className: 'min-w-[14rem]',
    getValue: (row) => row.correo,
  },
  {
    key: 'telefono',
    label: 'Teléfono',
    className: 'min-w-[8rem]',
    getValue: (row) => row.telefono,
  },
  {
    key: 'territorial',
    label: 'Territorial',
    className: 'min-w-[11rem]',
    getValue: (row) => row.territorial,
  },
  {
    key: 'sede',
    label: 'Sede',
    className: 'min-w-[12rem]',
    getValue: (row) => row.sede,
  },
];

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

const TEMPLATE_RULES = [
  'No diligencies una columna ID; el sistema genera el identificador interno automáticamente.',
  'Una misma IDENTIFICACION puede aparecer varias veces solo si el TITULO es diferente.',
  'No se permite repetir la combinación IDENTIFICACION + TITULO en el archivo ni en la base de datos.',
  'FECHAREGISTRO no puede ser posterior a la fecha actual.',
  'TITULO, TERRITORIAL y SEDE deben copiarse exactamente desde los bloques de PARAMETROS.',
  'La SEDE debe pertenecer a la TERRITORIAL indicada en el bloque TERRITORIALES_Y_SEDES_DETALLE.',
  'IDENTIFICACION solo debe contener números; graduados no almacena tipo de documento.',
  'REGISTRO, ACTA y LIBRO deben ser numéricos. REGISTRO máximo 3 dígitos; ACTA y LIBRO máximo 2.',
  'DIPLOMA no se diligencia en la plantilla; el sistema lo asigna automáticamente al crear el graduado.',
  'CORREO es opcional, pero si se diligencia debe tener @ y un punto después del @.',
  'TELEFONO es opcional, pero si se diligencia solo debe contener números, mínimo 7 y máximo 10 dígitos.',
  'El archivo debe ser .xlsx, con máximo 1000 filas y 10 MB.',
];

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeHeader = (value: string) => normalizeKey(value).replace(/\s+/g, '');

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'es'),
  );

const getTodayIso = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCellValue = (row: Record<string, unknown>, fieldName: FieldKey) => {
  const entries = Object.entries(row);
  const aliases = FIELD_ALIASES[fieldName].map(normalizeHeader);
  const match = entries.find(([key]) => aliases.includes(normalizeHeader(key)));
  const rawValue = match?.[1];
  if (rawValue === null || rawValue === undefined) return '';
  return String(rawValue).trim();
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

const buildCatalogs = (
  programOptions: string[],
  territorialOptions: string[],
  sedeTerritorialOptions: SedeTerritorialOption[],
): Catalogs => {
  const programsByKey = new Map<string, string>();
  uniqueSorted(programOptions).forEach((program) => programsByKey.set(normalizeKey(program), program));

  const territorialByKey = new Map<string, string>();
  uniqueSorted(territorialOptions).forEach((territorial) =>
    territorialByKey.set(normalizeKey(territorial), territorial),
  );

  const sedeByKey = new Map<string, string>();
  const territorialSedePairs = new Set<string>();
  sedeTerritorialOptions.forEach(({ territorial, sede }) => {
    const sedeKey = normalizeKey(sede);
    const territorialKey = normalizeKey(territorial);
    if (sedeKey) {
      sedeByKey.set(sedeKey, sede);
    }
    if (sedeKey && territorialKey) {
      territorialSedePairs.add(`${territorialKey}::${sedeKey}`);
    }
    if (territorialKey && !territorialByKey.has(territorialKey)) {
      territorialByKey.set(territorialKey, territorial);
    }
  });

  return {
    programsByKey,
    territorialByKey,
    sedeByKey,
    territorialSedePairs,
  };
};

const resolveCatalogValue = (value: string, options: Map<string, string>) =>
  options.get(normalizeKey(value));

const createExampleRows = (
  programOptions: string[],
  territorialOptions: string[],
  sedeTerritorialOptions: SedeTerritorialOption[],
) => {
  const programs = uniqueSorted(programOptions);
  const territorialRows = sedeTerritorialOptions;
  if (!programs.length || !territorialRows.length) {
    return [];
  }
  const firstProgram = programs[0];
  const secondProgram = programs[1] || firstProgram;
  const firstLocation = territorialRows[0];
  const secondLocation = territorialRows[1] || firstLocation;

  return [
    [
      '900100001',
      'LAURA CAMILA ANDRADE RIVERA',
      firstProgram,
      '123',
      '28',
      '3',
      '15-07-2022',
      '2022',
      'laura.andrade@example.com',
      '3004567890',
      firstLocation.territorial,
      firstLocation.sede,
    ],
    [
      '900100002',
      'MATEO ALEJANDRO PARRA LÓPEZ',
      secondProgram,
      '124',
      '55',
      '11',
      '22-10-2021',
      '2021',
      'mateo.parra@example.com',
      '3109876543',
      secondLocation.territorial,
      secondLocation.sede,
    ],
  ];
};

const buildLocationGroups = (
  territorialOptions: string[],
  sedeTerritorialOptions: SedeTerritorialOption[],
) => {
  const fallbackRows = territorialOptions.map((territorial) => ({ territorial, sede: '' }));
  const rows = (sedeTerritorialOptions.length ? sedeTerritorialOptions : fallbackRows)
    .map((row) => ({
      territorial: row.territorial.trim(),
      sede: row.sede.trim(),
    }))
    .filter((row) => row.territorial || row.sede)
    .sort((a, b) =>
      `${a.territorial} ${a.sede}`.localeCompare(`${b.territorial} ${b.sede}`, 'es'),
    );

  const groupsByTerritorial = new Map<string, { territorial: string; sedes: string[] }>();

  rows.forEach((row) => {
    const key = normalizeKey(row.territorial);
    if (!key) return;
    const current = groupsByTerritorial.get(key) || {
      territorial: row.territorial,
      sedes: [],
    };
    if (row.sede && !current.sedes.some((sede) => normalizeKey(sede) === normalizeKey(row.sede))) {
      current.sedes.push(row.sede);
    }
    groupsByTerritorial.set(key, current);
  });

  return Array.from(groupsByTerritorial.values())
    .map((group) => ({
      ...group,
      sedes: uniqueSorted(group.sedes),
    }))
    .sort((a, b) => a.territorial.localeCompare(b.territorial, 'es'));
};

const buildParametersRows = (
  programOptions: string[],
  territorialOptions: string[],
  sedeTerritorialOptions: SedeTerritorialOption[],
  programsPeriod?: string,
  structurePeriod?: string,
) => {
  const programs = uniqueSorted(programOptions);
  const locationGroups = buildLocationGroups(territorialOptions, sedeTerritorialOptions);
  const locationDetailRows = locationGroups.flatMap((group, groupIndex) => {
    const sedes = group.sedes.length ? group.sedes : [''];
    return sedes.map((sede, sedeIndex) => ({
      order: groupIndex + 1,
      territorial: group.territorial,
      sede,
      sedePosition: group.sedes.length ? `${sedeIndex + 1} de ${group.sedes.length}` : 'Sin sede asociada',
      sedeCount: group.sedes.length,
    }));
  });
  const rows: Array<Array<string | number>> = [
    ['PARAMETROS DE CARGA MASIVA DE GRADUADOS'],
    [
      'Use esta hoja como catálogo oficial. Copie y pegue los valores exactamente como aparecen para evitar errores en GRADUADOS.',
    ],
    [
      'Para sedes, copie siempre TERRITORIAL y SEDE desde la misma fila del bloque TERRITORIALES_Y_SEDES_DETALLE.',
    ],
    [
      `Periodos fuente: PROGRAMAS ACADEMICOS = ${programsPeriod || 'No disponible'} | ESTRUCTURA ORGANIZACIONAL = ${structurePeriod || 'No disponible'}.`,
    ],
    ['RESUMEN DE CATALOGOS'],
    ['CATALOGO', 'CANTIDAD', 'COLUMNA EN GRADUADOS', 'COMO USARLO', 'OBSERVACION'],
    [
      'Títulos válidos',
      programs.length,
      'TITULO',
      'Copiar un valor del bloque TITULOS_VALIDOS.',
      'Debe coincidir exactamente con un programa disponible en la plataforma.',
    ],
    [
      'Territoriales',
      locationGroups.length,
      'TERRITORIAL',
      'Copiar junto con la SEDE de la misma fila del detalle.',
      'La territorial proviene de Estructura Organizacional.',
    ],
    [
      'Relaciones territorial-sede',
      locationDetailRows.length,
      'TERRITORIAL + SEDE',
      'Usar el bloque de detalle para evitar cruces incorrectos.',
      'Una sede solo es válida dentro de su territorial asociada.',
    ],
    [''],
    ['BLOQUE 1 - TITULOS_VALIDOS'],
    ['#', 'TITULO_VALIDO', 'COPIAR_EN_COLUMNA', 'OBSERVACION'],
  ];

  programs.forEach((program, index) => {
    rows.push([index + 1, program, 'TITULO', 'Copie exactamente este texto.']);
  });

  rows.push(
    [''],
    ['BLOQUE 2 - RESUMEN_SEDES_POR_TERRITORIAL'],
    [
      '#',
      'TERRITORIAL',
      'TOTAL_SEDES',
      'SEDES_DE_ESTA_TERRITORIAL',
      'USO',
    ],
  );

  locationGroups.forEach((group, index) => {
    rows.push([
      index + 1,
      group.territorial,
      group.sedes.length,
      group.sedes.join(' | ') || 'Sin sedes asociadas',
      'Resumen de consulta. Para copiar datos use el bloque 3.',
    ]);
  });

  rows.push(
    [''],
    ['BLOQUE 3 - TERRITORIALES_Y_SEDES_DETALLE'],
    [
      '#',
      'TERRITORIAL',
      'SEDE',
      'SEDE_EN_TERRITORIAL',
      'COPIAR_EN_GRADUADOS',
    ],
  );

  locationDetailRows.forEach((location, index) => {
    rows.push([
      index + 1,
      location.territorial,
      location.sede || 'Sin sede asociada',
      location.sedePosition,
      'Copie TERRITORIAL y SEDE de esta misma fila.',
    ]);
  });

  rows.push([''], ['BLOQUE 4 - REGLAS_DE_CARGA'], ['#', 'REGLA']);
  TEMPLATE_RULES.forEach((rule, index) => rows.push([index + 1, rule]));

  return rows;
};

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
    addError(field, 'es obligatorio.');
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
  if (value.length > rule.maxLength) {
    addError(field, `no puede superar ${rule.maxLength} dígitos.`);
  }
};

const buildParsedRow = (
  row: Record<string, unknown>,
  rowNumber: number,
  duplicateKeys: Set<string>,
  catalogs: Catalogs,
): ParsedGraduateRow => {
  const identificacionRaw = getCellValue(row, 'identificacion');
  const identificacion = identificacionRaw.trim();
  const estudiante = getCellValue(row, 'estudiante').replace(/\s+/g, ' ').trim();
  const titulo = getCellValue(row, 'titulo').replace(/\s+/g, ' ').trim();
  const registro = getCellValue(row, 'registro').trim();
  const acta = getCellValue(row, 'acta').trim();
  const libro = getCellValue(row, 'libro').trim();
  const fechaRegistro = getCellValue(row, 'fechaRegistro').trim();
  const anioGrado = getCellValue(row, 'anioGrado').trim();
  const correo = getCellValue(row, 'correo').trim().toLowerCase();
  const telefono = getCellValue(row, 'telefono').trim();
  const telefonoNormalizado = telefono;
  const territorial = getCellValue(row, 'territorial').replace(/\s+/g, ' ').trim();
  const sede = getCellValue(row, 'sede').replace(/\s+/g, ' ').trim();
  const errors: string[] = [];
  const fieldErrors: FieldErrors = {};
  const addError = (field: FieldKey, message: string) =>
    addFieldError(errors, fieldErrors, field, message);

  if (identificacionRaw && !/^\d+$/.test(identificacionRaw)) {
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
  } else if (graduationDate > getTodayIso()) {
    addError('fechaRegistro', 'no puede ser posterior a la fecha actual.');
  }

  if (!anioGrado) {
    addError('anioGrado', 'es obligatorio.');
  } else if (!/^\d{4}$/.test(anioGrado)) {
    addError('anioGrado', 'debe contener exactamente cuatro dígitos, sin letras ni símbolos.');
  } else if (Number(anioGrado) < 1900 || Number(anioGrado) > Number(getTodayIso().slice(0, 4))) {
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

  const resolvedTerritorial = territorial ? resolveCatalogValue(territorial, catalogs.territorialByKey) : '';
  if (!territorial) {
    addError('territorial', 'es obligatoria.');
  } else if (catalogs.territorialByKey.size > 0 && !resolvedTerritorial) {
    addError('territorial', 'no coincide con las territoriales válidas de la hoja PARAMETROS.');
  } else if (territorial.length > TERRITORIAL_MAX_LENGTH) {
    addError('territorial', `no puede superar ${TERRITORIAL_MAX_LENGTH} caracteres.`);
  } else if (hasControlCharacters(territorial)) {
    addError('territorial', 'contiene caracteres no permitidos.');
  }

  const resolvedSede = sede ? resolveCatalogValue(sede, catalogs.sedeByKey) : '';
  if (!sede) {
    addError('sede', 'es obligatoria.');
  } else if (catalogs.sedeByKey.size > 0 && !resolvedSede) {
    addError('sede', 'no coincide con las sedes válidas de la hoja PARAMETROS.');
  } else if (sede.length > SEDE_MAX_LENGTH) {
    addError('sede', `no puede superar ${SEDE_MAX_LENGTH} caracteres.`);
  } else if (hasControlCharacters(sede)) {
    addError('sede', 'contiene caracteres no permitidos.');
  }

  const territorialSedePair =
    territorial && sede
      ? `${normalizeKey(territorial)}::${normalizeKey(sede)}`
      : '';
  if (
    territorialSedePair &&
    catalogs.territorialSedePairs.size > 0 &&
    !catalogs.territorialSedePairs.has(territorialSedePair)
  ) {
    addError('sede', 'no pertenece a la TERRITORIAL indicada.');
  }

  const duplicateKey = `${identificacion}::${normalizeKey(resolvedTitle || titulo)}`;
  if (identificacion && titulo && duplicateKeys.has(duplicateKey)) {
    addError('titulo', 'está repetido para la misma IDENTIFICACION dentro del archivo.');
  }
  if (identificacion && titulo) {
    duplicateKeys.add(duplicateKey);
  }

  const finalTitle = resolvedTitle || titulo;
  const finalTerritorial = resolvedTerritorial || territorial;
  const finalSede = resolvedSede || sede;
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

const getRowFieldErrors = (row: ParsedGraduateRow) =>
  Object.entries(row.fieldErrors).flatMap(([field, messages]) =>
    (messages || []).map((message) => ({
      label: FIELD_LABELS[field as FieldKey],
      message,
    })),
  );

export function BulkGraduatesUploadModal({
  open,
  onOpenChange,
  onImported,
  createdBy,
  programOptions,
  territorialOptions,
  sedeTerritorialOptions,
  programsPeriod,
  structurePeriod,
}: BulkGraduatesUploadModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [rows, setRows] = useState<ParsedGraduateRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkCreateGraduadosResponse | null>(null);

  const validSedeTerritorialOptions = useMemo(() => {
    const byPair = new Map<string, SedeTerritorialOption>();
    sedeTerritorialOptions.forEach((option) => {
      const territorial = option.territorial.trim();
      const sede = option.sede.trim();
      const key = `${normalizeKey(territorial)}::${normalizeKey(sede)}`;
      if (!territorial || !sede || byPair.has(key)) return;
      byPair.set(key, { territorial, sede });
    });
    return Array.from(byPair.values());
  }, [sedeTerritorialOptions]);

  const catalogs = useMemo(
    () => buildCatalogs(programOptions, territorialOptions, validSedeTerritorialOptions),
    [programOptions, territorialOptions, validSedeTerritorialOptions],
  );
  const validRows = useMemo(() => rows.filter((row) => row.errors.length === 0), [rows]);
  const invalidRows = rows.length - validRows.length;
  const readyToImport = validRows.length > 0 && !isParsing && !isImporting;
  const catalogsReady =
    programOptions.length > 0 &&
    territorialOptions.length > 0 &&
    validSedeTerritorialOptions.length > 0;
  const missingCatalogs = [
    programOptions.length === 0 ? 'títulos' : '',
    territorialOptions.length === 0 ? 'territoriales' : '',
    validSedeTerritorialOptions.length === 0 ? 'relaciones territorial-sede' : '',
  ].filter(Boolean);

  const resetState = () => {
    setSelectedFileName('');
    setRows([]);
    setImportResult(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isImporting) return;
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const handleDownloadTemplate = async () => {
    if (!catalogsReady) {
      toast.error('No se puede generar la plantilla', {
        description:
          'Los periodos seleccionados deben tener títulos y relaciones territorial-sede disponibles.',
      });
      return;
    }

    const fileBaseName = 'Plantilla_Carga_Masiva_Graduados_ESAP';
    const exampleRows = createExampleRows(
      programOptions,
      territorialOptions,
      validSedeTerritorialOptions,
    );
    const parameterRows = buildParametersRows(
      programOptions,
      territorialOptions,
      validSedeTerritorialOptions,
      programsPeriod,
      structurePeriod,
    );
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ESAP';
    workbook.created = new Date();

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      left: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      right: { style: 'thin', color: { argb: 'FFD9E2F3' } },
    };
    const applyRowFill = (row: any, color: string, fontColor = 'FFFFFFFF') => {
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        cell.font = { bold: true, color: { argb: fontColor } };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = thinBorder;
      });
    };
    const applyTableHeader = (row: any) => {
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
        cell.font = { bold: true, color: { argb: 'FF14532D' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = thinBorder;
      });
    };

    const graduatesSheet = workbook.addWorksheet('GRADUADOS', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    graduatesSheet.addRows([Array.from(TEMPLATE_HEADERS), ...exampleRows]);
    graduatesSheet.columns = [
      { width: 18 },
      { width: 34 },
      { width: 64 },
      { width: 12 },
      { width: 10 },
      { width: 10 },
      { width: 16 },
      { width: 12 },
      { width: 28 },
      { width: 14 },
      { width: 30 },
      { width: 36 },
    ];
    graduatesSheet.autoFilter = {
      from: 'A1',
      to: `L${exampleRows.length + 1}`,
    };
    applyRowFill(graduatesSheet.getRow(1), 'FF003DA5');
    graduatesSheet.eachRow((row: any) => {
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = thinBorder;
      });
    });

    const listsSheet = workbook.addWorksheet('CATALOGOS_VALIDACION', {
      state: 'veryHidden',
    });
    const programs = uniqueSorted(programOptions);
    const territorials = uniqueSorted(territorialOptions);
    const sedes = uniqueSorted(validSedeTerritorialOptions.map((option) => option.sede));
    listsSheet.addRow(['TITULOS', 'TERRITORIALES', 'SEDES']);
    const maxCatalogLength = Math.max(programs.length, territorials.length, sedes.length);
    for (let index = 0; index < maxCatalogLength; index += 1) {
      listsSheet.addRow([
        programs[index] || '',
        territorials[index] || '',
        sedes[index] || '',
      ]);
    }
    workbook.definedNames.add(
      `CATALOGOS_VALIDACION!$A$2:$A$${programs.length + 1}`,
      'LISTA_TITULOS_GRADUADOS',
    );
    workbook.definedNames.add(
      `CATALOGOS_VALIDACION!$B$2:$B$${territorials.length + 1}`,
      'LISTA_TERRITORIALES_GRADUADOS',
    );
    workbook.definedNames.add(
      `CATALOGOS_VALIDACION!$C$2:$C$${sedes.length + 1}`,
      'LISTA_SEDES_GRADUADOS',
    );

    const addListValidation = (
      targetColumn: string,
      listName: string,
      errorTitle: string,
    ) => {
      for (let rowNumber = 2; rowNumber <= MAX_ROWS + 1; rowNumber += 1) {
        graduatesSheet.getCell(`${targetColumn}${rowNumber}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [listName],
          showErrorMessage: true,
          errorStyle: 'stop',
          errorTitle,
          error: 'Seleccione un valor del catálogo dinámico incluido en esta plantilla.',
        };
      }
    };
    addListValidation('C', 'LISTA_TITULOS_GRADUADOS', 'Título no válido');
    addListValidation('K', 'LISTA_TERRITORIALES_GRADUADOS', 'Territorial no válida');
    addListValidation('L', 'LISTA_SEDES_GRADUADOS', 'Sede no válida');

    const parametersSheet = workbook.addWorksheet('PARAMETROS', {
      views: [{ state: 'frozen', ySplit: 3 }],
    });
    parametersSheet.addRows(parameterRows);
    parametersSheet.columns = [
      { width: 24 },
      { width: 64 },
      { width: 24 },
      { width: 30 },
      { width: 96 },
    ];
    parameterRows.forEach((sourceRow, index) => {
      const rowNumber = index + 1;
      const row = parametersSheet.getRow(rowNumber);
      const firstCell = String(sourceRow[0] || '');
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = thinBorder;
      });

      if (sourceRow.length === 1 && firstCell) {
        parametersSheet.mergeCells(rowNumber, 1, rowNumber, 5);
        row.height = firstCell.startsWith('BLOQUE') ? 23 : 24;
        const fillColor = firstCell.startsWith('BLOQUE')
          ? 'FF059669'
          : firstCell === 'RESUMEN DE CATALOGOS'
            ? 'FFFBBF24'
            : 'FF003DA5';
        const fontColor = fillColor === 'FFFBBF24' ? 'FF78350F' : 'FFFFFFFF';
        applyRowFill(row, fillColor, fontColor);
      } else if (firstCell === '#' || firstCell === 'CATALOGO') {
        applyTableHeader(row);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `${fileBaseName}.xlsx`,
    );
    toast.success('Plantilla XLSX descargada', {
      description: 'Incluye GRADUADOS para diligenciar y PARAMETROS con títulos, sedes y reglas.',
    });
  };

  const parseFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('El archivo supera el límite de 10 MB');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Formato no permitido', {
        description: 'La carga masiva solo acepta archivos .xlsx.',
      });
      return;
    }

    if (!catalogsReady) {
      toast.error('No se puede validar la plantilla', {
        description:
          'No se cargaron títulos, territoriales o sedes desde la plataforma. Intenta abrir nuevamente el módulo antes de importar.',
      });
      return;
    }

    setIsParsing(true);
    setImportResult(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: false,
        raw: false,
      });
      const sheetName = workbook.SheetNames.find((name) => normalizeKey(name) === 'graduados');
      if (!sheetName) {
        throw new Error('El archivo XLSX debe tener una hoja llamada GRADUADOS.');
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
        raw: false,
      });
      if (!jsonRows.length) {
        throw new Error('La hoja GRADUADOS no tiene filas de datos.');
      }
      if (jsonRows.length > MAX_ROWS) {
        throw new Error(`El archivo supera el límite de ${MAX_ROWS} filas.`);
      }

      const duplicateKeys = new Set<string>();
      const parsedRows = jsonRows.map((row, index) =>
        buildParsedRow(row, index + 2, duplicateKeys, catalogs),
      );
      setRows(parsedRows);
      setSelectedFileName(file.name);
      toast.success('Archivo validado', {
        description: `${parsedRows.length} filas leídas, ${parsedRows.filter((row) => row.errors.length === 0).length} listas para importar.`,
      });
    } catch (error: any) {
      setRows([]);
      setSelectedFileName('');
      toast.error('No se pudo leer el archivo', {
        description: error?.message || 'Verifica que sea un archivo .xlsx válido.',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Formato no permitido', {
        description: 'Carga únicamente la plantilla en formato .xlsx.',
      });
      event.target.value = '';
      return;
    }
    void parseFile(file);
  };

  const handleImport = async () => {
    if (!readyToImport) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const result = await graduadosService.graduados.crearMasivo(
        validRows.map((row) => row.payload!),
        createdBy?.trim() || 'bulk_upload',
      );
      setImportResult(result);
      if (result.created.length > 0) {
        onImported(result.created);
      }
      if (result.failedCount > 0) {
        toast.warning('Carga procesada con observaciones', {
          description: `${result.createdCount} creados, ${result.failedCount} con error.`,
        });
      } else {
        toast.success('Carga masiva completada', {
          description: `${result.createdCount} graduados creados correctamente.`,
        });
      }
    } catch (error: any) {
      toast.error('No se pudo completar la carga masiva', {
        description: error?.response?.data?.message || error?.message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[94vw] max-w-[76rem] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" style={{ color: '#003DA5' }} />
            Carga masiva de graduados
          </DialogTitle>
          <DialogDescription>
            Importa graduados desde Excel. El sistema valida el archivo antes de crear registros y genera el identificador interno automáticamente.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            opacity: { duration: 0.22, ease: 'easeOut' },
            y: { duration: 0.22, ease: 'easeOut' },
            layout: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
          }}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
        >
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 28rem), 1fr))' }}
          >
            <div className="rounded-lg border p-4" style={{ borderColor: '#DBEAFE', background: '#F8FAFF' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                    Plantilla oficial
                  </p>
                  <p className="mt-1 text-xs leading-5" style={{ color: '#64748B' }}>
                    El Excel trae dos hojas: <strong>GRADUADOS</strong> para diligenciar personas y <strong>PARAMETROS</strong> para copiar títulos, territoriales y sedes válidas.
                  </p>
                </div>
                <FileSpreadsheet className="h-8 w-8 flex-shrink-0" style={{ color: '#047857' }} />
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => void handleDownloadTemplate()}
                  disabled={!catalogsReady}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed"
                  style={{
                    borderColor: catalogsReady ? '#A7F3D0' : '#D1D5DB',
                    color: catalogsReady ? '#047857' : '#6B7280',
                    background: catalogsReady ? '#FFFFFF' : '#F3F4F6',
                  }}
                >
                  <Download className="h-4 w-4" />
                  Descargar plantilla XLSX
                </button>
              </div>
              <div className="mt-4 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                Catálogos disponibles: {programOptions.length} títulos, {territorialOptions.length} territoriales y {validSedeTerritorialOptions.length} relaciones territorial-sede.
                <br />
                Periodos: programas <strong>{programsPeriod || 'no disponible'}</strong> · estructura <strong>{structurePeriod || 'no disponible'}</strong>.
              </div>
              {!catalogsReady && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  No se puede descargar ni validar una carga porque faltan: <strong>{missingCatalogs.join(', ')}</strong>. Revisa los períodos seleccionados en los módulos de origen.
                </div>
              )}
            </div>

            <div className="rounded-lg border p-4" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                    Archivo a importar
                  </p>
                  <p className="mt-1 text-xs leading-5" style={{ color: '#64748B' }}>
                    Solo formato .xlsx. Máximo {MAX_ROWS} filas y 10 MB.
                  </p>
                </div>
                {isParsing ? (
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#003DA5' }} />
                ) : (
                  <Upload className="h-6 w-6" style={{ color: '#003DA5' }} />
                )}
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isParsing || isImporting || !catalogsReady}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isParsing || isImporting || !catalogsReady}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{ borderColor: '#CBD5E1', color: '#1F2937', background: '#F8FAFC' }}
              >
                <Upload className="h-4 w-4 flex-shrink-0" />
                <span className="max-w-full truncate">{selectedFileName || 'Seleccionar archivo XLSX'}</span>
              </button>
              <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                Se lee únicamente la hoja GRADUADOS. PARAMETROS es la guía para copiar valores válidos y evitar errores de escritura.
              </p>
            </div>
          </div>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13.5rem), 1fr))' }}
          >
            {[
              { label: 'Filas leídas', value: rows.length, border: '#DBEAFE', bg: '#EFF6FF', color: '#1D4ED8' },
              { label: 'Listas para crear', value: validRows.length, border: '#BBF7D0', bg: '#F0FDF4', color: '#047857' },
              { label: 'Con errores', value: invalidRows, border: '#FECACA', bg: '#FEF2F2', color: '#B91C1C' },
            ].map((item) => (
              <motion.div
                key={item.label}
                layout
                className="rounded-lg border px-4 py-3"
                style={{ borderColor: item.border, background: item.bg }}
              >
                <p className="text-xs font-semibold uppercase" style={{ color: item.color }}>
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold" style={{ color: '#111827' }}>
                  {item.value}
                </p>
              </motion.div>
            ))}
          </div>

          <AnimatePresence>
            {rows.length > 0 && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10, height: 0, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, y: 8, height: 0, scale: 0.985 }}
                transition={{
                  opacity: { duration: 0.18, ease: 'easeOut' },
                  y: { duration: 0.24, ease: 'easeOut' },
                  scale: { duration: 0.24, ease: 'easeOut' },
                  height: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
                  layout: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
                }}
                className="overflow-hidden rounded-lg border"
                style={{ borderColor: '#E5E7EB' }}
              >
                <div className="border-b bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Previsualización y validaciones</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Revisa cada columna antes de crear. Las celdas marcadas en rojo indican exactamente qué dato debe corregirse en el archivo.
                  </p>
                </div>
                <div className="max-h-[22rem] overflow-auto">
                  <table className="min-w-[92rem] divide-y divide-gray-200 text-xs">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr>
                        <th className="min-w-[4rem] px-2 py-2 text-left text-[11px] font-semibold uppercase text-gray-600">Fila</th>
                        <th className="min-w-[7.5rem] px-2 py-2 text-left text-[11px] font-semibold uppercase text-gray-600">Estado</th>
                        {PREVIEW_COLUMNS.map((column) => (
                          <th
                            key={column.key}
                            className={`${column.className} px-2 py-2 text-left text-[11px] font-semibold uppercase text-gray-600`}
                          >
                            {column.label}
                          </th>
                        ))}
                        <th className="min-w-[18rem] px-2 py-2 text-left text-[11px] font-semibold uppercase text-gray-600">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {rows.slice(0, 100).map((row) => {
                        const rowFieldErrors = getRowFieldErrors(row);
                        return (
                          <tr key={row.rowNumber} className={row.errors.length ? 'bg-red-50/40' : ''}>
                            <td className="whitespace-nowrap px-2 py-2 text-gray-700">{row.rowNumber}</td>
                            <td className="whitespace-nowrap px-2 py-2">
                              {row.errors.length === 0 ? (
                                <Badge className="border border-green-200 bg-green-50 text-green-700">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Se creará
                                </Badge>
                              ) : (
                                <Badge className="border border-red-200 bg-red-50 text-red-700">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  No se crea
                                </Badge>
                              )}
                            </td>
                            {PREVIEW_COLUMNS.map((column) => {
                              const fieldError = row.fieldErrors[column.key]?.join(' ');
                              const hasError = Boolean(fieldError);
                              return (
                                <td
                                  key={column.key}
                                  className={`${column.className} px-2 py-2 align-top ${
                                    hasError ? 'bg-red-50 text-red-800' : 'text-gray-700'
                                  }`}
                                  title={fieldError || undefined}
                                >
                                  <span className="block break-words font-medium">
                                    {column.getValue(row) || 'N/A'}
                                  </span>
                                  {hasError && (
                                    <span className="mt-1 block text-[11px] leading-4 text-red-700">
                                      {fieldError}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="min-w-[18rem] px-2 py-2 align-top">
                              {row.errors.length === 0 ? (
                                <span className="text-xs font-medium text-green-700">Fila válida para importación.</span>
                              ) : (
                                <div className="flex items-start gap-2 text-xs leading-5 text-red-700">
                                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                  <ul className="space-y-1">
                                    {rowFieldErrors.map((error, index) => (
                                      <li key={`${row.rowNumber}-${error.label}-${index}`}>
                                        <strong>{error.label}:</strong> {error.message}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {rows.length > 100 && (
                  <div className="border-t bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    Mostrando las primeras 100 filas. El proceso importará todas las filas válidas.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {importResult && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 8, height: 0 }}
                transition={{
                  opacity: { duration: 0.18, ease: 'easeOut' },
                  y: { duration: 0.22, ease: 'easeOut' },
                  height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                  layout: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                }}
                className="rounded-xl border p-4"
                style={{
                  borderColor: importResult.failedCount ? '#FDE68A' : '#BBF7D0',
                  background: importResult.failedCount ? '#FFFBEB' : '#F0FDF4',
                }}
              >
                <div className="flex items-start gap-3">
                  {importResult.failedCount ? (
                    <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#B45309' }} />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: '#047857' }} />
                  )}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                      Resultado de la carga
                    </p>
                    <p className="mt-1 text-sm" style={{ color: '#374151' }}>
                      {importResult.createdCount} graduados creados de {importResult.total} enviados.
                    </p>
                    {importResult.errors.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs" style={{ color: '#92400E' }}>
                        {importResult.errors.slice(0, 8).map((error) => {
                          const originalRowNumber =
                            validRows[Math.max(0, error.rowNumber - 2)]?.rowNumber || error.rowNumber;
                          return (
                            <li key={`${error.rowNumber}-${error.message}`}>
                              Fila {originalRowNumber}: {error.message}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={isImporting}
            className="rounded-lg border-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: '#D1D5DB', color: '#4B5563', background: '#FFFFFF' }}
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!readyToImport}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: '#003DA5' }}
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isImporting ? 'Importando...' : `Crear ${validRows.length} graduados`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
