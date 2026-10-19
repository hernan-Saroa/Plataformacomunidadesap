import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RundCarpetaHistoricoController, RundCarpetaHistoricoService } from './rund-carpeta-historico.module';

const persona = '11111111-1111-4111-8111-111111111111';
const otra = '22222222-2222-4222-8222-222222222222';
const build = (rows: any = []) => {
  const query = jest.fn().mockResolvedValue(rows);
  const service = new RundCarpetaHistoricoService({ query } as any);
  return { query, service, controller: new RundCarpetaHistoricoController(service) };
};

describe('API interna de carpeta histórica de PTA', () => {
  it('soportes por lote conserva la selección anterior y parametriza los IDs', async () => {
    const items = [{ persona_id: persona, id: 's1', estado: 'APROBADO' }];
    const { query, controller } = build(items);
    await expect(controller.soportes({ personaIds: [persona, otra] })).resolves.toEqual({ consulta: { personaIds: [persona, otra] }, items, total: 1 });
    const [sql, params] = query.mock.calls[0];
    expect(params).toEqual([[persona, otra]]);
    expect(sql).toContain(`NULLIF(TRIM(s.nombre_archivo),'') IS NOT NULL OR NULLIF(TRIM(s.documento_carpeta_id),'') IS NOT NULL`);
    expect(sql).not.toMatch(/INSERT|UPDATE|DELETE|auth\.|rund\./);
  });

  it.each([null, [], {}, { personaIds: [] }, { personaIds: ['x'] }, { personaIds: [persona, persona.toUpperCase()] },
    { personaIds: Array(501).fill(persona) }, { personaIds: [persona], extra: 1 }])('soportes rechaza consulta inválida sin SQL %j', async raw => {
    const { query, service } = build();
    await expect(service.soportesPorPersonas(raw)).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it('perfiles conserva orden y tope de 201 filas para detectar listas incompletas', async () => {
    const { query, service } = build([{ id: 'p1' }]);
    await expect(service.perfilesPorPersona(persona)).resolves.toEqual({ items: [{ id: 'p1' }], total: 1 });
    expect(query.mock.calls[0][0]).toContain('ORDER BY "periodoCarga" DESC NULLS LAST, id LIMIT 201');
  });

  it('persona de soporte devuelve la dueña y 404 cuando PTA confirma ausencia', async () => {
    const found = build([{ persona_id: persona }]);
    await expect(found.service.personaDeSoporte(otra)).resolves.toEqual({ personaId: persona });
    await expect(build([]).service.personaDeSoporte(otra)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('un fallo SQL no se convierte en ausencia', async () => {
    const { query, service } = build();
    query.mockRejectedValue(new Error('fuente caída'));
    await expect(service.perfilesPorPersona(persona)).rejects.toThrow('fuente caída');
    await expect(service.verificarOriginal({ url: '/u', recursoId: 'r', endpoints: ['E'] })).rejects.toThrow('fuente caída');
  });

  it('verifica original por soporte y luego por marca permanente', async () => {
    const porSoporte = build([{ id: 's1' }]);
    await expect(porSoporte.service.verificarOriginal({ url: '/u', recursoId: 'r', endpoints: ['E'] })).resolves.toEqual({ esOriginalHistorico: true });
    expect(porSoporte.query).toHaveBeenCalledTimes(1);
    const { query, service } = build();
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'marca' }]);
    await expect(service.verificarOriginal({ url: '/u', recursoId: 'r', endpoints: ['E'] })).resolves.toEqual({ esOriginalHistorico: true });
    expect(query.mock.calls[1][1]).toEqual(['r', ['E']]);
    query.mockResolvedValue([]);
    await expect(service.verificarOriginal({ url: '/u', recursoId: 'r', endpoints: ['E'] })).resolves.toEqual({ esOriginalHistorico: false });
  });

  it.each([null, {}, { url: '/u', recursoId: 'r' }, { url: '', recursoId: 'r', endpoints: [] }, { url: '/u', recursoId: 'r', endpoints: [1] }])(
    'originales rechaza consulta inválida sin SQL %j', async raw => {
      const { query, service } = build();
      await expect(service.verificarOriginal(raw)).rejects.toBeInstanceOf(BadRequestException);
      expect(query).not.toHaveBeenCalled();
    });

  it('registra el acceso con un ID propio y confirma el registro', async () => {
    const { query, service } = build();
    const acceso = { actorId: 'a', roles: ['ADMIN'], endpoint: 'E', recursoId: 'r', campos: ['C'], resultado: 'DENEGADO' };
    await expect(service.registrarAcceso(acceso)).resolves.toEqual({ registrado: true });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('INSERT INTO academic_work_plan."RundAccesoDatosLog"');
    expect(params.slice(1)).toEqual(['a', ['ADMIN'], 'E', 'r', ['C'], 'DENEGADO']);
    expect(params[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each([null, {}, { actorId: 'a', roles: [], endpoint: 'E', recursoId: 'r', campos: [], resultado: 'OTRO' },
    { actorId: '', roles: [], endpoint: 'E', recursoId: 'r', campos: [], resultado: 'COMPLETO' },
    { actorId: 'a', roles: 'x', endpoint: 'E', recursoId: 'r', campos: [], resultado: 'COMPLETO' }])('acceso inválido no escribe %j', async raw => {
    const { query, service } = build();
    await expect(service.registrarAcceso(raw)).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });
});
