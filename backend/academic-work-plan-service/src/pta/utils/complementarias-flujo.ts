import type { PTAComponentKey, PTATipoAprobacionComplementaria } from '../auth/pta-permissions.constants';

export const COMPLEMENTARIAS_FLUJO_SECUENCIAL = 'programa_responsable_v1';
export const COMPLEMENTARIAS_FLUJO_LEGACY = 'legacy';

export function tipoAprobacionComplementaria(value: unknown): PTATipoAprobacionComplementaria {
  const tipo = String(value || '').trim().toLowerCase();
  return tipo === 'decanatura' || tipo === 'territorial' ? tipo : 'gestion_profesoral';
}

/** Las etapas son autorizaciones sobre la misma actividad, nunca carga adicional. */
export function etapasComplementaria(
  nivel: unknown, tipo: PTATipoAprobacionComplementaria | undefined, territorial: unknown, legacy = false,
): PTAComponentKey[] {
  const programa = nivel === 'pregrado' ? 'complementarias_pregrado'
    : nivel === 'posgrado' ? 'complementarias_posgrado' : undefined;
  if (legacy) {
    if ((tipo === 'decanatura' || tipo === 'territorial') && territorial) return ['complementarias_territorial'];
    return [programa || (tipo === 'gestion_profesoral' ? 'complementarias_gestion_profesoral' : 'complementarias')];
  }
  if (!tipo) return [programa || 'complementarias'];
  const responsable = tipo === 'decanatura' ? 'complementarias_decanatura'
    : tipo === 'territorial' ? 'complementarias_territorial' : 'complementarias_gestion_profesoral';
  return programa ? [programa, responsable] : [responsable];
}

export function complementariasHistoricas(pta: any): boolean {
  const datos = pta?.datosEstructurados || pta || {};
  const version = datos.complementarias_flujo_version ?? pta?.complementarias_flujo_version;
  if (version === COMPLEMENTARIAS_FLUJO_LEGACY) return true;
  if (version === COMPLEMENTARIAS_FLUJO_SECUENCIAL) return false;
  const estado = String(pta?.estado || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return ['APROBADO', 'TERMINADO', 'EN_FIRME', 'FINALIZADO', 'APROBADO_DEF'].includes(estado);
}
