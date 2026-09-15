import { normalizeLaborFunctionText, resolveLaborInternalGroup } from './labor-functions.utils';

export type LaborOrganization = {
  department?: string | null;
  organization_department?: string | null;
  internal_group?: string | null;
  cost_center?: string | null;
  position_location?: string | null;
};
export type LaborContextRequest = LaborOrganization & {
  id_number?: string | null;
  status?: string | null;
  observations?: string | null;
  position_category?: string | null;
  hiring_date?: Date | string | null;
  request_date?: Date | string | null;
  created_at?: Date | string | null;
  certificate_dependency?: string;
  certificate_organization?: LaborOrganization;
};

const dateOnly = (value?: Date | string | null): Date | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    const ymd = value.trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+.*)?$/);
    const dmy = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+.*)?$/);
    if (ymd || dmy) {
      const [year, month, day] = ymd
        ? [Number(ymd[1]), Number(ymd[2]), Number(ymd[3])]
        : [Number(dmy![3]), Number(dmy![2]), Number(dmy![1])];
      const date = new Date(year, month - 1, day, 12);
      return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
};
const isActive = (row: LaborContextRequest): boolean => {
  const status = String(row.status || '').trim().toUpperCase();
  if (['A', 'ACTIVO', 'ACTIVE'].includes(status)) return true;
  if (['I', 'INACTIVO', 'INACTIVE'].includes(status)) return false;
  const start = dateOnly(row.hiring_date);
  const end = dateOnly(row.request_date);
  const today = dateOnly(new Date())!;
  return !!start && today >= start && (!end || today <= end);
};
const isEncargo = (row: LaborContextRequest) => String(row.observations || '').trim().toUpperCase().startsWith('E');
const documentKey = (row: LaborContextRequest) => normalizeLaborFunctionText(row.id_number).replace(/\s+/g, '');
const timestamp = (value?: Date | string | null) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

/** Prioridad compartida con la fecha de ingreso: normal vigente, carrera
 * administrativa, fecha de solicitud, ingreso y creacion. */
export const selectNormalLaborRequest = <T extends LaborContextRequest>(selected: T, rows: T[]): T => {
  const document = documentKey(selected);
  const candidates = rows.filter(row =>
    (!document || documentKey(row) === document) && !isEncargo(row) && isActive(row),
  ).sort((left, right) => {
    for (const [a, b] of [
      [left.request_date || left.hiring_date || left.created_at, right.request_date || right.hiring_date || right.created_at],
      [left.hiring_date, right.hiring_date], [left.created_at, right.created_at],
    ]) {
      const difference = timestamp(b) - timestamp(a);
      if (difference !== 0) return difference;
    }
    return 0;
  });
  return candidates.find(row => {
    const category = normalizeLaborFunctionText(row.position_category);
    return category.includes('cra administrativa') || category.includes('carrera administrativa');
  }) || candidates[0] || selected;
};

/** Contexto calculado de solo lectura; conserva todos los campos del encargo. */
export const buildLaborOrganizationContext = <T extends LaborContextRequest>(selected: T, rows: T[]) => {
  const normal = selectNormalLaborRequest(selected, rows);
  if (!isEncargo(selected) || normal === selected) {
    return { certificate_dependency: undefined, certificate_organization: undefined };
  }
  const organization: LaborOrganization = {
    department: normal.department ?? null,
    organization_department: normal.organization_department ?? null,
    internal_group: normal.internal_group ?? null,
    cost_center: normal.cost_center ?? null,
    position_location: normal.position_location ?? null,
  };
  return {
    certificate_organization: organization,
    certificate_dependency: resolveLaborInternalGroup(organization.internal_group, organization.cost_center) ||
      String(organization.department || '').trim() || String(organization.organization_department || '').trim(),
  };
};

/** Solo la matriz aplica estos campos; las otras variables del PDF usan el encargo. */
export const withLaborOrganization = <T extends LaborContextRequest>(row: T): T =>
  row.certificate_organization ? { ...row, ...row.certificate_organization } : row;

export const attachLaborOrganizationContexts = <T extends LaborContextRequest>(rows: T[], related: LaborContextRequest[] = rows) => {
  const byDocument = new Map<string, LaborContextRequest[]>();
  for (const row of related) {
    const key = documentKey(row);
    const group = byDocument.get(key) || [];
    group.push(row);
    byDocument.set(key, group);
  }
  return rows.map(row => ({ ...row, ...buildLaborOrganizationContext(row, byDocument.get(documentKey(row)) || []) }));
};
