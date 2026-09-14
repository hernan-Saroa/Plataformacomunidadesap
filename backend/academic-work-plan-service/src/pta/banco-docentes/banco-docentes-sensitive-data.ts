export const RUND_SENSITIVE_FIELDS = ['DOCUMENTO_IDENTIDAD', 'PUNTAJE_SALARIAL'] as const;

const FULL_ACCESS_ROLES = new Set(['GESTION_PROFESORAL', 'SUPER_ADMIN']);
const DOCUMENT_KEYS = new Set([
  'documento_identidad',
  'documentoidentidad',
  'documentnumber',
  'num_identificacion',
  'identificacion',
  'documento',
  'document',
  'document_number',
  'documentodeidentidad',
  'numero_documento',
  'cedula',
  'docente_identificacion',
  'documento_docente',
]);
const SALARY_KEYS = new Set(['puntaje_salarial', 'puntajesalarial']);
const VALUE_KEYS = new Set(['valor', 'datoprevio', 'datonuevo', 'dato_previo', 'dato_nuevo', 'valoranterior', 'valornuevo', 'datoerrado']);

export type RundSensitiveField = typeof RUND_SENSITIVE_FIELDS[number];

function normalizeKey(value: unknown): string {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

function fieldForKey(key: unknown): RundSensitiveField | undefined {
  const normalized = normalizeKey(key);
  if (DOCUMENT_KEYS.has(normalized)) return 'DOCUMENTO_IDENTIDAD';
  if (SALARY_KEYS.has(normalized)) return 'PUNTAJE_SALARIAL';
  return undefined;
}

function contextualField(value: Record<string, any>): RundSensitiveField | undefined {
  return fieldForKey(value.campo || value.campoAfectado || value.campo_afectado || value.columna || value.field);
}

// Los historiales antiguos pueden guardar snapshots JSON como texto.
function parsedSnapshot(value: unknown): unknown {
  if (typeof value !== 'string' || !/^[\s]*[\[{]/.test(value)) return value;
  try { return JSON.parse(value); } catch { return value; }
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

export function getRequestRoleCodes(user: any): string[] {
  const rawRoles = Array.isArray(user?.roles) ? user.roles : [user?.role];
  return Array.from(new Set(rawRoles
    .map((role: any) => String(typeof role === 'string' ? role : role?.code || '').trim().toUpperCase())
    .filter(Boolean)));
}

/** Lista blanca deliberadamente estricta: cualquier rol no definido recibe datos protegidos. */
export function canViewRundSensitiveData(user: any): boolean {
  return getRequestRoleCodes(user).some((role) => FULL_ACCESS_ROLES.has(role));
}

export function maskIdentityDocument(value: unknown): string | null {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const document = String(value).trim();
  if (document.length <= 4) return '*'.repeat(document.length);
  return `${'*'.repeat(document.length - 4)}${document.slice(-4)}`;
}

export function findRundSensitiveFields(value: unknown): RundSensitiveField[] {
  const fields = new Set<RundSensitiveField>();

  const visit = (current: unknown) => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!isRecord(current)) return;

    if ((current.tipo_soporte || current.tipoSoporte || current.documentoLogicoId || current.rundSoporteId || current.rund_soporte_id)
      && (current.nombre_archivo || current.nombreArchivo || current.documentoCarpetaId || current.documento_carpeta_id || current.contenidoUrl)) {
      RUND_SENSITIVE_FIELDS.forEach((field) => fields.add(field));
    }

    const fieldCode = contextualField(current);
    Object.entries(current).forEach(([key, nestedValue]) => {
      const normalized = normalizeKey(key);
      const field = fieldForKey(key) || (VALUE_KEYS.has(normalized) ? fieldCode : undefined);
      if (field && nestedValue !== null && nestedValue !== undefined) {
        fields.add(field);
      } else {
        visit(VALUE_KEYS.has(normalized) ? parsedSnapshot(nestedValue) : nestedValue);
      }
    });
  };

  visit(value);
  return Array.from(fields);
}

function protectRecursively(value: unknown, supportContext = false): any {
  if (Array.isArray(value)) return value.map((item) => protectRecursively(item, supportContext));
  if (!isRecord(value)) return value;

  const protectedValue: Record<string, any> = {};
  const fieldCode = contextualField(value);
  const isSupport = supportContext || Boolean(value.tipo_soporte || value.tipoSoporte || value.rundSoporteId || value.rund_soporte_id || value.documentoLogicoId || value.soporteId || value.soporte_id);
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    const field = fieldForKey(key) || (VALUE_KEYS.has(normalized) ? fieldCode : undefined);
    if (isSupport && ['nombrearchivo', 'nombre_archivo'].includes(normalized)) {
      protectedValue[key] = 'Documento del perfil';
    } else if (isSupport && ['documentocarpetaid', 'documento_carpeta_id', 'contenidourl', 'url', 'observacion', 'descripcion'].includes(normalized)) {
      protectedValue[key] = null;
    } else if (fieldCode && ['observacion', 'observaciones', 'motivo', 'justificacion'].includes(normalized)) {
      protectedValue[key] = null;
    } else if (field === 'DOCUMENTO_IDENTIDAD') {
      protectedValue[key] = maskIdentityDocument(nestedValue);
    } else if (field === 'PUNTAJE_SALARIAL') {
      protectedValue[key] = null;
    } else if (key === 'editable' && (fieldCode === 'DOCUMENTO_IDENTIDAD' || fieldCode === 'PUNTAJE_SALARIAL')) {
      protectedValue[key] = false;
    } else {
      const snapshot = VALUE_KEYS.has(normalized) ? parsedSnapshot(nestedValue) : nestedValue;
      protectedValue[key] = snapshot !== nestedValue
        ? JSON.stringify(protectRecursively(snapshot, isSupport))
        : protectRecursively(nestedValue, isSupport);
    }
  }

  if (fieldCode === 'DOCUMENTO_IDENTIDAD' || fieldCode === 'PUNTAJE_SALARIAL') {
    protectedValue.restringido = true;
  }
  if (isSupport) protectedValue.contenidoRestringido = true;
  return protectedValue;
}

export function protectRundSensitiveData<T>(value: T, allowFullAccess: boolean): T {
  const fields = findRundSensitiveFields(value);
  const result: any = allowFullAccess ? value : protectRecursively(value);
  if (!isRecord(result)) return result as T;

  return {
    ...result,
    proteccion_datos: {
      acceso_completo: allowFullAccess,
      campos_sensibles: fields,
      campos_enmascarados: allowFullAccess ? [] : fields,
    },
  } as T;
}

/** Conserva la estructura de errores de importación sin repetir datos en el texto libre. */
export function protectRundBulkResponse<T>(value: T, fullAccess: boolean): T {
  if (fullAccess) return protectRundSensitiveData(value, true);
  const result: any = protectRundSensitiveData(value, false);
  if (Array.isArray(result?.errorDetails)) {
    result.errorDetails = result.errorDetails.map((error: any) => {
      const column = String(error.columna || error.field || 'fila');
      return {
        ...error,
        // El detalle estructurado conserva columna, fila y valor esperado; nunca un error SQL o un eco del original.
        message: `No se pudo procesar la fila. Revise ${column.replace(/[^a-zA-Z_áéíóúÁÉÍÓÚ ]/g, '') || 'los campos indicados'}.`,
        mensaje: `No se pudo procesar la fila. Revise los campos indicados.`,
        reasons: undefined,
        razones: undefined,
        valorEsperado: findRundSensitiveFields(error).length ? 'Valor válido según el campo indicado' : error.valorEsperado,
      };
    });
  }
  return result;
}
