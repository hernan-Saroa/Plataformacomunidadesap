import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PtaService } from './pta.service';

describe('Docencia territorial: revisión y aprobación independientes', () => {
  const componente = 'academica_territorial';
  function repository(initial: any[] = []) {
    const rows = new Map(initial.map(row => [row.id, structuredClone(row)]));
    let next = initial.length;
    const matches = (row: any, where: any) => Object.entries(where || {}).every(([key, value]: any) =>
      value && typeof value === 'object' && 'value' in value ? value.value.includes(row[key]) : row[key] === value);
    return {
      find: jest.fn(async ({ where }: any = {}) => structuredClone([...rows.values()].filter(row => matches(row, where)))),
      findOne: jest.fn(async ({ where }: any) => structuredClone([...rows.values()].find(row => matches(row, where)) || null)),
      exists: jest.fn(async ({ where }: any) => [...rows.values()].some(row => matches(row, where))),
      delete: jest.fn(async (where: any) => {
        for (const [id, row] of rows) if (matches(row, where)) rows.delete(id);
      }),
      update: jest.fn(async (where: any, changes: any) => {
        for (const [id, row] of rows) if (matches(row, where)) rows.set(id, { ...row, ...changes });
      }),
      create: jest.fn((value: any) => ({ id: `row-${++next}`, ...value })),
      save: jest.fn(async (value: any) => {
        for (const row of Array.isArray(value) ? value : [value]) rows.set(row.id, structuredClone(row));
        return structuredClone(value);
      }),
    };
  }
  function actor(territorial: string, etapa: 'review' | 'approve', niveles = ['pregrado']) {
    return { userId: `${territorial}-${etapa}`, name: `${territorial} ${etapa}`, roles: ['Docente'],
      territorialIds: [territorial], isSuperUser: false, approvesAll: false, reviewsAll: false,
      permissions: new Set(niveles.map(nivel => `pta.${etapa}.academica.territorial.${nivel}`)),
      allowedComponents: etapa === 'approve' ? [componente] : [],
      allowedReviewSubsecciones: etapa === 'review' ? [`${componente}:general`] : [],
      allowedNivelesTerritorialAprobar: etapa === 'approve' ? niveles : [],
      allowedNivelesTerritorialRevisar: etapa === 'review' ? niveles : [],
    };
  }
  function setup(conPosgrado = false) {
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = repository([{ id: 'pta-1', docenteId: 'docente-1', estado: 'Pendiente Jefatura', version: 1,
      datosEstructurados: {
        asignaturas: [
          { nombre: 'Asignatura Pasto', territorial_id: 'Pasto', programa_id: 'pre', total_horas: 100 },
          { nombre: 'Asignatura Bucaramanga', territorial_id: 'Bucaramanga', programa_id: 'pre', total_horas: 100 },
          ...(conPosgrado ? [{ nombre: 'Posgrado Pasto', territorial_id: 'Pasto', programa_id: 'pos', total_horas: 100 }] : []),
        ], investigacion_proyecto: { nombre: 'Investigación aprobada', horas_solicitadas: 10 },
      },
    }]);
    service.programaRepo = repository([{ id: 'pre', tipo: 'pregrado' }, { id: 'pos', tipo: 'maestria' }]);
    service.ptaComponentApprovalRepo = repository([{ id: 'investigacion', ptaId: 'pta-1', componente: 'investigacion', estado: 'aprobado', aprobadorId: 'otro-aprobador' }]);
    service.ptaComponentReviewRepo = repository([{ id: 'rev-investigacion', ptaId: 'pta-1', componente: 'investigacion', subseccion: 'general', estado: 'revisado' }]);
    service.ptaTerritorialReviewRepo = repository();
    service.ptaTerritorialApprovalRepo = repository();
    service.solicitudRepo = repository();
    service.historialRepo = repository();
    service.getExtMultiplicadores = jest.fn().mockResolvedValue({});
    service.getCatalogoActividadesComplementarias = jest.fn().mockResolvedValue([]);
    service.getCatalogoActividadesAcademicoAdmin = jest.fn().mockResolvedValue([]);
    service.resolveTerritorialIdsNoCentrales = jest.fn().mockResolvedValue(new Set(['Pasto', 'Bucaramanga']));
    service.resolveNombrePorSeccionalId = jest.fn(async (ids: string[]) => new Map(ids.map(id => [id, id])));
    service.resolveNombresSeccionales = jest.fn(async (ids: string[]) => ids);
    service.logEvento = jest.fn();
    service.syncResolucionProyectoInvestigacion = jest.fn();
    service.syncPtaSeguimientoEstado = jest.fn();
    service.ptaNotifications = { notifyProfesorComponenteAprobado: jest.fn(), notifyProfesorComponenteDevuelto: jest.fn() };
    service.logger = { log: jest.fn(), warn: jest.fn() };
    return service;
  }
  const revisar = (service: any, territorial: string, nivel = 'pregrado') => service.revisarComponente('pta-1', {
    componente, subseccion: 'general', estado: 'revisado', territorialId: territorial, nivel,
  }, actor(territorial, 'review', [nivel]));

  it.each(['individual', 'masiva'])('%s aprueba Pasto después de su revisión aunque Bucaramanga siga pendiente, y consolida solo al terminar ambas', async modalidad => {
    const service = setup();
    const revisorPasto = actor('Pasto', 'review');
    const aprobadorPasto = actor('Pasto', 'approve');
    const revision = await service.revisarComponentesLote({ ptaIds: ['pta-1'], revisiones: [`${componente}:general`] }, revisorPasto);
    expect(revision.resumen).toMatchObject({ revisados: 1, fallidos: 0 });
    expect(revision.ptasActualizados[0].componentes_revision_usuario).toEqual([
      expect.objectContaining({ territorial_id: 'Pasto', estado: 'revisado' }),
    ]);
    const pasto = await service.getUpdatedGestionPta('pta-1', aprobadorPasto);
    expect(pasto.componentes_aprobacion_usuario).toEqual([
      expect.objectContaining({ territorial_id: 'Pasto', estado: 'pendiente', revision_completa: true }),
    ]);
    const bucaramanga = await service.getUpdatedGestionPta('pta-1', actor('Bucaramanga', 'approve'));
    expect(bucaramanga.componentes_aprobacion_usuario).toEqual([
      expect.objectContaining({ territorial_id: 'Bucaramanga', estado: 'pendiente', revision_completa: false }),
    ]);
    if (modalidad === 'individual') {
      await service.aprobarComponente('pta-1', { componente, estado: 'aprobado', territorialId: 'Pasto', nivel: 'pregrado' }, aprobadorPasto);
    } else {
      const lote = await service.aprobarComponentesLote({ ptaIds: ['pta-1'], componentes: [componente] }, aprobadorPasto);
      expect(lote.resumen).toMatchObject({ aprobados: 1, fallidos: 0 });
    }
    const propio = await service.getUpdatedGestionPta('pta-1', aprobadorPasto);
    expect(propio.estado).toBe('Pendiente Jefatura');
    expect(propio.componentes_aprobacion_usuario).toEqual([expect.objectContaining({ territorial_id: 'Pasto', estado: 'aprobado' })]);
    const pares = await service.getTerritorialApprovalStatus('pta-1');
    expect(pares).toContainEqual(expect.objectContaining({ territorialId: 'Bucaramanga', estado: 'pendiente' }));
    await expect(service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, actor('Bucaramanga', 'approve')))
      .rejects.toBeInstanceOf(BadRequestException);
    await revisar(service, 'Bucaramanga');
    await service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, actor('Bucaramanga', 'approve'));
    expect((await service.ptaRepo.findOne({ where: { id: 'pta-1' } })).estado).toBe('Aprobado');
    expect(await service.ptaComponentApprovalRepo.findOne({ where: { id: 'investigacion' } }))
      .toMatchObject({ estado: 'aprobado', aprobadorId: 'otro-aprobador' });
  });

  it('individualiza también los niveles de una misma territorial y rechaza pares ajenos', async () => {
    const service = setup(true);
    await revisar(service, 'Pasto');
    const aprobador = actor('Pasto', 'approve', ['pregrado', 'posgrado']);
    await expect(service.aprobarComponente('pta-1', { componente, estado: 'aprobado', territorialId: 'Bucaramanga', nivel: 'pregrado' }, aprobador))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.aprobarComponente('pta-1', { componente, estado: 'aprobado', territorialId: 'Pasto', nivel: 'posgrado' }, aprobador))
      .rejects.toBeInstanceOf(BadRequestException);
    await service.aprobarComponente('pta-1', { componente, estado: 'aprobado', territorialId: 'Pasto', nivel: 'pregrado' }, aprobador);
    const filas = await service.getTerritorialApprovalStatus('pta-1');
    expect(filas).toContainEqual(expect.objectContaining({ territorialId: 'Pasto', nivel: 'posgrado', estado: 'pendiente' }));
  });

  it('el lote procesa solo los pares propios revisados y deja pendientes los niveles propios todavía sin revisión', async () => {
    const service = setup(true);
    await revisar(service, 'Pasto');
    const autorizado = actor('Pasto', 'approve', ['pregrado', 'posgrado']);
    const lote = await service.aprobarComponentesLote({ ptaIds: ['pta-1'], componentes: [componente] }, autorizado);
    expect(lote.resumen).toMatchObject({ aprobados: 1, fallidos: 0 });
    expect(lote.resultados[0].motivo).toMatch(/pares propios pendientes de revisión/);
    expect(await service.ptaTerritorialApprovalRepo.findOne({ where: { territorialId: 'Pasto', nivel: 'pregrado' } }))
      .toMatchObject({ estado: 'aprobado' });
    expect(await service.ptaTerritorialApprovalRepo.findOne({ where: { territorialId: 'Pasto', nivel: 'posgrado' } }))
      .toMatchObject({ estado: 'pendiente' });
    await revisar(service, 'Pasto', 'posgrado');
    const siguiente = await service.aprobarComponentesLote({ ptaIds: ['pta-1'], componentes: [componente] }, autorizado);
    expect(siguiente.resumen).toMatchObject({ aprobados: 1, fallidos: 0 });
    expect(siguiente.ptasActualizados[0].componentes_aprobacion_usuario.every((row: any) => row.estado === 'aprobado')).toBe(true);
    expect(await service.ptaTerritorialApprovalRepo.findOne({ where: { territorialId: 'Bucaramanga' } }))
      .toMatchObject({ estado: 'pendiente' });
  });

  it('repetir el lote propio ya resuelto se omite sin falsos fallos ni cambios en la territorial ajena', async () => {
    const service = setup();
    await revisar(service, 'Pasto');
    const revision = await service.revisarComponentesLote({ ptaIds: ['pta-1'], revisiones: [`${componente}:general`] }, actor('Pasto', 'review'));
    expect(revision.resumen).toMatchObject({ revisados: 0, omitidos: 1, fallidos: 0 });
    await service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, actor('Pasto', 'approve'));
    const aprobacion = await service.aprobarComponentesLote({ ptaIds: ['pta-1'], componentes: [componente] }, actor('Pasto', 'approve'));
    expect(aprobacion.resumen).toMatchObject({ aprobados: 0, omitidos: 1, fallidos: 0 });
    expect(aprobacion.resultados[0].motivo).toBe('Ya estaba aprobado');
    expect(await service.ptaTerritorialApprovalRepo.findOne({ where: { territorialId: 'Bucaramanga' } }))
      .toMatchObject({ estado: 'pendiente' });
  });

  it('una revisión parcial respeta la solicitud de edición pendiente de envío', async () => {
    const service = setup();
    await service.ptaComponentApprovalRepo.save({ id: 'docencia', ptaId: 'pta-1', componente,
      estado: 'devuelto', scope: 'solicitud_edicion', scopeId: 'sol-1' });
    await service.solicitudRepo.save({ id: 'sol-1', ptaId: 'pta-1', tipoSolicitud: 'edicion_componentes',
      estado: 'aprobado', componentes: ['docencia'] });
    await expect(revisar(service, 'Pasto')).rejects.toThrow(/todavía no ha enviado/);
    expect((await service.ptaTerritorialReviewRepo.find()).some((row: any) => row.estado === 'revisado')).toBe(false);
  });

  it('la corrección de una territorial exige una nueva revisión y conserva la aprobación ajena', async () => {
    const service = setup();
    await revisar(service, 'Pasto');
    await revisar(service, 'Bucaramanga');
    await service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, actor('Pasto', 'approve'));
    await service.aprobarComponente('pta-1', { componente, estado: 'devuelto', comentarios: 'Corregir Bucaramanga' }, actor('Bucaramanga', 'approve'));
    await service.resetComponentApprovalWorkflow('pta-1', true, 'Corrección enviada');
    const reenviado = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    await service.ptaRepo.save({ ...reenviado, estado: 'Pendiente Jefatura' });
    await expect(service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, actor('Bucaramanga', 'approve')))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(await service.ptaTerritorialApprovalRepo.findOne({ where: { territorialId: 'Pasto' } }))
      .toMatchObject({ estado: 'aprobado' });
    await revisar(service, 'Bucaramanga');
    await service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, actor('Bucaramanga', 'approve'));
    expect((await service.ptaRepo.findOne({ where: { id: 'pta-1' } })).estado).toBe('Aprobado');
  });

  it('una devolución consolidada sin pares concretos reinicia Docencia territorial completa y preserva los otros componentes', async () => {
    const service = setup();
    await revisar(service, 'Pasto');
    await revisar(service, 'Bucaramanga');
    await service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, actor('Pasto', 'approve'));
    await service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, actor('Bucaramanga', 'approve'));
    const consolidada = await service.ptaComponentApprovalRepo.findOne({ where: { ptaId: 'pta-1', componente } });
    await service.ptaComponentApprovalRepo.save({ ...consolidada, estado: 'devuelto', scope: 'concertacion' });
    await service.resetComponentApprovalWorkflow('pta-1', true);
    expect((await service.getTerritorialReviewStatus('pta-1')).every((row: any) => row.estado === 'pendiente')).toBe(true);
    expect((await service.getTerritorialApprovalStatus('pta-1')).every((row: any) => row.estado === 'pendiente')).toBe(true);
    expect(await service.ptaComponentApprovalRepo.findOne({ where: { id: 'investigacion' } }))
      .toMatchObject({ estado: 'aprobado', aprobadorId: 'otro-aprobador' });
  });

  it('una territorial devuelta no bloquea el lote ajeno ni permite revisar el par devuelto antes de corregirlo', async () => {
    const service = setup();
    await service.aprobarComponente('pta-1', { componente, estado: 'devuelto', comentarios: 'Corregir Pasto' }, actor('Pasto', 'approve'));
    await expect(revisar(service, 'Pasto')).rejects.toBeInstanceOf(BadRequestException);
    const revision = await service.revisarComponentesLote({ ptaIds: ['pta-1'], revisiones: [`${componente}:general`] }, actor('Bucaramanga', 'review'));
    expect(revision.resumen).toMatchObject({ revisados: 1, fallidos: 0 });
    const aprobacion = await service.aprobarComponentesLote({ ptaIds: ['pta-1'], componentes: [componente] }, actor('Bucaramanga', 'approve'));
    expect(aprobacion.resumen).toMatchObject({ aprobados: 1, fallidos: 0, omitidos: 0 });
    expect(await service.ptaTerritorialApprovalRepo.findOne({ where: { territorialId: 'Pasto' } }))
      .toMatchObject({ estado: 'devuelto' });
  });

  it('preserva las decisiones consolidadas históricas cuando todavía no existen filas territoriales', async () => {
    const service = setup();
    await service.ptaComponentApprovalRepo.save({ id: 'docencia', ptaId: 'pta-1', componente, estado: 'aprobado', aprobadorNombre: 'Aprobador histórico' });
    await service.ptaComponentReviewRepo.save({ id: 'revision-docencia', ptaId: 'pta-1', componente, subseccion: 'general', estado: 'revisado' });
    expect((await service.getTerritorialReviewStatus('pta-1')).every((row: any) => row.estado === 'revisado')).toBe(true);
    expect((await service.getTerritorialApprovalStatus('pta-1')).every((row: any) => row.estado === 'aprobado')).toBe(true);
    expect((await service.getUpdatedGestionPta('pta-1', actor('Pasto', 'approve'))).componentes_aprobacion_usuario)
      .toEqual([expect.objectContaining({ estado: 'aprobado', revision_completa: true })]);
  });

  it.each([false, true])('reabrir Docencia conserva los bloques vacíos y exige revisión si se incorpora contenido central: %s', async incorporarSedeCentral => {
    const service = setup();
    await revisar(service, 'Pasto');
    await revisar(service, 'Bucaramanga');
    await service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, actor('Pasto', 'approve'));
    await service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, actor('Bucaramanga', 'approve'));
    await service.solicitudRepo.save({ id: 'sol-1', ptaId: 'pta-1', tipoSolicitud: 'edicion_componentes',
      estado: 'pendiente', componentes: ['docencia'], justificacion: 'Modificar Docencia' });
    const repositories: Record<string, any> = { SolicitudPtaEntity: service.solicitudRepo,
      PlanTrabajoAcademicoEntity: service.ptaRepo, HistorialEstadoPtaEntity: service.historialRepo,
      PtaComponentApprovalEntity: service.ptaComponentApprovalRepo, PtaComponentReviewEntity: service.ptaComponentReviewRepo,
      PtaTerritorialApprovalEntity: service.ptaTerritorialApprovalRepo, PtaTerritorialReviewEntity: service.ptaTerritorialReviewRepo };
    service.ptaRepo.manager = { transaction: (callback: any) => callback({ getRepository: (entity: any) => repositories[entity.name] }) };
    const autorizado = actor('Pasto', 'approve');
    autorizado.permissions.add('pta.requests.edit.manage');
    await service.resolverSolicitudPTA('sol-1', { decision: 'aprobado', componentes: ['docencia'] }, autorizado);
    expect(await service.ptaTerritorialApprovalRepo.find()).toEqual([]);
    expect(await service.ptaTerritorialReviewRepo.find()).toEqual([]);
    await expect(revisar(service, 'Pasto')).rejects.toThrow(/todavía no ha enviado/);
    const central = 'academica_pregrado';
    const actorCentral = (etapa: 'review' | 'approve') => ({ ...actor('Bogota', etapa),
      permissions: new Set([`pta.${etapa}.academica.pregrado`]),
      allowedComponents: etapa === 'approve' ? [central] : [],
      allowedReviewSubsecciones: etapa === 'review' ? [`${central}:general`] : [] });
    if (incorporarSedeCentral) {
      const editable = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
      editable.datosEstructurados.asignaturas.push({ nombre: 'Nueva asignatura central',
        territorial_id: 'Bogota', programa_id: 'pre', total_horas: 100 });
      await service.ptaRepo.save(editable);
    }
    const solicitud = await service.solicitudRepo.findOne({ where: { id: 'sol-1' } });
    await service.solicitudRepo.save({ ...solicitud, estado: 'en_aprobacion' });
    await service.resetComponentApprovalWorkflow('pta-1', true);
    const reenviado = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    await service.ptaRepo.save({ ...reenviado, estado: 'Pendiente Jefatura' });
    if (incorporarSedeCentral) {
      expect(await service.ptaComponentApprovalRepo.findOne({ where: { ptaId: 'pta-1', componente: central } }))
        .toMatchObject({ estado: 'pendiente', scope: 'solicitud_edicion', scopeId: 'sol-1' });
      await expect(service.aprobarComponente('pta-1', { componente: central, estado: 'aprobado' }, actorCentral('approve')))
        .rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, actor('Pasto', 'approve')))
      .rejects.toBeInstanceOf(BadRequestException);
    await revisar(service, 'Pasto');
    await service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, actor('Pasto', 'approve'));
    expect((await service.getUpdatedGestionPta('pta-1', actor('Pasto', 'approve'))).componentes_aprobacion_usuario)
      .toEqual([expect.objectContaining({ territorial_id: 'Pasto', estado: 'aprobado' })]);
    expect((await service.getUpdatedGestionPta('pta-1', actor('Bucaramanga', 'approve'))).componentes_aprobacion_usuario)
      .toEqual([expect.objectContaining({ territorial_id: 'Bucaramanga', estado: 'pendiente', revision_completa: false })]);
    await revisar(service, 'Bucaramanga');
    await service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, actor('Bucaramanga', 'approve'));
    if (incorporarSedeCentral) {
      expect((await service.ptaRepo.findOne({ where: { id: 'pta-1' } })).estado).toBe('Pendiente Jefatura');
      expect((await service.solicitudRepo.findOne({ where: { id: 'sol-1' } })).estado).toBe('en_aprobacion');
      await service.revisarComponente('pta-1', { componente: central, subseccion: 'general', estado: 'revisado' }, actorCentral('review'));
      await service.aprobarComponente('pta-1', { componente: central, estado: 'aprobado' }, actorCentral('approve'));
    }
    expect((await service.ptaRepo.findOne({ where: { id: 'pta-1' } })).estado).toBe('Aprobado');
    expect(await service.solicitudRepo.findOne({ where: { id: 'sol-1' } }))
      .toMatchObject({ estado: 'gestionada', resolucionAccion: 'edicion_componentes_aprobada' });
    expect(await service.ptaComponentApprovalRepo.findOne({ where: { id: 'investigacion' } }))
      .toMatchObject({ estado: 'aprobado', aprobadorId: 'otro-aprobador' });
  });
});
