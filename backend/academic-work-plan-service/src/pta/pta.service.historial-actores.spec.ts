import { PtaService } from './pta.service';

describe('nombres de los autores del historial PTA', () => {
  function setup() {
    const service = Object.create(PtaService.prototype) as any;
    service.fetchAuthDocenteInfo = jest.fn().mockResolvedValue({ fullName: 'Carlos Pérez' });
    return service;
  }

  it('enriquece registros antiguos sin cambiar los IDs ni persistir modificaciones', async () => {
    const service = setup();
    const history = [{ actorId: 'docente-1', actorRol: 'Docente' }, { actorId: 'user-1', actorRol: 'Revisor' }];
    const result = await service.enrichHistorialActors(history, { docente_id: 'docente-1', docente_nombre: 'Ana Torres' });
    expect(result).toEqual([
      { ...history[0], actorNombre: 'Ana Torres' },
      { ...history[1], actorNombre: 'Carlos Pérez' },
    ]);
    expect(history[0]).not.toHaveProperty('actorNombre');
    expect(service.fetchAuthDocenteInfo).toHaveBeenCalledWith('user-1', { adminEdit: true });
  });

  it('consulta cada identidad una sola vez y distingue el sistema', async () => {
    const service = setup();
    const result = await service.enrichHistorialActors([{ actorId: 'user-1' }, { actorId: 'user-1' }, { actorId: 'sistema' }], {});
    expect(service.fetchAuthDocenteInfo).toHaveBeenCalledTimes(1);
    expect(result.map((h: any) => h.actorNombre)).toEqual(['Carlos Pérez', 'Carlos Pérez', 'Sistema']);
  });

  it('no atribuye al docente una identidad inexistente o una consulta fallida', async () => {
    const service = setup();
    service.fetchAuthDocenteInfo.mockResolvedValueOnce({ fullName: 'Docente ESAP' }).mockRejectedValueOnce(new Error('Sin conexión'));
    const result = await service.enrichHistorialActors([{ actorId: 'unknown' }, { actorId: 'deleted' }], { docente_nombre: 'Ana Torres' });
    expect(result.map((h: any) => h.actorNombre)).toEqual([null, null]);
  });

  it('incluye el nombre en la respuesta real de consulta del detalle', async () => {
    const service = setup();
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue({ id: 'pta-1' }) };
    service.evidenciaRepo = { find: jest.fn().mockResolvedValue([]) };
    service.historialRepo = { find: jest.fn().mockResolvedValue([{ actorId: 'user-1' }]) };
    service.toPtaDto = jest.fn().mockReturnValue({ id: 'pta-1' });
    service.getExtMultiplicadores = jest.fn().mockResolvedValue({});
    service.enrichPtaSummaries = jest.fn().mockImplementation(async (dtos: any[]) => dtos);
    service.attachPtaReferenceDates = jest.fn().mockResolvedValue(undefined);
    expect((await service.getPTAById('pta-1')).historialEstados).toEqual([{ actorId: 'user-1', actorNombre: 'Carlos Pérez' }]);
  });
});
