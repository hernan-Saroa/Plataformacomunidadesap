import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PTA_MANAGE_EDIT_REQUESTS_PERMISSION } from './auth/pta-permissions.constants';
import { PtaService } from './pta.service';

const auth = (
  permissions: string[],
  allowedReviewSubsecciones: string[] = [],
  allowedComponents: string[] = [],
) => ({
  userId: 'revisor-1',
  name: 'Revisor Docencia - Pregrado',
  email: 'revisor@esap.edu.co',
  roles: ['REVISOR_DOCENCIA_PREGRADO'],
  territorialIds: [],
  cetapIds: [],
  isSuperUser: false,
  approvesAll: permissions.includes('pta.approve.all'),
  reviewsAll: permissions.includes('pta.review.all'),
  permissions: new Set(permissions),
  allowedComponents,
  approvalLevels: [],
  allowedReviewSubsecciones,
  allowedNivelesTerritorialAprobar: [],
  allowedNivelesTerritorialRevisar: [],
});

describe('PtaService - permiso de solicitudes de edición', () => {
  it('limita la bandeja a solicitudes de edición para el permiso funcional', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{
        id: 'sol-sin-alcance', tipoSolicitud: 'edicion_componentes', estado: 'pendiente',
        componentes: ['docencia'],
      }]),
    };
    service.solicitudRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    service.enrichSolicitudesPta = jest.fn(async (rows: any[]) => rows);

    await expect(service.getSolicitudesPTA(
      undefined,
      auth([PTA_MANAGE_EDIT_REQUESTS_PERMISSION]),
    )).resolves.toEqual([]);

    expect(qb.andWhere).toHaveBeenCalledWith(
      's.tipoSolicitud = :tipoSolicitud',
      { tipoSolicitud: 'edicion_componentes' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      's.tipoSolicitud <> :tipoSolicitudEdicionSinAcceso',
      { tipoSolicitudEdicionSinAcceso: 'edicion_componentes' },
    );
  });

  it('un permiso de revisión sin el permiso funcional no abre la bandeja', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.solicitudRepo = { createQueryBuilder: jest.fn() };

    await expect(service.getSolicitudesPTA(
      undefined,
      auth(['pta.review.academica.pregrado'], ['academica_pregrado:general']),
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('habilita la bandeja con el permiso funcional y muestra solo el área del revisor', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const qb = {
      andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([{
        id: 'sol-areas', tipoSolicitud: 'edicion_componentes', estado: 'pendiente',
        componentes: ['docencia', 'investigacion'], decisionesComponentes: {
          docencia: { estado: 'pendiente' }, investigacion: { estado: 'pendiente' },
        },
      }]),
    };
    service.solicitudRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    service.enrichSolicitudesPta = jest.fn(async (rows: any[]) => rows);

    const result = await service.getSolicitudesPTA(
      undefined,
      auth(
        [PTA_MANAGE_EDIT_REQUESTS_PERMISSION, 'pta.review.academica.pregrado'],
        ['academica_pregrado:general'],
      ),
    );

    expect(result).toHaveLength(1);
    expect(result[0].componentes).toEqual(['docencia']);
    expect(result[0].decisionesComponentes).toEqual({ docencia: expect.objectContaining({ estado: 'pendiente' }) });
    expect(qb.andWhere).toHaveBeenCalledWith(
      's.tipoSolicitud = :tipoSolicitud',
      { tipoSolicitud: 'edicion_componentes' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(s.componentes @> CAST(:solicitudComponente0 AS jsonb))',
      { solicitudComponente0: '["docencia"]' },
    );
  });

  it('oculta solicitudes que no contienen componentes del revisor', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const qb = {
      andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([{
        id: 'sol-investigacion', tipoSolicitud: 'edicion_componentes', estado: 'pendiente',
        componentes: ['investigacion'],
      }]),
    };
    service.solicitudRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    service.enrichSolicitudesPta = jest.fn(async (rows: any[]) => rows);

    await expect(service.getSolicitudesPTA(
      undefined,
      auth(
        [PTA_MANAGE_EDIT_REQUESTS_PERMISSION, 'pta.review.academica.pregrado'],
        ['academica_pregrado:general'],
      ),
    )).resolves.toEqual([]);
  });

  it('conserva la consulta histórica de creación sin exponer solicitudes de edición', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const qb = {
      andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([
        { id: 'sol-creacion', tipoSolicitud: 'creacion', estado: 'pendiente' },
        {
          id: 'sol-edicion', tipoSolicitud: 'edicion_componentes', estado: 'pendiente',
          componentes: ['investigacion'],
        },
      ]),
    };
    service.solicitudRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    service.enrichSolicitudesPta = jest.fn(async (rows: any[]) => rows);

    await expect(service.getSolicitudesPTA(
      undefined,
      // El permiso de revisión no debe filtrar una solicitud de edición si
      // falta la puerta explícita pta.requests.edit.manage.
      auth(
        ['pta.backoffice.ver_gestion', 'pta.review.investigacion'],
        ['investigacion:general'],
      ),
    )).resolves.toEqual([
      expect.objectContaining({ id: 'sol-creacion' }),
    ]);
    expect(qb.andWhere).toHaveBeenCalledWith(
      's.tipoSolicitud <> :tipoSolicitudEdicionSinAcceso',
      { tipoSolicitudEdicionSinAcceso: 'edicion_componentes' },
    );
  });

  it('el filtro pendiente omite solicitudes cuyo componente ya resolvió el revisor', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const qb = {
      andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([{
        id: 'sol-docencia-lista', tipoSolicitud: 'edicion_componentes', estado: 'pendiente',
        componentes: ['docencia', 'investigacion'],
        decisionesComponentes: {
          docencia: { estado: 'aprobado' }, investigacion: { estado: 'pendiente' },
        },
      }]),
    };
    service.solicitudRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    service.enrichSolicitudesPta = jest.fn(async (rows: any[]) => rows);

    await expect(service.getSolicitudesPTA(
      { estado: 'pendiente' },
      auth(
        [PTA_MANAGE_EDIT_REQUESTS_PERMISSION, 'pta.review.academica.pregrado'],
        ['academica_pregrado:general'],
      ),
    )).resolves.toEqual([]);
  });

  it('mantiene visible una resolución completa que todavía requiere consolidación', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const qb = {
      andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([{
        id: 'sol-por-consolidar', tipoSolicitud: 'edicion_componentes', estado: 'pendiente',
        componentes: ['docencia', 'investigacion'],
        decisionesComponentes: {
          docencia: { estado: 'aprobado' }, investigacion: { estado: 'denegado' },
        },
      }]),
    };
    service.solicitudRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    service.enrichSolicitudesPta = jest.fn(async (rows: any[]) => rows);

    const result = await service.getSolicitudesPTA(
      { estado: 'pendiente' },
      auth(
        [PTA_MANAGE_EDIT_REQUESTS_PERMISSION, 'pta.review.academica.pregrado'],
        ['academica_pregrado:general'],
      ),
    );

    expect(result).toEqual([
      expect.objectContaining({
        id: 'sol-por-consolidar', requiereConsolidacion: true, componentes: ['docencia'],
      }),
    ]);
  });

  it.each([
    ['pta.review.academica.pregrado', ['academica_pregrado:general'], ['docencia']],
    ['pta.review.investigacion', ['investigacion:general'], ['investigacion']],
    ['pta.review.extension.capacitacion', ['ext_capacitacion:general'], ['extension']],
    ['pta.review.complementarias.pregrado', ['complementarias_pregrado:docencia'], ['complementarias']],
  ])('%s ve únicamente las áreas de solicitudes cubiertas por su revisión', async (
    permiso,
    allowedReviewSubsecciones,
    componentesEsperados,
  ) => {
    const service = Object.create(PtaService.prototype) as any;
    const qb = {
      andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([{
        id: 'sol-todas', tipoSolicitud: 'edicion_componentes', estado: 'pendiente',
        componentes: ['docencia', 'investigacion', 'extension', 'complementarias'],
      }]),
    };
    service.solicitudRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    service.enrichSolicitudesPta = jest.fn(async (rows: any[]) => rows);

    const result = await service.getSolicitudesPTA(
      undefined,
      auth([PTA_MANAGE_EDIT_REQUESTS_PERMISSION, permiso], allowedReviewSubsecciones),
    );

    expect(result).toHaveLength(1);
    expect(result[0].componentes).toEqual(componentesEsperados);
  });

  it.each([
    ['pta.review.academica.pregrado', ['academica_pregrado:general'], 'docencia', 'investigacion', 'aprobado'],
    ['pta.review.investigacion', ['investigacion:general'], 'investigacion', 'docencia', 'aprobado'],
    ['pta.review.extension.capacitacion', ['ext_capacitacion:general'], 'extension', 'docencia', 'aprobado'],
    ['pta.review.complementarias.pregrado', ['complementarias_pregrado:docencia'], 'complementarias', 'docencia', 'aprobado'],
    ['pta.review.investigacion', ['investigacion:general'], 'investigacion', 'docencia', 'denegado'],
  ])('%s registra %s únicamente en su componente y conserva pendiente el ajeno', async (
    permiso,
    allowedReviewSubsecciones,
    componentePropio,
    componenteAjeno,
    decision,
  ) => {
    const service = Object.create(PtaService.prototype) as any;
    const solicitud = {
      id: `sol-${componentePropio}`, tipoSolicitud: 'edicion_componentes', ptaId: 'pta-matriz',
      docenteNombre: 'Docente', estado: 'pendiente', componentes: [componentePropio, componenteAjeno],
      decisionesComponentes: {
        [componentePropio]: { estado: 'pendiente' }, [componenteAjeno]: { estado: 'pendiente' },
      },
    };
    const pta = { id: 'pta-matriz', docenteId: 'doc-1', estado: 'Aprobado', version: 2, datosEstructurados: {} };
    const txSolicitudRepo = {
      findOne: jest.fn().mockResolvedValue(solicitud), save: jest.fn(async (value: any) => value),
    };
    const txPtaRepo = { findOne: jest.fn().mockResolvedValue(pta) };
    const txHistorialRepo = {
      create: jest.fn((value: any) => value), save: jest.fn(async (value: any) => value),
    };
    const manager = {
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'SolicitudPtaEntity') return txSolicitudRepo;
        if (entity.name === 'PlanTrabajoAcademicoEntity') return txPtaRepo;
        if (entity.name === 'HistorialEstadoPtaEntity') return txHistorialRepo;
        throw new Error(`Repositorio inesperado: ${entity.name}`);
      }),
    };
    service.solicitudRepo = { findOne: jest.fn().mockResolvedValue(solicitud) };
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue(pta),
      manager: { transaction: jest.fn((callback: any) => callback(manager)) },
    };
    service.logEvento = jest.fn().mockResolvedValue(undefined);

    const result = await service.resolverSolicitudPTA(
      solicitud.id,
      { decision, componentes: [componentePropio], motivo: decision === 'denegado' ? 'No procede.' : undefined },
      auth([PTA_MANAGE_EDIT_REQUESTS_PERMISSION, permiso], allowedReviewSubsecciones),
    );

    expect(result).toMatchObject({ resolucionParcial: true, componentesPendientes: [componenteAjeno] });
    expect(solicitud.decisionesComponentes).toMatchObject({
      [componentePropio]: { estado: decision },
      [componenteAjeno]: { estado: 'pendiente' },
    });
    expect(pta.estado).toBe('Aprobado');
  });

  it.each([
    ['pta.approve.academica.pregrado', ['academica_pregrado']],
    ['pta.approve.investigacion', ['investigacion']],
    ['pta.approve.extension.capacitacion', ['ext_capacitacion']],
    ['pta.approve.all', [
      'academica_pregrado', 'academica_posgrado', 'academica_territorial',
      'investigacion', 'ext_capacitacion', 'ext_procesos', 'ext_fortalecimiento',
      'ext_gobierno', 'complementarias_pregrado',
    ]],
  ])('%s no concede acceso a solicitudes de edición', async (permiso, allowedComponents) => {
    const service = Object.create(PtaService.prototype) as any;
    service.solicitudRepo = { createQueryBuilder: jest.fn() };

    await expect(service.getSolicitudesPTA(
      undefined,
      auth([permiso], [], allowedComponents),
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloquea también la resolución directa cuando el usuario solo tiene aprobación', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.solicitudRepo = { findOne: jest.fn().mockResolvedValue({
      id: 'sol-aprobacion', tipoSolicitud: 'edicion_componentes', ptaId: 'pta-1',
      estado: 'pendiente', componentes: ['investigacion'],
    }) };

    await expect(service.resolverSolicitudPTA(
      'sol-aprobacion',
      { decision: 'aprobado', componentes: ['investigacion'] },
      auth(['pta.approve.investigacion'], [], ['investigacion']),
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('pta.review.all consulta todas las áreas solicitadas', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const qb = {
      andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([{
        id: 'sol-review-all', tipoSolicitud: 'edicion_componentes', estado: 'pendiente',
        componentes: ['docencia', 'investigacion', 'extension', 'complementarias'],
      }]),
    };
    service.solicitudRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    service.enrichSolicitudesPta = jest.fn(async (rows: any[]) => rows);

    const result = await service.getSolicitudesPTA(
      undefined,
      auth([PTA_MANAGE_EDIT_REQUESTS_PERMISSION, 'pta.review.all'], []),
    );

    expect(result[0].componentes).toEqual(['docencia', 'investigacion', 'extension', 'complementarias']);
  });

  it('registra una decisión parcial sin reabrir todavía los demás componentes', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const solicitud = {
      id: 'sol-parcial', tipoSolicitud: 'edicion_componentes', ptaId: 'pta-1',
      docenteNombre: 'Docente', estado: 'pendiente', componentes: ['docencia', 'investigacion', 'extension'],
      decisionesComponentes: {
        docencia: { estado: 'pendiente' }, investigacion: { estado: 'pendiente' }, extension: { estado: 'pendiente' },
      },
    };
    // Simula que Investigación decidió mientras este revisor todavía conservaba
    // una lectura anterior: el bloqueo debe mezclar, no sobrescribir, esa decisión.
    const solicitudBloqueada = {
      ...solicitud,
      decisionesComponentes: {
        docencia: { estado: 'pendiente' }, investigacion: { estado: 'aprobado' }, extension: { estado: 'pendiente' },
      },
    };
    const pta = { id: 'pta-1', docenteId: 'doc-1', estado: 'Aprobado', version: 3, datosEstructurados: {} };
    const txSolicitudRepo = {
      findOne: jest.fn().mockResolvedValue(solicitudBloqueada),
      save: jest.fn(async (value: any) => value),
    };
    const txPtaRepo = { findOne: jest.fn().mockResolvedValue(pta) };
    const txHistorialRepo = {
      create: jest.fn((value: any) => value),
      save: jest.fn(async (value: any) => value),
    };
    const manager = {
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'SolicitudPtaEntity') return txSolicitudRepo;
        if (entity.name === 'PlanTrabajoAcademicoEntity') return txPtaRepo;
        if (entity.name === 'HistorialEstadoPtaEntity') return txHistorialRepo;
        throw new Error(`Repositorio inesperado: ${entity.name}`);
      }),
    };
    service.solicitudRepo = { findOne: jest.fn().mockResolvedValue(solicitud) };
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue(pta),
      manager: { transaction: jest.fn((callback: any) => callback(manager)) },
    };
    service.logEvento = jest.fn();

    const result = await service.resolverSolicitudPTA(
      'sol-parcial',
      { decision: 'aprobado', componentes: ['docencia'] },
      auth(
        [PTA_MANAGE_EDIT_REQUESTS_PERMISSION, 'pta.review.academica.pregrado'],
        ['academica_pregrado:general'],
      ),
    );

    expect(result).toMatchObject({ resolucionParcial: true, componentesPendientes: ['extension'] });
    expect(solicitud.estado).toBe('pendiente');
    expect(solicitudBloqueada.decisionesComponentes).toMatchObject({
      docencia: { estado: 'aprobado', resueltoPor: 'Revisor Docencia - Pregrado' },
      investigacion: { estado: 'aprobado' },
      extension: { estado: 'pendiente' },
    });
    expect(service.ptaRepo.findOne).toHaveBeenCalledTimes(1);
    expect(service.ptaRepo.manager.transaction).toHaveBeenCalledTimes(1);
  });

  it('bloquea que un revisor decida componentes de otra área', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.solicitudRepo = { findOne: jest.fn().mockResolvedValue({
      id: 'sol-1', tipoSolicitud: 'edicion_componentes', ptaId: 'pta-1',
      estado: 'pendiente', componentes: ['docencia', 'investigacion'],
    }) };
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue({ id: 'pta-1', estado: 'Aprobado' }) };

    await expect(service.resolverSolicitudPTA(
      'sol-1',
      { decision: 'aprobado', componentes: ['investigacion'] },
      auth(
        [PTA_MANAGE_EDIT_REQUESTS_PERMISSION, 'pta.review.academica.pregrado'],
        ['academica_pregrado:general'],
      ),
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza componentes inválidos sin interpretarlos como todo el alcance del revisor', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.solicitudRepo = { findOne: jest.fn().mockResolvedValue({
      id: 'sol-componente-invalido', tipoSolicitud: 'edicion_componentes', ptaId: 'pta-1',
      estado: 'pendiente', componentes: ['docencia'],
    }) };
    service.ptaRepo = { findOne: jest.fn() };

    await expect(service.resolverSolicitudPTA(
      'sol-componente-invalido',
      { decision: 'aprobado', componentes: ['componente_inexistente'] },
      auth(
        [PTA_MANAGE_EDIT_REQUESTS_PERMISSION, 'pta.review.academica.pregrado'],
        ['academica_pregrado:general'],
      ),
    )).rejects.toBeInstanceOf(BadRequestException);

    expect(service.ptaRepo.findOne).not.toHaveBeenCalled();
  });

  it('no persiste la última decisión si el PTA ya no puede reabrirse', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const solicitud = {
      id: 'sol-estado-invalido', tipoSolicitud: 'edicion_componentes', ptaId: 'pta-borrador',
      estado: 'pendiente', componentes: ['docencia'],
      decisionesComponentes: { docencia: { estado: 'pendiente' } },
    };
    const pta = { id: 'pta-borrador', docenteId: 'doc-1', estado: 'Borrador', version: 1 };
    const txSolicitudRepo = {
      findOne: jest.fn().mockResolvedValue(solicitud), save: jest.fn(),
    };
    const txPtaRepo = { findOne: jest.fn().mockResolvedValue(pta) };
    const manager = {
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'SolicitudPtaEntity') return txSolicitudRepo;
        if (entity.name === 'PlanTrabajoAcademicoEntity') return txPtaRepo;
        if (entity.name === 'HistorialEstadoPtaEntity') return { create: jest.fn(), save: jest.fn() };
        throw new Error(`Repositorio inesperado: ${entity.name}`);
      }),
    };
    service.solicitudRepo = { findOne: jest.fn().mockResolvedValue(solicitud) };
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue(pta),
      manager: { transaction: jest.fn((callback: any) => callback(manager)) },
    };

    await expect(service.resolverSolicitudPTA(
      solicitud.id,
      { decision: 'aprobado', componentes: ['docencia'] },
      auth(
        [PTA_MANAGE_EDIT_REQUESTS_PERMISSION, 'pta.review.academica.pregrado'],
        ['academica_pregrado:general'],
      ),
    )).rejects.toThrow('ya no puede reabrirse');

    expect(txSolicitudRepo.save).not.toHaveBeenCalled();
  });

  it('el permiso funcional y el permiso del componente permiten resolver la solicitud', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.solicitudRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'sol-1',
        tipoSolicitud: 'edicion_componentes',
        ptaId: 'pta-inexistente',
        estado: 'pendiente',
        componentes: ['docencia'],
      }),
    };
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue(null) };

    await expect(service.resolverSolicitudPTA(
      'sol-1',
      { decision: 'aprobado', componentes: ['docencia'] },
      auth(
        [PTA_MANAGE_EDIT_REQUESTS_PERMISSION, 'pta.review.academica.pregrado'],
        ['academica_pregrado:general'],
      ),
    )).rejects.toThrow(/PTA asociado a la solicitud ya no existe/i);
  });

  it('el permiso funcional aislado no concede alcance para resolver componentes', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.solicitudRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'sol-sin-componente', tipoSolicitud: 'edicion_componentes', ptaId: 'pta-1',
        estado: 'pendiente', componentes: ['docencia'],
      }),
    };
    service.ptaRepo = { findOne: jest.fn() };

    await expect(service.resolverSolicitudPTA(
      'sol-sin-componente',
      { decision: 'aprobado', componentes: ['docencia'] },
      auth([PTA_MANAGE_EDIT_REQUESTS_PERMISSION]),
    )).rejects.toBeInstanceOf(ForbiddenException);

    expect(service.ptaRepo.findOne).not.toHaveBeenCalled();
  });

  it('no usa el permiso de edición para resolver solicitudes de creación', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.solicitudRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'sol-2',
        tipoSolicitud: 'creacion',
        estado: 'pendiente',
      }),
    };

    await expect(service.resolverSolicitudPTA(
      'sol-2',
      { decision: 'aprobado' },
      auth([PTA_MANAGE_EDIT_REQUESTS_PERMISSION]),
    )).rejects.toBeInstanceOf(ForbiddenException);
  });
});
