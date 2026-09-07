import { PtaService } from './pta.service';

describe('PtaService - resolución de investigación en Seguimiento', () => {
  const proyectoAprobado = {
    docente_nombre: 'Docente Prueba',
    investigacion_proyecto: {
      nombre: 'Proyecto institucional',
      horas_solicitadas: 288,
      resolucion_nombre: 'Resolución 123 de 2026',
      resolucion_archivo_nombre: 'resolucion-123.pdf',
      resolucion_archivo_tipo: 'application/pdf',
      resolucion_archivo_tamanio: 1024,
      resolucion_archivo_url: '/uploads/pta-resoluciones/resolucion-123.pdf',
    },
  };

  function createService(existing: any = null) {
    const service = Object.create(PtaService.prototype) as any;
    service.configuracionRepo = { findOne: jest.fn().mockResolvedValue(null) };
    service.evidenciaRepo = {
      findOne: jest.fn().mockResolvedValue(existing),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((value: any) => ({ id: 'evidencia-1', ...value })),
      save: jest.fn(async (value: any) => value),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    return service;
  }

  it('crea aprobada la resolución que ya fue evaluada con el componente Investigación', async () => {
    const service = createService();

    await service.syncResolucionProyectoInvestigacion('pta-1', proyectoAprobado);

    expect(service.evidenciaRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      ptaId: 'pta-1',
      componentePta: 'investigacion',
      horasAvance: 288,
      estadoRevision: 'aprobado',
      revisadoPor: 'Sistema',
      comentarioRevision:
        'Aprobado automáticamente junto con el componente Investigación del PTA.',
    }));
    expect(service.evidenciaRepo.save.mock.calls[0][0].categoria)
      .toContain('Creación');
  });

  it('migra a aprobada una resolución automática antigua que todavía estaba pendiente', async () => {
    const existing = {
      id: 'evidencia-antigua',
      ptaId: 'pta-1',
      categoria: 'Resolución proyecto de investigación · Creación',
      estado: 'activo',
      estadoRevision: 'pendiente',
      revisadoPor: null,
      comentarioRevision: null,
      storageUrl: proyectoAprobado.investigacion_proyecto.resolucion_archivo_url,
      horasAvance: 288,
      nombre: 'resolucion-123.pdf',
    };
    const service = createService(existing);

    await service.syncResolucionProyectoInvestigacion('pta-1', proyectoAprobado);

    expect(service.evidenciaRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'evidencia-antigua',
      estadoRevision: 'aprobado',
      revisadoPor: 'Sistema',
      comentarioRevision:
        'Aprobado automáticamente junto con el componente Investigación del PTA.',
    }));
  });

  it('mantiene pendiente cualquier soporte que el docente agregue después', async () => {
    const service = createService();
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'pta-1',
        estado: 'Aprobado',
        datosEstructurados: proyectoAprobado,
      }),
    };

    await service.registrarEvidenciaPTA('pta-1', {
      nombre: 'soporte-adicional.pdf',
      categoria: 'Resolución proyecto de investigación',
      componente_pta: 'investigacion',
      horas_avance: 20,
      storage_url: '/uploads/pta-evidencias/soporte-adicional.pdf',
      estadoRevision: 'aprobado',
      revisadoPor: 'Cliente',
    });

    expect(service.evidenciaRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'soporte-adicional.pdf',
      estadoRevision: 'pendiente',
      revisadoPor: null,
      comentarioRevision: null,
    }));
  });
});
