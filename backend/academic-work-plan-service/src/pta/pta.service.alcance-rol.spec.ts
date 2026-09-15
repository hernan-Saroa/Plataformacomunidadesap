import { PtaService } from './pta.service';
import { PtaPermissionsService } from './auth/pta-permissions.service';

describe('alcance administrativo del rol en decisiones territoriales PTA', () => {
  const pairs = [
    { territorialId: 'A', nivel: 'pregrado' }, { territorialId: 'A', nivel: 'posgrado' },
    { territorialId: 'B', nivel: 'pregrado' }, { territorialId: 'B', nivel: 'posgrado' },
  ];
  const row = (permission: string, scope: any = { tipo: 'Filtrado', territorial: 'Todas', cetap: 'Todos', programa: 'Todos' }, role = 'APROBAR_PTA_2') =>
    ({ role_code: role, permission_code: permission, role_scope: scope });
  function setup(rows: any[]) {
    const query = jest.fn().mockResolvedValue(rows);
    const resolver = new PtaPermissionsService({ query } as any);
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue({ id: 'pta-1' }) };
    service.getTerritorialNivelPairsDelComponente = jest.fn().mockResolvedValue(pairs);
    service.resolveNombrePorSeccionalId = jest.fn().mockResolvedValue(new Map([['A', 'Nariño'], ['B', 'Meta']]));
    service.resolveNombresSeccionales = jest.fn().mockResolvedValue(['Nariño', 'Meta']);
    const context = async (territorialIds: string[] = []) => ({ ...await resolver.resolveForUser('user-1'), userId: 'user-1', territorialIds });
    return { service, context, query };
  }

  it.each([{ tipo: 'Global' }, { tipo: 'Filtrado', territorial: 'Todas', cetap: 'Todos', programa: 'Todos' }])(
    'respeta %j sin exigir una seccional personal para aprobar o revisar', async scope => {
      const { service, context } = setup([
        row('pta.approve.academica.territorial.pregrado', scope), row('pta.approve.academica.territorial.posgrado', scope),
        row('pta.review.academica.territorial.pregrado', scope), row('pta.review.academica.territorial.posgrado', scope),
      ]);
      const auth = await context();
      const ui = await service.getDecisionPermissions('pta-1', auth);
      expect(ui.territorial.aprobar.pairs).toEqual(pairs);
      expect(ui.territorial.revisar.pairs).toEqual(pairs);
      expect((await service.assertAlcanceTerritorial('academica_territorial', {}, auth, 'aprobar')).propios).toEqual(pairs);
    },
  );

  it('restringe al territorio seleccionado aunque la persona pertenezca a otro', async () => {
    const { service, context } = setup([row('pta.approve.academica.territorial.pregrado', { tipo: 'Filtrado', territorial: 'Nariño' })]);
    const result = await service.getDecisionPermissions('pta-1', await context(['B']));
    expect(result.territorial.aprobar.pairs).toEqual([pairs[0]]);
    expect(result.territorial.revisar.pairs).toEqual([]);
  });

  it('no combina el alcance global de otro rol con un permiso territorial restringido', async () => {
    const { service, context } = setup([
      row('pta.approve.academica.territorial.pregrado', { tipo: 'Filtrado', territorial: 'Nariño' }, 'PREGRADO'),
      row('pta.approve.academica.territorial.posgrado', { tipo: 'Filtrado', territorial: 'Meta' }, 'POSGRADO'),
      row('pta.review.academica.territorial.pregrado', { tipo: 'Global' }, 'REVISOR'),
      row('pta.approve.ext.capacitacion', { tipo: 'Global' }, 'EXTENSION'),
    ]);
    const result = await service.getDecisionPermissions('pta-1', await context());
    expect(result.territorial.aprobar.pairs).toEqual([pairs[0], pairs[3]]);
    expect(result.territorial.revisar.pairs).toEqual([pairs[0], pairs[2]]);
  });

  it.each([null, { tipo: 'territorial_por_persona', source: 'auth.personas.id_seccional' }])(
    'mantiene la seccional personal para roles históricos sin alcance explícito: %j', async scope => {
      const { service, context } = setup([row('pta.approve.academica.territorial.pregrado', scope)]);
      expect((await service.getDecisionPermissions('pta-1', await context(['B']))).territorial.aprobar.pairs).toEqual([pairs[2]]);
      expect((await service.getDecisionPermissions('pta-1', await context())).territorial.aprobar.pairs).toEqual([pairs[0], pairs[2]]);
    },
  );

  it('aplica el cambio de alcance guardado sin reutilizar el alcance anterior', async () => {
    const { service, context, query } = setup([row('pta.approve.academica.territorial.pregrado')]);
    expect((await service.getDecisionPermissions('pta-1', await context())).territorial.aprobar.pairs).toEqual([pairs[0], pairs[2]]);
    query.mockResolvedValue([row('pta.approve.academica.territorial.pregrado', { tipo: 'Filtrado', territorial: 'Meta' })]);
    expect((await service.getDecisionPermissions('pta-1', await context())).territorial.aprobar.pairs).toEqual([pairs[2]]);
  });

  it('el listado usa Personas cuando el rol no restringe y respeta un filtro específico del rol', async () => {
    const { service, context, query } = setup([row('pta.approve.academica.territorial.pregrado')]);
    expect(await service.getDecisionListScope(await context(['A']))).toEqual({ configured: true, territoriales: ['A', 'Nariño'], programas: null, cetaps: null });
    query.mockResolvedValue([row('pta.approve.academica.territorial.pregrado', { tipo: 'Filtrado', territorial: 'B' })]);
    expect(await service.getDecisionListScope(await context(['A']))).toEqual({ configured: true, territoriales: ['B', 'Meta'], programas: null, cetaps: null });
    query.mockResolvedValue([row('pta.approve.academica.territorial.pregrado', null)]);
    expect(await service.getDecisionListScope(await context(['A']))).toEqual({ configured: true, territoriales: ['A', 'Nariño'], programas: null, cetaps: null });
  });

  it('un rol global sin el permiso de docencia territorial no habilita decisiones', async () => {
    const { service, context } = setup([row('pta.approve.academica.pregrado', { tipo: 'Global' })]);
    expect((await service.getDecisionPermissions('pta-1', await context())).territorial.aprobar.pairs).toEqual([]);
  });

  it('un alcance mal formado no concede todas las territoriales', async () => {
    const { service, context } = setup([row('pta.approve.academica.territorial.pregrado', { tipo: 'Filtrado' })]);
    const result = await service.getDecisionPermissions('pta-1', await context(['A']));
    expect(result.territorial.aprobar.pairs).toEqual([]);
    expect(result.territorial.aprobar.reason).toContain('alcance válido');
  });

  it('no aprueba asignaturas de otro programa o CETAP dentro del mismo par', async () => {
    const { service, context } = setup([row('pta.approve.academica.territorial.pregrado', {
      tipo: 'Filtrado', territorial: 'Todas', cetap: 'Sede uno', programa: 'Administración pública',
    })]);
    service.getTerritorialScopeSubjects = jest.fn().mockResolvedValue([
      { ...pairs[0], programas: ['administracionpublica'], cetaps: ['sedeuno'] },
      { ...pairs[0], programas: ['otroprograma'], cetaps: ['sedeuno'] },
      { ...pairs[2], programas: ['administracionpublica'], cetaps: ['sedeuno'] },
    ]);
    expect((await service.getDecisionPermissions('pta-1', await context())).territorial.aprobar.pairs).toEqual([pairs[2]]);
  });

  it('resuelve nombres de programa y CETAP del catálogo para comparar el alcance guardado', async () => {
    const { service } = setup([]);
    service.clasificarAsignaturasDocencia = jest.fn().mockResolvedValue({ academica_territorial: [
      { territorial_id: 'A', programa_id: 'p1', cetap_id: 's1' },
    ] });
    service.programaRepo = { find: jest.fn().mockResolvedValue([{ id: 'p1', tipo: 'pregrado', nombre: 'Administración Pública' }]) };
    service.ptaRepo.manager = { query: jest.fn().mockResolvedValue([{ id: 's1', codigo: '01', nombre: 'Sede Uno' }]) };
    const subjects = await service.getTerritorialScopeSubjects({ datosEstructurados: { asignaturas: [] } }, true);
    expect(subjects[0]).toMatchObject({ territorialId: 'A', nivel: 'pregrado' });
    expect(subjects[0].programas).toContain('administracionpublica');
    expect(subjects[0].cetaps).toContain('sedeuno');
  });

  it('una devolución en revisión conserva el alcance del revisor al reutilizar la transición de aprobación', async () => {
    const { service, context } = setup([
      row('pta.review.academica.territorial.pregrado', { tipo: 'Filtrado', territorial: 'Meta' }),
      row('pta.approve.academica.territorial.posgrado', { tipo: 'Filtrado', territorial: 'Nariño' }),
    ]);
    service.assertComponenteDisponibleParaDecision = jest.fn().mockResolvedValue(undefined);
    service.getRequiredSubsecciones = jest.fn().mockResolvedValue(['general']);
    service.ptaComponentReviewRepo = {
      findOne: jest.fn().mockResolvedValue({}), save: jest.fn().mockResolvedValue({}),
    };
    service.aprobarComponente = jest.fn().mockImplementation(async (_id: string, _body: any, auth: any) => {
      const scope = await service.assertAlcanceTerritorial('academica_territorial', {}, auth, 'aprobar');
      expect(scope.propios).toEqual([pairs[2]]);
      expect(auth.isSuperUser).toBe(false);
      return { estadoGeneral: 'REVISION_DOCENTE_N1' };
    });
    await service.revisarComponente('pta-1', { componente: 'academica_territorial', estado: 'devuelto', comentarios: 'Ajustar' }, await context());
    expect(service.aprobarComponente).toHaveBeenCalledTimes(1);
  });
});
