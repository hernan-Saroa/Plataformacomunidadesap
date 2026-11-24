import { BadRequestException } from '@nestjs/common';
import { BancoDocentesService, periodoPruebaInfo } from './banco-docentes.service';
import { hoyColombia } from './rund-periodo-prueba';

const DOCENTE_ID = '8a7b9c10-1234-4abc-8def-0123456789ab';
const SOPORTE_ID = 'soporte-comite-1';

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
/** Inicio tal que el año de prueba vence dentro de `diasParaVencer` días (negativo = ya venció). */
function inicioQueVenceEn(diasParaVencer: number): string {
  const vence = sumarDias(hoyColombia(), diasParaVencer);
  const [y, m, d] = vence.split('-').map(Number);
  return `${y - 1}-${String(m).padStart(2, '0')}-${String(Math.min(d, new Date(Date.UTC(y - 1, m, 0)).getUTCDate())).padStart(2, '0')}`;
}

function build(opts: { inicio?: string | null; soporte?: boolean; docente?: Record<string, unknown> } = {}) {
  const docente: any = {
    id: DOCENTE_ID, personaId: 'persona-1', periodoCarga: '2026-2', estado: 'ACTIVO', eliminadoRund: false,
    tipoVinculacion: 'PERIODO_DE_PRUEBA', vinculacionDisplay: 'Periodo de Prueba',
    regimenNormativo: 'Circular Dispositiva 003/2025', decisionPeriodoPrueba: null,
    ...opts.docente,
  };
  const docenteRepo = {
    findOne: jest.fn().mockResolvedValue(docente),
    save: jest.fn().mockImplementation(async (value) => value),
  };
  const audits: any[][] = [];
  const dataSource = {
    query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('to_char("fechaInicioVinculacion"')) return [{ inicio: opts.inicio === undefined ? inicioQueVenceEn(-30) : opts.inicio }];
      if (sql.includes('RundSoporteCampo')) return opts.soporte === false ? [] : [{ id: SOPORTE_ID, nombre_archivo: 'acta-comite.pdf' }];
      if (sql.includes('RundAprobacionLog')) { audits.push(params); return []; }
      return [];
    }),
  };
  const service = new BancoDocentesService(docenteRepo as any, {} as any, {} as any, {} as any, {} as any, dataSource as any);
  return { service, docente, docenteRepo, dataSource, audits };
}

const supera = { resultado: 'SUPERA', fechaComite: hoyColombia(), soporteId: SOPORTE_ID, actorId: 'ggp-1', periodoCarga: '2026-2' };

describe('HU 2424 · BancoDocentesService.registrarDecisionPeriodoPrueba', () => {
  it('CA-04: «Supera» pasa a Carrera 2, sigue activo y guarda la decisión', async () => {
    const { service, docente, docenteRepo } = build();
    const result = await service.registrarDecisionPeriodoPrueba(DOCENTE_ID, supera);

    expect(docente.tipoVinculacion).toBe('CARRERA2');
    expect(docente.vinculacionDisplay).toBe('Carrera2');
    expect(docente.regimenNormativo).toBe('Acuerdo 003/2018');
    expect(docente.estado).toBe('ACTIVO');
    expect(docenteRepo.save).toHaveBeenCalledWith(docente);
    expect(docente.decisionPeriodoPrueba).toMatchObject({
      resultado: 'SUPERA', fechaComite: hoyColombia(), soporteId: SOPORTE_ID, soporteNombre: 'acta-comite.pdf', registradoPor: 'ggp-1',
      vinculacionAnterior: { codigo: 'PERIODO_DE_PRUEBA', etiqueta: 'Periodo de Prueba' }, estadoAnterior: 'ACTIVO',
    });
    expect(result).toMatchObject({ id: DOCENTE_ID, vinculacion: 'Carrera2', estado: 'ACTIVO' });
  });

  it('CA-05: «No supera» deja el estado Inactivo y conserva la vinculación', async () => {
    const { service, docente } = build();
    const result = await service.registrarDecisionPeriodoPrueba(DOCENTE_ID, { ...supera, resultado: 'NO_SUPERA', motivo: 'No cumple segunda lengua' });

    expect(docente.estado).toBe('INACTIVO');
    expect(docente.tipoVinculacion).toBe('PERIODO_DE_PRUEBA');
    expect(docente.regimenNormativo).toBe('Circular Dispositiva 003/2025');
    expect(docente.decisionPeriodoPrueba).toMatchObject({ resultado: 'NO_SUPERA', motivo: 'No cumple segunda lengua' });
    expect(result).toMatchObject({ estado: 'INACTIVO', vinculacion: 'Periodo de Prueba' });
  });

  it('CA-09 / RN-09: el historial guarda usuario, resultado, soporte y valores anteriores de vinculación y estado', async () => {
    const { service, audits } = build();
    await service.registrarDecisionPeriodoPrueba(DOCENTE_ID, { ...supera, observacion: 'Acta 14', ip: '10.0.0.1' });

    expect(audits).toHaveLength(1);
    const params = audits[0];
    expect(params).toEqual(expect.arrayContaining([DOCENTE_ID, 'VINCULACION', 'DECISION_COMITE_PRUEBA', 'ggp-1', SOPORTE_ID, '10.0.0.1']));
    const metadata = JSON.parse(params[12]);
    expect(metadata).toMatchObject({
      resultado: 'SUPERA', resultadoEtiqueta: 'Supera el periodo de prueba', fechaComite: hoyColombia(),
      soporteNombre: 'acta-comite.pdf', correccion: false,
      cambios: {
        VINCULACION: { anterior: 'Periodo de Prueba', nuevo: 'Carrera2' },
        ESTADO_DOCENTE: { anterior: 'ACTIVO', nuevo: 'ACTIVO' },
        REGIMEN_NORMATIVO: { anterior: 'Circular Dispositiva 003/2025', nuevo: 'Acuerdo 003/2018' },
      },
    });
  });

  it('«No supera» registra el cambio de estado ACTIVO → INACTIVO en el historial', async () => {
    const { service, audits } = build();
    await service.registrarDecisionPeriodoPrueba(DOCENTE_ID, { ...supera, resultado: 'NO_SUPERA', motivo: 'Sin segunda lengua' });
    const metadata = JSON.parse(audits[0][12]);
    expect(metadata.cambios.ESTADO_DOCENTE).toEqual({ anterior: 'ACTIVO', nuevo: 'INACTIVO' });
    expect(metadata.cambios.VINCULACION).toEqual({ anterior: 'Periodo de Prueba', nuevo: 'Periodo de Prueba' });
    expect(metadata.cambios.REGIMEN_NORMATIVO).toBeUndefined();
    expect(audits[0]).toEqual(expect.arrayContaining(['Sin segunda lengua']));
  });

  it('CA-06 / CA-07: valida antes de tocar la base de datos', async () => {
    const { service, dataSource, docenteRepo } = build();
    await expect(service.registrarDecisionPeriodoPrueba(DOCENTE_ID, { resultado: 'SUPERA' })).rejects.toThrow('Faltan campos obligatorios');
    await expect(service.registrarDecisionPeriodoPrueba(DOCENTE_ID, { ...supera, resultado: 'NO_SUPERA' })).rejects.toThrow('El motivo es obligatorio');
    expect(dataSource.query).not.toHaveBeenCalled();
    expect(docenteRepo.save).not.toHaveBeenCalled();
  });

  it('RN-05: el soporte debe existir y pertenecer al docente', async () => {
    const { service, docente, docenteRepo } = build({ soporte: false });
    await expect(service.registrarDecisionPeriodoPrueba(DOCENTE_ID, supera)).rejects.toThrow('soporte de la decisión del comité no existe');
    expect(docenteRepo.save).not.toHaveBeenCalled();
    expect(docente.tipoVinculacion).toBe('PERIODO_DE_PRUEBA');
  });

  it('RN-01: rechaza a un docente que no está en periodo de prueba', async () => {
    const { service, docenteRepo } = build({ docente: { tipoVinculacion: 'CARRERA2', vinculacionDisplay: 'Carrera2' } });
    await expect(service.registrarDecisionPeriodoPrueba(DOCENTE_ID, supera)).rejects.toThrow('solo aplica a docentes con vinculación «Periodo de prueba»');
    expect(docenteRepo.save).not.toHaveBeenCalled();
  });

  it('rechaza si el año de prueba aún no se cumple y dice cuándo vence', async () => {
    const { service, docenteRepo } = build({ inicio: inicioQueVenceEn(3) });
    const promise = service.registrarDecisionPeriodoPrueba(DOCENTE_ID, supera);
    await expect(promise).rejects.toThrow(`vence el ${sumarDias(hoyColombia(), 3)} (faltan 3 días)`);
    expect(docenteRepo.save).not.toHaveBeenCalled();
  });

  it('acepta el mismo día en que se cumple el año', async () => {
    const { service, docente } = build({ inicio: inicioQueVenceEn(0) });
    await service.registrarDecisionPeriodoPrueba(DOCENTE_ID, supera);
    expect(docente.tipoVinculacion).toBe('CARRERA2');
  });

  it('rechaza si no hay fecha de inicio o si el perfil está inactivo', async () => {
    await expect(build({ inicio: null }).service.registrarDecisionPeriodoPrueba(DOCENTE_ID, supera)).rejects.toThrow('no tiene fecha de inicio');
    await expect(build({ docente: { estado: 'INACTIVO' } }).service.registrarDecisionPeriodoPrueba(DOCENTE_ID, supera)).rejects.toThrow('perfil está inactivo');
  });

  it('rechaza un periodo de carga distinto al del perfil', async () => {
    const { service } = build();
    await expect(service.registrarDecisionPeriodoPrueba(DOCENTE_ID, { ...supera, periodoCarga: '2027-1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('RN-08: corregir una decisión parte de los valores originales (Supera → No supera)', async () => {
    const { service, docente, audits } = build();
    await service.registrarDecisionPeriodoPrueba(DOCENTE_ID, supera);
    expect(docente.tipoVinculacion).toBe('CARRERA2');

    await service.registrarDecisionPeriodoPrueba(DOCENTE_ID, { ...supera, resultado: 'NO_SUPERA', motivo: 'Corrección del acta' });
    expect(docente.tipoVinculacion).toBe('PERIODO_DE_PRUEBA');
    expect(docente.vinculacionDisplay).toBe('Periodo de Prueba');
    expect(docente.regimenNormativo).toBe('Circular Dispositiva 003/2025');
    expect(docente.estado).toBe('INACTIVO');
    expect(docente.decisionPeriodoPrueba.vinculacionAnterior.codigo).toBe('PERIODO_DE_PRUEBA');
    expect(docente.decisionPeriodoPrueba.estadoAnterior).toBe('ACTIVO');
    const correccion = JSON.parse(audits[1][12]);
    expect(correccion.correccion).toBe(true);
    expect(correccion.cambios.VINCULACION).toEqual({ anterior: 'Carrera2', nuevo: 'Periodo de Prueba' });
    expect(correccion.cambios.ESTADO_DOCENTE).toEqual({ anterior: 'ACTIVO', nuevo: 'INACTIVO' });
  });

  it('un reenvío idéntico no duplica la decisión ni el historial', async () => {
    const { service, docente, audits, docenteRepo } = build();
    await service.registrarDecisionPeriodoPrueba(DOCENTE_ID, supera);
    const guardados = docenteRepo.save.mock.calls.length;
    const again = await service.registrarDecisionPeriodoPrueba(DOCENTE_ID, supera);
    expect(audits).toHaveLength(1);
    expect(docenteRepo.save.mock.calls.length).toBe(guardados);
    expect(again).toMatchObject({ id: DOCENTE_ID, resultado: 'SUPERA', vinculacion: 'Carrera2', estado: 'ACTIVO' });
    expect(docente.tipoVinculacion).toBe('CARRERA2');
  });

  it('corregir No supera → Supera devuelve a Carrera 2 y reactiva', async () => {
    const { service, docente } = build();
    await service.registrarDecisionPeriodoPrueba(DOCENTE_ID, { ...supera, resultado: 'NO_SUPERA', motivo: 'x' });
    expect(docente.estado).toBe('INACTIVO');
    await service.registrarDecisionPeriodoPrueba(DOCENTE_ID, supera);
    expect(docente.tipoVinculacion).toBe('CARRERA2');
    expect(docente.estado).toBe('ACTIVO');
  });
});

describe('HU 2424 · periodoPruebaInfo (respuesta del listado)', () => {
  it('CA-01: expone inicio, cumplimiento y días restantes', () => {
    const inicio = inicioQueVenceEn(10);
    const info = periodoPruebaInfo('PERIODO_DE_PRUEBA', 'ACTIVO', inicio, null);
    expect(info).toMatchObject({ en_periodo_prueba: true, inicio, cumplimiento: sumarDias(hoyColombia(), 10), dias_restantes: 10, pendiente_decision: false });
  });

  it('CA-03: vencido y activo queda pendiente de decisión', () => {
    expect(periodoPruebaInfo('PERIODO_DE_PRUEBA', 'ACTIVO', inicioQueVenceEn(-5), null)).toMatchObject({ dias_restantes: -5, pendiente_decision: true });
  });

  it('un docente de otra vinculación sin decisión no tiene datos de prueba', () => {
    expect(periodoPruebaInfo('CARRERA2', 'ACTIVO', '2020-01-01', null)).toBeNull();
  });

  it('con decisión registrada se conserva aunque ya sea Carrera 2 (permite corregir)', () => {
    const decision = { resultado: 'SUPERA' };
    expect(periodoPruebaInfo('CARRERA2', 'ACTIVO', '2024-01-01', decision)).toMatchObject({ en_periodo_prueba: false, pendiente_decision: false, decision });
  });
});

describe('HU 2424 · filtro de periodo de prueba en listado y borrado masivo', () => {
  const rowsEliminacion = [{ id: 'doc-1', nombre_completo: 'ANA', documento_identidad: '1', periodo_carga: '2026-2', updatedAt: new Date('2026-01-01') }];

  it('«Seleccionar todos los resultados» conserva el filtro: no borra más que lo filtrado', async () => {
    const service: any = Object.create(BancoDocentesService.prototype);
    service.dataSource = { query: jest.fn().mockResolvedValue(rowsEliminacion) };
    await service.previewRegistroDeletion({ todosFiltrados: true, filters: { periodoPrueba: 'PENDIENTE' }, excluirIds: [] });
    const [sql, params] = service.dataSource.query.mock.calls[0];
    expect(params).toEqual(['PERIODO_DE_PRUEBA']);
    expect(sql).toContain('vinculacion_codigo = $1');
    expect(sql).toContain("estado_efectivo = 'ACTIVO' AND decision_periodo_prueba IS NULL");
    expect(sql).toContain("(inicio_vinculacion::date + interval '1 year')::date <= (now() AT TIME ZONE 'America/Bogota')::date");
  });

  it('EN_PRUEBA filtra solo por vinculación; PENDIENTE además por año cumplido, activo y sin decisión', () => {
    const service: any = Object.create(BancoDocentesService.prototype);
    const enPrueba: any[] = [];
    const sqlEnPrueba = service.buildAuthDocentesFilters({ periodoPrueba: 'EN_PRUEBA' }, enPrueba);
    expect(enPrueba).toEqual(['PERIODO_DE_PRUEBA']);
    expect(sqlEnPrueba).toContain('vinculacion_codigo = $1');
    expect(sqlEnPrueba).not.toContain('decision_periodo_prueba');

    const sinFiltro: any[] = [];
    expect(service.buildAuthDocentesFilters({ periodoPrueba: '' }, sinFiltro)).toBe('');
    expect(service.buildAuthDocentesFilters({ periodoPrueba: 'INVENTADO' }, [])).toBe('');
    expect(sinFiltro).toEqual([]);
  });

  it('combina con los demás filtros sin descuadrar los parámetros', () => {
    const service: any = Object.create(BancoDocentesService.prototype);
    const params: any[] = [];
    const sql = service.buildAuthDocentesFilters({ periodoCarga: '2026-2', periodoPrueba: 'PENDIENTE', estado: 'ACTIVO' }, params);
    expect(params).toEqual(['PERIODO_DE_PRUEBA', 'ACTIVO', '2026-2']);
    expect(sql).toContain('vinculacion_codigo = $1');
    expect(sql).toContain('estado_efectivo = $2');
    expect(sql).toContain('periodo_carga = $3');
  });
});
