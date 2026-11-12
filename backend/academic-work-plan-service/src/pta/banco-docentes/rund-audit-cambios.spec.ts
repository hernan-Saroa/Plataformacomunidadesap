import { auditCambios, singleFieldAuditValues } from './rund-audit-cambios';

describe('rund-audit-cambios (NF002)', () => {
  it('un solo campo llena valor anterior y nuevo', () => {
    expect(singleFieldAuditValues({ dedicacion: { anterior: 'MT', nuevo: 'TC' } }))
      .toEqual({ datoPrevio: 'MT', datoNuevo: 'TC' });
  });

  it('varios campos o ninguno no llenan las columnas dedicadas', () => {
    expect(singleFieldAuditValues({ a: { anterior: 1, nuevo: 2 }, b: { anterior: 1, nuevo: 2 } })).toEqual({});
    expect(singleFieldAuditValues({})).toEqual({});
  });

  it('convierte nulos, fechas y objetos a texto', () => {
    expect(singleFieldAuditValues({ x: { anterior: null, nuevo: { a: 1 } } }))
      .toEqual({ datoPrevio: undefined, datoNuevo: '{"a":1}' });
    expect(singleFieldAuditValues({ f: { anterior: new Date('2026-01-02T00:00:00Z'), nuevo: 5 } }))
      .toEqual({ datoPrevio: '2026-01-02T00:00:00.000Z', datoNuevo: '5' });
  });

  it('expone cada campo de metadata.cambios con anterior y nuevo', () => {
    expect(auditCambios({
      campoAfectado: 'dedicacion,estado',
      metadata: { cambios: { dedicacion: { anterior: 'MT', nuevo: 'TC' }, estado: { anterior: null, nuevo: 'ACTIVO' } } },
    })).toEqual([
      { campo: 'dedicacion', anterior: 'MT', nuevo: 'TC' },
      { campo: 'estado', anterior: null, nuevo: 'ACTIVO' },
    ]);
  });

  it('registros anteriores de un campo (cambio de estado, contacto) usan las columnas dedicadas', () => {
    expect(auditCambios({ campoAfectado: 'ESTADO_DOCENTE', datoPrevio: 'ACTIVO', datoNuevo: 'INACTIVO', metadata: {} }))
      .toEqual([{ campo: 'ESTADO_DOCENTE', anterior: 'ACTIVO', nuevo: 'INACTIVO' }]);
  });

  it('sin detalle no inventa cambios', () => {
    expect(auditCambios({ campoAfectado: 'a,b', metadata: {} })).toEqual([]);
    expect(auditCambios({ campoAfectado: null, metadata: null })).toEqual([]);
    expect(auditCambios({ campoAfectado: 'X', metadata: { cambios: [] } })).toEqual([]);
  });
});
