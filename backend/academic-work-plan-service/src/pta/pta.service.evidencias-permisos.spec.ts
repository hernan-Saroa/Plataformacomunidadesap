import { ForbiddenException } from '@nestjs/common';
import { PtaService } from './pta.service';
import type { PTAComponentKey } from './auth/pta-permissions.constants';

describe('Seguimiento de evidencias - autorización por componente', () => {
  function auth(allowedComponents: PTAComponentKey[] = [], approvesAll = false) {
    return {
      userId: 'user-1', name: 'Aprobador Verificado', email: 'aprobador@esap.edu.co', roles: [],
      territorialIds: [], isSuperUser: false, approvesAll,
      permissions: new Set<string>(), allowedComponents, approvalLevels: [], reviewsAll: false,
      allowedReviewSubsecciones: [], allowedNivelesTerritorialAprobar: [],
      allowedNivelesTerritorialRevisar: [],
    } as any;
  }

  function serviceFor(evidencia: any) {
    const service = Object.create(PtaService.prototype) as any;
    service.evidenciaRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'ev-1', ptaId: 'pta-1', estadoRevision: 'pendiente', ...evidencia }),
      save: jest.fn(async (value: any) => value),
    };
    service.syncPtaSeguimientoEstado = jest.fn();
    return service;
  }

  it.each([
    ['pta.approve.academica.pregrado', ['academica_pregrado'], { componentePta: 'docencia' }],
    ['pta.approve.investigacion', ['investigacion'], { componentePta: 'investigacion' }],
    ['pta.approve.extension.capacitacion', ['ext_capacitacion'], { componentePta: 'extension', seccionExtension: 'capacitacion' }],
  ] as Array<[string, PTAComponentKey[], any]>)('%s permite decidir solamente su evidencia correspondiente', async (_permiso, componentes, evidencia) => {
    const service = serviceFor(evidencia);
    await service.revisarEvidenciaPTA(
      'pta-1',
      'ev-1',
      { decision: 'rechazado', revisado_por: 'Identidad manipulada' },
      auth(componentes),
    );

    expect(service.evidenciaRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      estadoRevision: 'rechazado',
      revisadoPor: 'Aprobador Verificado',
    }));
  });

  it('no concede una sección desconocida de Extensión a un aprobador granular', async () => {
    const service = serviceFor({ componentePta: 'extension', seccionExtension: 'desconocida' });
    await expect(
      service.revisarEvidenciaPTA('pta-1', 'ev-1', { decision: 'rechazado' }, auth(['ext_capacitacion'])),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('pta.approve.all permite decidir evidencias de todos los componentes', async () => {
    const service = serviceFor({ componentePta: 'extension', seccionExtension: 'alto_gobierno' });
    await service.revisarEvidenciaPTA('pta-1', 'ev-1', { decision: 'rechazado' }, auth([], true));
    expect(service.evidenciaRepo.save).toHaveBeenCalledTimes(1);
  });

  it.each([
    [['academica_pregrado'], { componentePta: 'investigacion' }],
    [['investigacion'], { componentePta: 'docencia' }],
    [['ext_capacitacion'], { componentePta: 'extension', seccionExtension: 'alto_gobierno' }],
  ] as Array<[PTAComponentKey[], any]>)('bloquea decisiones cruzadas entre componentes', async (componentes, evidencia) => {
    const service = serviceFor(evidencia);
    await expect(
      service.revisarEvidenciaPTA('pta-1', 'ev-1', { decision: 'rechazado' }, auth(componentes)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.evidenciaRepo.save).not.toHaveBeenCalled();
  });

  it('rechaza la decisión si no existe una sesión PTA autenticada', async () => {
    const service = serviceFor({ componentePta: 'investigacion' });
    await expect(
      service.revisarEvidenciaPTA('pta-1', 'ev-1', { decision: 'rechazado' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lista solo evidencias autorizadas y conserva un resumen global sin datos de archivos ajenos', async () => {
    const pta = { id: 'pta-1', estado: 'Aprobado', datosEstructurados: {}, updatedAt: new Date() };
    const evidencias = [
      {
        id: 'ev-docencia', ptaId: 'pta-1', componentePta: 'docencia',
        estado: 'activo', estadoRevision: 'aprobado', horasAvance: 100,
      },
      {
        id: 'ev-extension', ptaId: 'pta-1', componentePta: 'extension',
        seccionExtension: 'capacitacion', estado: 'activo', estadoRevision: 'aprobado', horasAvance: 20,
      },
    ];
    const ptaQb = {
      andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([pta]),
    };
    const evidenciaQb = {
      where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(evidencias),
    };
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = { createQueryBuilder: jest.fn(() => ptaQb) };
    service.evidenciaRepo = { createQueryBuilder: jest.fn(() => evidenciaQb) };
    service.getExtMultiplicadores = jest.fn().mockResolvedValue({ capacitacion: 2 });
    service.toPtaDto = jest.fn().mockReturnValue({
      id: 'pta-1', pta_id: 'pta-1', estado: 'Aprobado', periodo: '2026-2',
      componentes_con_datos: ['academica_pregrado', 'ext_capacitacion'],
    });
    service.attachPtaReferenceDates = jest.fn();
    service.enrichPtaSummaries = jest.fn(async (rows: any[]) => rows);
    service.filterGestionPtas = jest.fn(async (rows: any[]) => rows);
    service.sortPtasByReferenceDate = jest.fn((rows: any[]) => rows);
    service.toEvidenciaDto = jest.fn((row: any) => ({ id: row.id, componente_pta: row.componentePta }));

    const result = await service.getAllPtasConEvidencias('2026-2', auth(['ext_capacitacion']));

    expect(result[0].evidencias).toEqual([{ id: 'ev-extension', componente_pta: 'extension' }]);
    expect(result[0].seguimiento_resumen).toEqual(expect.objectContaining({
      docencia: { horas_aprobadas: 100 },
      extension: { horas_aprobadas: 20 },
    }));
  });
});
