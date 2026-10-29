import { describe, expect, it } from 'vitest';
import { getPtaDecisionReference, isOlderPtaWorkflow, mergePtaDecisionRows } from './ptaWorkflowSync';

describe('sincronización del flujo confirmado del PTA', () => {
  it.each(['fechaRevision', 'fechaAprobacion'])('mantiene el listado protegido si falla el resumen después de guardar %s', field => {
    const current = { id: 'pta-1', version: 3, flujo_actualizado_en: '2026-10-28T10:00:00Z' };
    const reference = getPtaDecisionReference(current, { [field]: '2026-10-28T10:01:00Z' });
    const confirmed = { ...current, ...reference };
    expect(reference).toEqual({ version: 3, flujo_actualizado_en: '2026-10-28T10:01:00Z' });
    expect(isOlderPtaWorkflow(confirmed, current)).toBe(false);
    expect(isOlderPtaWorkflow(current, confirmed)).toBe(true);
  });

  it('no inventa una fecha ni retrocede la referencia conocida si el servidor no entrega otra válida', () => {
    const current = { id: 'pta-1', version: 3, flujo_actualizado_en: '2026-10-28T10:01:00Z' };
    expect(getPtaDecisionReference(current, { fechaRevision: 'inválida', updatedAt: '2026-10-28T10:00:00Z' }))
      .toEqual({ version: 3, flujo_actualizado_en: current.flujo_actualizado_en });
    expect(getPtaDecisionReference({}, {})).toEqual({});
  });

  it('acepta una edición de versión posterior y descarta una versión vieja aunque provenga de otro reloj', () => {
    const current = { id: 'pta-1', version: 3, flujo_actualizado_en: '2026-10-28T10:01:00Z' };
    expect(isOlderPtaWorkflow({ ...current, version: 2, flujo_actualizado_en: '2026-10-28T10:02:00Z' }, current)).toBe(true);
    expect(isOlderPtaWorkflow({ ...current, version: 4, flujo_actualizado_en: '2026-10-28T10:00:00Z' }, current)).toBe(false);
  });

  it('distingue decisiones parciales de la misma versión y conserva compatibilidad con respuestas históricas', () => {
    const previous = { id: 'pta-1', version: 1, flujo_actualizado_en: '2026-10-28T10:00:00Z' };
    const current = { ...previous, flujo_actualizado_en: '2026-10-28T10:01:00Z' };
    expect(isOlderPtaWorkflow(previous, current)).toBe(true);
    expect(isOlderPtaWorkflow(current, previous)).toBe(false);
    expect(isOlderPtaWorkflow({ id: 'pta-2' }, current)).toBe(false);
    expect(isOlderPtaWorkflow({ id: 'pta-1' }, { id: 'pta-1' })).toBe(false);
  });

  it('mantiene el aval propio sin aprobar otra territorial o nivel y acepta una reapertura confirmada', () => {
    const propio = { componente: 'academica_territorial', territorialId: 'Pasto', nivel: 'pregrado', estado: 'pendiente' };
    const ajeno = { ...propio, territorialId: 'Bucaramanga' };
    const posgrado = { ...propio, nivel: 'posgrado' };
    const guardado = { ...propio, estado: 'aprobado', comentarios: 'Aval registrado' };
    const resumen = { ...propio, territorial_id: propio.territorialId, estado: 'aprobado' };
    const visible = mergePtaDecisionRows([propio, ajeno, posgrado], [resumen], [guardado]);
    expect(visible.map(row => row.estado)).toEqual(['aprobado', 'pendiente', 'pendiente']);
    expect(visible[0].comentarios).toBe('Aval registrado');
    expect(mergePtaDecisionRows(visible, [{ ...resumen, estado: 'pendiente' }])[0].estado).toBe('pendiente');
  });
});
