import { PTANivelDocencia, PTA_APPROVE_ALL, PTA_REVIEW_ALL, TERRITORIAL_NIVEL_APPROVE_PERMISSION, TERRITORIAL_NIVEL_REVIEW_PERMISSION } from './pta-permissions.constants';

export interface PtaTerritorialDecisionGrant {
  nivel: PTANivelDocencia;
  territorial: 'persona' | 'todas' | 'seleccionada';
  territorialId?: string;
  cetap?: string;
  programa?: string;
}

export type PtaTerritorialDecisionGrants = Record<'aprobar' | 'revisar', PtaTerritorialDecisionGrant[]>;

/** Cada permiso conserva el alcance de su propio rol: no se mezclan roles ajenos. */
export function territorialGrantsFromRoles(rows: Array<{ permission_code: string | null; role_scope?: unknown }>): PtaTerritorialDecisionGrants {
  const result: PtaTerritorialDecisionGrants = { aprobar: [], revisar: [] };
  const text = (v: unknown) => typeof v === 'string' ? v.trim() : '';
  for (const row of rows) {
    const scope = row.role_scope as any;
    let normalized: Omit<PtaTerritorialDecisionGrant, 'nivel'>;
    if (!scope || ['territorial', 'territorial_por_persona'].includes(text(scope.tipo).toLowerCase())) {
      normalized = { territorial: 'persona' };
    } else if (text(scope.tipo).toLowerCase() === 'global') {
      normalized = { territorial: 'todas' };
    } else if (text(scope.tipo).toLowerCase() === 'filtrado' && text(scope.territorial)) {
      const territorial = text(scope.territorial);
      normalized = territorial.toLowerCase() === 'todas'
        ? { territorial: 'todas' }
        : { territorial: 'seleccionada', territorialId: territorial };
      for (const field of ['cetap', 'programa'] as const) {
        const value = text(scope[field]);
        if (value && value.toLowerCase() !== 'todos') normalized[field] = value;
      }
    } else {
      // Un alcance desconocido no debe convertirse en acceso global.
      continue;
    }
    for (const nivel of ['pregrado', 'posgrado'] as const) {
      if (row.permission_code === PTA_APPROVE_ALL || row.permission_code === TERRITORIAL_NIVEL_APPROVE_PERMISSION[nivel]) {
        result.aprobar.push({ ...normalized, nivel });
      }
      if (row.permission_code === PTA_REVIEW_ALL || row.permission_code === TERRITORIAL_NIVEL_REVIEW_PERMISSION[nivel]) {
        result.revisar.push({ ...normalized, nivel });
      }
    }
  }
  return result;
}
