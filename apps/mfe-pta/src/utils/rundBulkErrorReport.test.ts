import { describe, expect, it } from 'vitest';
import { buildRundBulkErrorReportRows, rundBulkErrorReportFileName } from './rundBulkErrorReport';

describe('Reporte de errores de la carga masiva RUND (HU 1355)', () => {
  it('arma las columnas fila, cédula, nombre, columna, dato errado, valor esperado y motivo, ordenadas por fila', () => {
    const rows = buildRundBulkErrorReportRows([
      { fila: 9, documentoIdentidad: '55', nombre: 'Luis Gómez', columna: 'DOCUMENTO_IDENTIDAD', datoErrado: '55', valorEsperado: 'Entre 5 y 20 caracteres', mensaje: 'La cédula debe tener entre 5 y 20 caracteres.' },
      { row: 3, data: { DOCUMENTO_IDENTIDAD: '1020304050', NOMBRE_COMPLETO: 'Ana Pérez' }, columna: 'GENERO', datoErrado: '(vacío)', message: 'Campo obligatorio vacío: GENERO' },
    ]);
    expect(rows.map(r => r.Fila)).toEqual([3, 9]);
    expect(rows[0]).toEqual({ Fila: 3, 'Documento de identidad': '1020304050', Nombre: 'Ana Pérez', Columna: 'GENERO',
      'Dato errado': '(vacío)', 'Valor esperado': '', Motivo: 'Campo obligatorio vacío: GENERO' });
    expect(rows[1].Motivo).toBe('La cédula debe tener entre 5 y 20 caracteres.');
  });

  it('acepta errores en texto plano y pone un motivo por defecto si falta', () => {
    const rows = buildRundBulkErrorReportRows(['Archivo equivocado', { fila: 2 }]);
    expect(rows[1].Motivo).toBe('Archivo equivocado');
    expect(rows[0].Motivo).toBe('El registro no superó la validación de la carga.');
  });

  it('sin errores devuelve vacío (no se genera archivo)', () => {
    expect(buildRundBulkErrorReportRows([])).toEqual([]);
    expect(buildRundBulkErrorReportRows(undefined as any)).toEqual([]);
  });

  it('el nombre del archivo es seguro y conserva el del Excel de origen', () => {
    expect(rundBulkErrorReportFileName('Carga Docentes 2026-2.xlsx')).toBe('reporte-errores-Carga_Docentes_2026-2.xlsx');
    expect(rundBulkErrorReportFileName('../../x:y*.csv')).toBe('reporte-errores-x_y.xlsx');
    expect(rundBulkErrorReportFileName(null)).toBe('reporte-errores-carga-rund.xlsx');
  });
});
