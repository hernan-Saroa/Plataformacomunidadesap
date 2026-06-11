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
  programOptions: string[];
  territorialOptions: string[];
  sedeTerritorialOptions: SedeTerritorialOption[];
};

type FieldKey =
  | 'tipoIdentificacion'
  | 'identificacion'
  | 'estudiante'
  | 'titulo'
  | 'registro'
  | 'acta'
  | 'libro'
  | 'diploma'
  | 'fechaRegistro'
  | 'anioGrado'
  | 'correo'
  | 'telefono'
  | 'territorial'
  | 'sede';

type FieldErrors = Partial<Record<FieldKey, string[]>>;

type ParsedGraduateRow = {
  rowNumber: number;
  tipoIdentificacion: string;
  identificacion: string;
  estudiante: string;
  titulo: string;
  registro: string;
  acta: string;
  libro: string;
  diploma: string;
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
  territorialBySedeKey: Map<string, string>;
};

type DocumentTypeOption = {
  code: string;
  name: string;
  validation: string;
  storedInGraduates: 'NO';
  note: string;
};

const TEMPLATE_HEADERS = [
  'TIPOIDENTIFICACION',
  'IDENTIFICACION',
  'ESTUDIANTE',
  'TITULO',
  'REGISTRO',
  'ACTA',
  'LIBRO',
  'DIPLOMA',
  'FECHAREGISTRO',
  'AñoGrado',
  'CORREO',
  'TELEFONO',
  'TERRITORIAL',
  'SEDE',
] as const;

const FIELD_LABELS: Record<FieldKey, string> = {
  tipoIdentificacion: 'TIPOIDENTIFICACION',
  identificacion: 'IDENTIFICACION',
  estudiante: 'ESTUDIANTE',
  titulo: 'TITULO',
  registro: 'REGISTRO',
  acta: 'ACTA',
  libro: 'LIBRO',
  diploma: 'DIPLOMA',
  fechaRegistro: 'FECHAREGISTRO',
  anioGrado: 'AñoGrado',
  correo: 'CORREO',
  telefono: 'TELEFONO',
  territorial: 'TERRITORIAL',
  sede: 'SEDE',
};

const DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] = [
  {
    code: 'CC',
    name: 'Cédula de ciudadanía',
    validation: '6 a 10 dígitos numéricos',
    storedInGraduates: 'NO',
    note: 'El servicio de usuarios/personas valida este formato; graduados solo guarda IDENTIFICACION.',
  },
  {
    code: 'CE',
    name: 'Cédula de extranjería',
    validation: '6 a 10 dígitos numéricos',
    storedInGraduates: 'NO',
    note: 'El servicio de usuarios/personas valida este formato; graduados solo guarda IDENTIFICACION.',
  },
  {
    code: 'TI',
    name: 'Tarjeta de identidad',
    validation: '10 u 11 dígitos numéricos',
    storedInGraduates: 'NO',
    note: 'El servicio de usuarios/personas valida este formato; graduados solo guarda IDENTIFICACION.',
  },
  {
    code: 'PEP',
    name: 'Permiso Especial de Permanencia',
    validation: '5 a 20 dígitos numéricos en esta plantilla',
    storedInGraduates: 'NO',
    note: 'No tiene validación específica en graduados; se controla para evitar datos inconsistentes.',
  },
  {
    code: 'PPT',
    name: 'Permiso por Protección Temporal',
    validation: '5 a 20 dígitos numéricos en esta plantilla',
    storedInGraduates: 'NO',
    note: 'No tiene validación específica en graduados; se controla para evitar datos inconsistentes.',
  },
  {
    code: 'PASAPORTE',
    name: 'Pasaporte',
    validation: '5 a 20 dígitos numéricos en esta plantilla',
    storedInGraduates: 'NO',
    note: 'No tiene validación específica en graduados; se controla para evitar datos inconsistentes.',
  },
];

const DOCUMENT_TYPE_CODES = DOCUMENT_TYPE_OPTIONS.map((option) => option.code);
const MAX_ROWS = 1000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const NUMERIC_FIELD_RULES: Record<
  'registro' | 'acta' | 'libro' | 'diploma',
  { maxLength: number; label: string }
> = {
  registro: { maxLength: 3, label: 'REGISTRO' },
  acta: { maxLength: 2, label: 'ACTA' },
  libro: { maxLength: 2, label: 'LIBRO' },
  diploma: { maxLength: 6, label: 'DIPLOMA' },
};

const PREVIEW_COLUMNS: Array<{
  key: FieldKey;
  label: string;
  className: string;
  getValue: (row: ParsedGraduateRow) => string;
}> = [
  {
    key: 'tipoIdentificacion',
    label: 'Tipo ID',
    className: 'min-w-[7rem]',
    getValue: (row) => row.tipoIdentificacion,
  },
  {
    key: 'identificacion',
    label: 'Identificación',
    className: 'min-w-[9rem]',
    getValue: (row) => row.identificacion,
  },
  {
    key: 'estudiante',
    label: 'Estudiante',
    className: 'min-w-[17rem]',
    getValue: (row) => row.estudiante,
  },
  {
    key: 'titulo',
    label: 'Título',
    className: 'min-w-[22rem]',
    getValue: (row) => row.titulo,
  },
  {
    key: 'registro',
    label: 'Registro',
    className: 'min-w-[7rem]',
    getValue: (row) => row.registro,
  },
  {
    key: 'acta',
    label: 'Acta',
    className: 'min-w-[6rem]',
    getValue: (row) => row.acta,
  },
  {
    key: 'libro',
    label: 'Libro',
    className: 'min-w-[6rem]',
    getValue: (row) => row.libro,
  },
  {
    key: 'diploma',
    label: 'Diploma',
    className: 'min-w-[7rem]',
    getValue: (row) => row.diploma,
  },
  {
    key: 'fechaRegistro',
    label: 'Fecha registro',
    className: 'min-w-[10rem]',
    getValue: (row) => row.fechaRegistro,
  },
  {
    key: 'anioGrado',
    label: 'Año grado',
    className: 'min-w-[8rem]',
    getValue: (row) => row.anioGrado,
  },
  {
    key: 'correo',
    label: 'Correo',
    className: 'min-w-[17rem]',
    getValue: (row) => row.correo,
  },
  {
    key: 'telefono',
    label: 'Teléfono',
    className: 'min-w-[9rem]',
    getValue: (row) => row.telefono,
  },
  {
    key: 'territorial',
    label: 'Territorial',
    className: 'min-w-[14rem]',
    getValue: (row) => row.territorial,
  },
  {
    key: 'sede',
    label: 'Sede',
    className: 'min-w-[16rem]',
    getValue: (row) => row.sede,
  },
];

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  tipoIdentificacion: ['TIPOIDENTIFICACION', 'TIPO_IDENTIFICACION', 'TIPO DOCUMENTO'],
  identificacion: ['IDENTIFICACION', 'DOCUMENTO', 'CEDULA', 'NUMERO_DOCUMENTO'],
  estudiante: ['ESTUDIANTE', 'NOMBRE', 'NOMBRE_COMPLETO', 'GRADUADO'],
  titulo: ['TITULO', 'PROGRAMA', 'PROGRAMA_ACADEMICO', 'TITULO_OBTENIDO'],
  registro: ['REGISTRO', 'NUM_REGISTRO', 'NUMERO_REGISTRO'],
  acta: ['ACTA', 'NUM_ACTA', 'NUMERO_ACTA', 'FOLIO', 'NUM_FOLIO', 'NUMERO_FOLIO'],
  libro: ['LIBRO', 'NUM_LIBRO', 'NUMERO_LIBRO'],
  diploma: ['DIPLOMA', 'NUM_DIPLOMA', 'DIPLOMA_NUMBER'],
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
  'La SEDE debe pertenecer a la TERRITORIAL indicada en el bloque TERRITORIALES_Y_SEDES.',
  'TIPOIDENTIFICACION se valida en la plantilla, pero el módulo de graduados no lo almacena como campo propio.',
  'REGISTRO, ACTA, LIBRO y DIPLOMA deben ser numéricos. REGISTRO máximo 3 dígitos; ACTA y LIBRO máximo 2; DIPLOMA máximo 6.',
  'CORREO es opcional, pero si se diligencia debe tener @ y un punto después del @.',
  'TELEFONO es opcional, pero si se diligencia solo debe contener números y separadores básicos.',
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
  }

  const year = Number((fallbackYear || '').replace(/\D/g, ''));
  if (Number.isInteger(year) && year >= 1900 && year <= 2100) {
    return `${year}-12-31`;
  }
  return '';
};

const validateEmail = (value: string) => {
  if (!value) return true;
  const atIndex = value.indexOf('@');
  const dotAfterAt = atIndex >= 0 ? value.indexOf('.', atIndex + 2) : -1;
  return atIndex > 0 && dotAfterAt > atIndex + 1 && dotAfterAt < value.length - 1;
};

const normalizePhone = (value: string) => value.replace(/\D+/g, '');

const validateName = (value: string) =>
  /^[\p{L}\s.'-]+$/u.test(value) && /\p{L}/u.test(value) && !/\d/.test(value);

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
  const territorialBySedeKey = new Map<string, string>();
  sedeTerritorialOptions.forEach(({ territorial, sede }) => {
    const sedeKey = normalizeKey(sede);
    const territorialKey = normalizeKey(territorial);
    if (sedeKey) {
      sedeByKey.set(sedeKey, sede);
    }
    if (sedeKey && territorialKey) {
      territorialBySedeKey.set(sedeKey, territorialKey);
    }
    if (territorialKey && !territorialByKey.has(territorialKey)) {
      territorialByKey.set(territorialKey, territorial);
    }
  });

  return {
    programsByKey,
    territorialByKey,
    sedeByKey,
    territorialBySedeKey,
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
  const territorialRows = sedeTerritorialOptions.length
    ? sedeTerritorialOptions
    : territorialOptions.map((territorial) => ({ territorial, sede: '' }));
  const firstProgram = programs[0] || 'ADMINISTRACIÓN PÚBLICA';
  const secondProgram = programs[1] || firstProgram;
  const firstLocation = territorialRows[0] || {
    territorial: 'Seccional Meta',
    sede: 'Sede Territorial Meta',
  };
  const secondLocation = territorialRows[1] || firstLocation;

  return [
    [
      'CC',
      '900100001',
      'LAURA CAMILA ANDRADE RIVERA',
      firstProgram,
      '123',
      '28',
      '3',
      '28',
      '15-07-2022',
      '2022',
      'laura.andrade@example.com',
      '3004567890',
      firstLocation.territorial,
      firstLocation.sede,
    ],
    [
      'CC',
      '900100002',
      'MATEO ALEJANDRO PARRA LÓPEZ',
      secondProgram,
      '124',
      '55',
      '11',
      '55',
      '22-10-2021',
      '2021',
      'mateo.parra@example.com',
      '3109876543',
      secondLocation.territorial,
      secondLocation.sede,
    ],
  ];
};

const buildLocationRows = (
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

  const countsByTerritorial = new Map<string, number>();
  rows.forEach((row) => {
    const key = normalizeKey(row.territorial);
    countsByTerritorial.set(key, (countsByTerritorial.get(key) || 0) + 1);
  });

  return rows.map((row, index) => ({
    ...row,
    order: index + 1,
    sedeCount: countsByTerritorial.get(normalizeKey(row.territorial)) || 0,
  }));
};

const buildParametersRows = (
  programOptions: string[],
  territorialOptions: string[],
  sedeTerritorialOptions: SedeTerritorialOption[],
) => {
  const programs = uniqueSorted(programOptions);
  const locationRows = buildLocationRows(territorialOptions, sedeTerritorialOptions);
  const rows: Array<Array<string | number>> = [
    ['PARAMETROS DE CARGA MASIVA DE GRADUADOS'],
    [
      'Use esta hoja como catálogo oficial. Copie y pegue los valores exactamente como aparecen para evitar errores de ortografía en GRADUADOS.',
    ],
    [''],
    ['BLOQUE 1', 'TITULOS_VALIDOS'],
    ['#', 'TITULO'],
  ];

  programs.forEach((program, index) => rows.push([index + 1, program]));

  rows.push(
    [''],
    ['BLOQUE 2', 'TERRITORIALES_Y_SEDES'],
    [
      'TERRITORIAL',
      'SEDE',
      'SEDES_EN_TERRITORIAL',
      'ORDEN',
      'OBSERVACION',
    ],
  );

  locationRows.forEach((location) => {
    rows.push([
      location.territorial,
      location.sede,
      location.sedeCount,
      location.order,
      'Copie ambos valores en la misma fila del graduado. La sede pertenece a esta territorial.',
    ]);
  });

  rows.push(
    [''],
    ['BLOQUE 3', 'TIPOS_IDENTIFICACION'],
    ['CODIGO', 'NOMBRE', 'VALIDACION_IDENTIFICACION', 'SE_GUARDA_EN_GRADUADOS', 'OBSERVACION'],
  );

  DOCUMENT_TYPE_OPTIONS.forEach((option) => {
    rows.push([
      option.code,
      option.name,
      option.validation,
      option.storedInGraduates,
      option.note,
    ]);
  });

  rows.push([''], ['BLOQUE 4', 'REGLAS_DE_CARGA'], ['#', 'REGLA']);
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
  tipoIdentificacion: string,
  identificacion: string,
  addError: (field: FieldKey, message: string) => void,
) => {
  if (!identificacion) {
    addError('identificacion', 'es obligatoria.');
    return;
  }

  if (tipoIdentificacion === 'CC' || tipoIdentificacion === 'CE') {
    if (!/^\d{6,10}$/.test(identificacion)) {
      addError('identificacion', `${tipoIdentificacion} debe tener entre 6 y 10 dígitos.`);
    }
    return;
  }

  if (tipoIdentificacion === 'TI') {
    if (!/^\d{10,11}$/.test(identificacion)) {
      addError('identificacion', 'TI debe tener 10 u 11 dígitos.');
    }
    return;
  }

  if (identificacion.length < 5 || identificacion.length > 20) {
    addError('identificacion', 'debe tener entre 5 y 20 dígitos.');
  }
};

const validateNumericControlField = (
  field: 'registro' | 'acta' | 'libro' | 'diploma',
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
  const tipoIdentificacion = getCellValue(row, 'tipoIdentificacion').toUpperCase();
  const identificacionRaw = getCellValue(row, 'identificacion');
  const identificacion = identificacionRaw.replace(/\D+/g, '');
  const estudiante = getCellValue(row, 'estudiante').replace(/\s+/g, ' ').trim();
  const titulo = getCellValue(row, 'titulo').replace(/\s+/g, ' ').trim();
  const registro = getCellValue(row, 'registro').trim();
  const acta = getCellValue(row, 'acta').trim();
  const libro = getCellValue(row, 'libro').trim();
  const diploma = getCellValue(row, 'diploma').trim();
  const fechaRegistro = getCellValue(row, 'fechaRegistro').trim();
  const anioGrado = getCellValue(row, 'anioGrado').replace(/\D+/g, '');
  const correo = getCellValue(row, 'correo').trim().toLowerCase();
  const telefono = getCellValue(row, 'telefono').trim();
  const telefonoNormalizado = normalizePhone(telefono);
  const territorial = getCellValue(row, 'territorial').replace(/\s+/g, ' ').trim();
  const sede = getCellValue(row, 'sede').replace(/\s+/g, ' ').trim();
  const errors: string[] = [];
  const fieldErrors: FieldErrors = {};
  const addError = (field: FieldKey, message: string) =>
    addFieldError(errors, fieldErrors, field, message);

  if (!tipoIdentificacion) {
    addError('tipoIdentificacion', 'es obligatorio.');
  } else if (!DOCUMENT_TYPE_CODES.includes(tipoIdentificacion)) {
    addError('tipoIdentificacion', `debe ser uno de: ${DOCUMENT_TYPE_CODES.join(', ')}.`);
  }

  if (identificacionRaw && /[A-Za-z]/.test(identificacionRaw)) {
    addError('identificacion', 'solo debe contener números.');
  } else if (identificacionRaw && /[^\d\s.-]/.test(identificacionRaw)) {
    addError('identificacion', 'solo debe contener números y separadores básicos.');
  }
  validateIdentificationNumber(tipoIdentificacion, identificacion, addError);

  if (!estudiante) {
    addError('estudiante', 'es obligatorio.');
  } else if (!validateName(estudiante)) {
    addError('estudiante', 'solo debe contener letras, espacios, puntos, guiones o apóstrofes.');
  }

  const resolvedTitle = titulo ? resolveCatalogValue(titulo, catalogs.programsByKey) : '';
  if (!titulo) {
    addError('titulo', 'es obligatorio.');
  } else if (catalogs.programsByKey.size > 0 && !resolvedTitle) {
    addError('titulo', 'no coincide con los títulos válidos de la hoja PARAMETROS.');
  }

  validateNumericControlField('registro', registro, addError);
  validateNumericControlField('acta', acta, addError);
  validateNumericControlField('libro', libro, addError);
  validateNumericControlField('diploma', diploma, addError);

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
  } else if (anioGrado.length !== 4 || Number(anioGrado) < 1900 || Number(anioGrado) > 2100) {
    addError('anioGrado', 'debe ser un año válido de cuatro dígitos.');
  } else if (graduationDate && graduationDate.slice(0, 4) !== anioGrado) {
    addError('anioGrado', 'debe coincidir con el año de FECHAREGISTRO.');
  }

  if (!validateEmail(correo)) {
    addError('correo', 'no tiene un formato válido.');
  }

  if (telefono) {
    if (!/^[0-9+\-\s()]+$/.test(telefono)) {
      addError('telefono', 'solo debe contener números y separadores básicos.');
    } else if (telefonoNormalizado.length < 7 || telefonoNormalizado.length > 15) {
      addError('telefono', 'debe tener entre 7 y 15 dígitos.');
    }
  }

  const resolvedTerritorial = territorial ? resolveCatalogValue(territorial, catalogs.territorialByKey) : '';
  if (!territorial) {
    addError('territorial', 'es obligatoria.');
  } else if (catalogs.territorialByKey.size > 0 && !resolvedTerritorial) {
    addError('territorial', 'no coincide con las territoriales válidas de la hoja PARAMETROS.');
  }

  const resolvedSede = sede ? resolveCatalogValue(sede, catalogs.sedeByKey) : '';
  if (!sede) {
    addError('sede', 'es obligatoria.');
  } else if (catalogs.sedeByKey.size > 0 && !resolvedSede) {
    addError('sede', 'no coincide con las sedes válidas de la hoja PARAMETROS.');
  }

  const sedeTerritorialKey = sede ? catalogs.territorialBySedeKey.get(normalizeKey(sede)) : '';
  if (
    territorial &&
    sede &&
    sedeTerritorialKey &&
    normalizeKey(territorial) !== sedeTerritorialKey
  ) {
    addError('sede', 'no pertenece a la TERRITORIAL indicada.');
  }

  const duplicateKey = `${identificacion}::${normalizeKey(titulo)}`;
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
        diplomaNumber: diploma,
        actaNumber: acta,
        numActa: acta,
        numRegistro: registro,
        numFolio: acta,
        numLibro: libro,
        campus: finalSede,
        seccionalName: finalTerritorial,
        status: 'ACTIVE',
        isVerified: true,
        createdBy: 'bulk_upload',
      };

  return {
    rowNumber,
    tipoIdentificacion,
    identificacion,
    estudiante,
    titulo,
    registro,
    acta,
    libro,
    diploma,
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
  programOptions,
  territorialOptions,
  sedeTerritorialOptions,
}: BulkGraduatesUploadModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [rows, setRows] = useState<ParsedGraduateRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkCreateGraduadosResponse | null>(null);

  const catalogs = useMemo(
    () => buildCatalogs(programOptions, territorialOptions, sedeTerritorialOptions),
    [programOptions, territorialOptions, sedeTerritorialOptions],
  );
  const validRows = useMemo(() => rows.filter((row) => row.errors.length === 0), [rows]);
  const invalidRows = rows.length - validRows.length;
  const readyToImport = validRows.length > 0 && !isParsing && !isImporting;

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
    const fileBaseName = 'Plantilla_Carga_Masiva_Graduados_ESAP';
    const exampleRows = createExampleRows(programOptions, territorialOptions, sedeTerritorialOptions);
    const parameterRows = buildParametersRows(programOptions, territorialOptions, sedeTerritorialOptions);
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const graduatesSheet = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      ...exampleRows,
    ]);
    graduatesSheet['!cols'] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 34 },
      { wch: 64 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 28 },
      { wch: 14 },
      { wch: 30 },
      { wch: 36 },
    ];
    graduatesSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

    const parametersSheet = XLSX.utils.aoa_to_sheet(parameterRows);
    parametersSheet['!cols'] = [
      { wch: 24 },
      { wch: 64 },
      { wch: 24 },
      { wch: 24 },
      { wch: 96 },
    ];
    parametersSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

    XLSX.utils.book_append_sheet(workbook, graduatesSheet, 'GRADUADOS');
    XLSX.utils.book_append_sheet(workbook, parametersSheet, 'PARAMETROS');
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
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
        'bulk_upload',
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
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-[92rem] overflow-y-auto">
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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="space-y-5"
        >
          <div className="grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-xl border p-4" style={{ borderColor: '#DBEAFE', background: '#F8FAFF' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                    Plantilla oficial
                  </p>
                  <p className="mt-1 text-xs leading-5" style={{ color: '#64748B' }}>
                    El Excel trae dos hojas: <strong>GRADUADOS</strong> para diligenciar personas y <strong>PARAMETROS</strong> para copiar títulos, territoriales, sedes y tipos de identificación válidos.
                  </p>
                </div>
                <FileSpreadsheet className="h-8 w-8 flex-shrink-0" style={{ color: '#047857' }} />
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => void handleDownloadTemplate()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-emerald-50"
                  style={{ borderColor: '#A7F3D0', color: '#047857', background: '#FFFFFF' }}
                >
                  <Download className="h-4 w-4" />
                  Descargar plantilla XLSX
                </button>
              </div>
              <div className="mt-4 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                Catálogos disponibles: {programOptions.length} títulos, {territorialOptions.length} territoriales y {sedeTerritorialOptions.length} relaciones territorial-sede.
              </div>
            </div>

            <div className="rounded-xl border p-4" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
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
                disabled={isParsing || isImporting}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isParsing || isImporting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{ borderColor: '#CBD5E1', color: '#1F2937', background: '#F8FAFC' }}
              >
                <Upload className="h-4 w-4" />
                {selectedFileName || 'Seleccionar archivo XLSX'}
              </button>
              <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                Se lee únicamente la hoja GRADUADOS. PARAMETROS es la guía para copiar valores válidos y evitar errores de escritura.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden rounded-xl border"
                style={{ borderColor: '#E5E7EB' }}
              >
                <div className="border-b bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Previsualización y validaciones</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Revisa cada columna antes de crear. Las celdas marcadas en rojo indican exactamente qué dato debe corregirse en el archivo.
                  </p>
                </div>
                <div className="max-h-[26rem] overflow-auto">
                  <table className="min-w-[118rem] divide-y divide-gray-200 text-sm">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr>
                        <th className="min-w-[4.5rem] px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Fila</th>
                        <th className="min-w-[8rem] px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Estado</th>
                        {PREVIEW_COLUMNS.map((column) => (
                          <th
                            key={column.key}
                            className={`${column.className} px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600`}
                          >
                            {column.label}
                          </th>
                        ))}
                        <th className="min-w-[26rem] px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {rows.slice(0, 100).map((row) => {
                        const rowFieldErrors = getRowFieldErrors(row);
                        return (
                          <tr key={row.rowNumber} className={row.errors.length ? 'bg-red-50/40' : ''}>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.rowNumber}</td>
                            <td className="whitespace-nowrap px-3 py-2">
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
                                  className={`${column.className} px-3 py-2 align-top ${
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
                            <td className="min-w-[26rem] px-3 py-2 align-top">
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
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
