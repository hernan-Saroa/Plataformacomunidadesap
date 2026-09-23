import { PtaService } from './pta.service';

describe('Seguimiento documental - consistencia del estado final', () => {
  function serviceFor(estado: string, evidencias: any[], horas: Record<string, number>) {
    const pta = { id: 'pta-1', estado, datosEstructurados: {} };
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue(pta),
      save: jest.fn(async (value: any) => value),
    };
    service.evidenciaRepo = { find: jest.fn().mockResolvedValue(evidencias) };
    service.getExtMultiplicadores = jest.fn().mockResolvedValue({});
    service.toPtaDto = jest.fn().mockReturnValue({
      horas_docencia: horas.docencia || 0,
      horas_investigacion: horas.investigacion || 0,
      horas_extension: horas.extension || 0,
      horas_complementarias: horas.complementarias || 0,
    });
    return { service, pta };
  }

  it('finaliza con soportes legacy de Académica y Académico-Administrativa', async () => {
    const { service, pta } = serviceFor('Aprobado', [
      { componentePta: 'academica', estado: 'activo', estadoRevision: 'aprobado', horasAvance: 100 },
      { componentePta: 'acad_admin', estado: 'activo', estadoRevision: 'aprobado', horasAvance: 50 },
    ], { docencia: 100, complementarias: 50 });

    await service.syncPtaSeguimientoEstado('pta-1');

    expect(pta.estado).toBe('Finalizado');
    expect(service.ptaRepo.save).toHaveBeenCalledWith(pta);
  });

  it('no finaliza mientras exista cualquier soporte activo pendiente', async () => {
    const { service, pta } = serviceFor('Aprobado', [
      { componentePta: 'investigacion', estado: 'activo', estadoRevision: 'aprobado', horasAvance: 100 },
      { componentePta: 'investigacion', estado: 'activo', estadoRevision: 'pendiente', horasAvance: 0 },
    ], { investigacion: 100 });

    await service.syncPtaSeguimientoEstado('pta-1');

    expect(pta.estado).toBe('Aprobado');
    expect(service.ptaRepo.save).not.toHaveBeenCalled();
  });

  it('revierte Finalizado cuando aparece un soporte pendiente', async () => {
    const { service, pta } = serviceFor('Finalizado', [
      { componentePta: 'investigacion', estado: 'activo', estadoRevision: 'aprobado', horasAvance: 100 },
      { componentePta: 'investigacion', estado: 'activo', estadoRevision: 'pendiente', horasAvance: 10 },
    ], { investigacion: 100 });

    await service.syncPtaSeguimientoEstado('pta-1');

    expect(pta.estado).toBe('Aprobado');
    expect(service.ptaRepo.save).toHaveBeenCalledWith(pta);
  });
});
