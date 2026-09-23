import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PtaService } from './pta.service';
import { PtaController } from './pta.controller';
import { PtaAuthGuard } from './auth/pta-auth.guard';

describe('listado de gestión según componentes y alcance efectivos', () => {
  const territorial = 'academica_territorial';
  const subject = (territorialId: string, sede = 'granada', nivel = 'pregrado') => ({ territorialId, nivel, cetaps: [sede], programas: [] });
  function setup(approve: string[] = [], review: string[] = []) {
    const service = Object.create(PtaService.prototype) as any;
    service.resolveNombrePorSeccionalId = jest.fn().mockResolvedValue(new Map());
    service.resolveNombresSeccionales = jest.fn().mockResolvedValue(['Meta', 'Caldas']);
    service.getTerritorialNivelPairsDelComponente = jest.fn(async p => p.subjects);
    service.getTerritorialScopeSubjects = jest.fn(async p => p.subjects);
    const auth: any = { isSuperUser: false, allowedComponents: approve, allowedReviewSubsecciones: review,
      territorialIds: ['Meta'], cetapIds: ['Granada'],
      allowedNivelesTerritorialAprobar: approve.includes(territorial) ? ['pregrado'] : [],
      allowedNivelesTerritorialRevisar: review.includes(`${territorial}:general`) ? ['pregrado'] : [],
    };
    const rows = [
      { id: 'propio', subjects: [subject('Meta')] },
      { id: 'otra-territorial', subjects: [subject('Caldas')] },
      { id: 'otra-sede', subjects: [subject('Meta', 'lejanias')] },
      { id: 'otro-nivel', subjects: [subject('Meta', 'granada', 'posgrado')] },
      { id: 'solo-investigacion', subjects: [] },
      { id: 'cruce-ajeno', subjects: [subject('Meta', 'lejanias'), subject('Caldas')] },
    ];
    const dtos = rows.map(row => ({ id: row.id,
      componentes_con_datos: row.subjects.length ? [territorial, 'investigacion'] : ['investigacion'],
      subsecciones_con_datos: row.subjects.length ? [`${territorial}:general`, 'investigacion:general'] : ['investigacion:general'],
    }));
    return { service, auth, rows, dtos };
  }

  it.each(['aprobar', 'revisar'])('un especialista de %s solo recibe PTA con docencia de su territorial, sede y nivel', async etapa => {
    const { service, auth, rows, dtos } = setup(etapa === 'aprobar' ? [territorial] : [], etapa === 'revisar' ? [`${territorial}:general`] : []);
    const result = await service.filterGestionPtas(dtos, rows, auth);
    expect(result.map(p => p.id)).toEqual(['propio']);
    expect(result[0].componentes_en_alcance).toEqual([territorial]);
  });

  it('la sede del docente o investigación no hacen visible una docencia ajena', async () => {
    const { service, auth, rows, dtos } = setup([territorial]);
    const result = await service.filterGestionPtas(dtos.map(p => ({ ...p, territorial: 'Meta', cetap: 'Granada' })), rows, auth);
    expect(result.map(p => p.id)).toEqual(['propio']);
  });

  it('sin asignación geográfica muestra todas las territoriales pero solo el nivel autorizado', async () => {
    const { service, auth, rows, dtos } = setup([], [`${territorial}:general`]);
    auth.territorialIds = []; auth.cetapIds = [];
    expect((await service.filterGestionPtas(dtos, rows, auth)).map(p => p.id))
      .toEqual(['propio', 'otra-territorial', 'otra-sede', 'cruce-ajeno']);
  });

  it('un permiso adicional real de investigación sí permite ver su trabajo independiente', async () => {
    const { service, auth, rows, dtos } = setup([territorial, 'investigacion']);
    const result = await service.filterGestionPtas(dtos, rows, auth);
    expect(result).toHaveLength(dtos.length);
    expect(result.find(p => p.id === 'otra-territorial').componentes_en_alcance).toEqual(['investigacion']);
  });

  it('no convierte la revisión de una subsección en acceso a las demás', async () => {
    const { service, auth } = setup([], ['complementarias:docencia']);
    const rows = [{ id: 'docencia' }, { id: 'administrativas' }];
    const dtos = rows.map((p, i) => ({ ...p, componentes_con_datos: ['complementarias'],
      subsecciones_con_datos: [`complementarias:${i ? 'academico_administrativas' : 'docencia'}`] }));
    expect((await service.filterGestionPtas(dtos, rows, auth)).map(p => p.id)).toEqual(['docencia']);
  });

  it('niega por defecto y conserva la consulta de perfiles con permiso general y superusuario', async () => {
    const { service, auth, rows, dtos } = setup();
    auth.permissions = new Set();
    expect(await service.filterGestionPtas(dtos, rows, auth)).toEqual([]);
    auth.permissions.add('pta.backoffice.ver_gestion');
    expect(await service.filterGestionPtas(dtos, rows, auth)).toEqual(dtos);
    auth.permissions.clear();
    auth.approvesAll = true;
    expect(await service.filterGestionPtas(dtos, rows, auth)).toEqual(dtos);
    auth.approvesAll = false;
    auth.isSuperUser = true;
    expect(await service.filterGestionPtas(dtos, rows, auth)).toEqual(dtos);
  });

  it('la ruta de gestión usa el guard y el contexto del servidor', async () => {
    const getAllPTAs = jest.fn().mockResolvedValue([]);
    const controller = new PtaController({ getAllPTAs } as any);
    const auth: any = { allowedComponents: [] };
    expect(Reflect.getMetadata(GUARDS_METADATA, controller.getGestion)).toContain(PtaAuthGuard);
    await controller.getGestion({ periodo: '2026-2', isSuperUser: true }, { ptaAuth: auth } as any);
    expect(getAllPTAs).toHaveBeenCalledWith({ periodo: '2026-2', isSuperUser: true }, auth);
  });
});
