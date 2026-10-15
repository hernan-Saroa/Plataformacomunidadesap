import { BadRequestException, ConflictException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { RundCatalogosController, RundCatalogosGuard, RundCatalogosService, RundNombreHistoricoController, RundPlanesHistoricosController } from './rund-catalogos.module';

const context = (headers: Record<string, unknown>) => ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as any;

describe('Planes históricos firmes para RUND', () => {
  it.each([{ docenteId: ' PERFIL LEGACY ' }, { periodo: '2099-1' }, { docenteId: 'perfil', periodo: '2099-1' }])('preserva filtros exactos y selección sin límite %s', async consulta => {
    const items = [{ id: 'plan', docenteId: 'perfil', periodo: '2099-1', estado: 'EN_FIRME', datosEstructurados: { asignaturas: [null, { horas: '0' }] } }];
    const query = jest.fn().mockResolvedValue(items), service = new RundCatalogosService({ query } as any);
    await expect(new RundPlanesHistoricosController(service).historial(consulta)).resolves.toEqual({ consulta, items, total: 1 });
    const [sql, params] = query.mock.calls[0];
    expect(params).toEqual([['APROBADO', 'APROBADO_DEF', 'EN_FIRME', 'RADICADO', 'EN_EJECUCION', 'FINALIZADO', 'TERMINADO'],
      ...('periodo' in consulta ? [consulta.periodo] : []), ...('docenteId' in consulta ? [consulta.docenteId] : [])]);
    expect(sql).toContain('WHERE estado=ANY($1::text[])'); expect(sql).toContain('ORDER BY periodo DESC');
    expect(sql).toContain(`jsonb_build_object('asignaturas',"datosEstructurados"->'asignaturas')`);
    expect(sql).not.toMatch(/LIMIT|OFFSET|auth\.|rund\.|JOIN|INSERT|UPDATE|DELETE/);
  });
  it.each([null, [], {}, { docenteId: '' }, { periodo: null }, { docenteId: 1 }, { periodo: [] },
    { periodo: '2026-1', estado: 'BORRADOR' }, { docenteId: 'x', extra: true }])('rechaza consulta inválida sin SQL %s', async raw => {
    const query = jest.fn(); await expect(new RundCatalogosService({ query } as any).planesFirmes(raw)).rejects.toBeInstanceOf(BadRequestException); expect(query).not.toHaveBeenCalled();
  });
  it('parametriza caracteres especiales sin modificar IDs/períodos históricos', async () => {
    const query = jest.fn().mockResolvedValue([]), consulta = { docenteId: "' OR true --", periodo: ' 2099-X ' };
    await new RundCatalogosService({ query } as any).planesFirmes(consulta);
    expect(query.mock.calls[0][1].slice(1)).toEqual([consulta.periodo, consulta.docenteId]); expect(query.mock.calls[0][0]).not.toContain(consulta.docenteId);
  });
  it('vacío confirma ausencia y fallo SQL no la suplanta', async () => {
    const query = jest.fn().mockResolvedValue([]), consulta = { periodo: '2099-1' }, service = new RundCatalogosService({ query } as any);
    await expect(service.planesFirmes(consulta)).resolves.toEqual({ consulta, items: [], total: 0 });
    query.mockRejectedValue(new Error('fuente caída')); await expect(service.planesFirmes(consulta)).rejects.toThrow('fuente caída');
  });
});
describe('Catálogo interno territorial PTA', () => {
  const personaId = '11111111-1111-4111-8111-111111111111';
  it('programas conserva bigint textual, nombre crudo, inactivos y filtro de soft delete del repositorio', async () => {
    const consulta = { programaIds: ['9007199254740993', '+001'] }, items = [{ id: '9007199254740993', nombre: ' Histórico ' }];
    const query = jest.fn().mockResolvedValue(items), service = new RundCatalogosService({ query } as any);
    await expect(new RundCatalogosController(service).programas(consulta)).resolves.toEqual({ consulta, items, total: 1 });
    expect(query.mock.calls[0][1]).toEqual([consulta.programaIds]);
    expect(query.mock.calls[0][0]).toContain('id::text AS id,nombre');
    expect(query.mock.calls[0][0]).toContain('id=ANY($1::bigint[]) AND deleted_at IS NULL');
    expect(query.mock.calls[0][0]).not.toMatch(/activo|auth\.|rund\.|LIMIT|INSERT|UPDATE|DELETE/);
  });
  it('programas ausentes confirman vacío y el error de fuente no lo suplanta', async () => {
    const consulta = { programaIds: ['1'] }, query = jest.fn().mockResolvedValue([]), service = new RundCatalogosService({ query } as any);
    await expect(service.programasHistoricos(consulta)).resolves.toEqual({ consulta, items: [], total: 0 });
    query.mockRejectedValue(new Error('fuente caída')); await expect(service.programasHistoricos(consulta)).rejects.toThrow('fuente caída');
  });
  it.each([null, [], {}, { programaIds: [1] }, { programaIds: ['1', '1'] }, { programaIds: ['no-id'] },
    { programaIds: ['9223372036854775808'] }, { programaIds: ['-9223372036854775809'] },
    { programaIds: Array(501).fill('1') }])('programas rechaza consulta inválida antes de SQL %s', async raw => {
    const query = jest.fn(); await expect(new RundCatalogosService({ query } as any).programasHistoricos(raw)).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });
  it('programas conserva los extremos int8 y los alias numéricos aceptados por PostgreSQL', async () => {
    const query = jest.fn().mockResolvedValue([]), consulta = { programaIds: ['-9223372036854775808', '9223372036854775807', '0001', '+1', '-0'] };
    await new RundCatalogosService({ query } as any).programasHistoricos(consulta); expect(query.mock.calls[0][1]).toEqual([consulta.programaIds]);
  });
  it('identidad histórica por lote conserva nombre/documento crudos y consulta solo Persona de PTA', async () => {
    const items = [{ personaId, primer_nombre: ' José ', segundo_nombre: null, primer_apellido: '', segundo_apellido: 'Muñoz', identificacion: ' 00.123 ' }];
    const query = jest.fn().mockResolvedValue(items), consulta = { personaIds: [personaId] };
    const controller = new RundNombreHistoricoController(new RundCatalogosService({ query } as any));
    await expect(controller.identidades(consulta)).resolves.toEqual({ consulta, items, total: 1 });
    expect(query.mock.calls[0][1]).toEqual([[personaId]]);
    expect(query.mock.calls[0][0]).toContain('identificacion FROM academic_work_plan."Persona" WHERE id=ANY($1::uuid[])');
    expect(query.mock.calls[0][0]).not.toMatch(/auth\.|rund\.|LIMIT|is_active|INSERT|UPDATE|DELETE/);
  });
  it('lote sin coincidencias confirma vacío y no oculta errores del propietario', async () => {
    const query = jest.fn().mockResolvedValue([]), service = new RundCatalogosService({ query } as any), consulta = { personaIds: [personaId] };
    await expect(service.identidadesHistoricas(consulta)).resolves.toEqual({ consulta, items: [], total: 0 });
    query.mockRejectedValue(new Error('fuente caída'));
    await expect(service.identidadesHistoricas(consulta)).rejects.toThrow('fuente caída');
  });
  it.each([null, [], {}, { personaIds: 'id' }, { personaIds: [null] }, { personaIds: ['texto'] },
    { personaIds: [personaId, personaId] }, { personaIds: Array(501).fill(personaId) }])('rechaza lote inválido antes de SQL %s', async consulta => {
    const query = jest.fn(), service = new RundCatalogosService({ query } as any);
    await expect(service.identidadesHistoricas(consulta)).rejects.toBeInstanceOf(BadRequestException); expect(query).not.toHaveBeenCalled();
  });
  it('nombre histórico publica las cuatro partes originales sin consultar Auth ni modificar datos', async () => {
    const personaId = '11111111-1111-4111-8111-111111111111';
    const items = [{ personaId, primer_nombre: ' José ', segundo_nombre: null, primer_apellido: 'Muñoz', segundo_apellido: '' }];
    const query = jest.fn().mockResolvedValue(items);
    const controller = new RundNombreHistoricoController(new RundCatalogosService({ query } as any));
    await expect(controller.nombre(personaId)).resolves.toEqual({ items, total: 1 });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM academic_work_plan."Persona" WHERE id=$1'), [personaId]);
    expect(query.mock.calls[0][0]).not.toMatch(/INSERT|UPDATE|DELETE|auth\.|rund\./);
  });

  it('ausencia histórica es explícita y el fallo de la fuente no se transforma en ausencia', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new RundCatalogosService({ query } as any);
    await expect(service.nombreHistorico('persona')).resolves.toEqual({ items: [], total: 0 });
    query.mockRejectedValue(new Error('fuente no disponible'));
    await expect(service.nombreHistorico('persona')).rejects.toThrow('fuente no disponible');
  });
  it('publica solo el período en curso sin sustituirlo por planeación o concertación', async () => {
    const items = [{ codigo: '2026-2', estado: 'en_curso' }];
    const query = jest.fn().mockResolvedValue(items);
    const controller = new RundCatalogosController(new RundCatalogosService({ query } as any));
    await expect(controller.periodoActivo()).resolves.toEqual({ items, total: 1 });
    expect(query.mock.calls[0][0]).toContain("WHERE estado='en_curso' LIMIT 2");
    expect(query.mock.calls[0][0]).not.toMatch(/INSERT|UPDATE|DELETE|auth\.|rund\./);
  });

  it('sin período en curso publica ausencia confirmada, sin usar fecha del servidor', async () => {
    const query = jest.fn().mockResolvedValue([]);
    await expect(new RundCatalogosService({ query } as any).periodoActivo()).resolves.toEqual({ items: [], total: 0 });
  });

  it('varios períodos activos producen conflicto antes de asignar uno arbitrario', async () => {
    const query = jest.fn().mockResolvedValue([{ codigo: '2026-1', estado: 'en_curso' }, { codigo: '2026-2', estado: 'en_curso' }]);
    await expect(new RundCatalogosService({ query } as any).periodoActivo()).rejects.toBeInstanceOf(ConflictException);
  });

  it('un fallo SQL de períodos no se publica como ausencia confirmada', async () => {
    const query = jest.fn().mockRejectedValue(new Error('fuente no disponible'));
    await expect(new RundCatalogosService({ query } as any).periodoActivo()).rejects.toThrow('fuente no disponible');
  });
  it('mantiene código exacto y filas históricas sin filtro de activos o período', async () => {
    const items = [{ codigo: '001', nombre: 'Histórica' }];
    const query = jest.fn().mockResolvedValue(items);
    const controller = new RundCatalogosController(new RundCatalogosService({ query } as any));
    await expect(controller.territoriales()).resolves.toEqual({ items, total: 1 });
    expect(query.mock.calls[0][0]).toContain('FROM academic_work_plan.direccion_territorial');
    expect(query.mock.calls[0][0]).not.toMatch(/WHERE|auth\.|rund\./);
  });

  it('vacío es explícito y un fallo SQL no se oculta como lista vacía', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new RundCatalogosService({ query } as any);
    await expect(service.territoriales()).resolves.toEqual({ items: [], total: 0 });
    query.mockRejectedValue(new Error('base no disponible'));
    await expect(service.territoriales()).rejects.toThrow('base no disponible');
  });

  it('acepta la credencial configurada', () => {
    const guard = new RundCatalogosGuard({ get: () => 'interno-ficticio' } as any);
    expect(guard.canActivate(context({ 'x-internal-service-token': 'interno-ficticio' }))).toBe(true);
  });

  it.each([{}, { authorization: 'Bearer jwt' }, { 'x-internal-service-token': '' },
    { 'x-internal-service-token': 'otro' }, { 'x-internal-service-token': ['interno-ficticio'] }])('rechaza acceso sin token válido %s', headers => {
    const guard = new RundCatalogosGuard({ get: () => 'interno-ficticio' } as any);
    expect(() => guard.canActivate(context(headers))).toThrow(UnauthorizedException);
  });

  it.each([undefined, '', '   '])('sin credencial configurada no recurre a JWT_SECRET', token => {
    const guard = new RundCatalogosGuard({ get: () => token } as any);
    expect(() => guard.canActivate(context({}))).toThrow(ServiceUnavailableException);
  });
});
