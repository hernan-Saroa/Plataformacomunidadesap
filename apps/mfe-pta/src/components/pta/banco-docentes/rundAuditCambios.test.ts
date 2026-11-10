import { describe, expect, it } from 'vitest';
import { auditCambiosOf, formatAuditValue } from './rundAuditCambios';

describe('rundAuditCambios', () => {
  it('muestra (vacío) para nulos y cadenas vacías', () => {
    expect(formatAuditValue(null)).toBe('(vacío)');
    expect(formatAuditValue(undefined)).toBe('(vacío)');
    expect(formatAuditValue('')).toBe('(vacío)');
  });
  it('recorta valores largos y serializa objetos', () => {
    expect(formatAuditValue('a'.repeat(200))).toHaveLength(121);
    expect(formatAuditValue({ a: 1 })).toBe('{"a":1}');
    expect(formatAuditValue('TC')).toBe('TC');
  });
  it('ignora entradas sin cambios o mal formadas', () => {
    expect(auditCambiosOf({})).toEqual([]);
    expect(auditCambiosOf({ cambios: 'x' })).toEqual([]);
    expect(auditCambiosOf({ cambios: [null, { campo: '' }, { campo: 'estado', anterior: 'A', nuevo: 'B' }] }))
      .toEqual([{ campo: 'estado', anterior: 'A', nuevo: 'B' }]);
  });
});
