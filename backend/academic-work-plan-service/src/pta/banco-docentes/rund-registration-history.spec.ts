import { bulkRegistrationTrace, historicalRegistrationRows, registrationHistoryFilters, RundRegistrationHistory } from './rund-registration-history';
import * as xlsx from 'xlsx';

describe('Trazabilidad del registro RUND', () => {
  it('recupera las personas de un Excel histórico con su periodo, sin inventar aprobaciones o creaciones', () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['Registro de docentes'], ['DOCUMENTO', 'NOMBRE'], ['TEST-1', 'Persona del Archivo'],
    ]), 'DATOS');
    const content = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const rows = historicalRegistrationRows(content, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', { periodo: '2026-2' });
    expect(rows).toEqual([expect.objectContaining({ nombre: 'Persona del Archivo', documento_identidad: 'TEST-1', periodo: '2026-2', resultado: 'HISTORICO', fila: 3 })]);
    expect(rows[0].fecha).toBeUndefined();
  });
  it('conserva filas sin cambios, fallidas y omitidas sin guardar el payload completo', () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({ __sourceRowNumber: index + 2, NOMBRE_COMPLETO: 'Nombre de prueba',
      DOCUMENTO_IDENTIDAD: '123456', PERIODO_CARGA: '2026-2', PUNTAJE_SALARIAL: 'NO_PUBLICAR' }));
    const trace = bulkRegistrationTrace(rows, [{ sourceRowNumber: 2, action: 'unchanged', fullName: 'Nombre al cargar', periodoCarga: '2026-2' }], [{ fila: 3, data: { password: 'NO_PUBLICAR' } }]);
    expect(trace.registros.map(row => row.resultado)).toEqual(['SIN_CAMBIOS', 'NO_CARGADO', 'NO_PROCESADO']);
    expect(trace.registros[0].nombre).toBe('Nombre al cargar');
    expect(trace.resumenPorPeriodo['2026-2']).toMatchObject({ total: 3, sinCambios: 1, errores: 1, omitidos: 1 });
    expect(JSON.stringify(trace)).not.toContain('NO_PUBLICAR');
  });
  it('conserva la fecha de validación de una fila rechazada y distingue los documentos duplicados', () => {
    const trace = bulkRegistrationTrace([{ __sourceRowNumber: 2, NOMBRE_COMPLETO: 'Persona', PERIODO_CARGA: '2026-2' }], [],
      [{ fila: 2, tipo: 'DUPLICADO_DOCUMENTO', processedAt: '2026-10-22T14:00:00Z' }]);
    expect(trace.registros[0]).toMatchObject({ resultado: 'NO_CARGADO', fecha: '2026-10-22T14:00:00Z', observacion: 'Documento repetido dentro del archivo para el mismo periodo.' });
  });
  it.each([{ page: '-1' }, { limit: '100' }, { tipo: 'BORRAR' }, { search: 'x'.repeat(151) }])('rechaza filtros inválidos: %j', query => {
    expect(() => registrationHistoryFilters(query)).toThrow();
  });
  it('rechaza una operación inválida antes de consultar la base', async () => {
    const db = { query: jest.fn() };
    await expect(new RundRegistrationHistory(db as any).detail('MASIVO','invalido',{})).rejects.toThrow('no es válida');
    expect(db.query).not.toHaveBeenCalled();
  });
});
