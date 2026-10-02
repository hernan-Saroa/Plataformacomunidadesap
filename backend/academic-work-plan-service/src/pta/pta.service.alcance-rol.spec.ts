import { PtaService } from './pta.service';
import { PtaPermissionsService } from './auth/pta-permissions.service';

describe('decisiones PTA: permisos del rol y territorial de la cuenta', () => {
  const pairs = [
    { territorialId: 'A', nivel: 'pregrado' }, { territorialId: 'A', nivel: 'posgrado' },
    { territorialId: 'B', nivel: 'pregrado' }, { territorialId: 'B', nivel: 'posgrado' },
  ];
  const row = (permission: string, roleScope: any = { tipo: 'Global' }, role = 'ROL_LIBRE') => ({
    role_code: role, permission_code: permission, role_scope: roleScope,
  });

  function setup(rows: any[]) {
    const resolver = new PtaPermissionsService({ query: jest.fn().mockResolvedValue(rows) } as any);
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue({ id: 'pta-1' }) };
    service.getTerritorialNivelPairsDelComponente = jest.fn().mockResolvedValue(pairs);
    service.resolveNombrePorSeccionalId = jest.fn().mockResolvedValue(new Map([['A', 'Nariño'], ['B', 'Meta']]));
    service.resolveNombresSeccionales = jest.fn().mockResolvedValue(['Nariño', 'Meta']);
    service.clasificarAsignaturasDocencia = jest.fn(async (asignaturas: any[]) => ({
      academica_pregrado: asignaturas, academica_posgrado: [], academica_territorial: [],
    }));
    const context = async (territorialIds: string[] = []) => ({
      ...await resolver.resolveForUser('user-1'), userId: 'user-1', territorialIds,
    });
    return { service, context };
  }

  it('usa la territorial asignada a la cuenta aunque el permiso venga de cualquier rol', async () => {
    const { service, context } = setup([
      row('pta.approve.academica.territorial.pregrado', { tipo: 'Filtrado', territorial: 'Nariño' }, 'ROL_PERSONALIZADO'),
      row('pta.review.academica.territorial.posgrado', { tipo: 'Global' }, 'OTRO_ROL'),
    ]);
    const auth = await context(['B']);
    const decision = await service.getDecisionPermissions('pta-1', auth);
    expect(decision.territorial.aprobar.pairs).toEqual([pairs[2]]);
    expect(decision.territorial.revisar.pairs).toEqual([pairs[3]]);
    expect(await service.getDecisionListScope(auth)).toEqual({
      configured: true, territoriales: ['B', 'Meta'], programas: null, cetaps: null,
    });
  });

  it('sin territorial de cuenta permite las territoriales según cada permiso concedido', async () => {
    const { service, context } = setup([
      row('pta.approve.academica.territorial.pregrado', { tipo: 'Filtrado', territorial: 'Nariño' }),
      row('pta.review.academica.territorial.posgrado', { tipo: 'Filtrado', territorial: 'Meta' }),
    ]);
    const auth = await context();
    const decision = await service.getDecisionPermissions('pta-1', auth);
    expect(decision.territorial.aprobar.pairs).toEqual([pairs[0], pairs[2]]);
    expect(decision.territorial.revisar.pairs).toEqual([pairs[1], pairs[3]]);
    expect((await service.getDecisionListScope(auth)).territoriales).toBeNull();
  });

  it('no convierte revisión en aprobación ni aprobación en revisión', async () => {
    const { service, context } = setup([row('pta.review.academica.pregrado')]);
    const auth = await context();
    expect(auth.allowedComponents).toEqual([]);
    expect(auth.allowedReviewSubsecciones).toContain('academica_pregrado:general');
    await expect(service.aprobarComponente('pta-1', {
      componente: 'academica_pregrado', estado: 'aprobado',
    }, auth)).rejects.toThrow(/No tiene permisos para aprobar/);
    await expect(service.assertAlcanceTerritorial('academica_pregrado', {
      datosEstructurados: { asignaturas: [{ territorial_id: 'Meta' }] },
    }, auth, 'revisar')).resolves.toBeNull();
  });

  it('impide aprobar o revisar una actividad ajena aun con ambos permisos', async () => {
    const { service, context } = setup([
      row('pta.approve.academica.pregrado'), row('pta.review.academica.pregrado'),
    ]);
    const auth = await context(['Meta']);
    const ptaTolima = { datosEstructurados: { asignaturas: [{ territorial_id: 'Tolima' }] } };
    for (const action of ['aprobar', 'revisar']) {
      await expect(service.assertAlcanceTerritorial('academica_pregrado', ptaTolima, auth, action))
        .rejects.toThrow(/alcance territorial/);
    }
    const ptaMeta = { datosEstructurados: { asignaturas: [{ territorial_id: 'Meta' }] } };
    await expect(service.assertAlcanceTerritorial('academica_pregrado', ptaMeta, auth, 'aprobar')).resolves.toBeNull();
    await expect(service.assertAlcanceTerritorial('academica_pregrado', ptaMeta, auth, 'revisar')).resolves.toBeNull();
  });

  it('no concede decisiones cuando falta el permiso específico del componente', async () => {
    const { service, context } = setup([row('pta.approve.academica.pregrado')]);
    const decision = await service.getDecisionPermissions('pta-1', await context(['B']));
    expect(decision.territorial.aprobar.pairs).toEqual([]);
    expect(decision.territorial.revisar.pairs).toEqual([]);
  });

  it('una devolución de revisión conserva el permiso del revisor y la territorial de su cuenta', async () => {
    const { service, context } = setup([
      row('pta.review.academica.territorial.pregrado'),
      row('pta.approve.academica.territorial.posgrado'),
    ]);
    service.assertComponenteDisponibleParaDecision = jest.fn().mockResolvedValue(undefined);
    service.getRequiredSubsecciones = jest.fn().mockResolvedValue(['general']);
    service.ptaComponentReviewRepo = { findOne: jest.fn().mockResolvedValue({}), save: jest.fn() };
    service.aprobarComponente = jest.fn().mockImplementation(async (_id: string, _body: any, auth: any) => {
      const scope = await service.assertAlcanceTerritorial('academica_territorial', {}, auth, 'aprobar');
      expect(scope.propios).toEqual([pairs[2]]);
      expect(auth.isSuperUser).toBe(false);
      return { estadoGeneral: 'REVISION_DOCENTE_N1' };
    });
    await service.revisarComponente('pta-1', {
      componente: 'academica_territorial', estado: 'devuelto', comentarios: 'Ajustar',
    }, await context(['B']));
    expect(service.aprobarComponente).toHaveBeenCalledTimes(1);
  });
});
