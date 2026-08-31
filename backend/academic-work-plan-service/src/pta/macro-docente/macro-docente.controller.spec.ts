import { MacroDocenteController } from './macro-docente.controller';

function buildController(overrides: Partial<Record<string, any>> = {}) {
  const service = {
    getHistorial: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, pages: 1 }),
    getConsultaPuntual: jest.fn().mockResolvedValue([]),
    crearAccesoExterno: jest.fn().mockResolvedValue({ id: 'acc-1', token: 'tok-1' }),
    listarAccesosExternos: jest.fn().mockResolvedValue([{ id: 'acc-1' }]),
    listarBitacora: jest.fn().mockResolvedValue([{ id: 'log-1' }]),
    revocarAccesoExterno: jest.fn().mockResolvedValue({ id: 'acc-1', activo: false }),
    validarAccesoExterno: jest.fn().mockResolvedValue({ id: 'acc-1', enteNombre: 'MEN', docenteId: 'doc-1' }),
    getHistorialParaAccesoExterno: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, pages: 1 }),
    logConsulta: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const controller = new MacroDocenteController(service as any);
  return { controller, service };
}

const reqConUsuario = { user: { userId: 'user-1', roles: ['CONTROL_INTERNO'] }, headers: {}, ip: '10.0.0.1' };

describe('MacroDocenteController - getHistorial (F020)', () => {
  it('delega en el service, arma los filtros desde el query y registra la bitácora', async () => {
    const { controller, service } = buildController({
      getHistorial: jest.fn().mockResolvedValue({ items: [{ docente_id: 'doc-1' }], total: 1, page: 1, limit: 50, pages: 1 }),
    });

    const result = await controller.getHistorial('doc-1', '2025-2', 'Risaralda', undefined, undefined, undefined, '1', '20', reqConUsuario);

    expect(service.getHistorial).toHaveBeenCalledWith({
      docenteId: 'doc-1',
      periodo: '2025-2',
      territorial: 'Risaralda',
      cetap: undefined,
      programa: undefined,
      nucleoTematico: undefined,
      page: 1,
      limit: 20,
    });
    expect(service.logConsulta).toHaveBeenCalledWith(expect.objectContaining({
      tipoConsulta: 'MACRO_DOCENTE',
      actorId: 'user-1',
      roles: ['CONTROL_INTERNO'],
      docenteId: 'doc-1',
      periodo: '2025-2',
      totalResultados: 1,
      failClosed: false,
    }));
    expect(result).toEqual({ success: true, items: [{ docente_id: 'doc-1' }], total: 1, page: 1, limit: 50, pages: 1 });
  });

  it('usa page=1 y limit=50 por defecto cuando no vienen en el query', async () => {
    const { controller, service } = buildController();
    await controller.getHistorial(undefined, '2025-2', undefined, undefined, undefined, undefined, undefined, undefined, reqConUsuario);
    expect(service.getHistorial).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 50 }));
  });
});

describe('MacroDocenteController - getConsultaPuntual (F022)', () => {
  it('delega en el service y registra la bitácora con el total de resultados', async () => {
    const { controller, service } = buildController({
      getConsultaPuntual: jest.fn().mockResolvedValue([{ asignatura_codigo: 'A1' }, { asignatura_codigo: 'A2' }]),
    });

    const result = await controller.getConsultaPuntual('doc-1', '2025-2', reqConUsuario);

    expect(service.getConsultaPuntual).toHaveBeenCalledWith('doc-1', '2025-2');
    expect(service.logConsulta).toHaveBeenCalledWith(expect.objectContaining({
      tipoConsulta: 'CONSULTA_PUNTUAL',
      docenteId: 'doc-1',
      periodo: '2025-2',
      totalResultados: 2,
    }));
    expect(result).toEqual({ success: true, items: [{ asignatura_codigo: 'A1' }, { asignatura_codigo: 'A2' }], total: 2 });
  });
});

describe('MacroDocenteController - gestión de accesos externos', () => {
  it('crearAccesoExterno delega en el service con el actorId resuelto de la sesión', async () => {
    const { controller, service } = buildController();
    const body = { enteNombre: 'MEN', docenteId: 'doc-1', fechaInicio: '2026-01-01', fechaFin: '2026-02-01' };

    const result = await controller.crearAccesoExterno(body, reqConUsuario);

    expect(service.crearAccesoExterno).toHaveBeenCalledWith(body, 'user-1');
    expect(result).toEqual({ success: true, data: { id: 'acc-1', token: 'tok-1' } });
  });

  it('listarAccesosExternos combina accesos y bitácora en un solo payload', async () => {
    const { controller, service } = buildController();
    const result = await controller.listarAccesosExternos();
    expect(service.listarAccesosExternos).toHaveBeenCalled();
    expect(service.listarBitacora).toHaveBeenCalledWith(100);
    expect(result).toEqual({ success: true, data: { accesos: [{ id: 'acc-1' }], bitacora: [{ id: 'log-1' }] } });
  });

  it('revocarAccesoExterno delega en el service con el id y el actor', async () => {
    const { controller, service } = buildController();
    const result = await controller.revocarAccesoExterno('acc-1', reqConUsuario);
    expect(service.revocarAccesoExterno).toHaveBeenCalledWith('acc-1', 'user-1');
    expect(result).toEqual({ success: true, data: { id: 'acc-1', activo: false } });
  });
});

describe('MacroDocenteController - getHistorialExterno (acceso público por token)', () => {
  it('valida el token, acota el historial y audita con failClosed=true y actorId de ente externo', async () => {
    const { controller, service } = buildController();
    const reqExterno = { user: null, headers: { 'x-forwarded-for': '200.1.2.3' }, ip: '200.1.2.3' };

    const result = await controller.getHistorialExterno('tok-1', '2025-2', '1', '50', reqExterno);

    expect(service.validarAccesoExterno).toHaveBeenCalledWith('tok-1');
    expect(service.getHistorialParaAccesoExterno).toHaveBeenCalledWith(
      { id: 'acc-1', enteNombre: 'MEN', docenteId: 'doc-1' },
      { periodo: '2025-2', page: 1, limit: 50 },
    );
    expect(service.logConsulta).toHaveBeenCalledWith(expect.objectContaining({
      tipoConsulta: 'EXTERNA',
      actorId: 'ENTE_EXTERNO:MEN',
      accesoExternoId: 'acc-1',
      docenteId: 'doc-1',
      failClosed: true,
      ip: '200.1.2.3',
    }));
    expect(result).toEqual({ success: true, items: [], total: 0, page: 1, limit: 50, pages: 1 });
  });

  it('no llama getHistorialParaAccesoExterno si el token no es válido (validarAccesoExterno lanza)', async () => {
    const { controller, service } = buildController({
      validarAccesoExterno: jest.fn().mockRejectedValue(new Error('Enlace inválido')),
    });
    const reqExterno = { user: null, headers: {}, ip: '1.1.1.1' };

    await expect(controller.getHistorialExterno('tok-malo', undefined, undefined, undefined, reqExterno)).rejects.toThrow('Enlace inválido');
    expect(service.getHistorialParaAccesoExterno).not.toHaveBeenCalled();
    expect(service.logConsulta).not.toHaveBeenCalled();
  });
});
