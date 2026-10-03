import { PtaService } from './pta.service';
import { PtaPermissionsService } from './auth/pta-permissions.service';

describe('PTA: alcance vigente desde Personas', () => {
  const pairs = [
    { territorialId: 'Meta', nivel: 'pregrado' },
    { territorialId: 'Meta', nivel: 'posgrado' },
    { territorialId: 'Caldas', nivel: 'pregrado' },
  ];

  async function setup(persona: any, scope: any = null) {
    const query = jest.fn().mockImplementation(async (sql: string) => sql.includes('permission_code') ? [
      { role_code: 'APROBADOR', permission_code: 'pta.approve.academica.territorial.pregrado', role_scope: scope },
      { role_code: 'REVISOR', permission_code: 'pta.review.academica.territorial.posgrado', role_scope: scope },
    ] : [persona]);
    const resolver = new PtaPermissionsService({ query } as any);
    const auth = {
      ...await resolver.resolveForUser('u1'), ...await resolver.resolvePersonalScopeForUser('u1'), userId: 'u1',
    };
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue({ id: 'pta1' }) };
    service.getTerritorialNivelPairsDelComponente = jest.fn().mockResolvedValue(pairs);
    service.resolveNombrePorSeccionalId = jest.fn().mockResolvedValue(new Map());
    service.resolveNombresSeccionales = jest.fn().mockResolvedValue(['Meta', 'Caldas']);
    return { service, auth, resolver, query };
  }

  it.each([null, { tipo: 'Global' }, { tipo: 'Filtrado', territorial: 'Todas', cetap: 'Todos', programa: 'Todos' }, { tipo: 'territorial_por_persona' }])(
    'usa territorial y sede de Personas para botones, listado y ambas decisiones con rol %j', async scope => {
    const { service, auth } = await setup({ id_seccional: 'Meta', id_sede: 169, nombre_sede: 'Granada' }, scope);
    const ui = await service.getDecisionPermissions('pta1', auth);
    expect(ui.territorial.aprobar.pairs).toEqual([pairs[0]]);
    expect(ui.territorial.revisar.pairs).toEqual([pairs[1]]);
    for (const [action, pair] of [['aprobar', pairs[0]], ['revisar', pairs[1]]] as const) {
      expect((await service.assertAlcanceTerritorial('academica_territorial', {}, auth, action)).propios).toEqual([pair]);
    }
    expect(await service.getDecisionListScope(auth)).toEqual({
      configured: true, territoriales: ['Meta'], programas: null, cetaps: null,
    });
  });

  it.each(['aprobar', 'revisar'])('permite %s dentro de la territorial aunque la sede sea distinta', async action => {
    const { service, auth } = await setup({ id_seccional: 'Meta', id_sede: 170, nombre_sede: 'Otra sede' });
    expect((await service.assertAlcanceTerritorial('academica_territorial', {}, auth, action)).propios)
      .toEqual([action === 'aprobar' ? pairs[0] : pairs[1]]);
  });

  it('la sede de la actividad no modifica el alcance territorial de la cuenta', async () => {
    const { service, auth } = await setup({ id_seccional: 'Meta', id_sede: 169 });
    expect((await service.assertAlcanceTerritorial('academica_territorial', {}, auth, 'aprobar')).propios).toEqual([pairs[0]]);
  });

  it('sin sede personal permite las sedes de la territorial asignada', async () => {
    const { service, auth } = await setup({ id_seccional: 'Meta', id_sede: null });
    expect((await service.getDecisionPermissions('pta1', auth)).territorial.aprobar.pairs).toEqual([pairs[0]]);
  });

  it('sin asignaciones permite cualquier territorial conservando nivel y etapa', async () => {
    const { service, auth } = await setup({ id_seccional: null, id_sede: null });
    const ui = await service.getDecisionPermissions('pta1', auth);
    expect(ui.territorial.aprobar.pairs).toEqual([pairs[0], pairs[2]]);
    expect(ui.territorial.revisar.pairs).toEqual([pairs[1]]);
    expect(await service.getDecisionListScope(auth)).toEqual({ configured: true, territoriales: null, programas: null, cetaps: null });
  });

  it('un alcance administrativo del rol ajeno no reemplaza la territorial de la cuenta', async () => {
    const { service, auth } = await setup({ id_seccional: 'Meta', id_sede: 170 }, { tipo: 'Filtrado', territorial: 'Caldas' });
    const ui = await service.getDecisionPermissions('pta1', auth);
    expect(ui.territorial.aprobar.pairs).toEqual([pairs[0]]);
    expect(ui.territorial.revisar.pairs).toEqual([pairs[1]]);
  });

  it('reconoce equivalencias de sede y CETAP y vuelve a consultar los cambios en Personas', async () => {
    const { auth, resolver, query } = await setup({
      id_seccional: ' Meta ', id_sede: 169, codigo_sede: 'CET-0169', nombre_sede: 'Granada',
      id_cetap: 900169, codigo_cetap: 'CET-0169', nombre_cetap: 'Granada',
    });
    expect(auth.territorialIds).toEqual(['Meta']);
    expect(auth.cetapIds).toEqual(['169', 'CET-0169', 'Granada', '900169']);
    expect(query.mock.calls[1][0]).toContain('COALESCE(p.id_seccional, s.id_seccional)');
    expect(query.mock.calls[1][0]).toContain('auth.sede_cetap_mapping');
    query.mockResolvedValue([{ id_seccional: 'Caldas', id_sede: null }]);
    expect(await resolver.resolvePersonalScopeForUser('u1')).toEqual({ territorialIds: ['Caldas'], cetapIds: [] });
  });

  it('un error de consulta o una cuenta sin persona no se interpreta como alcance libre', async () => {
    const { resolver, query } = await setup({});
    query.mockRejectedValueOnce(new Error('DB no disponible')).mockResolvedValueOnce([]);
    await expect(resolver.resolvePersonalScopeForUser('u1')).rejects.toThrow('No fue posible verificar');
    await expect(resolver.resolvePersonalScopeForUser('u1')).rejects.toThrow('No fue posible verificar');
  });
});
