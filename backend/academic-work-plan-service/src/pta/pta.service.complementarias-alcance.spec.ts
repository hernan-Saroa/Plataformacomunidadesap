import { PtaService } from './pta.service';
import { PtaPermissionsService } from './auth/pta-permissions.service';

describe('alcance independiente de Complementarias territoriales', () => {
  async function setup(rows: any[], actividades: any[] = [{ actividad_id: 'pre', territorial_id: 'Meta', horas: 10 }]) {
    const resolver = new PtaPermissionsService({ query: jest.fn().mockResolvedValue(rows) } as any);
    const auth: any = { ...await resolver.resolveForUser('u1'), territorialIds: ['Meta'], cetapIds: ['Granada'] };
    const service = Object.create(PtaService.prototype) as any;
    service.getCatalogoActividadesComplementarias = jest.fn().mockResolvedValue([
      { id: 'pre', tipo_aprobacion: 'territorial', nivel_programa: 'pregrado' },
      { id: 'pos', tipo_aprobacion: 'territorial', nivel_programa: 'posgrado' },
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

  it.each(['aprobar', 'revisar'])('Complementarias conserva el permiso por nivel sin depender de la territorial de la cuenta para %s', async action => {
    const permission = action === 'aprobar' ? 'approve' : 'review';
    const { service, auth, pta } = await setup([
      row(permission, 'pregrado', 'Caldas'),
      { ...row(permission, 'pregrado', 'Todas', 'academica'), role_scope: { tipo: 'Global' } },
    ]);
    expect((await service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, action)).propios)
      .toEqual([{ territorialId: 'Meta', nivel: 'pregrado' }]);
    auth.territorialIds = ['Caldas'];
    expect((await service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, action)).propios)
      .toEqual([{ territorialId: 'Meta', nivel: 'pregrado' }]);
  });

  it('separa los niveles del aprobador y revisor de un mismo usuario', async () => {
    const { service, auth, pta } = await setup([row('approve', 'pregrado'), row('review', 'posgrado')]);
    expect((await service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, 'aprobar')).propios).toHaveLength(1);
    await expect(service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, 'revisar')).rejects.toThrow();
    const ui = await service.getDecisionPermissions('pta', auth);
    expect(ui.allowedComponents).toContain('complementarias_territorial');
    expect(ui.allowedReviewSubsecciones).not.toContain('complementarias_territorial:docencia');
  });

  it.each(['aprobar', 'revisar'])('varias territoriales no eliminan la obligación de tener todos los niveles para %s', async action => {
    const permission = action === 'aprobar' ? 'approve' : 'review';
    const { service, auth, pta } = await setup([row(permission)], [
      { actividad_id: 'pre', territorial_id: 'Caldas', horas: 10 },
      { actividad_id: 'pos', territorial_id: 'Tolima', horas: 10 },
    ]);
    await expect(service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, action))
      .rejects.toThrow('Falta permiso de: posgrado');
    auth.permissions.add(`pta.${permission}.complementarias.territorial.posgrado`);
    expect((await service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, action)).propios)
      .toHaveLength(2);
  });

  it('permite decidir el mismo nivel en varias territoriales con un único permiso de Complementarias', async () => {
    const { service, auth, pta } = await setup([row('approve')], [
      { actividad_id: 'pre', territorial_id: 'Meta', horas: 10 },
      { actividad_id: 'pre', territorial_id: 'Caldas', horas: 10 },
    ]);
    expect((await service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, 'aprobar')).propios)
      .toEqual([{ territorialId: 'Meta', nivel: 'pregrado' }, { territorialId: 'Caldas', nivel: 'pregrado' }]);
    expect((await service.getDecisionPermissions('pta', auth)).allowedComponents).toContain('complementarias_territorial');
  });

  // Regresión del bloqueo sin salida: una complementaria de Decanatura sin
  // territorial capturada ya no entra al componente territorial, así que este
  // alcance no aplica y el PTA se resuelve por su componente normal en vez de
  // quedar trabado con un 403 que nadie —salvo el superusuario— podía levantar.
  it('permite Territorial sin depender de una territorial capturada, conservando el nivel autorizado', async () => {
    const { service, auth, pta } = await setup([row('approve')], [
      { actividad_id: 'pre', horas: 10 },
    ]);
    expect((await service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, 'aprobar')).propios)
      .toEqual([{ territorialId: '', nivel: 'pregrado' }]);
    const ui = await service.getDecisionPermissions('pta', auth);
    expect(ui.allowedComponents).toContain('complementarias_territorial');
  });

  it('la territorial, sede y alcance geográfico del rol no restringen Complementarias', async () => {
    const conSede = (territorial: string) => ({
      ...row('approve'), role_scope: { tipo: 'Filtrado', territorial, cetap: 'Granada', programa: 'APT' },
    });

    const propia = await setup([conSede('Meta')]);
    expect((await propia.service.assertAlcanceTerritorial('complementarias_territorial', propia.pta, propia.auth, 'aprobar')).propios)
      .toEqual([{ territorialId: 'Meta', nivel: 'pregrado' }]);

    const ajena = await setup([conSede('Caldas')]);
    expect((await ajena.service.assertAlcanceTerritorial('complementarias_territorial', ajena.pta, ajena.auth, 'aprobar')).propios)
      .toEqual([{ territorialId: 'Meta', nivel: 'pregrado' }]);
    ajena.auth.territorialIds = ['Caldas'];
    expect((await ajena.service.assertAlcanceTerritorial('complementarias_territorial', ajena.pta, ajena.auth, 'aprobar')).propios)
      .toEqual([{ territorialId: 'Meta', nivel: 'pregrado' }]);
  });

  it('sin asignación permite cualquier territorial, pero no concede otros niveles', async () => {
    const { service, auth, pta } = await setup([{ ...row('approve'), role_scope: null }]);
    auth.territorialIds = [];
    pta.datosEstructurados.complementarias[0].territorial_id = 'Caldas';
    expect((await service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, 'aprobar')).propios).toHaveLength(1);
    pta.datosEstructurados.complementarias[0].actividad_id = 'pos';
    await expect(service.assertAlcanceTerritorial('complementarias_territorial', pta, auth, 'aprobar')).rejects.toThrow();
  });

  it('sin territorial personal no limita el listado por el alcance del rol', async () => {
    const { service, auth } = await setup([row('approve', 'pregrado', 'Meta')]);
    auth.territorialIds = [];
    expect(await service.getDecisionListScope(auth)).toEqual({
      configured: true, territoriales: null, programas: null, cetaps: null,
    });
  });
});
