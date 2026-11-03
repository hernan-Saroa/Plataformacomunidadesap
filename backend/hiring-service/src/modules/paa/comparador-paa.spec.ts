import { compararVersiones, type LineaComparable } from './comparador-paa';
import { huellaDe } from './lector-paa';

function linea(codigo: string, valores: Record<string, string | number | null> = {}, regionId = 'sede'): LineaComparable {
  const v = { objeto: `Objeto de ${codigo}`, valor_total: 1000, modalidad: 'Contratación directa', ...valores };
  return { codigo, regionId, valores: v, huella: huellaDe(v) };
}

describe('compararVersiones', () => {
  it('clasifica nuevas, eliminadas, modificadas y sin cambios', () => {
    const base = [linea('LINEA 1'), linea('LINEA 2'), linea('CHOCO 1', {}, 'choco')];
    const nueva = [linea('LINEA 1'), linea('LINEA 2', { valor_total: 2000 }), linea('LINEA 3')];

    const r = compararVersiones(base, nueva, 'MISMA_VIGENCIA');

    expect(r.confiable).toBe(true);
    expect(r.resumen).toMatchObject({ nuevas: 1, eliminadas: 1, modificadas: 1, sinCambios: 1 });
    expect(r.resumen.porRegion).toEqual({
      sede: { nuevas: 1, eliminadas: 0, modificadas: 1 },
      choco: { nuevas: 0, eliminadas: 1, modificadas: 0 },
    });
    expect(r.detalle.nuevas.map((l) => l.codigo)).toEqual(['LINEA 3']);
    expect(r.detalle.eliminadas.map((l) => l.codigo)).toEqual(['CHOCO 1']);
  });

  it('dice qué campo cambió y de qué valor a qué valor', () => {
    const r = compararVersiones(
      [linea('LINEA 2')],
      [linea('LINEA 2', { valor_total: 2000, objeto: 'Otro objeto' })],
      'MISMA_VIGENCIA',
    );
    expect(r.detalle.modificadas[0].cambios).toEqual([
      { campo: 'objeto', etiqueta: 'Objeto', antes: 'Objeto de LINEA 2', despues: 'Otro objeto' },
      { campo: 'valor_total', etiqueta: 'Valor total estimado', antes: 1000, despues: 2000 },
    ]);
  });

  it('no cuenta la descripción como un cambio aparte del objeto', () => {
    const r = compararVersiones(
      [linea('LINEA 1', { descripcion: 'LINEA 1 - A' })],
      [linea('LINEA 1', { descripcion: 'LINEA 1 - B', objeto: 'B' })],
      'MISMA_VIGENCIA',
    );
    expect(r.detalle.modificadas[0].cambios.map((c) => c.campo)).toEqual(['objeto']);
  });

  it('reporta columnas nuevas y retiradas', () => {
    const r = compararVersiones(
      [linea('LINEA 1', { 'extra:Notas': 'x' })],
      [linea('LINEA 1', { 'extra:Prioridad': 'alta' })],
      'MISMA_VIGENCIA',
    );
    expect(r.detalle.columnasNuevas).toEqual(['extra:Prioridad']);
    expect(r.detalle.columnasRetiradas).toEqual(['extra:Notas']);
  });

  it('no es confiable si una versión repite códigos', () => {
    const r = compararVersiones([linea('LINEA 1')], [linea('LINEA 1'), linea('LINEA 1', { valor_total: 5 })], 'MISMA_VIGENCIA');
    expect(r.confiable).toBe(false);
    expect(r.detalle.avisos[0]).toContain('LINEA 1');
  });

  it('entre vigencias avisa que los códigos no equivalen', () => {
    const r = compararVersiones([linea('LINEA 1')], [linea('LINEA 1')], 'CAMBIO_VIGENCIA');
    expect(r.confiable).toBe(true);
    expect(r.detalle.avisos[0]).toContain('no equivale');
  });
});
