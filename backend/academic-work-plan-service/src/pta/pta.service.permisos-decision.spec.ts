import { PtaService } from './pta.service';

describe('acciones que puede ofrecer el formulario PTA', () => {
  function setup() {
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue({ id: 'pta-1' }) };
    service.getTerritorialNivelPairsDelComponente = jest.fn().mockResolvedValue([
      { territorialId: 'A', nivel: 'pregrado' }, { territorialId: 'A', nivel: 'posgrado' }, { territorialId: 'B', nivel: 'pregrado' },
    ]);
    service.resolveNombrePorSeccionalId = jest.fn().mockResolvedValue(new Map([['A', 'Nariño'], ['B', 'Meta']]));
    service.resolveNombresSeccionales = jest.fn().mockResolvedValue(['Nariño', 'Meta']);
    const auth: any = { isSuperUser: false, allowedComponents: ['academica_territorial', 'ext_capacitacion'],
      allowedReviewSubsecciones: ['academica_territorial:general'], territorialIds: ['A'],
      allowedNivelesTerritorialAprobar: ['pregrado'], allowedNivelesTerritorialRevisar: ['posgrado'] };
    return { service, auth };
  }

  it('la interfaz recibe exactamente sus territoriales y niveles para cada etapa', async () => {
    const { service, auth } = setup();
    const result = await service.getDecisionPermissions('pta-1', auth);
    expect(result.territorial.aprobar.pairs).toEqual([{ territorialId: 'A', nivel: 'pregrado' }]);
    expect(result.territorial.revisar.pairs).toEqual([{ territorialId: 'A', nivel: 'posgrado' }]);
    expect(result.allowedComponents).toContain('ext_capacitacion');
  });

  it('tener permiso sin territorial no habilita el formulario territorial y explica el motivo', async () => {
    const { service, auth } = setup();
    auth.territorialIds = [];
    const result = await service.getDecisionPermissions('pta-1', auth);
    expect(result.allowedComponents).toEqual(['ext_capacitacion']);
    expect(result.allowedReviewSubsecciones).toEqual([]);
    expect(result.territorial.aprobar.reason).toContain('No tiene una territorial asignada');
    expect(auth.allowedComponents).toContain('academica_territorial');
  });

  it('no habilita territoriales ajenas y conserva la excepción real del superusuario', async () => {
    const { service, auth } = setup();
    auth.territorialIds = ['C'];
    expect((await service.getDecisionPermissions('pta-1', auth)).allowedComponents).not.toContain('academica_territorial');
    auth.isSuperUser = true;
    expect((await service.getDecisionPermissions('pta-1', auth)).territorial.aprobar.pairs).toHaveLength(3);
  });

  it('no habilita acciones ni busca alcance cuando faltan los permisos de componente', async () => {
    const { service, auth } = setup();
    auth.allowedComponents = [];
    auth.allowedReviewSubsecciones = [];
    expect((await service.getDecisionPermissions('pta-1', auth)).allowedComponents).toEqual([]);
    expect(service.getTerritorialNivelPairsDelComponente).not.toHaveBeenCalled();
  });
});
