import { PtaService } from './pta.service';

describe('Justificaciones: aplicabilidad del componente y sección', () => {
  function serviceFor(datosEstructurados: any = {}) {
    const service = Object.create(PtaService.prototype) as any;
    service.configuracionRepo = { findOne: jest.fn().mockResolvedValue(null) };
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue({ id: 'pta-1', estado: 'Aprobado', datosEstructurados }) };
    service.evidenciaRepo = {
      create: jest.fn((x: any) => x), save: jest.fn(async (x: any) => x),
      find: jest.fn().mockResolvedValue([]), findOne: jest.fn(),
    };
    service.syncPtaSeguimientoEstado = jest.fn();
    return service;
  }
  const body = { nombre: 'soporte.pdf', componente_pta: 'extension', seccion_extension: 'capacitacion', horas_avance: 1 };

  it.each([0, 1, 20])('impide registrar %sh en Extensión vacía, incluso por API directa', async horas => {
    const service = serviceFor({ investigacion_proyecto: { horas_solicitadas: 200 }, horas_extension: 999 });
    await expect(service.registrarEvidenciaPTA('pta-1', { ...body, horas_avance: horas })).rejects.toThrow('no aplica');
    expect(service.evidenciaRepo.save).not.toHaveBeenCalled();
  });

  it.each(['docencia', 'investigacion', 'complementarias'])('también bloquea %s sin carga', async componente => {
    const service = serviceFor();
    await expect(service.registrarEvidenciaPTA('pta-1', { ...body, componente_pta: componente })).rejects.toThrow('no aplica');
  });

  it('no usa las horas de otra sección de Extensión', async () => {
    const service = serviceFor({ extension_actividades: [{ seccion: 'fortalecimiento', horas: 40 }] });
    await expect(service.registrarEvidenciaPTA('pta-1', body)).rejects.toThrow('no aplica');
  });

  it('permite la sección asignada y sus adjuntos de cero horas', async () => {
    const service = serviceFor({ extension_actividades: [{ seccion: 'capacitacion', horas_ejecutadas: 10, horas: 10 }] });
    await service.registrarEvidenciaPTA('pta-1', { ...body, horas_avance: 20 });
    await service.registrarEvidenciaPTA('pta-1', { ...body, horas_avance: 0, descripcion: 'Adjunto 2 de 2' });
    expect(service.evidenciaRepo.save).toHaveBeenCalledTimes(2);
    expect(service.evidenciaRepo.save.mock.calls[1][0]).toMatchObject({ horasAvance: 0, estadoRevision: 'pendiente' });
  });

  it('rechaza una sección omitida o desconocida y horas superiores a la carga', async () => {
    const service = serviceFor({ extension_actividades: [{ seccion: 'fortalecimiento', horas: 40 }] });
    for (const seccion of ['', 'inventada']) {
      await expect(service.registrarEvidenciaPTA('pta-1', { ...body, seccion_extension: seccion })).rejects.toThrow('sección válida');
    }
    await expect(service.registrarEvidenciaPTA('pta-1', { ...body, seccion_extension: 'fortalecimiento', horas_avance: 41 })).rejects.toThrow('supera');
  });

  it('no aprueba un soporte histórico de un componente vacío, pero permite rechazarlo sin borrarlo', async () => {
    const service = serviceFor();
    service.evidenciaRepo.findOne.mockResolvedValue({ id: 'e1', componentePta: 'extension', seccionExtension: 'capacitacion', estadoRevision: 'pendiente' });
    await expect(service.revisarEvidenciaPTA('pta-1', 'e1', { decision: 'aprobado' })).rejects.toThrow('no aplica');
    expect(service.evidenciaRepo.save).not.toHaveBeenCalled();
    await service.revisarEvidenciaPTA('pta-1', 'e1', { decision: 'rechazado' });
    expect(service.evidenciaRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1', estadoRevision: 'rechazado' }));
  });

  it('conserva la revisión de soportes legacy sin sección si Extensión sí tiene carga', async () => {
    const service = serviceFor({ extension_actividades: [{ seccion: 'fortalecimiento', horas: 40 }] });
    service.evidenciaRepo.findOne.mockResolvedValue({ id: 'e1', componentePta: 'extension', estadoRevision: 'pendiente' });
    await service.revisarEvidenciaPTA('pta-1', 'e1', { decision: 'aprobado' });
    expect(service.evidenciaRepo.save).toHaveBeenCalledTimes(1);
  });
});
