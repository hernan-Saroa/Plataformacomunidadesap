import { describe, expect, it } from 'vitest';
import { PTA_BULK_APPROVAL_GROUPS, PTA_COMPONENT_KEYS, hasComponentApprovalData, PTA_COMPLEMENTARIAS_COMPONENT_KEYS } from './ptaComponentPermissions';

describe('grupos de aprobación masiva PTA', () => {
  it('mantiene una correspondencia exacta entre permiso, botón y componente', () => {
    const components = PTA_BULK_APPROVAL_GROUPS.flatMap(group => group.componentKeys);

    expect(components).toEqual(PTA_COMPONENT_KEYS);
    expect(new Set(components).size).toBe(PTA_COMPONENT_KEYS.length);
    expect(PTA_BULK_APPROVAL_GROUPS.every(group => group.componentKeys.length === 1)).toBe(true);
  });

  it('no concede Complementarias al botón de Docencia Pregrado', () => {
    const pregrado = PTA_BULK_APPROVAL_GROUPS.find(group => group.key === 'docencia_pregrado');
    const complementarias = PTA_BULK_APPROVAL_GROUPS.find(group => group.key === 'complementarias_pregrado');

    expect(pregrado?.componentKeys).toEqual(['academica_pregrado']);
    expect(complementarias?.componentKeys).toEqual(['complementarias_pregrado']);
  });

  it.each(PTA_COMPLEMENTARIAS_COMPONENT_KEYS)('incluye %s sin horas en la bandeja correspondiente, conservando separados los demás ámbitos', key => {
    const pta = {
      complementarias_por_componente: Object.fromEntries(PTA_COMPLEMENTARIAS_COMPONENT_KEYS.map(k => [k, 0])),
      complementarias_con_contenido: Object.fromEntries(PTA_COMPLEMENTARIAS_COMPONENT_KEYS.map(k => [k, k === key])),
    };
    expect(PTA_COMPLEMENTARIAS_COMPONENT_KEYS.filter(k => hasComponentApprovalData(pta, k))).toEqual([key]);
  });
});
