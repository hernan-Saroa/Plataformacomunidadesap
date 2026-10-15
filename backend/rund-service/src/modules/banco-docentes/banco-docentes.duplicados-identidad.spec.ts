import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';

const person = '11111111-1111-4111-8111-111111111111';
const items = [{ personaId: person, documento: '001.23', nombre: 'NOMBRE', fechaNacimiento: '1980-01-17' }];
function build() {
  const s = Object.create(BancoDocentesService.prototype) as any;
  const manager = { query: jest.fn(async (sql: string, _params?: any[]): Promise<any[]> => {
    if (sql.startsWith('SET TRANSACTION')) return [];
    if (sql.includes('SELECT DISTINCT')) return [{ persona_id: person }];
    return [{ id: 'DOC-TEXTUAL', documento: '001.23' }];
  }) };
  s.dataSource = { transaction: jest.fn(async (_isolation, run) => run(manager)), query: jest.fn().mockResolvedValue([]) };
  s.identities = { coincidenciasUnicidad: jest.fn().mockResolvedValue(items), coincidenciasNombreFecha: jest.fn().mockResolvedValue(items) };
  return { s, manager };
}
describe('Diagnósticos RUND con coincidencias del propietario Auth', () => {
  it('sin criterios retorna vacío antes de abrir transacción o consultar Auth', async () => {
    const { s } = build(); await expect(s.validarUnicidad('', '')).resolves.toEqual({ duplicados: [] });
    expect(s.dataSource.transaction).not.toHaveBeenCalled(); expect(s.identities.coincidenciasUnicidad).not.toHaveBeenCalled();
  });
  it('unicidad mantiene snapshot nativo de solo lectura y combina documento/correo con OR y exclusión', async () => {
    const { s, manager } = build(); await s.validarUnicidad(' 001.23 ', 'PERSONA@ESAP.EDU.CO', 'DOC-EXCLUIR');
    expect(s.dataSource.transaction).toHaveBeenCalledWith('REPEATABLE READ', expect.any(Function));
    expect(manager.query).toHaveBeenNthCalledWith(1, 'SET TRANSACTION READ ONLY');
    expect(s.identities.coincidenciasUnicidad).toHaveBeenCalledWith(' 001.23 ', [person]);
    const [sql, params] = manager.query.mock.calls[2];
    expect(sql).toContain("d.estado='ACTIVO'"); expect(sql).toContain(' OR '); expect(sql).toContain('d.id<>$4');
    expect(sql).not.toMatch(/auth\.|LOWER\(d\./);
    expect(params).toEqual([JSON.stringify(items), ' 001.23 ', 'persona@esap.edu.co', 'DOC-EXCLUIR']);
  });
  it('correo sin perfiles nativos no necesita confirmar identidad ajena', async () => {
    const { s, manager } = build(); manager.query.mockResolvedValue([]);
    await expect(s.validarUnicidad('', 'ausente@example.test')).resolves.toEqual({ duplicados: [] });
    expect(s.identities.coincidenciasUnicidad).not.toHaveBeenCalled();
  });
  it('documento sin correo busca todas las identidades normalizadas sin exigir usuario/rol', async () => {
    const { s, manager } = build(); await s.validarUnicidad('00123', '');
    expect(s.identities.coincidenciasUnicidad).toHaveBeenCalledWith('00123', []);
    expect(manager.query).toHaveBeenCalledTimes(2); // SET y selección nativa final.
  });
  it('ausencia confirmada de identidades no ejecuta selección nativa final', async () => {
    const { s, manager } = build(); s.identities.coincidenciasUnicidad.mockResolvedValue([]);
    await expect(s.validarUnicidad('00123', '')).resolves.toEqual({ duplicados: [] }); expect(manager.query).toHaveBeenCalledTimes(1);
  });
  it('fallo del propietario no se convierte en unicidad confirmada', async () => {
    const { s, manager } = build(); s.identities.coincidenciasUnicidad.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.validarUnicidad('00123', 'persona@example.test')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(manager.query).toHaveBeenCalledTimes(2); expect(s.dataSource.query).not.toHaveBeenCalled();
  });
  it.each([['', new Date('1980-01-17')], ['NOMBRE', null]])('nombre/fecha incompletos no consultan al propietario', async (name, date) => {
    const { s } = build(); await expect(s.detectarPosibleDuplicado(name, date)).resolves.toEqual({ posiblesDuplicados: [] });
    expect(s.identities.coincidenciasNombreFecha).not.toHaveBeenCalled();
  });
  it('nombre/fecha conserva UTC y normalización anterior sin aproximar coincidencias', async () => {
    const { s } = build(); await s.detectarPosibleDuplicado('  nombre  ', new Date('1980-01-16T20:00:00-05:00'));
    expect(s.identities.coincidenciasNombreFecha).toHaveBeenCalledWith('NOMBRE', '1980-01-17');
    const [sql, params] = s.dataSource.query.mock.calls[0];
    expect(sql).not.toMatch(/auth\.|ILIKE|similarity/); expect(sql).toContain('UPPER(TRIM(p.nombre)) = $2');
    expect(params).toEqual([JSON.stringify(items), 'NOMBRE', '1980-01-17']);
  });
  it('fecha inválida devuelve 400 antes de realizar llamadas remotas', async () => {
    const { s } = build(); await expect(s.detectarPosibleDuplicado('NOMBRE', new Date('invalida'))).rejects.toBeInstanceOf(BadRequestException);
    expect(s.identities.coincidenciasNombreFecha).not.toHaveBeenCalled(); expect(s.dataSource.query).not.toHaveBeenCalled();
  });
  it('nombre/fecha sin identidades confirmadas conserva vacío explícito', async () => {
    const { s } = build(); s.identities.coincidenciasNombreFecha.mockResolvedValue([]);
    await expect(s.detectarPosibleDuplicado('NOMBRE', new Date('1980-01-17'))).resolves.toEqual({ posiblesDuplicados: [] });
    expect(s.dataSource.query).not.toHaveBeenCalled();
  });
  it('nombre/fecha falla antes de SQL si Auth no confirma coincidencias', async () => {
    const { s } = build(); s.identities.coincidenciasNombreFecha.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.detectarPosibleDuplicado('NOMBRE', new Date('1980-01-17'))).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s.dataSource.query).not.toHaveBeenCalled();
  });
});
