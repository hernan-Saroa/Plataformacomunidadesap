import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PtaService } from './pta.service';
import { DOCENCIA_COMPONENT_KEYS, PTA_COMPONENT_KEYS, REVIEW_SUBSECCIONES_BY_COMPONENT, PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION } from './auth/pta-permissions.constants';

describe('territorialidad exclusiva de Docencia', () => {
  function repository(initial: any[] = []) {
    const rows = new Map(initial.map(row => [row.id, structuredClone(row)]));
    let nextId = initial.length;
    const matches = (row: any, where: any) => Object.entries(where || {}).every(([key, value]: any) =>
      value && typeof value === 'object' && 'value' in value ? value.value.includes(row[key]) : row[key] === value);
    return {
      find: jest.fn(async ({ where }: any = {}) => structuredClone([...rows.values()].filter(row => matches(row, where)))),
      findOne: jest.fn(async ({ where }: any) => structuredClone([...rows.values()].find(row => matches(row, where)) || null)),
      exists: jest.fn(async ({ where }: any) => [...rows.values()].some(row => matches(row, where))),
      create: jest.fn((value: any) => ({ id: `row-${++nextId}`, ...value })),
      update: jest.fn(async (where: any, changes: any) => {
        for (const [id, row] of rows) if (matches(row, where)) {
          const patch = { ...changes };
          if (typeof patch.datosEstructurados === 'function') {
            patch.datosEstructurados = { ...row.datosEstructurados, complementarias_flujo_version:
              row.datosEstructurados?.complementarias_flujo_version || 'programa_responsable_v1' };
          }
          rows.set(id, { ...row, ...patch });
        }
      }),
      save: jest.fn(async (value: any) => {
        for (const row of Array.isArray(value) ? value : [value]) rows.set(row.id, structuredClone(row));
        return structuredClone(value);
      }),
    };
  }

  const componentes = PTA_COMPONENT_KEYS.filter(key => !DOCENCIA_COMPONENT_KEYS.includes(key));
  function setup(componente: string) {
    const service = Object.create(PtaService.prototype) as any;
    const seccion = ({ ext_capacitacion: 'capacitacion', ext_procesos: 'seleccion',
      ext_fortalecimiento: 'fortalecimiento', ext_gobierno: 'alto_gobierno' } as any)[componente];
    const actividades = ['Caldas', 'Tolima', ...(componente === 'complementarias_territorial' ? [] : [undefined])]
      .map((territorial_id, index) => ({ id: `a-${index}`, actividad_id: 'ACT', nombre: `Actividad ${index}`,
        territorial_id, horas: 10, horas_total: 10 }));
    const datos = componente === 'investigacion'
      ? { investigacion_proyecto: { nombre: 'Proyecto de otra territorial', territorial_id: 'Caldas', horas_solicitadas: 100 },
        investigacion_actividades: actividades }
      : componente.startsWith('ext_') ? { extension_actividades: actividades.map(a => ({ ...a, seccion })) }
      : { complementarias: actividades.flatMap(a => [
        { ...a, id: `${a.id}-doc`, seccion: 'complementarias_docencia' },
        { ...a, id: `${a.id}-admin`, seccion: 'academico_administrativas' },
      ]) };
    service.ptaRepo = repository([{ id: 'pta-1', docenteId: 'docente-caldas', estado: 'Pendiente Jefatura', version: 1,
      datosEstructurados: { asignaturas: [{ nombre: 'Docencia ajena', territorial_id: 'Caldas', total_horas: 480 }], ...datos } }]);
    service.ptaComponentReviewRepo = repository();
    service.ptaComponentApprovalRepo = repository([{ id: 'docencia', ptaId: 'pta-1', componente: 'academica_pregrado', estado: 'aprobado' }]);
    service.historialRepo = repository();
    service.solicitudRepo = repository();
    service.getExtMultiplicadores = jest.fn().mockResolvedValue({});
    service.attachPtaReferenceDates = jest.fn();
    service.enrichPtaSummaries = jest.fn(async (rows: any[]) => {
      await service.attachComponentApprovalProgress(rows);
      return rows;
    });
    service.splitHorasDocenciaPorNivel = jest.fn().mockResolvedValue({ pregrado: 480, posgrado: 0, territorial: 0 });
    service.clasificarAsignaturasDocencia = jest.fn(async (asignaturas: any[]) => ({
      academica_pregrado: asignaturas, academica_posgrado: [], academica_territorial: [],
    }));
    service.resolveTerritorialIdsNoCentrales = jest.fn().mockResolvedValue(new Set());
    service.resolveNombrePorSeccionalId = jest.fn().mockResolvedValue(new Map());
    service.getCatalogoActividadesComplementarias = jest.fn().mockResolvedValue(componente === 'complementarias' ? [] : [{
      id: 'ACT', tipo_aprobacion: componente === 'complementarias_territorial' ? 'territorial'
        : componente === 'complementarias_decanatura' ? 'decanatura' : 'gestion_profesoral',
      nivel_programa: componente === 'complementarias_posgrado' ? 'posgrado'
        : componente === 'complementarias_pregrado' ? 'pregrado' : null,
    }]);
    service.getCatalogoActividadesAcademicoAdmin = service.getCatalogoActividadesComplementarias;
    service.logEvento = jest.fn();
    service.syncResolucionProyectoInvestigacion = jest.fn();
    service.syncPtaSeguimientoEstado = jest.fn();
    service.ptaNotifications = { notifyProfesorComponenteAprobado: jest.fn(), notifyProfesorComponenteDevuelto: jest.fn() };
    service.logger = { warn: jest.fn() };
    const subsecciones = REVIEW_SUBSECCIONES_BY_COMPONENT[componente as keyof typeof REVIEW_SUBSECCIONES_BY_COMPONENT];
    const base = { userId: 'usuario-meta', name: 'Usuario de Meta', roles: ['Docente'], territorialIds: ['Meta'],
      isSuperUser: false, reviewsAll: false, approvesAll: false, allowedComponents: [], allowedReviewSubsecciones: [],
      permissions: new Set<string>() };
    const reviewer = { ...base, allowedReviewSubsecciones: subsecciones.map(sub => `${componente}:${sub}`),
      permissions: new Set(['pta.review.complementarias.territorial.pregrado']) };
    const approver = { ...base, allowedComponents: [componente],
      permissions: new Set(['pta.approve.complementarias.territorial.pregrado']) };
    return { service, reviewer, approver, subsecciones };
  }

  it.each(componentes)('%s permite revisión, aprobación y seguimiento sin restringir territorial, conservando permisos y estados individuales y masivos', async componente => {
    const { service, reviewer, approver, subsecciones } = setup(componente);
    const permissions = await service.getDecisionPermissions('pta-1', reviewer);
    expect(permissions.allowedReviewSubsecciones).toEqual(reviewer.allowedReviewSubsecciones);
    expect(permissions.allowedComponents).toEqual([]);
    expect(permissions.personalTerritoriales).toBeNull();
    expect((await service.getDecisionPermissions('pta-1', approver)).allowedComponents).toEqual([componente]);
    await expect(service.getPtaEnAlcanceSeguimiento('pta-1', approver)).resolves.toMatchObject({ id: 'pta-1' });
    await expect(service.getPtaEnAlcanceSeguimiento('pta-1', reviewer)).resolves.toBeNull();
    const inicial = await service.getUpdatedGestionPta('pta-1', approver);
    expect(inicial.componentes_aprobacion_usuario).toContainEqual(expect.objectContaining({ componente, estado: 'pendiente' }));
    await expect(service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, approver))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.revisarComponente('pta-1', { componente, subseccion: subsecciones[0], estado: 'revisado' }, approver))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.aprobarComponente('pta-1', { componente, estado: 'aprobado' }, reviewer))
      .rejects.toBeInstanceOf(ForbiddenException);
    const review = await service.revisarComponentesLote({ ptaIds: ['pta-1'], revisiones: reviewer.allowedReviewSubsecciones }, reviewer);
    expect(review.resumen).toMatchObject({ revisados: subsecciones.length, fallidos: 0 });
    expect(review.ptasActualizados[0].componentes_revision_usuario.every((row: any) => row.estado === 'revisado')).toBe(true);
    const approval = await service.aprobarComponentesLote({ ptaIds: ['pta-1'], componentes: [componente] }, approver);
    expect(approval.resumen).toMatchObject({ aprobados: 1, fallidos: 0, omitidos: 0 });
    expect(approval.ptasActualizados[0].componentes_aprobacion_usuario)
      .toContainEqual(expect.objectContaining({ componente, estado: 'aprobado' }));
    expect((await service.getComponentesAprobacion('pta-1')).find((row: any) => row.componente === 'academica_pregrado'))
      .toMatchObject({ estado: 'aprobado' });
    expect(approver.allowedComponents).toEqual([componente]);
    expect(reviewer.allowedComponents).toEqual([]);
  });

  it.each(['aprobar', 'revisar'])('Docencia sigue bloqueada en otra territorial para %s aun con permisos de otros componentes', async etapa => {
    const { service, reviewer, approver } = setup('investigacion');
    const auth = etapa === 'aprobar' ? { ...approver, allowedComponents: ['investigacion', 'academica_pregrado'] }
      : { ...reviewer, allowedReviewSubsecciones: ['investigacion:general', 'academica_pregrado:general'] };
    const permisos = await service.getDecisionPermissions('pta-1', auth);
    expect(permisos.allowedComponents).not.toContain('academica_pregrado');
    expect(permisos.allowedReviewSubsecciones).not.toContain('academica_pregrado:general');
    expect(permisos.personalTerritoriales).toEqual(['Meta']);
    await expect(service.getPtaEnAlcanceSeguimiento('pta-1', { ...approver, allowedComponents: ['academica_pregrado'] }))
      .resolves.toBeNull();
    await expect(service.assertAlcanceTerritorial('academica_pregrado', await service.ptaRepo.findOne({ where: { id: 'pta-1' } }), auth, etapa))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each(componentes)('%s permite devolver desde revisión sin conceder aprobación ni exigir coincidencia territorial', async componente => {
    const { service, reviewer, subsecciones } = setup(componente);
    const result = await service.revisarComponente('pta-1', { componente, subseccion: subsecciones[0],
      estado: 'devuelto', comentarios: 'Corregir actividad de otra territorial' }, reviewer);
    expect(result.estadoGeneral).toMatch(/^REVISION_DOCENTE_/);
    expect((await service.getComponentesAprobacion('pta-1')).find((row: any) => row.componente === componente))
      .toMatchObject({ estado: 'devuelto' });
    expect(reviewer.allowedComponents).toEqual([]);
    expect((await service.getComponentesAprobacion('pta-1')).find((row: any) => row.componente === 'academica_pregrado'))
      .toMatchObject({ estado: 'aprobado' });
  });

  it.each(['revision', 'aprobacion'])('un lote mixto de %s resuelve Investigación y bloquea Docencia ajena sin alterar sus estados ni permisos', async etapa => {
    const { service, reviewer, approver } = setup('investigacion');
    await service.ptaComponentApprovalRepo.save({ id: 'docencia', ptaId: 'pta-1', componente: 'academica_pregrado', estado: 'pendiente' });
    const auth = etapa === 'revision'
      ? { ...reviewer, allowedReviewSubsecciones: ['academica_pregrado:general', 'investigacion:general'] }
      : { ...approver, allowedComponents: ['academica_pregrado', 'investigacion'] };
    if (etapa === 'aprobacion') {
      await service.revisarComponente('pta-1', { componente: 'investigacion', subseccion: 'general', estado: 'revisado' }, reviewer);
    }
    const permisosAntes = structuredClone({ ...auth, permissions: [...auth.permissions] });
    const decisionIndividualDocencia = etapa === 'revision'
      ? service.revisarComponente('pta-1', { componente: 'academica_pregrado', subseccion: 'general', estado: 'revisado' }, auth)
      : service.aprobarComponente('pta-1', { componente: 'academica_pregrado', estado: 'aprobado' }, auth);
    await expect(decisionIndividualDocencia).rejects.toBeInstanceOf(ForbiddenException);
    const result = etapa === 'revision'
      ? await service.revisarComponentesLote({ ptaIds: ['pta-1'], revisiones: auth.allowedReviewSubsecciones }, auth)
      : await service.aprobarComponentesLote({ ptaIds: ['pta-1'], componentes: auth.allowedComponents }, auth);
    expect(result.resumen).toMatchObject({ total: 2, fallidos: 1, omitidos: 0,
      [etapa === 'revision' ? 'revisados' : 'aprobados']: 1 });
    expect(result.resultados).toContainEqual(expect.objectContaining({ componente: 'academica_pregrado',
      estado: 'fallido', motivo: expect.stringMatching(/territorial/i) }));
    const campoPersonal = etapa === 'revision' ? 'componentes_revision_usuario' : 'componentes_aprobacion_usuario';
    expect(result.ptasActualizados[0][campoPersonal]).toEqual([
      expect.objectContaining({ componente: 'investigacion', estado: etapa === 'revision' ? 'revisado' : 'aprobado' }),
    ]);
    expect(result.ptasActualizados[0].estado).toBe('Pendiente Jefatura');
    expect((await service.getComponentesAprobacion('pta-1')).find((row: any) => row.componente === 'academica_pregrado'))
      .toMatchObject({ estado: 'pendiente' });
    expect((await service.getComponentesRevision('pta-1')).find((row: any) => row.componente === 'academica_pregrado'))
      .toMatchObject({ estado: 'pendiente' });
    expect({ ...auth, permissions: [...auth.permissions] }).toEqual(permisosAntes);
  });

  it.each(['detalle', 'listado', 'decision'].flatMap(frente => [false, true].map(integral => ({ frente, integral }))))(
    'Seguimiento $frente protege Docencia ajena y conserva la propia e histórica, con aprobación integral $integral', async ({ frente, integral }) => {
    const { service, approver } = setup('investigacion');
    const auth = { ...approver, approvesAll: integral, allowedComponents: ['investigacion', 'academica_pregrado'],
      permissions: new Set([PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION]) };
    const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    await service.ptaRepo.save({ ...pta, estado: 'Aprobado' });
    service.evidenciaRepo = repository([
      { id: 'ev-doc', ptaId: 'pta-1', componentePta: 'docencia', estadoRevision: 'pendiente' },
      { id: 'ev-inv', ptaId: 'pta-1', componentePta: 'investigacion', estadoRevision: 'pendiente' },
    ]);
    const query = (repo: any) => ({ andWhere: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(), getMany: () => repo.find() });
    service.ptaRepo.createQueryBuilder = () => query(service.ptaRepo);
    service.evidenciaRepo.createQueryBuilder = () => query(service.evidenciaRepo);
    if (frente === 'decision') {
      await expect(service.revisarEvidenciaPTA('pta-1', 'ev-doc', { decision: 'rechazado' }, auth))
        .rejects.toBeInstanceOf(ForbiddenException);
      expect(service.evidenciaRepo.save).not.toHaveBeenCalled();
      await expect(service.revisarEvidenciaPTA('pta-1', 'ev-inv', { decision: 'rechazado' }, auth))
        .resolves.toMatchObject({ id: 'ev-inv', estado_revision: 'rechazado' });
    } else {
      const evidencias = frente === 'detalle' ? await service.getEvidenciasSeguimientoPTA('pta-1', auth)
        : (await service.getAllPtasConEvidencias(undefined, auth))[0].evidencias;
      expect(evidencias.map((row: any) => row.id)).toEqual(['ev-inv']);
    }
    // Docencia propia continúa disponible; los soportes históricos sin asignaturas
    // vigentes conservan la consulta y el rechazo con su permiso de componente.
    for (const asignaturas of [[{ nombre: 'Docencia propia', territorial_id: 'Meta', total_horas: 480 }], []]) {
      await service.ptaRepo.save({ ...pta, estado: 'Aprobado', datosEstructurados: { ...pta.datosEstructurados, asignaturas } });
      if (frente === 'decision') {
        await expect(service.revisarEvidenciaPTA('pta-1', 'ev-doc', { decision: 'rechazado' }, auth))
          .resolves.toMatchObject({ id: 'ev-doc', estado_revision: 'rechazado' });
      } else {
        const evidencias = frente === 'detalle' ? await service.getEvidenciasSeguimientoPTA('pta-1', auth)
          : (await service.getAllPtasConEvidencias(undefined, auth))[0].evidencias;
        expect(evidencias.map((row: any) => row.id)).toEqual(['ev-doc', 'ev-inv']);
      }
    }
  });
});
