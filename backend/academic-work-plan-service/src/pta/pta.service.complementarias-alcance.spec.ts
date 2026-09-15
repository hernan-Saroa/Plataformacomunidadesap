import { PtaService } from './pta.service';
import { PtaPermissionsService } from './auth/pta-permissions.service';

describe('alcance independiente de Complementarias territoriales', () => {
  async function setup(rows: any[], actividades: any[] = [{ actividad_id: 'pre', territorial_id: 'Meta', horas: 10 }]) {
    const resolver = new PtaPermissionsService({ query: jest.fn().mockResolvedValue(rows) } as any);
    const auth: any = { ...await resolver.resolveForUser('u1'), territorialIds: ['Meta'], cetapIds: ['Granada'] };
    const service = Object.create(PtaService.prototype) as any;
    service.getCatalogoActividadesComplementarias = jest.fn().mockResolvedValue([
      { id: 'pre', tipo_aprobacion: 'decanatura', nivel_programa: 'pregrado' },
      { id: 'pos', tipo_aprobacion: 'decanatura', nivel_programa: 'posgrado' },
    ]);
    service.getCatalogoActividadesAcademicoAdmin = jest.fn().mockResolvedValue([]);
    service.resolveNombrePorSeccionalId = jest.fn().mockResolvedValue(new Map());
    const pta: any = { id: 'pta', datosEstructurados: { complementarias: actividades } };
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue(pta) };
    return { service, auth, pta };
  }
  const row = (action: string, level = 'pregrado', territorial = 'Meta', component = 'complementarias') => ({
    role_code: `${component}_${action}_${level}`, permission_code: `pta.${action}.${component}.territorial.${level}`,
    role_scope: { tipo: 'Filtrado', territorial },
  });

  it.each([['approve', 'aprobar'], ['review', 'revisar']])('respeta el alcance del permiso %s sin exigir una sede que la actividad no captura', async (permission, action) => {
    const { service, auth, pta } = await setup([{ ...row(permission), role_scope: { tipo: 'Global' } }]);
    const result = await service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, action);
    expect(result.propios).toEqual([{ territorialId: 'Meta', nivel: 'pregrado' }]);
  });

  it.each(['aprobar', 'revisar'])('no mezcla un rol de Docencia global con Complementarias ajenas al %s', async action => {
    const permission = action === 'aprobar' ? 'approve' : 'review';
    const { service, auth, pta } = await setup([
      row(permission, 'pregrado', 'Caldas'),
      { ...row(permission, 'pregrado', 'Todas', 'academica'), role_scope: { tipo: 'Global' } },
    ]);
    await expect(service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, action)).rejects.toThrow('No tiene alcance');
  });

  it('separa los niveles del aprobador y revisor de un mismo usuario', async () => {
    const { service, auth, pta } = await setup([row('approve', 'pregrado'), row('review', 'posgrado')]);
    expect((await service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, 'aprobar')).propios).toHaveLength(1);
    await expect(service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, 'revisar')).rejects.toThrow();
    const ui = await service.getDecisionPermissions('pta', auth);
    expect(ui.allowedComponents).toContain('complementarias_territorial');
    expect(ui.allowedReviewSubsecciones).not.toContain('complementarias_territorial:docencia');
  });

  it('no consolida actividades de otra territorial dentro del mismo componente', async () => {
    const { service, auth, pta } = await setup([row('approve')], [
      { actividad_id: 'pre', territorial_id: 'Meta', horas: 10 },
      { actividad_id: 'pre', territorial_id: 'Caldas', horas: 10 },
    ]);
    await expect(service.aprobarComponente('pta', { componente: 'complementarias_territorial', estado: 'aprobado' }, auth))
      .rejects.toThrow('No tiene alcance');
    auth.territorialDecisionGrantsByComponent.complementarias_territorial.aprobar.push({ nivel: 'pregrado', territorial: 'seleccionada', territorialId: 'Caldas' });
    expect((await service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, 'aprobar')).propios).toHaveLength(2);
  });

  // Regresión del bloqueo sin salida: una complementaria de Decanatura sin
  // territorial capturada ya no entra al componente territorial, así que este
  // alcance no aplica y el PTA se resuelve por su componente normal en vez de
  // quedar trabado con un 403 que nadie —salvo el superusuario— podía levantar.
  it('no exige alcance territorial por una Decanatura sin territorial capturada', async () => {
    const { service, auth, pta } = await setup([row('approve')], [
      { actividad_id: 'pre', horas: 10 },
    ]);
    expect(await service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, 'aprobar')).toBeNull();
    const ui = await service.getDecisionPermissions('pta', auth);
    expect(ui.allowedComponents).toContain('complementarias_territorial');
  });

  // La complementaria captura territorial, pero NO sede/CETAP ni programa. Un rol
  // con alcance Filtrado que además acota la sede quedaba sin poder aprobar
  // ninguna complementaria territorial: el filtro se comparaba contra un dato que
  // el ítem nunca trae. La territorial, en cambio, sigue siendo estricta.
  it('acota por territorial pero ignora la sede del rol, que la actividad no captura', async () => {
    const conSede = (territorial: string) => ({
      ...row('approve'), role_scope: { tipo: 'Filtrado', territorial, cetap: 'Granada', programa: 'APT' },
    });

    const propia = await setup([conSede('Meta')]);
    expect((await propia.service.assertAlcanceTerritorial('complementarias_territorial', propia.pta, propia.auth, 'aprobar')).propios)
      .toEqual([{ territorialId: 'Meta', nivel: 'pregrado' }]);

    const ajena = await setup([conSede('Caldas')]);
    await expect(ajena.service.assertAlcanceTerritorial('complementarias_territorial', ajena.pta, ajena.auth, 'aprobar'))
      .rejects.toThrow('No tiene alcance');
  });

  it('sin asignación permite cualquier territorial, pero no concede otros niveles', async () => {
    const { service, auth, pta } = await setup([{ ...row('approve'), role_scope: null }]);
    auth.territorialIds = [];
    pta.datosEstructurados.complementarias[0].territorial_id = 'Caldas';
    expect((await service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, 'aprobar')).propios).toHaveLength(1);
    pta.datosEstructurados.complementarias[0].actividad_id = 'pos';
    await expect(service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, 'aprobar')).rejects.toThrow();
  });
});
