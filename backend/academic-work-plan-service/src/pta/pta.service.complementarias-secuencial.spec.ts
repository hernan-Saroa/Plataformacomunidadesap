import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PtaService } from './pta.service';
import { PtaPermissionsService } from './auth/pta-permissions.service';
import { COMPLEMENTARIAS_FLUJO_SECUENCIAL } from './utils/complementarias-flujo';
import { DataSource, UpdateQueryBuilder } from 'typeorm';
import { PlanTrabajoAcademicoEntity } from './entities/plan-trabajo-academico.entity';

function repository(initial: any[] = []) {
  const rows = new Map(initial.map(row => [row.id, structuredClone(row)]));
  let next = 0;
  const matches = (row: any, where: any) => Object.entries(where || {}).every(([key, value]: any) =>
    value && typeof value === 'object' && 'value' in value ? value.value.includes(row[key]) : row[key] === value);
  return {
    find: jest.fn(async ({ where }: any = {}) => structuredClone([...rows.values()].filter(row => matches(row, where)))),
    findOne: jest.fn(async ({ where }: any) => structuredClone([...rows.values()].find(row => matches(row, where)) || null)),
    exists: jest.fn(async ({ where }: any) => [...rows.values()].some(row => matches(row, where))),
    create: jest.fn((value: any) => ({ id: `row-${++next}`, ...value })),
    save: jest.fn(async (value: any) => {
      for (const row of Array.isArray(value) ? value : [value]) rows.set(row.id, structuredClone(row));
      return structuredClone(value);
    }),
    delete: jest.fn(async (where: any) => { for (const [id, row] of rows) if (matches(row, where)) rows.delete(id); }),
    update: jest.fn(async (where: any, changes: any) => {
      for (const [id, row] of rows) if (matches(row, where)) {
        const patch = { ...changes };
        if (typeof patch.datosEstructurados === 'function') {
          const sql = patch.datosEstructurados();
          patch.datosEstructurados = { ...row.datosEstructurados };
          if (sql.includes(" - 'complementarias_filas_corregidas'")) delete patch.datosEstructurados.complementarias_filas_corregidas;
          else patch.datosEstructurados.complementarias_flujo_version ||= sql.includes("'legacy'") ? 'legacy' : COMPLEMENTARIAS_FLUJO_SECUENCIAL;
        }
        rows.set(id, { ...row, ...patch });
      }
    }),
  };
}
const permission = (component: string, stage: 'review' | 'approve') => `pta.${stage}.complementarias.${component.replace('complementarias_', '')}`;
async function actor(component: string, stage: 'review' | 'approve', extra: string[] = []) {
  const resolver = new PtaPermissionsService({ query: jest.fn().mockResolvedValue([
    { role_code: 'ROL_PERSONALIZADO', permission_code: permission(component, stage) },
    ...extra.map(permission_code => ({ role_code: 'ROL_PERSONALIZADO', permission_code })),
  ]) } as any);
  return { ...await resolver.resolveForUser('usuario'), userId: `${component}-${stage}`, name: `${component} ${stage}`,
    territorialIds: ['Caldas'], roles: ['ROL_PERSONALIZADO'] };
}
function setup(nivel: string | null, tipo: string, seccion = 'complementarias_docencia', estado = 'Pendiente Jefatura') {
  const service = Object.create(PtaService.prototype) as any;
  const catalogo = [{ id: 'ACT', nombre: 'Actividad', nivel_programa: nivel, tipo_aprobacion: tipo, max_horas: 40 }];
  service.ptaRepo = repository([{ id: 'pta-1', docenteId: 'docente', periodo: '2026-1', estado, version: 1,
    datosEstructurados: { asignaturas: [], complementarias: [{ actividad_id: 'ACT', seccion, territorial_id: 'Pasto', horas: 40 }] },
  }]);
  service.ptaComponentApprovalRepo = repository(); service.ptaComponentReviewRepo = repository();
  service.ptaTerritorialApprovalRepo = repository(); service.ptaTerritorialReviewRepo = repository();
  service.historialRepo = repository(); service.solicitudRepo = repository(); service.programaRepo = repository();
  service.configuracionRepo = { findOne: jest.fn().mockResolvedValue(null) };
  service.getCatalogoActividadesComplementarias = jest.fn().mockResolvedValue(seccion === 'complementarias_docencia' ? catalogo : []);
  service.getCatalogoActividadesAcademicoAdmin = jest.fn().mockResolvedValue(seccion !== 'complementarias_docencia' ? catalogo : []);
  service.getExtMultiplicadores = jest.fn().mockResolvedValue({});
  service.resolveTerritorialIdsNoCentrales = jest.fn().mockResolvedValue(new Set());
  service.resolveNombrePorSeccionalId = jest.fn().mockResolvedValue(new Map());
  service.logEvento = jest.fn(); service.syncResolucionProyectoInvestigacion = jest.fn(); service.syncPtaSeguimientoEstado = jest.fn();
  service.ptaNotifications = { notifyProfesorComponenteAprobado: jest.fn(), notifyProfesorComponenteDevuelto: jest.fn() };
  service.logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const repos: Record<string, any> = {
    PlanTrabajoAcademicoEntity: service.ptaRepo, SolicitudPtaEntity: service.solicitudRepo,
    HistorialEstadoPtaEntity: service.historialRepo, PtaComponentApprovalEntity: service.ptaComponentApprovalRepo,
    PtaComponentReviewEntity: service.ptaComponentReviewRepo,
  };
  service.ptaRepo.manager = { transaction: async (fn: any) => fn({ getRepository: (entity: any) => repos[entity.name] }) };
  return service;
}
const revisar = async (service: any, componente: string, subseccion = 'docencia') => service.revisarComponente('pta-1',
  { componente, subseccion, estado: 'revisado' }, await actor(componente, 'review'));
const aprobar = async (service: any, componente: string) => service.aprobarComponente('pta-1',
  { componente, estado: 'aprobado' }, await actor(componente, 'approve'));

describe('Complementarias: Programa previo y responsable final', () => {
  it.each(['pregrado', 'posgrado'].flatMap(nivel => ['gestion_profesoral', 'decanatura', 'territorial']
    .map(tipo => ({ nivel, tipo }))))('los indicadores personales separan $nivel de $tipo y habilitan la etapa final al aprobar Programa', async ({ nivel, tipo }) => {
    const service = setup(nivel, tipo);
    const programa = `complementarias_${nivel}`;
    const final = `complementarias_${tipo}`;
    const aprobadorPrograma = await actor(programa, 'approve');
    const aprobadorFinal = await actor(final, 'approve');
    const revisorPrograma = await actor(programa, 'review');
    const revisorFinal = await actor(final, 'review');
    await revisar(service, programa); await revisar(service, final);
    for (const [auth, componente] of [[revisorPrograma, programa], [revisorFinal, final]]) {
      const personal = await service.getUpdatedGestionPta('pta-1', auth);
      expect(personal.componentes_revision_usuario).toEqual([
        expect.objectContaining({ componente, subseccion: 'docencia', estado: 'revisado' }),
      ]);
      expect(personal.componentes_aprobacion_usuario).toEqual([]);
    }
    const antes = await service.getUpdatedGestionPta('pta-1', aprobadorFinal);
    expect(antes.componentes_aprobacion_usuario).toEqual([
      expect.objectContaining({ componente: final, estado: 'pendiente', revision_completa: false,
        dependencias_pendientes: [programa] }),
    ]);
    await aprobar(service, programa);
    const programaResuelto = await service.getUpdatedGestionPta('pta-1', aprobadorPrograma);
    expect(programaResuelto.componentes_aprobacion_usuario).toEqual([
      expect.objectContaining({ componente: programa, estado: 'aprobado' }),
    ]);
    expect(programaResuelto.componentes_estado.find((row: any) => row.key === 'complementarias'))
      .toMatchObject({ estado: 'pendiente', horas: 40, horas_aprobadas: 0 });
    const finalHabilitado = await service.getUpdatedGestionPta('pta-1', aprobadorFinal);
    expect(finalHabilitado.componentes_aprobacion_usuario).toEqual([
      expect.objectContaining({ componente: final, estado: 'pendiente', revision_completa: true,
        dependencias_pendientes: [] }),
    ]);
    const ambos = await actor(programa, 'approve', [permission(final, 'approve')]);
    const personalAmbos = await service.getUpdatedGestionPta('pta-1', ambos);
    expect(personalAmbos.componentes_aprobacion_usuario.map((row: any) => row.estado)).toEqual(['aprobado', 'pendiente']);
    await aprobar(service, final);
    const terminado = await service.getUpdatedGestionPta('pta-1', aprobadorFinal);
    expect(terminado.componentes_aprobacion_usuario).toEqual([
      expect.objectContaining({ componente: final, estado: 'aprobado' }),
    ]);
    expect(terminado.componentes_estado.find((row: any) => row.key === 'complementarias'))
      .toMatchObject({ estado: 'aprobado', horas: 40, horas_aprobadas: 40 });
  });
  it('guardar el modelo no revierte un estado ni una versión confirmados por otra acción', async () => {
    const service = setup('pregrado', 'gestion_profesoral');
    const anterior = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    await service.ptaRepo.save({ ...anterior, estado: 'Aprobado', version: 3,
      datosEstructurados: { ...anterior.datosEstructurados, observaciones_docente: 'Cambio confirmado',
        complementarias: [{ ...anterior.datosEstructurados.complementarias[0], horas: 32 }] } });
    await service.conservarModeloComplementarias(anterior, 'complementarias_pregrado');
    expect(await service.ptaRepo.findOne({ where: { id: 'pta-1' } })).toMatchObject({ estado: 'Aprobado', version: 3,
      datosEstructurados: { complementarias_flujo_version: COMPLEMENTARIAS_FLUJO_SECUENCIAL,
        observaciones_docente: 'Cambio confirmado', complementarias: [expect.objectContaining({ horas: 32 })] } });
  });

  it('TypeORM genera una actualización de la clave JSON sin sobrescribir el PTA', async () => {
    const source = new DataSource({ type: 'postgres', entities: [PlanTrabajoAcademicoEntity] });
    await (source as any).buildMetadatas();
    let sql = '';
    const spy = jest.spyOn(UpdateQueryBuilder.prototype, 'execute').mockImplementation(async function () {
      sql = this.getQuery(); return { raw: [], affected: 1, generatedMaps: [] };
    });
    try {
      const service = setup('pregrado', 'gestion_profesoral');
      const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
      service.ptaRepo = source.getRepository(PlanTrabajoAcademicoEntity);
      await service.conservarModeloComplementarias(pta, 'complementarias_pregrado');
      expect(sql).toContain('COALESCE("datosEstructurados",');
      expect(sql).toContain('jsonb_build_object(');
      expect(sql).toContain("'complementarias_flujo_version'");
      expect(sql).not.toContain('"estado" ='); expect(sql).not.toContain('"version" =');
    } finally { spy.mockRestore(); }
  });

  it.each(['NUEVA', 'SIN_PROGRAMA'])('una actividad corregida exige sus avales actuales (%s) y conserva los ajenos', async destino => {
    const service = setup('pregrado', 'gestion_profesoral');
    service.resolveDocenteIdCached = jest.fn().mockResolvedValue({ personId: 'docente', fullName: 'Docente' });
    service.resolveDocenteId = jest.fn().mockResolvedValue('docente');
    service.resolveHorasAProgramar = jest.fn().mockResolvedValue(800);
    service.getConfiguracionPTAGlobal = jest.fn().mockResolvedValue({});
    service.syncAsignaturasPensum = jest.fn(async (rows: any[]) => rows);
    service.syncAsignaturasCupos = jest.fn(async (rows: any[]) => rows);
    service.evidenciaRepo = repository(); service.attachPtaReferenceDates = jest.fn();
    service.enrichPtaSummaries = jest.fn(async (rows: any[]) => rows);
    service.enrichHorasDesdeBanco = jest.fn();
    service.validatePtaBeforeApproval = jest.fn();
    const docente = { userId: 'docente', roles: ['DOCENTE'], permissions: new Set(), allowedComponents: [] };
    service.getCatalogoActividadesComplementarias.mockResolvedValue([
      { id: 'ACT', nivel_programa: 'pregrado', tipo_aprobacion: 'gestion_profesoral' },
      { id: 'NUEVA', nivel_programa: 'posgrado', tipo_aprobacion: 'decanatura' },
      { id: 'SIN_PROGRAMA', tipo_aprobacion: 'gestion_profesoral' },
    ]);
    const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    pta.estado = 'REVISION_DOCENTE_N1';
    pta.datosEstructurados.complementarias = [{ id: 1, actividad_id: 'ACT', horas: 40 },
      { id: 2, actividad_id: 'NUEVA', horas: 20 }];
    pta.datosEstructurados.complementarias_flujo_version = COMPLEMENTARIAS_FLUJO_SECUENCIAL;
    await service.ptaRepo.save(pta);
    await service.ptaComponentApprovalRepo.save([
      { id: 'pre', ptaId: 'pta-1', componente: 'complementarias_pregrado', estado: 'devuelto' },
      { id: 'pos', ptaId: 'pta-1', componente: 'complementarias_posgrado', estado: 'aprobado' },
      { id: 'dec', ptaId: 'pta-1', componente: 'complementarias_decanatura', estado: 'aprobado' },
      { id: 'inv', ptaId: 'pta-1', componente: 'investigacion', estado: 'aprobado', aprobadorNombre: 'Aval conservado' },
    ]);
    await service.ptaComponentReviewRepo.save([
      { id: 'rpos', ptaId: 'pta-1', componente: 'complementarias_posgrado', subseccion: 'docencia', estado: 'revisado' },
      { id: 'rdec', ptaId: 'pta-1', componente: 'complementarias_decanatura', subseccion: 'docencia', estado: 'revisado' },
    ]);
    await service.savePTA({ ...pta.datosEstructurados, id: 'pta-1', docente_id: 'docente',
      complementarias_filas_corregidas: { 'docencia:2': ['complementarias_pregrado'] },
      complementarias: [{ id: 1, actividad_id: 'NUEVA', horas: 32 }, { id: 2, actividad_id: 'NUEVA', horas: 999 }],
    }, docente);
    const guardado = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    expect(guardado.datosEstructurados.complementarias_filas_corregidas).toEqual({ 'docencia:1': ['complementarias_pregrado'] });
    // Un autoguardado posterior permite continuar corrigiendo solo esa fila.
    await service.savePTA({ id: 'pta-1', docente_id: 'docente', complementarias: [
      { id: 1, actividad_id: destino, horas: 28 }, { id: 2, actividad_id: 'NUEVA', horas: 999 },
    ] }, docente);
    const editada = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    expect(editada.datosEstructurados.complementarias).toEqual(expect.arrayContaining([
      { id: 1, actividad_id: destino, horas: 28 }, { id: 2, actividad_id: 'NUEVA', horas: 20 },
    ]));
    expect(editada.datosEstructurados.complementarias_filas_corregidas).toEqual({ 'docencia:1': ['complementarias_pregrado'] });
    const detalle = await service.getPTAById('pta-1');
    const requeridas = destino === 'NUEVA'
      ? ['complementarias_posgrado', 'complementarias_decanatura'] : ['complementarias_gestion_profesoral'];
    expect(detalle.complementarias.find((item: any) => item.id === 1))
      .toMatchObject({ componentes_edicion_complementaria: ['complementarias_pregrado'],
        componentes_complementaria: requeridas });
    expect(detalle.complementarias.find((item: any) => item.id === 2))
      .toMatchObject({ componentes_edicion_complementaria: [] });
    await service.updatePTAStatus('pta-1', { accion: 'reenviar_corregido' }, docente);
    await service.getComponentesRevision('pta-1');
    for (const componente of requeridas) {
      expect(await service.ptaComponentApprovalRepo.findOne({ where: { componente } })).toMatchObject({ estado: 'pendiente' });
      expect(await service.ptaComponentReviewRepo.findOne({ where: { componente } })).toMatchObject({ estado: 'pendiente' });
    }
    if (destino === 'SIN_PROGRAMA') {
      expect(await service.ptaComponentApprovalRepo.findOne({ where: { componente: 'complementarias_decanatura' } }))
        .toMatchObject({ estado: 'aprobado' });
      expect(await service.ptaComponentReviewRepo.findOne({ where: { componente: 'complementarias_posgrado' } }))
        .toMatchObject({ estado: 'revisado' });
    }
    expect(await service.ptaComponentApprovalRepo.findOne({ where: { componente: 'investigacion' } }))
      .toMatchObject({ estado: 'aprobado', aprobadorNombre: 'Aval conservado' });
    expect((await service.ptaRepo.findOne({ where: { id: 'pta-1' } })).datosEstructurados.complementarias_filas_corregidas).toBeUndefined();
    await expect(aprobar(service, requeridas[requeridas.length - 1])).rejects.toBeInstanceOf(BadRequestException);
    for (const componente of requeridas) { await revisar(service, componente); await aprobar(service, componente); }
    expect((await service.ptaRepo.findOne({ where: { id: 'pta-1' } })).estado).toBe('Aprobado');
  });
  const casos = ['complementarias_docencia', 'academico_administrativas'].flatMap(seccion =>
    [null, 'pregrado', 'posgrado'].flatMap(nivel => ['gestion_profesoral', 'decanatura', 'territorial']
      .map(tipo => ({ seccion, nivel, tipo }))));
  it.each(casos)('$seccion: $nivel → $tipo exige cada revisión y aprobación y cuenta las horas una vez', async ({ seccion, nivel, tipo }) => {
    const service = setup(nivel, tipo, seccion);
    const programa = nivel ? `complementarias_${nivel}` : null;
    const final = `complementarias_${tipo}`;
    const subseccion = seccion === 'complementarias_docencia' ? 'docencia' : 'academico_administrativas';
    const filas = await service.getComponentesAprobacion('pta-1');
    expect(filas.filter((row: any) => row.aplica).map((row: any) => row.componente).sort())
      .toEqual([programa, final].filter(Boolean).sort());
    await expect(aprobar(service, final)).rejects.toBeInstanceOf(BadRequestException);
    await revisar(service, final, subseccion);
    if (programa) {
      await expect(aprobar(service, final)).rejects.toThrow(/debe aprobarse el programa/);
      await expect(service.aprobarComponente('pta-1', { componente: programa, estado: 'aprobado', isSuperUser: true }, await actor(final, 'approve')))
        .rejects.toBeInstanceOf(ForbiddenException);
      await revisar(service, programa, subseccion);
      await aprobar(service, programa);
      expect((await service.ptaRepo.findOne({ where: { id: 'pta-1' } })).estado).toBe('Pendiente Jefatura');
    }
    await aprobar(service, final);
    const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    expect(pta.estado).toBe('Aprobado');
    expect(pta.datosEstructurados.complementarias).toHaveLength(1);
    expect(pta.datosEstructurados.complementarias_flujo_version).toBe(COMPLEMENTARIAS_FLUJO_SECUENCIAL);
    const dto = service.toPtaDto(pta);
    await service.attachComponentApprovalProgress([dto]);
    expect(dto.horas_complementarias).toBe(40);
    expect(dto.componentes_estado.find((row: any) => row.key === 'complementarias'))
      .toMatchObject({ estado: 'aprobado', horas: 40, horas_aprobadas: 40, horas_pendientes: 0 });
  });

  it('un PTA histórico aprobado conserva su flujo anterior al consultar', async () => {
    const service = setup('pregrado', 'gestion_profesoral', 'complementarias_docencia', 'Aprobado');
    await service.ptaComponentApprovalRepo.save({ id: 'pre', ptaId: 'pta-1', componente: 'complementarias_pregrado',
      estado: 'aprobado', aprobadorNombre: 'Aprobador histórico' });
    const filas = await service.getComponentesAprobacion('pta-1');
    expect(filas.find((row: any) => row.componente === 'complementarias_gestion_profesoral')).toMatchObject({ aplica: false });
    expect(filas.find((row: any) => row.componente === 'complementarias_pregrado')).toMatchObject({ estado: 'aprobado', aprobadorNombre: 'Aprobador histórico' });
    expect((await service.ptaRepo.findOne({ where: { id: 'pta-1' } })).estado).toBe('Aprobado');
  });

  it('la corrección de Gestión Profesoral reabre Programa y sus revisiones, manteniendo la actividad única', async () => {
    const service = setup('pregrado', 'gestion_profesoral');
    await revisar(service, 'complementarias_pregrado'); await aprobar(service, 'complementarias_pregrado');
    await revisar(service, 'complementarias_gestion_profesoral');
    await service.aprobarComponente('pta-1', { componente: 'complementarias_gestion_profesoral', estado: 'devuelto', comentarios: 'Corregir contenido' },
      await actor('complementarias_gestion_profesoral', 'approve'));
    await service.resetComponentApprovalWorkflow('pta-1', true);
    expect(await service.ptaComponentApprovalRepo.findOne({ where: { componente: 'complementarias_pregrado' } }))
      .toMatchObject({ estado: 'pendiente' });
    expect(await service.ptaComponentReviewRepo.findOne({ where: { componente: 'complementarias_pregrado' } }))
      .toMatchObject({ estado: 'pendiente' });
    await expect(aprobar(service, 'complementarias_gestion_profesoral')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('el lote procesa Programa antes del responsable aunque llegue en orden inverso', async () => {
    const service = setup('pregrado', 'gestion_profesoral');
    await revisar(service, 'complementarias_pregrado'); await revisar(service, 'complementarias_gestion_profesoral');
    const auth = await actor('complementarias_pregrado', 'approve', [permission('complementarias_gestion_profesoral', 'approve')]);
    const result = await service.aprobarComponentesLote({ ptaIds: ['pta-1'],
      componentes: ['complementarias_gestion_profesoral', 'complementarias_pregrado'] }, auth);
    expect(result.resumen).toMatchObject({ aprobados: 2, fallidos: 0 });
    expect(result.resultados.map((row: any) => row.componente))
      .toEqual(['complementarias_pregrado', 'complementarias_gestion_profesoral']);
    expect((await service.ptaRepo.findOne({ where: { id: 'pta-1' } })).estado).toBe('Aprobado');
  });

  it('separa las dos subsecciones aunque sus catálogos reutilicen un ID de actividad', async () => {
    const service = setup('pregrado', 'gestion_profesoral');
    service.getCatalogoActividadesAcademicoAdmin.mockResolvedValue([{ id: 'ACT', nivel_programa: 'posgrado', tipo_aprobacion: 'decanatura' }]);
    const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    pta.datosEstructurados.complementarias.push({ actividad_id: 'ACT', seccion: 'academico_administrativas', horas: 20 });
    await service.ptaRepo.save(pta);
    const filas = await service.getComponentesAprobacion('pta-1');
    expect(filas.find((row: any) => row.componente === 'complementarias_pregrado')).toMatchObject({ horas: 40 });
    expect(filas.find((row: any) => row.componente === 'complementarias_posgrado')).toMatchObject({ horas: 20 });
    await revisar(service, 'complementarias_pregrado'); await aprobar(service, 'complementarias_pregrado');
    const dto = service.toPtaDto(await service.ptaRepo.findOne({ where: { id: 'pta-1' } }));
    await service.attachComponentApprovalProgress([dto]);
    expect(dto.horas_complementarias).toBe(60);
    expect(dto.componentes_estado.find((row: any) => row.key === 'complementarias')).toMatchObject({ horas_aprobadas: 0 });
    expect(dto.componentes_aprobacion_estado.find((row: any) => row.componente === 'complementarias_gestion_profesoral'))
      .toMatchObject({ dependencias_pendientes: [] });
    expect(dto.componentes_aprobacion_estado.find((row: any) => row.componente === 'complementarias_decanatura'))
      .toMatchObject({ dependencias_pendientes: ['complementarias_posgrado'] });
  });

  it.each([false, true])('la solicitud reabre las etapas necesarias, conserva otros componentes y termina en el mismo PTA (histórico: %s)', async historico => {
    const service = setup('pregrado', 'gestion_profesoral');
    await revisar(service, 'complementarias_pregrado'); await aprobar(service, 'complementarias_pregrado');
    await revisar(service, 'complementarias_gestion_profesoral'); await aprobar(service, 'complementarias_gestion_profesoral');
    if (historico) {
      const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
      delete pta.datosEstructurados.complementarias_flujo_version;
      await service.ptaRepo.save(pta);
    }
    await service.solicitudRepo.save({ id: 'sol-1', ptaId: 'pta-1', docenteId: 'docente',
      tipoSolicitud: 'edicion_componentes', estado: 'pendiente', componentes: ['complementarias'], justificacion: 'Actualizar' });
    const gestor = await actor('complementarias_gestion_profesoral', 'approve', ['pta.requests.edit.manage']);
    await service.resolverSolicitudPTA('sol-1', { decision: 'aprobado' }, gestor);
    const reabiertas = await service.ptaComponentApprovalRepo.find({ where: { estado: 'devuelto' } });
    expect(reabiertas.map((row: any) => row.componente).sort()).toEqual(['complementarias_gestion_profesoral', 'complementarias_pregrado']);
    expect(await service.ptaComponentApprovalRepo.findOne({ where: { componente: 'investigacion' } })).toMatchObject({ estado: 'aprobado' });
    const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    pta.estado = 'Pendiente Jefatura'; pta.datosEstructurados.complementarias[0].horas = 32;
    await service.ptaRepo.save(pta);
    const solicitud = await service.solicitudRepo.findOne({ where: { id: 'sol-1' } });
    solicitud.estado = 'en_aprobacion'; await service.solicitudRepo.save(solicitud);
    await service.resetComponentApprovalWorkflow('pta-1', true);
    await expect(aprobar(service, 'complementarias_gestion_profesoral')).rejects.toBeInstanceOf(BadRequestException);
    await revisar(service, 'complementarias_pregrado'); await aprobar(service, 'complementarias_pregrado');
    expect((await service.solicitudRepo.findOne({ where: { id: 'sol-1' } })).estado).toBe('en_aprobacion');
    await revisar(service, 'complementarias_gestion_profesoral'); await aprobar(service, 'complementarias_gestion_profesoral');
    expect((await service.solicitudRepo.findOne({ where: { id: 'sol-1' } })).estado).toBe('gestionada');
    expect(await service.ptaRepo.findOne({ where: { id: 'pta-1' } })).toMatchObject({ estado: 'Aprobado',
      datosEstructurados: { complementarias: [expect.objectContaining({ horas: 32 })] } });
  });

  it('permite agregar Territorial en una solicitud sobre Complementarias vacías sin crear una aprobación ficticia de GP', async () => {
    const service = setup(null, 'territorial', 'complementarias_docencia', 'Aprobado');
    const pta = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    pta.datosEstructurados.complementarias = [];
    pta.datosEstructurados.investigacion_proyecto = { nombre: 'Investigación conservada', horas_solicitadas: 40 };
    await service.ptaRepo.save(pta);
    await service.ptaComponentApprovalRepo.save({ id: 'inv', ptaId: 'pta-1', componente: 'investigacion', estado: 'aprobado', aprobadorNombre: 'Investigador' });
    await service.solicitudRepo.save({ id: 'sol-vacia', ptaId: 'pta-1', docenteId: 'docente',
      tipoSolicitud: 'edicion_componentes', estado: 'pendiente', componentes: ['complementarias'], justificacion: 'Agregar' });
    const gestor = await actor('complementarias_territorial', 'approve', ['pta.requests.edit.manage']);
    await service.resolverSolicitudPTA('sol-vacia', { decision: 'aprobado' }, gestor);
    const editada = await service.ptaRepo.findOne({ where: { id: 'pta-1' } });
    editada.datosEstructurados.complementarias = [{ id: 'c1', actividad_id: 'ACT', horas: 40 }];
    editada.estado = 'Pendiente Jefatura'; await service.ptaRepo.save(editada);
    const solicitud = await service.solicitudRepo.findOne({ where: { id: 'sol-vacia' } });
    solicitud.estado = 'en_aprobacion'; await service.solicitudRepo.save(solicitud);
    await service.resetComponentApprovalWorkflow('pta-1', true);
    const etapas = await service.getComponentesAprobacion('pta-1');
    expect(etapas.find((row: any) => row.componente === 'complementarias_gestion_profesoral')).toMatchObject({ aplica: false });
    expect(etapas.find((row: any) => row.componente === 'complementarias_territorial')).toMatchObject({ aplica: true, estado: 'pendiente', scopeId: 'sol-vacia' });
    await revisar(service, 'complementarias_territorial'); await aprobar(service, 'complementarias_territorial');
    expect((await service.solicitudRepo.findOne({ where: { id: 'sol-vacia' } })).estado).toBe('gestionada');
    expect(await service.ptaComponentApprovalRepo.findOne({ where: { componente: 'investigacion' } }))
      .toMatchObject({ aprobadorNombre: 'Investigador', estado: 'aprobado' });
  });

  it('la corrección autorizada por Programa conserva filas ajenas y permite cambiar la actividad sin perderla ni duplicarla', async () => {
    const service = setup('pregrado', 'gestion_profesoral');
    service.getCatalogoActividadesComplementarias.mockResolvedValue([
      { id: 'ACT', nivel_programa: 'pregrado', tipo_aprobacion: 'gestion_profesoral' },
      { id: 'AJENA', nivel_programa: 'posgrado', tipo_aprobacion: 'decanatura' },
    ]);
    const existing = { id: 'pta-1', datosEstructurados: { complementarias: [
      { id: 1, actividad_id: 'ACT', horas: 40 }, { id: 2, actividad_id: 'AJENA', horas: 20 },
    ] } };
    const merged = await service.mergeRestrictedAdminEditInput({ complementarias: [
      { id: 1, actividad_id: 'AJENA', horas: 32 }, { id: 2, actividad_id: 'ACT', horas: 999 },
    ] }, existing, ['complementarias_pregrado']);
    expect(merged.complementarias).toHaveLength(2);
    expect(merged.complementarias).toEqual(expect.arrayContaining([
      { id: 1, actividad_id: 'AJENA', horas: 32 }, { id: 2, actividad_id: 'AJENA', horas: 20 },
    ]));
  });
});
