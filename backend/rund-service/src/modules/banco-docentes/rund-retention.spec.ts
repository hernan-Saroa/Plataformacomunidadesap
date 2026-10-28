import fs from 'fs';
import { addRetentionMonths, readRetentionPolicy, retentionReport, retentionSnapshot } from './rund-retention';

const policy = { version: 'fixture-v1', aprobacion: 'SOLO PRUEBA', reglas: [{ id: 'regla-1', categoria: 'TITULOS',
  serie: 'fixture', subserie: 'fixture', eventoInicio: 'CIERRE', mesesGestion: 1, mesesCentral: 2,
  disposicion: 'CONSERVACION_TOTAL', fundamentoTratamiento: 'fixture', finalidad: 'fixture' }] };

describe('TRD configurable y conservadora', () => {
  afterEach(() => { delete process.env.RUND_TRD_POLICY_FILE; jest.restoreAllMocks(); });
  const configure = (value: any = policy) => {
    process.env.RUND_TRD_POLICY_FILE = 'fixture.json';
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(value));
  };
  it('sin TRD no inventa vencimiento ni autoriza eliminación', () => {
    expect(retentionReport(retentionSnapshot('TITULOS'))).toMatchObject({ estado: 'PENDIENTE_TRD', eliminacionFisicaPermitida: false });
  });
  it.each([-1, 1.5, '12', null])('rechaza plazo inválido %s', value => {
    configure({ ...policy, reglas: [{ ...policy.reglas[0], mesesGestion: value }] });
    expect(readRetentionPolicy).toThrow('configuración TRD');
  });
  it('rechaza selectores ambiguos', () => {
    configure({ ...policy, reglas: [policy.reglas[0], { ...policy.reglas[0], id: 'otra' }] });
    expect(readRetentionPolicy).toThrow();
  });
  it('prefiere el tipo específico y no aplica reglas a categorías sin clasificar', () => {
    configure({ ...policy, reglas: [...policy.reglas, { ...policy.reglas[0], id: 'especial', tipoSoporte: 'titulo_pregrado' }] });
    expect(retentionSnapshot('TITULOS', 'titulo_pregrado')).toMatchObject({ regla: { id: 'especial' } });
    expect(retentionSnapshot('OTROS')).toEqual({ estado: 'PENDIENTE_TRD' });
  });
  it('el snapshot histórico conserva sus plazos tras cambiar la configuración', () => {
    configure();
    const snapshot = retentionSnapshot('TITULOS');
    jest.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ ...policy, version: 'v2', reglas: [{ ...policy.reglas[0], mesesGestion: 100 }] }));
    expect(retentionSnapshot('TITULOS')).not.toEqual(snapshot);
    expect(retentionReport(snapshot, '2024-01-31T00:00:00Z', false, new Date('2025-01-01')))
      .toMatchObject({ transferenciaDesde: '2024-02-29T00:00:00.000Z', revisionDisposicionDesde: '2024-04-29T00:00:00.000Z',
        estado: 'REQUIERE_REVISION_ARCHIVISTICA', eliminacionFisicaPermitida: false });
    expect(retentionReport(snapshot).estado).toBe('PENDIENTE_EVENTO');
    expect(retentionReport(snapshot, '2024-01-31', true).estado).toBe('SUSPENDIDA');
  });
  it('cuenta meses calendario y conserva UTC', () => {
    expect(addRetentionMonths(new Date('2023-01-31T12:15:00Z'), 1).toISOString()).toBe('2023-02-28T12:15:00.000Z');
    expect(addRetentionMonths(new Date('2024-02-29T12:15:00Z'), 12).toISOString()).toBe('2025-02-28T12:15:00.000Z');
  });
});
