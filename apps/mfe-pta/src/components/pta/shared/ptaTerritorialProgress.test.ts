import { describe, expect, it } from 'vitest';
import { mergeTerritorialProgress, scopedTerritorialProgress, territorialProgressStatus } from './ptaTerritorialProgress';

describe('avance territorial autorizado', () => {
  const pre = { territorialId: 'Pasto', nivel: 'pregrado' };
  const pos = { territorialId: 'Pasto', nivel: 'posgrado' };
  it('proyecta solo el nivel y territorial concedidos, sin sumar pendientes ajenos', () => {
    const own = scopedTerritorialProgress([{ ...pre, estado: 'revisado' }, { territorialId: 'Bucaramanga', nivel: 'pregrado', estado: 'pendiente' }], [], [pre], { estado: 'pendiente' });
    expect(own).toEqual([expect.objectContaining({ ...pre, estado: 'revisado' })]);
    expect(territorialProgressStatus(own, 'revisado')).toBe('revisado');
  });
  it('un cambio confirmado sustituye el estado anterior sin modificar otro nivel del mismo territorio', () => {
    const rows = mergeTerritorialProgress([{ ...pre, estado: 'pendiente' }, { ...pos, estado: 'pendiente' }],
      [{ territorial_id: 'Pasto', nivel: 'pregrado', estado: 'aprobado' }]);
    expect(rows[1]).toEqual({ ...pos, estado: 'pendiente' });
    expect(territorialProgressStatus(scopedTerritorialProgress(rows, [], [pre], {}), 'aprobado')).toBe('aprobado');
    expect(territorialProgressStatus(rows, 'aprobado')).toBe('pendiente');
  });
  it('respeta la revisión pendiente explícita de un par aunque el consolidado histórico diga revisado', () => {
    const rows = scopedTerritorialProgress([{ ...pre, estado: 'pendiente' }], [], [pre], { estado: 'revisado' });
    expect(territorialProgressStatus(rows, 'revisado')).toBe('pendiente');
  });
});
