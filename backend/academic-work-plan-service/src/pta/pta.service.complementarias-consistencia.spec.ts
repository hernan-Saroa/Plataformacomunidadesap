import { PtaService } from './pta.service';
import { PtaPermissionsService } from './auth/pta-permissions.service';

describe('Complementarias: contenido, aprobación automática y permisos vigentes', () => {
  function setup(ds: any, approvals: any[] = []) {
    const service = Object.create(PtaService.prototype) as any;
    const pta = { id: 'pta', estado: 'Pendiente Jefatura', datosEstructurados: ds };
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue(pta) };
    service.ptaComponentApprovalRepo = {
      find: jest.fn(async () => approvals),
      create: jest.fn((v: any) => ({ ...v })),
      save: jest.fn(async (value: any) => {
        for (const row of Array.isArray(value) ? value : [value]) if (!approvals.includes(row)) approvals.push(row);
        return value;
      }),
    };
    service.ptaComponentReviewRepo = {
      find: jest.fn().mockResolvedValue([]), create: jest.fn((v: any) => ({ ...v })),
      save: jest.fn(async (v: any) => v),
    };
    service.getCatalogoActividadesComplementarias = jest.fn().mockResolvedValue([
      { id: 'COMP', tipo_aprobacion: 'gestion_profesoral', nivel_programa: 'pregrado' },
    ]);
    service.getCatalogoActividadesAcademicoAdmin = jest.fn().mockResolvedValue([
      { id: 'AADM', tipo_aprobacion: 'gestion_profesoral' },
    ]);
    service.getExtMultiplicadores = jest.fn().mockResolvedValue({});
    service.configuracionRepo = { findOne: jest.fn().mockResolvedValue(null) };
    service.logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn(), debug: jest.fn() };
    service.resolveNombrePorSeccionalId = jest.fn().mockResolvedValue(new Map());
    service.ptaRepo.save = jest.fn(async (row: any) => row);
    service.ptaRepo.update = jest.fn(async (_where: any, changes: any) => {
      if (typeof changes.datosEstructurados === 'function') {
        pta.datosEstructurados = { ...pta.datosEstructurados, complementarias_flujo_version: 'programa_responsable_v1' };
      } else Object.assign(pta, changes);
    });
    service.historialRepo = { create: jest.fn((row: any) => row), save: jest.fn(async (row: any) => row) };
    service.logEvento = jest.fn().mockResolvedValue(undefined);
    const txApprovalRepo = {
      ...service.ptaComponentApprovalRepo,
      findOne: jest.fn(async ({ where }: any) => approvals.find(row => row.componente === where.componente) || null),
    };
    service.ptaRepo.manager = { transaction: jest.fn(async (fn: any) => fn({
      getRepository: (entity: any) => entity.name === 'PlanTrabajoAcademicoEntity' ? service.ptaRepo
        : entity.name === 'PtaComponentApprovalEntity' ? txApprovalRepo : service.historialRepo,
    })) };
    return { service, pta, approvals, txApprovalRepo };
  }

  const dsMixto = () => ({
    complementarias: [{ actividad_id: 'COMP', horas: 40, seccion: 'complementarias_docencia', territorial_id: '900001' }],
    academico_admin: [{ actividad_id: 'AADM', horas: 100, territorial_id: '900001' }],
  });

  it('requiere revisión académico-administrativa aunque el formato anterior no tenga sección ni consumeTotalidad', async () => {
    const { service } = setup(dsMixto());
    const rows = await service.getComponentesRevision('pta');
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ componente: 'complementarias_gestion_profesoral', subseccion: 'academico_administrativas' }),
      expect.objectContaining({ componente: 'complementarias_pregrado', subseccion: 'docencia' }),
    ]));
    expect(rows).toContainEqual(expect.objectContaining({ componente: 'complementarias_gestion_profesoral', subseccion: 'docencia' }));
  });

  it('cuenta las actividades anteriores en el listado y las revisiones necesarias coinciden con el detalle', async () => {
    const { service } = setup(dsMixto());
    const dtos = [{ id: 'pta', estado: 'Pendiente Jefatura', ...dsMixto(), horas_complementarias: 140 }];
    await service.attachComponentApprovalProgress(dtos);
    expect((dtos[0] as any).complementarias_por_componente).toMatchObject({
      complementarias_pregrado: 40, complementarias_gestion_profesoral: 140, complementarias: 0,
    });
    expect((dtos[0] as any).subsecciones_con_datos).toContain('complementarias_gestion_profesoral:academico_administrativas');
  });

  it('no duplica una actividad anterior que ya fue migrada', async () => {
    const ds = dsMixto();
    ds.complementarias.push({ ...ds.academico_admin[0], seccion: 'academico_administrativas' });
    const { service } = setup(ds);
    const { horasPorComponente } = await service.computeHorasPorComponente(ds);
    expect(horasPorComponente.complementarias_gestion_profesoral).toBe(140);
    expect(service.computeHorasTotales(ds, {}).total).toBe(140);
  });

  it('una aprobación automática por vacío no aprueba las complementarias que ahora tienen actividades', async () => {
    const automatic = { ptaId: 'pta', componente: 'complementarias_gestion_profesoral', estado: 'aprobado',
      aprobadorNombre: 'Sistema', comentarios: 'Sin actividades - aprobacion automatica', fechaAprobacion: new Date() };
    const { service } = setup(dsMixto(), [automatic]);
    const rows = await service.getComponentesAprobacion('pta');
    expect(rows.find((r: any) => r.componente === automatic.componente)).toMatchObject({ estado: 'pendiente', estado_visual: 'pendiente', aplica: true });
    expect(automatic.fechaAprobacion).toBeNull();
  });

  it.each(['complementarias_docencia', 'academico_administrativas'])('una actividad sin horas requiere revisión y aprobación: %s', async seccion => {
    const ds = { complementarias: [{ actividad_id: 'AADM', horas: 0, seccion, territorial_id: '900001' }] };
    const { service } = setup(ds);
    if (seccion === 'complementarias_docencia') {
      service.getCatalogoActividadesComplementarias.mockResolvedValue([{ id: 'AADM', tipo_aprobacion: 'gestion_profesoral' }]);
    }
    const rows = await service.getComponentesAprobacion('pta');
    expect(rows.find((r: any) => r.componente === 'complementarias_gestion_profesoral')).toMatchObject({
      estado: 'pendiente', estado_visual: 'pendiente', aplica: true, horas: 0,
    });
    const dtos: any[] = [{ id: 'pta', estado: 'Pendiente Jefatura', ...ds, horas_complementarias: 0 }];
    await service.attachComponentApprovalProgress(dtos);
    expect(dtos[0].componentes_con_datos).toContain('complementarias_gestion_profesoral');
    expect(dtos[0].componentes_revision_estado).toContainEqual({
      componente: 'complementarias_gestion_profesoral',
      subseccion: seccion === 'academico_administrativas' ? seccion : 'docencia', estado: 'pendiente',
    });
    expect(dtos[0].componentes_estado.find((r: any) => r.key === 'complementarias')).toMatchObject({
      estado: 'en_revision', aplica: true, horas: 0,
    });
    expect(dtos[0].componentes_total).toBe(1);
    expect(dtos[0].componentes_aprobados).toBe(0);
  });

  it('retira el marcador de aprobación por vacío también cuando la actividad está configurada sin horas', async () => {
    const ds = { academico_admin: [{ actividad_id: 'AADM', horas: 0 }] };
    const automatic = { ptaId: 'pta', componente: 'complementarias_gestion_profesoral', estado: 'aprobado',
      aprobadorNombre: 'Sistema', comentarios: 'Sin actividades - aprobacion automatica' };
    const { service } = setup(ds, [automatic]);
    const rows = await service.getComponentesAprobacion('pta');
    expect(rows.find((r: any) => r.componente === automatic.componente)).toMatchObject({ estado: 'pendiente', aplica: true });
  });

  it('preserva una aprobación humana y la aprobación automática de componentes vacíos', async () => {
    const human = { ptaId: 'pta', componente: 'complementarias_gestion_profesoral', estado: 'aprobado', aprobadorId: 'user', aprobadorNombre: 'Gestión Profesoral' };
    const { service } = setup(dsMixto(), [human]);
    const rows = await service.getComponentesAprobacion('pta');
    expect(rows.find((r: any) => r.componente === human.componente)?.estado).toBe('aprobado');
    expect(rows.find((r: any) => r.componente === 'complementarias_posgrado')).toMatchObject({ estado: 'aprobado', estado_visual: 'no_aplica' });
  });

  it('corrige el estado general aprobado por vacío, registra la corrección y no la repite al recargar', async () => {
    const automatic = { ptaId: 'pta', componente: 'complementarias_gestion_profesoral', estado: 'aprobado',
      aprobadorNombre: 'Sistema', comentarios: 'Sin actividades - aprobacion automatica' };
    const { service, pta } = setup(dsMixto(), [automatic]);
    pta.estado = 'Aprobado';
    const dtos = [{ id: 'pta', estado: 'Aprobado', ...dsMixto(), horas_complementarias: 140 }];
    await service.attachComponentApprovalProgress(dtos);
    expect(pta.estado).toBe('Pendiente Jefatura');
    expect(dtos[0].estado).toBe('Pendiente Jefatura');
    expect((dtos[0] as any).componentes_revision_estado).toContainEqual({
      componente: 'complementarias_gestion_profesoral', subseccion: 'academico_administrativas', estado: 'pendiente',
    });
    expect(service.historialRepo.save).toHaveBeenCalledWith(expect.objectContaining({ tipoAccion: 'CORRECCION_APROBACION_AUTOMATICA' }));
    await service.getComponentesAprobacion('pta');
    expect(service.historialRepo.save).toHaveBeenCalledTimes(1);
    expect(service.logEvento).toHaveBeenCalledTimes(1);
  });

  it.each(['Terminado', 'En firme', 'Finalizado'])('preserva los PTAs cerrados: %s', async estado => {
    const automatic = { ptaId: 'pta', componente: 'complementarias_gestion_profesoral', estado: 'aprobado',
      aprobadorNombre: 'Sistema', comentarios: 'Sin actividades - aprobacion automatica' };
    const { service, pta } = setup(dsMixto(), [automatic]);
    pta.estado = estado;
    const rows = await service.getComponentesAprobacion('pta');
    expect(rows.find((r: any) => r.componente === automatic.componente)?.estado).toBe('aprobado');
    expect(service.ptaRepo.save).not.toHaveBeenCalled();
  });

  it('preserva la aprobación humana registrada entre la consulta inicial y la reparación', async () => {
    const automatic = { ptaId: 'pta', componente: 'complementarias_gestion_profesoral', estado: 'aprobado',
      aprobadorNombre: 'Sistema', comentarios: 'Sin actividades - aprobacion automatica' };
    const { service, pta, txApprovalRepo } = setup(dsMixto(), [automatic]);
    pta.estado = 'Aprobado';
    txApprovalRepo.findOne.mockImplementationOnce(async () => {
      Object.assign(automatic, { aprobadorId: 'human', aprobadorNombre: 'Aprobador GP', comentarios: 'Aval verificado' });
      return automatic;
    });
    const rows = await service.getComponentesAprobacion('pta');
    expect(rows.find((r: any) => r.componente === automatic.componente)).toMatchObject({
      estado: 'aprobado', aprobadorId: 'human', comentarios: 'Aval verificado',
    });
    expect(pta.estado).toBe('Aprobado');
    expect(service.historialRepo.save).not.toHaveBeenCalled();
    expect(service.logEvento).not.toHaveBeenCalled();
    expect(service.ptaRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ lock: { mode: 'pessimistic_write' } }));
  });

  it('anota el ámbito de las actividades anteriores para mostrar varias tarjetas sin ocultarlas', async () => {
    const { service } = setup(dsMixto());
    service.evidenciaRepo = { find: jest.fn().mockResolvedValue([]) };
    service.historialRepo.find = jest.fn().mockResolvedValue([]);
    service.enrichPtaSummaries = jest.fn(async (rows: any) => rows);
    service.attachPtaReferenceDates = jest.fn();
    const detail = await service.getPTAById('pta');
    expect(detail.academico_admin[0]).toMatchObject({
      componente_complementaria: 'complementarias_gestion_profesoral', seccion: 'academico_administrativas', horas: 100,
    });
    expect(detail.complementarias[0].componente_complementaria).toBe('complementarias_gestion_profesoral');
    expect(detail.complementarias[0].componentes_complementaria).toEqual(['complementarias_pregrado', 'complementarias_gestion_profesoral']);
  });

  it.each(['900002', undefined])('permite revisión GP con su permiso aunque la territorial sea distinta o no esté registrada: %s', async territorial => {
    const ds = dsMixto();
    (ds.academico_admin[0] as any).territorial_id = territorial;
    const { service } = setup(ds);
    service.ptaComponentReviewRepo.findOne = jest.fn().mockResolvedValue(null);
    const resolver = new PtaPermissionsService({ query: jest.fn().mockResolvedValue([
      { role_code: 'GESTION_PROFESORAL', permission_code: 'pta.review.complementarias.gestion_profesoral' },
    ]) } as any);
    const auth = { ...await resolver.resolveForUser('reviewer'), territorialIds: ['900001'], cetapIds: [] };
    const effective = await service.getDecisionPermissions('pta', auth);
    expect(effective.allowedReviewSubsecciones.sort()).toEqual([
      'complementarias_gestion_profesoral:academico_administrativas', 'complementarias_gestion_profesoral:docencia',
    ]);
    expect(effective.allowedComponents).toEqual([]);
    expect(effective.componentReasons.complementarias_gestion_profesoral).toBeUndefined();
    await expect(service.revisarComponente('pta', {
      componente: 'complementarias_gestion_profesoral', subseccion: 'academico_administrativas', estado: 'revisado',
    }, auth)).resolves.toMatchObject({ review: { estado: 'revisado' } });
    await expect(service.aprobarComponente('pta', {
      componente: 'complementarias_gestion_profesoral', estado: 'aprobado',
    }, auth)).rejects.toThrow(/permiso/i);
  });

  it('el revisor GP obtiene ambas subsecciones dentro de su territorial, sin aprobación', async () => {
    const { service } = setup(dsMixto());
    const resolver = new PtaPermissionsService({ query: jest.fn().mockResolvedValue([
      { role_code: 'GESTION_PROFESORAL', permission_code: 'pta.review.complementarias.gestion_profesoral' },
    ]) } as any);
    const auth = { ...await resolver.resolveForUser('reviewer'), territorialIds: ['900001'], cetapIds: [] };
    const effective = await service.getDecisionPermissions('pta', auth);
    expect(effective.allowedReviewSubsecciones.sort()).toEqual([
      'complementarias_gestion_profesoral:academico_administrativas', 'complementarias_gestion_profesoral:docencia',
    ]);
    expect(effective.allowedComponents).toEqual([]);
  });

  it.each([
    ['gestion_profesoral', 'complementarias_gestion_profesoral', 'complementarias.gestion_profesoral', 'REVISION_DOCENTE_N3'],
    ['decanatura', 'complementarias_decanatura', 'complementarias.decanatura', 'REVISION_DOCENTE_N2'],
    ['territorial', 'complementarias_territorial', 'complementarias.territorial', 'REVISION_DOCENTE_N2'],
  ])('el revisor de %s puede devolver una actividad sin horas sin adquirir permiso de aprobación', async (tipo, componente, permiso, estadoDevuelto) => {
    const docenciaAprobada = { ptaId: 'pta', componente: 'academica_pregrado', estado: 'aprobado', aprobadorId: 'aprobador-docencia' };
    const { service, pta, approvals } = setup({
      asignaturas: [{ total_horas: 32 }],
      academico_admin: [{ actividad_id: 'AADM', territorial_id: '900001', horas: 0 }],
    }, [docenciaAprobada]);
    let review: any = null;
    service.getCatalogoActividadesAcademicoAdmin.mockResolvedValue([{ id: 'AADM', tipo_aprobacion: tipo }]);
    service.ptaComponentReviewRepo.findOne = jest.fn(async () => review);
    service.ptaComponentReviewRepo.save = jest.fn(async (value: any) => { review = value; return value; });
    service.ptaComponentReviewRepo.find = jest.fn(async ({ where }: any) => review && (!where.estado || review.estado === where.estado) ? [review] : []);
    service.ptaComponentReviewRepo.update = jest.fn(async (_where: any, changes: any) => { if (review) Object.assign(review, changes); });
    service.ptaComponentApprovalRepo.find = jest.fn(async ({ where }: any) => approvals.filter(row => !where.estado || row.estado === where.estado));
    service.ptaComponentApprovalRepo.findOne = jest.fn(async ({ where }: any) => approvals.find(row => row.componente === where.componente) || null);
    service.notificaciones = { notificarDecisionComponente: jest.fn(), notificarCambioEstado: jest.fn() };
    service.ptaTerritorialApprovalRepo = { update: jest.fn() };
    service.solicitudRepo = { findOne: jest.fn().mockResolvedValue(null) };
    const resolver = new PtaPermissionsService({ query: jest.fn().mockResolvedValue([
      { role_code: 'ROL_PERSONALIZADO', permission_code: `pta.review.${permiso}` },
    ]) } as any);
    const auth = { ...await resolver.resolveForUser('reviewer'), userId: 'reviewer', name: 'Revisor', territorialIds: ['900001'] };
    await service.getComponentesAprobacion('pta');
    const result = await service.revisarComponente('pta', {
      componente, subseccion: 'academico_administrativas',
      estado: 'devuelto', comentarios: 'Corregir el soporte de la actividad',
    }, auth);
    expect(result.review).toMatchObject({ estado: 'devuelto', revisorId: 'reviewer' });
    expect(result.estadoGeneral).toBe(estadoDevuelto);
    expect(pta.estado).toBe(result.estadoGeneral);
    expect(auth.allowedComponents).toEqual([]);
    expect(auth.isSuperUser).toBe(false);
    expect(approvals.find(row => row.componente === componente)).toMatchObject({ estado: 'devuelto' });
    await expect(service.revisarComponente('pta', {
      componente, subseccion: 'academico_administrativas', estado: 'revisado',
    }, auth)).rejects.toThrow(/pendiente de corrección/);
    await service.resetComponentApprovalWorkflow('pta', true, 'Soporte corregido');
    pta.estado = 'Pendiente Jefatura';
    expect(docenciaAprobada).toMatchObject({ estado: 'aprobado', aprobadorId: 'aprobador-docencia' });
    expect(review.estado).toBe('pendiente');
    expect(approvals.find(row => row.componente === componente)).toMatchObject({ estado: 'pendiente', respuestaDocente: 'Soporte corregido' });
    await service.revisarComponente('pta', { componente, subseccion: 'academico_administrativas', estado: 'revisado' }, auth);
    const approvalResolver = new PtaPermissionsService({ query: jest.fn().mockResolvedValue([
      { role_code: 'OTRO_ROL_PERSONALIZADO', permission_code: `pta.approve.${permiso}` },
    ]) } as any);
    const aprobador = { ...await approvalResolver.resolveForUser('approver'), userId: 'approver', name: 'Aprobador', territorialIds: ['900001'] };
    const approved = await service.aprobarComponente('pta', { componente, estado: 'aprobado' }, aprobador);
    expect(approved.estadoGeneral).toBe('Aprobado');
    expect(docenciaAprobada.aprobadorId).toBe('aprobador-docencia');
  });

  describe.each([
    ['Gestión Profesoral', undefined, 'gestion_profesoral', 'complementarias_gestion_profesoral', 'complementarias.gestion_profesoral'],
    ['Pregrado', 'pregrado', 'gestion_profesoral', 'complementarias_pregrado', 'complementarias.pregrado'],
    ['Posgrado', 'posgrado', 'gestion_profesoral', 'complementarias_posgrado', 'complementarias.posgrado'],
    ['Decanatura Pregrado', 'pregrado', 'decanatura', 'complementarias_decanatura', 'complementarias.decanatura'],
    ['Decanatura Posgrado', 'posgrado', 'decanatura', 'complementarias_decanatura', 'complementarias.decanatura'],
  ])('%s con permisos propios y sin depender del nombre del rol', (_label, nivel, tipo, componente, permissionSuffix) => {
    it.each([0, 10])('requiere las dos revisiones antes de aprobar el PTA, con %s horas por actividad', async horas => {
      const { service, pta, approvals } = setup({
        complementarias: [{ actividad_id: 'COMP', seccion: 'complementarias_docencia', territorial_id: '900001', horas }],
        academico_admin: [{ actividad_id: 'AADM', territorial_id: '900001', horas }],
      });
      service.getCatalogoActividadesComplementarias.mockResolvedValue([{ id: 'COMP', nivel_programa: nivel, tipo_aprobacion: tipo }]);
      service.getCatalogoActividadesAcademicoAdmin.mockResolvedValue([{ id: 'AADM', nivel_programa: nivel, tipo_aprobacion: tipo }]);
      const reviews: any[] = [];
      service.ptaComponentReviewRepo = {
        find: jest.fn(async ({ where }: any) => reviews.filter(row => !where.componente || row.componente === where.componente)),
        findOne: jest.fn(async ({ where }: any) => reviews.find(row => row.componente === where.componente && row.subseccion === where.subseccion) || null),
        create: jest.fn((row: any) => ({ ...row })),
        save: jest.fn(async (value: any) => {
          for (const row of Array.isArray(value) ? value : [value]) if (!reviews.includes(row)) reviews.push(row);
          return value;
        }),
      };
      service.ptaComponentApprovalRepo.findOne = jest.fn(async ({ where }: any) => approvals.find(row => row.componente === where.componente) || null);
      service.solicitudRepo = { findOne: jest.fn().mockResolvedValue(null) };
      service.notificaciones = { notificarDecisionComponente: jest.fn(), notificarCambioEstado: jest.fn() };
      const authFor = async (action: string, suffix = permissionSuffix) => {
        const resolver = new PtaPermissionsService({ query: jest.fn().mockResolvedValue([
          { role_code: 'ROL_PERSONALIZADO', permission_code: `pta.${action}.${suffix}` },
        ]) } as any);
        return { ...await resolver.resolveForUser(action), userId: action, name: action, territorialIds: ['900001'] };
      };
      const revisor = await authFor('review');
      const aprobador = await authFor('approve');
      const approve = (auth: any) => service.aprobarComponente('pta', { componente, estado: 'aprobado' }, auth);
      const revisar = (auth: any, subseccion: string) => service.revisarComponente('pta', { componente, subseccion, estado: 'revisado' }, auth);
      await service.getComponentesAprobacion('pta');
      await service.getComponentesRevision('pta');
      if (nivel && !['complementarias_pregrado', 'complementarias_posgrado'].includes(componente)) {
        const programa = `complementarias_${nivel}`;
        const revisorPrograma = await authFor('review', `complementarias.${nivel}`);
        const aprobadorPrograma = await authFor('approve', `complementarias.${nivel}`);
        for (const subseccion of ['docencia', 'academico_administrativas']) {
          await service.revisarComponente('pta', { componente: programa, subseccion, estado: 'revisado' }, revisorPrograma);
        }
        await service.aprobarComponente('pta', { componente: programa, estado: 'aprobado' }, aprobadorPrograma);
      }
      await expect(approve(revisor)).rejects.toThrow(/No tiene permisos/);
      await expect(revisar(aprobador, 'docencia')).rejects.toThrow(/No tiene permisos/);
      await expect(approve(aprobador)).rejects.toThrow(/revisión\(es\) pendiente/);
      await revisar(revisor, 'docencia');
      await expect(approve(aprobador)).rejects.toThrow(/academico_administrativas/);
      await revisar(revisor, 'academico_administrativas');
      const result = await approve(aprobador);
      expect(result.approval).toMatchObject({ estado: 'aprobado', componente, aprobadorId: 'approve' });
      const esPrograma = ['complementarias_pregrado', 'complementarias_posgrado'].includes(componente);
      expect(result.estadoGeneral).toBe(esPrograma ? 'Pendiente Jefatura' : 'Aprobado');
      expect(pta.estado).toBe(esPrograma ? 'Pendiente Jefatura' : 'Aprobado');
      const reload = await service.getComponentesAprobacion('pta');
      expect(reload.find((row: any) => row.componente === componente)).toMatchObject({ estado: 'aprobado', aplica: true });
    });
  });
});
