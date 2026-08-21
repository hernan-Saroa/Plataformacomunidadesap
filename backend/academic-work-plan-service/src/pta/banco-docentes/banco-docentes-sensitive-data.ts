export const RUND_SENSITIVE_FIELDS = ['DOCUMENTO_IDENTIDAD', 'PUNTAJE_SALARIAL'] as const;

const FULL_ACCESS_ROLES = new Set(['GESTION_PROFESORAL', 'SUPER_ADMIN']);
const DOCUMENT_KEYS = new Set([
  'documento_identidad',
  'documentoidentidad',
  'documentnumber',
  'num_identificacion',
  'identificacion',
  'documento',
]);
const SALARY_KEYS = new Set(['puntaje_salarial', 'puntajesalarial']);

export type RundSensitiveField = typeof RUND_SENSITIVE_FIELDS[number];

function normalizeKey(value: unknown): string {
  return String(value || '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
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

    const fieldCode = String(current.campo || '').trim().toUpperCase();
    if (fieldCode === 'DOCUMENTO_IDENTIDAD' && current.valor !== null && current.valor !== undefined) {
      fields.add('DOCUMENTO_IDENTIDAD');
    }
    if (fieldCode === 'PUNTAJE_SALARIAL' && current.valor !== null && current.valor !== undefined) {
      fields.add('PUNTAJE_SALARIAL');
    }

    Object.entries(current).forEach(([key, nestedValue]) => {
      const normalized = normalizeKey(key);
      if (DOCUMENT_KEYS.has(normalized) && nestedValue !== null && nestedValue !== undefined) {
        fields.add('DOCUMENTO_IDENTIDAD');
      } else if (SALARY_KEYS.has(normalized) && nestedValue !== null && nestedValue !== undefined) {
        fields.add('PUNTAJE_SALARIAL');
      } else {
        visit(nestedValue);
      }
    });
  };

  visit(value);
  return Array.from(fields);
}

function protectRecursively(value: unknown): any {
  if (Array.isArray(value)) return value.map(protectRecursively);
  if (!isRecord(value)) return value;

  const protectedValue: Record<string, any> = {};
  const fieldCode = String(value.campo || '').trim().toUpperCase();
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    if (DOCUMENT_KEYS.has(normalized)) {
      protectedValue[key] = maskIdentityDocument(nestedValue);
    } else if (SALARY_KEYS.has(normalized)) {
      protectedValue[key] = null;
    } else if (key === 'valor' && fieldCode === 'DOCUMENTO_IDENTIDAD') {
      protectedValue[key] = maskIdentityDocument(nestedValue);
    } else if (key === 'valor' && fieldCode === 'PUNTAJE_SALARIAL') {
      protectedValue[key] = null;
    } else if (key === 'editable' && (fieldCode === 'DOCUMENTO_IDENTIDAD' || fieldCode === 'PUNTAJE_SALARIAL')) {
      protectedValue[key] = false;
    } else {
      protectedValue[key] = protectRecursively(nestedValue);
    }
  }

  if (fieldCode === 'DOCUMENTO_IDENTIDAD' || fieldCode === 'PUNTAJE_SALARIAL') {
    protectedValue.restringido = true;
  }
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
