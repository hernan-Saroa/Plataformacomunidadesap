import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PTA_MANAGE_EDIT_REQUESTS_PERMISSION } from './auth/pta-permissions.constants';
import { PtaService } from './pta.service';

describe('Investigación: revisión persistida antes de la aprobación', () => {
  // El repositorio conserva copias: una consulta posterior no puede depender
  // de la referencia modificada en memoria por la decisión anterior.
  function repository(initial: any[] = []) {
    const rows = new Map(initial.map(row => [row.id, structuredClone(row)]));
    let nextId = initial.length;
    const matches = (row: any, where: any) => Object.entries(where || {}).every(([key, value]: any) =>
      value && typeof value === 'object' && 'value' in value
        ? value.value.includes(row[key]) : row[key] === value);
    return {
      find: jest.fn(async ({ where }: any = {}) => structuredClone([...rows.values()].filter(row => matches(row, where)))),
      findOne: jest.fn(async ({ where }: any) => structuredClone([...rows.values()].find(row => matches(row, where)) || null)),
      create: jest.fn((value: any) => ({ id: `row-${++nextId}`, ...value })),
      save: jest.fn(async (value: any) => {
        for (const row of Array.isArray(value) ? value : [value]) rows.set(row.id, structuredClone(row));
        return structuredClone(value);
      }),
      delete: jest.fn(async (where: any) => {
        for (const [id, row] of rows) if (matches(row, where)) rows.delete(id);
      }),
    };
  }

  function setup(content: any) {
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = repository([{
      id: 'pta-1', docenteId: 'docente-1', estado: 'Pendiente Jefatura', version: 1,
      datosEstructurados: { asignaturas: [{ total_horas: 480 }], ...content },
    }]);
    service.ptaComponentReviewRepo = repository();
    service.ptaComponentApprovalRepo = repository([{
      id: 'approval-docencia', ptaId: 'pta-1', componente: 'academica_pregrado', estado: 'aprobado',
    }]);
    service.historialRepo = repository();
    service.solicitudRepo = repository();
    service.getExtMultiplicadores = jest.fn().mockResolvedValue({});
    service.splitHorasDocenciaPorNivel = jest.fn().mockResolvedValue({ pregrado: 480, posgrado: 0, territorial: 0 });
    service.clasificarComplementarias = jest.fn().mockResolvedValue({
      complementarias: [], complementarias_pregrado: [], complementarias_posgrado: [],
      complementarias_territorial: [], complementarias_gestion_profesoral: [],
    });
    service.resolveTerritorialIdsNoCentrales = jest.fn().mockResolvedValue(new Set());
    service.getCatalogoActividadesComplementarias = jest.fn().mockResolvedValue([]);
    service.getCatalogoActividadesAcademicoAdmin = jest.fn().mockResolvedValue([]);
    service.logEvento = jest.fn();
    service.syncResolucionProyectoInvestigacion = jest.fn();
    service.syncPtaSeguimientoEstado = jest.fn();
    service.ptaNotifications = { notifyProfesorComponenteAprobado: jest.fn(), notifyProfesorComponenteDevuelto: jest.fn() };
    service.logger = { warn: jest.fn() };
    return service;
  }

  const reviewer = {
    userId: 'reviewer-1', name: 'Revisor Investigación', roles: ['REVISOR'], territorialIds: ['Meta'],
    isSuperUser: false, reviewsAll: false, approvesAll: false,
    allowedComponents: [], allowedReviewSubsecciones: ['investigacion:general'],
  } as any;
  const approver = {
    ...reviewer, userId: 'approver-1', name: 'Aprobador Investigación', roles: ['APROBADOR'],
    allowedComponents: ['investigacion'], allowedReviewSubsecciones: [],
  };
  const decision = { componente: 'investigacion', subseccion: 'general', estado: 'revisado', comentarios: 'Revisión de investigación' };

  it.each([
    ['proyecto', { investigacion_proyecto: { nombre: 'Proyecto', territorial_id: 'Caldas', horas_solicitadas: 200 } }, 200],
    ['actividades', { investigacion_actividades: [{ nombre: 'Actividad', territorial_id: 'Tolima', horas_total: 32 }] }, 32],
    ['proyecto y actividades', { investigacion_proyecto: { nombre: 'Proyecto', territorial_id: 'Caldas', horas_solicitadas: 200 },
      investigacion_actividades: [{ nombre: 'Actividad', territorial_id: 'Tolima', horas_total: 32 }] }, 232],
  ])('reabre %s por solicitud de edición y exige nueva revisión conservando Docencia', async (_label, content, hours) => {
    const service = setup(content);
    await service.revisarComponente('pta-1', decision, reviewer);
    await service.aprobarComponente('pta-1', { componente: 'investigacion', estado: 'aprobado' }, approver);
    const docenciaAntes = (await service.getComponentesAprobacion('pta-1'))
      .find((row: any) => row.componente === 'academica_pregrado');
    await service.solicitudRepo.save({ id: 'sol-1', ptaId: 'pta-1', docenteId: 'docente-1',
      tipoSolicitud: 'edicion_componentes', estado: 'pendiente', componentes: ['investigacion'],
      justificacion: 'Corregir Investigación' });
    const repositorios: Record<string, any> = {
      SolicitudPtaEntity: service.solicitudRepo, PlanTrabajoAcademicoEntity: service.ptaRepo,
      PtaComponentApprovalEntity: service.ptaComponentApprovalRepo,
      PtaComponentReviewEntity: service.ptaComponentReviewRepo, HistorialEstadoPtaEntity: service.historialRepo,
    };
    service.ptaRepo.manager = { transaction: async (callback: any) => callback({
      getRepository: (entity: any) => repositorios[entity.name],
    }) };
    const permisoSolicitud = { ...reviewer, roles: ['Docente'],
      permissions: new Set([PTA_MANAGE_EDIT_REQUESTS_PERMISSION, 'pta.review.investigacion']) };
    await service.resolverSolicitudPTA('sol-1', { decision: 'aprobado', motivo: 'Edición autorizada' }, permisoSolicitud);
    expect((await service.ptaRepo.findOne({ where: { id: 'pta-1' } })).datosEstructurados)
      .toMatchObject(content as any);
    expect((await service.getComponentesAprobacion('pta-1')).find((row: any) => row.componente === 'investigacion'))
      .toMatchObject({ estado: 'devuelto', scope: 'solicitud_edicion', scopeId: 'sol-1', horas: hours });
    await expect(service.revisarComponente('pta-1', decision, reviewer)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.aprobarComponente('pta-1', { componente: 'investigacion', estado: 'aprobado' }, approver))
      .rejects.toBeInstanceOf(BadRequestException);

    // El reenvío confirmado habilita la nueva revisión y conserva los demás avales.
    await service.resetComponentApprovalWorkflow('pta-1', true);
    const solicitud = await service.solicitudRepo.findOne({ where: { id: 'sol-1' } });
    await service.solicitudRepo.save({ ...solicitud, estado: 'en_aprobacion' });
    const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    await service.ptaRepo.save({ ...pta, estado: 'Pendiente Jefatura' });
    const dto = await service.getUpdatedGestionPta('pta-1', reviewer);
    expect(dto.componentes_revision_usuario).toEqual([
      { componente: 'investigacion', subseccion: 'general', estado: 'pendiente' },
    ]);
    expect(dto.horas_investigacion).toBe(hours);
    await expect(service.aprobarComponente('pta-1', { componente: 'investigacion', estado: 'aprobado' }, approver))
      .rejects.toBeInstanceOf(BadRequestException);
    await service.revisarComponente('pta-1', decision, reviewer);
    const result = await service.aprobarComponente('pta-1', { componente: 'investigacion', estado: 'aprobado' }, approver);
    expect(result.estadoGeneral).toBe('Aprobado');
    expect((await service.solicitudRepo.findOne({ where: { id: 'sol-1' } })).estado).toBe('gestionada');
    expect((await service.getComponentesAprobacion('pta-1')).find((row: any) => row.componente === 'academica_pregrado'))
      .toEqual(docenciaAntes);
  });

  it.each([['investigacion', true], ['ext_capacitacion', false]])(
    'acepta cambios en proyecto y actividades solo si Investigación está autorizada: %s', async (componente, autorizado) => {
      const anterior = { investigacion_proyecto: { nombre: 'Proyecto anterior', horas_solicitadas: 200 },
        investigacion_actividades: [{ nombre: 'Actividad anterior', horas_total: 32 }] };
      const cambios = { investigacion_proyecto: { nombre: 'Proyecto corregido', horas_solicitadas: 180 },
        investigacion_actividades: [{ nombre: 'Actividad corregida', horas_total: 52 }] };
      const service = setup(anterior);
      const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
      const merged = await service.mergeRestrictedAdminEditInput({ ...cambios, asignaturas: [] }, pta, [componente]);
      expect(merged).toMatchObject(autorizado ? cambios : anterior);
      expect(merged.asignaturas).toEqual(pta.datosEstructurados.asignaturas);
    },
  );

  it.each([
    ['proyecto', { investigacion_proyecto: { horas_solicitadas: 200 } }, 200],
    ['actividades', { investigacion_actividades: [{ horas_total: 32 }] }, 32],
    ['proyecto y actividades', {
      investigacion_proyecto: { horas_solicitadas: 200 }, investigacion_actividades: [{ horas_total: 32 }],
    }, 232],
  ])('conserva la revisión de %s al recargar y permite completar el PTA al aprobador', async (_label, content, hours) => {
    const service = setup(content);
    await service.getComponentesRevision('pta-1');
    const inicial = await service.getUpdatedGestionPta('pta-1', reviewer);
    expect(inicial.componentes_revision_usuario).toEqual([
      { componente: 'investigacion', subseccion: 'general', estado: 'pendiente' },
    ]);
    expect(inicial.componentes_aprobacion_usuario).toEqual([]);
    expect(inicial.horas_investigacion).toBe(hours);
    const result = await service.revisarComponente('pta-1', decision, reviewer);
    expect(result.review).toMatchObject({ estado: 'revisado', revisorId: reviewer.userId, comentarios: decision.comentarios });

    // Nueva instancia del servicio, mismos repositorios persistidos.
    const reloaded = Object.assign(Object.create(PtaService.prototype), service) as any;
    const reviews = await reloaded.getComponentesRevision('pta-1');
    expect(reviews.find((row: any) => row.componente === 'investigacion')).toMatchObject(result.review);
    const dto = reloaded.toPtaDto(await reloaded.ptaRepo.findOne({ where: { id: 'pta-1' } }), {});
    await reloaded.attachComponentApprovalProgress([dto]);
    expect(dto.componentes_revision_estado).toContainEqual({ componente: 'investigacion', subseccion: 'general', estado: 'revisado' });
    expect(dto.componentes_estado).toContainEqual(expect.objectContaining({ key: 'investigacion', estado: 'pendiente', horas: hours }));

    // Revisar no concede aprobación al revisor.
    await expect(reloaded.aprobarComponente('pta-1', { componente: 'investigacion', estado: 'aprobado' }, reviewer))
      .rejects.toBeInstanceOf(ForbiddenException);
    const approved = await reloaded.aprobarComponente('pta-1', { componente: 'investigacion', estado: 'aprobado' }, approver);
    expect(approved.estadoGeneral).toBe('Aprobado');
    expect((await reloaded.getComponentesRevision('pta-1')).find((row: any) => row.componente === 'investigacion').estado).toBe('revisado');
    const approvedDto = reloaded.toPtaDto(await reloaded.ptaRepo.findOne({ where: { id: 'pta-1' } }), {});
    await reloaded.attachComponentApprovalProgress([approvedDto]);
    expect(approvedDto.componentes_revision_estado).toContainEqual({ componente: 'investigacion', subseccion: 'general', estado: 'revisado' });
    expect(approvedDto.componentes_estado).toContainEqual(expect.objectContaining({ key: 'investigacion', estado: 'aprobado', horas: hours }));
    expect((await reloaded.getComponentesAprobacion('pta-1')).find((row: any) => row.componente === 'investigacion'))
      .toMatchObject({ estado: 'aprobado', aprobadorId: approver.userId });
  });

  it('impide aprobar sin revisión y revisar con un permiso de otro componente', async () => {
    const service = setup({ investigacion_proyecto: { horas_solicitadas: 200 } });
    await expect(service.aprobarComponente('pta-1', { componente: 'investigacion', estado: 'aprobado' }, approver))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.revisarComponente('pta-1', decision, {
      ...reviewer, allowedReviewSubsecciones: ['academica_pregrado:general'],
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.ptaComponentReviewRepo.save).not.toHaveBeenCalled();
  });

  it.each([
    ['solo proyecto', { investigacion_proyecto: { horas_solicitadas: 200 } }],
    ['solo actividades', { investigacion_actividades: [{ horas_total: 32 }] }],
    ['proyecto y actividades', { investigacion_proyecto: { horas_solicitadas: 200 }, investigacion_actividades: [{ horas_total: 32 }] }],
  ])('completa un PTA con %s de Investigación, sin otros componentes', async (_label, content) => {
    const service = setup(content);
    const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    await service.ptaRepo.save({ ...pta, datosEstructurados: { ...content, asignaturas: [] } });
    service.splitHorasDocenciaPorNivel.mockResolvedValue({ pregrado: 0, posgrado: 0, territorial: 0 });
    service.ptaComponentApprovalRepo = repository();
    await service.getComponentesRevision('pta-1');
    await service.revisarComponente('pta-1', decision, reviewer);
    const result = await service.aprobarComponente('pta-1', { componente: 'investigacion', estado: 'aprobado' }, approver);
    expect(result.estadoGeneral).toBe('Aprobado');
    expect((await service.getComponentesAprobacion('pta-1')).filter((row: any) => row.aplica))
      .toEqual([expect.objectContaining({ componente: 'investigacion', estado: 'aprobado' })]);
  });

  it('no considera actividad un formulario de proyecto vacío y no autoaprueba un PTA vacío', async () => {
    const service = setup({ investigacion_proyecto: { nombre: '', rol: '', horas_solicitadas: 0 } });
    const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    await service.ptaRepo.save({ ...pta, datosEstructurados: { ...pta.datosEstructurados, asignaturas: [] } });
    service.splitHorasDocenciaPorNivel.mockResolvedValue({ pregrado: 0, posgrado: 0, territorial: 0 });
    service.ptaComponentApprovalRepo = repository();
    expect((await service.getComponentesAprobacion('pta-1')).every((row: any) => row.estado === 'pendiente')).toBe(true);
  });

  it('no convierte el permiso de aprobación en permiso de revisión ni permite suplantar al revisor', async () => {
    const service = setup({ investigacion_proyecto: { horas_solicitadas: 200 } });
    await expect(service.revisarComponente('pta-1', decision, approver)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.revisarComponente('pta-1', decision)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.ptaComponentReviewRepo.save).not.toHaveBeenCalled();
    const result = await service.revisarComponente('pta-1', {
      ...decision, revisorId: 'otra-persona', revisorNombre: 'Otro revisor',
    }, reviewer);
    expect(result.review).toMatchObject({ revisorId: reviewer.userId, revisorNombre: reviewer.name });
    expect(await service.historialRepo.find()).toContainEqual(expect.objectContaining({
      tipoAccion: 'REVISION_COMPONENTE', actorId: reviewer.userId,
    }));
  });

  it.each([
    ['sin horas', {}, 'Pendiente Jefatura', decision],
    ['terminado', { investigacion_proyecto: { horas_solicitadas: 200 } }, 'Terminado', decision],
    ['subsección inválida', { investigacion_proyecto: { horas_solicitadas: 200 } }, 'Pendiente Jefatura', { ...decision, subseccion: 'proyectos' }],
    ['devolución sin comentario', { investigacion_proyecto: { horas_solicitadas: 200 } }, 'Pendiente Jefatura', { ...decision, estado: 'devuelto', comentarios: '' }],
  ])('rechaza %s sin guardar una revisión', async (_label, content, status, body) => {
    const service = setup(content);
    const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    await service.ptaRepo.save({ ...pta, estado: status });
    await expect(service.revisarComponente('pta-1', body, reviewer)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.ptaComponentReviewRepo.save).not.toHaveBeenCalled();
  });

  it('devuelve y vuelve a revisar Investigación tras la corrección, conservando los avales de Docencia', async () => {
    const service = setup({ investigacion_proyecto: { horas_solicitadas: 200 }, investigacion_actividades: [{ horas_total: 32 }] });
    await service.ptaComponentReviewRepo.save(service.ptaComponentReviewRepo.create({
      ptaId: 'pta-1', componente: 'academica_pregrado', subseccion: 'general', estado: 'revisado', revisorId: 'otro-revisor',
    }));
    const returned = await service.revisarComponente('pta-1', { ...decision, estado: 'devuelto', comentarios: 'Corregir actividades' }, reviewer);
    expect(returned.estadoGeneral).toBe('REVISION_DOCENTE_N2');
    expect((await service.getComponentesRevision('pta-1')).find((row: any) => row.componente === 'investigacion'))
      .toMatchObject({ estado: 'devuelto', comentarios: 'Corregir actividades' });
    expect(reviewer.allowedComponents).toEqual([]);
    await expect(service.aprobarComponente('pta-1', { componente: 'investigacion', estado: 'aprobado' }, approver))
      .rejects.toBeInstanceOf(BadRequestException);

    // El reenvío tras una devolución parcial reinicia únicamente lo devuelto.
    await service.resetComponentApprovalWorkflow('pta-1', true, 'Actividades corregidas');
    const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    await service.ptaRepo.save({ ...pta, estado: 'Pendiente Jefatura' });
    const reviews = await service.getComponentesRevision('pta-1');
    expect(reviews.find((row: any) => row.componente === 'investigacion'))
      .toMatchObject({ estado: 'pendiente', respuestaDocente: 'Actividades corregidas' });
    expect(reviews.find((row: any) => row.componente === 'academica_pregrado')).toMatchObject({ estado: 'revisado', revisorId: 'otro-revisor' });
    expect((await service.getComponentesAprobacion('pta-1')).find((row: any) => row.componente === 'academica_pregrado').estado).toBe('aprobado');
    await expect(service.aprobarComponente('pta-1', { componente: 'investigacion', estado: 'aprobado' }, approver))
      .rejects.toBeInstanceOf(BadRequestException);
    await service.revisarComponente('pta-1', decision, reviewer);
    expect((await service.aprobarComponente('pta-1', { componente: 'investigacion', estado: 'aprobado' }, approver)).estadoGeneral).toBe('Aprobado');
  });
});
