import { describe, expect, it } from 'vitest';
import { canDecidePtaComponent } from './ptaDecisionPermissions';
import type { PTADecisionPermissions } from '../../../services/api/ptaApi';

const permissions: PTADecisionPermissions = {
  allowedComponents: ['academica_territorial', 'academica_pregrado'],
  allowedReviewSubsecciones: ['academica_territorial:general'],
  territorial: {
    aprobar: { pairs: [{ territorialId: 'narino', nivel: 'pregrado' }], reason: null },
    revisar: { pairs: [{ territorialId: 'narino', nivel: 'posgrado' }], reason: null },
  },
};

describe('alcance efectivo para decidir componentes', () => {
  it('bloquea mientras no se conocen los permisos y respeta componentes independientes', () => {
    expect(canDecidePtaComponent(null, 'academica_pregrado', 'aprobar')).toBe(false);
    expect(canDecidePtaComponent(permissions, 'academica_pregrado', 'aprobar')).toBe(true);
    expect(canDecidePtaComponent(permissions, 'academica_posgrado', 'aprobar')).toBe(false);
    expect(canDecidePtaComponent(permissions, 'academica_pregrado', 'revisar')).toBe(false);
  });
  it.each([
    ['narino', 'pregrado', 'aprobar', true],
    ['narino', 'posgrado', 'aprobar', false],
    ['meta', 'pregrado', 'aprobar', false],
    ['narino', 'posgrado', 'revisar', true],
    ['narino', 'pregrado', 'revisar', false],
  ] as const)('evalúa territorial %s, nivel %s y etapa %s', (territorialId, nivel, stage, expected) => {
    expect(canDecidePtaComponent(permissions, 'academica_territorial', stage, 'general', { territorialId, nivel })).toBe(expected);
  });
  it('no concede aprobación general si no hay ningún par territorial autorizado', () => {
    const unassigned = { ...permissions, territorial: {
      ...permissions.territorial, aprobar: { pairs: [], reason: 'Sin territorial asignada' },
    } };
    expect(canDecidePtaComponent(unassigned, 'academica_territorial', 'aprobar')).toBe(false);
  });
});
