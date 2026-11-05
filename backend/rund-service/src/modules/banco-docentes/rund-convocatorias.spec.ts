import { BancoDocentesService } from './banco-docentes.service';
import { convocatoriaKey, convocatoriaName, convocatoriaPeriod } from './rund-convocatorias';
import { registrationHistoryFilters } from './rund-registration-history';

describe('Convocatorias de cargas RUND', () => {
  const build = () => {
    const service = Object.create(BancoDocentesService.prototype) as BancoDocentesService;
    const query = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT resumen')) return [{ nombre: 'Convocatoria Pública' }];
      return [];
    });
    (service as any).dataSource = { query };
    (service as any).catalogos = { periodoActivo: jest.fn().mockResolvedValue('2026-2'), territorialesBanco: jest.fn().mockResolvedValue([]) };
    jest.spyOn(service, 'upsertDocente').mockResolvedValue({ action: 'unchanged', docenteId: 'docente-1', sourceRowNumber: 2, periodoCarga: '2026-2' } as any);
    return { service, query };
  };
  const support = { fileName: 'docentes.xlsx', mimeType: 'application/octet-stream', content: Buffer.from('prueba') };

  it('normaliza espacios, mayúsculas y tildes para reutilizar el mismo nombre', () => {
    expect(convocatoriaName('  Convocatoria   Pública  ')).toBe('Convocatoria Pública');
    expect(convocatoriaKey(' CONVOCATORIA PUBLICA ')).toBe(convocatoriaKey('Convocatoria Pública'));
    expect(convocatoriaName('   ')).toBeNull();
    expect(registrationHistoryFilters({ convocatoria: ' Pública ' }).convocatoria).toBe('publica');
  });
  it.each([123, {}, ['Nombre'], 'x'.repeat(151), 'Nombre\ninválido'])('rechaza nombres inválidos: %j', value => {
    expect(() => convocatoriaName(value)).toThrow();
  });
  it.each([undefined, '', 'Todos', '2026-3'])('exige un período válido para consultar nombres: %j', value => {
    expect(() => convocatoriaPeriod(value)).toThrow();
  });
  it('conserva convocatoria y pertenencia de filas SIN_CAMBIOS en el soporte inicial y en el recibo final', async () => {
    const { service, query } = build();
    const result = await service.bulkUpsert([{ DOCUMENTO_IDENTIDAD: 'TEST-1' }], {
      convocatoria: ' convocatoria publica ', periodoCarga: '2026-2', support,
    });
    expect(result.unchanged).toBe(1);
    const initial = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO rund."RundCargaMasiva"'))!;
    expect(JSON.parse(initial[1][9])).toMatchObject({ convocatoria: 'Convocatoria Pública', convocatoriaClave: 'convocatoria publica', convocatoriaPeriodo: '2026-2' });
    const receipt = JSON.parse(query.mock.calls.at(-1)![1][2]);
    expect(receipt).toMatchObject({ convocatoria: 'Convocatoria Pública', convocatoriaPeriodo: '2026-2',
      trazabilidad: { registros: [{ docenteId: 'docente-1', resultado: 'SIN_CAMBIOS', periodo: '2026-2' }] } });
    expect(service.upsertDocente).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ audit: expect.objectContaining({
      metadata: expect.objectContaining({ convocatoriaClave: 'convocatoria publica' }),
    }) }));
  });
  it('rechaza archivos de otro período antes de crear soporte o modificar docentes', async () => {
    const { service, query } = build();
    await expect(service.bulkUpsert([{ PERIODO_CARGA: '2025-2' }], {
      convocatoria: 'Pública', periodoCarga: '2026-2', support,
    })).rejects.toThrow('período seleccionado');
    expect(service.upsertDocente).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
  it('no guarda convocatorias ni soportes durante una previsualización', async () => {
    const { service, query } = build();
    (service as any).dataSource.transaction = async (work: any) => work({ query: jest.fn().mockResolvedValue([]) });
    await service.bulkUpsert([{ DOCUMENTO_IDENTIDAD: 'TEST-1' }], { convocatoria: 'Nueva', periodoCarga: '2026-2', dryRun: true });
    expect(query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
    expect(service.upsertDocente).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ audit: undefined }));
  });
});
