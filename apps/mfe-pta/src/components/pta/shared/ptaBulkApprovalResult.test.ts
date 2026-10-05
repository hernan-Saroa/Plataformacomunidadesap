import { describe, expect, it } from 'vitest';
import { groupPtaBulkApprovalResults } from './ptaBulkApprovalResult';

describe('resultado de aprobación masiva por PTA', () => {
  it('cuenta tres PTA una sola vez y conserva aprobaciones parciales con sus motivos', () => {
    const result = groupPtaBulkApprovalResults(['p1', 'p2', 'p3'], [
      { ptaId: 'p1', componente: 'academica_pregrado', estado: 'aprobado' },
      { ptaId: 'p1', componente: 'complementarias_pregrado', estado: 'omitido', motivo: 'Sin actividades en este componente' },
      { ptaId: 'p2', componente: 'academica_pregrado', estado: 'aprobado' },
      { ptaId: 'p2', componente: 'complementarias_pregrado', estado: 'fallido', motivo: 'Fuera de alcance territorial' },
      { ptaId: 'p3', componente: 'academica_pregrado', estado: 'fallido', motivo: 'Revisión pendiente' },
      { ptaId: 'p3', componente: 'complementarias_pregrado', estado: 'omitido', motivo: 'Sin actividades en este componente' },
    ]);
    expect(result).toMatchObject({ total: 3, aprobados: 2, noAprobados: 1 });
    expect(result.ptas[1]).toMatchObject({ aprobado: true, detalles: expect.arrayContaining([
      expect.objectContaining({ estado: 'fallido', motivo: 'Fuera de alcance territorial' }),
    ]) });
  });

  it('informa como aprobado lo que ya estaba aprobado y no duplica IDs', () => {
    expect(groupPtaBulkApprovalResults(['p1', 'p1'], [
      { ptaId: 'p1', componente: 'investigacion', estado: 'omitido', motivo: 'Ya estaba aprobado' },
    ])).toMatchObject({ total: 1, aprobados: 1, noAprobados: 0 });
  });

  it('no inventa aprobaciones para PTA vacíos, devueltos o sin confirmación', () => {
    expect(groupPtaBulkApprovalResults(['p1', 'p2', 'p3'], [
      { ptaId: 'p1', componente: 'investigacion', estado: 'omitido', motivo: 'Sin actividades en este componente' },
      { ptaId: 'p2', componente: 'investigacion', estado: 'omitido', motivo: 'Devuelto: pendiente de corrección del docente' },
    ])).toMatchObject({ total: 3, aprobados: 0, noAprobados: 3 });
  });
});
