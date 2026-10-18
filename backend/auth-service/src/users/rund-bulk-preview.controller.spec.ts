import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA, HEADERS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RundBulkPreviewController, RundBulkPreviewService } from './rund-bulk-preview.controller';
import { RundIdentityGuard } from './rund-identity.controller';

const consulta = () => ({ version: 1, documento: '000.123456', correo: 'ficticio@example.test' });
const absence = () => ({ persona: null, usuario: null, rolDocenteDisponible: true, conflictoCorreo: false });
function setup() { const query = jest.fn(async (..._args: any[]): Promise<any[]> => [absence()]); return { query, service: new RundBulkPreviewService({ query } as any) }; }
describe('Lectura Auth propietaria para preview masivo', () => {
  it('confirma ausencia explícita en una sentencia y sin generar o reservar IDs', async () => {
    const s = setup(), value = await s.service.consultar(consulta());
    expect(value).toEqual({ consulta: consulta(), ...absence(), reserva: false }); expect(s.query).toHaveBeenCalledTimes(1);
    const [sql, params] = s.query.mock.calls[0] as any;
    expect(params).toEqual(['000.123456', 'ficticio@example.test']);
    expect(sql).toContain('BTRIM(num_identificacion::text)'); expect(sql).toContain('jsonb_build_object');
    expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|LOCK|nextval|password_hash|password_temp|reset_token)\b/i);
  });
  it('devuelve únicamente el DTO público mínimo y no otras columnas del manager', async () => {
    const s = setup(); s.query.mockResolvedValue([{ ...absence(), privado: 'NO PUBLICAR' }] as any);
    const result = await s.service.consultar(consulta()); expect(Object.keys(result).sort()).toEqual([
      'conflictoCorreo', 'consulta', 'persona', 'reserva', 'rolDocenteDisponible', 'usuario']); expect(result).not.toHaveProperty('privado');
  });
  it('copia el echo antes de esperar la base', async () => {
    const s = setup(); let done!: (value: any) => void;
    s.query.mockImplementation(() => new Promise(resolve => { done = resolve; }));
    const input = consulta(), pending = s.service.consultar(input); input.documento = 'CAMBIADO'; done([absence()]);
    expect((await pending).consulta.documento).toBe('000.123456');
  });
  it.each([null, [], {}, { ...consulta(), actorId: 'NO' }, { ...consulta(), version: 2 },
    { ...consulta(), documento: '' }, { ...consulta(), documento: 123 }, { ...consulta(), documento: ' \t ' },
    { ...consulta(), documento: 'abc\0def' }, { ...consulta(), correo: 'MAYUSCULA@example.test' },
    { ...consulta(), correo: ' email@example.test' }, { ...consulta(), correo: null }, { ...consulta(), correo: '' },
    { ...consulta(), correo: 'a\0b' }, { version: 1, documento: 'a' }, { ...consulta(), resolverPorCorreo: true },
  ])('consulta inválida %j no toca SQL', async raw => {
    const s = setup(); await expect(s.service.consultar(raw)).rejects.toBeInstanceOf(BadRequestException); expect(s.query).not.toHaveBeenCalled();
  });
  it('conserva correos/documentos no convencionales admitidos por la normalización del Excel', async () => {
    const s = setup(); await expect(s.service.consultar({ version: 1, documento: 'EX-123', correo: 'reportado-sin-dominio' })).resolves.toBeTruthy();
  });
  it('error SQL privado falla genéricamente y no confirma ausencia', async () => {
    const s = setup(); s.query.mockRejectedValue(new Error('SQL PRIVADO'));
    await expect(s.service.consultar(consulta())).rejects.toThrow(/^No fue posible consultar la identidad del preview en Auth\.$/);
  });
  it.each([[], [{}], [{ ...absence(), rolDocenteDisponible: undefined }], [{ ...absence(), conflictoCorreo: null }]].map(value => [value]))(
    'respuesta SQL incompleta %j falla explícitamente', async response => {
      const s = setup(); s.query.mockResolvedValue(response as any);
      await expect(s.service.consultar(consulta())).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  it('la ruta conserva token interno, HTTP 200 y no-store sin activar escritores', async () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, RundBulkPreviewController)).toContain(RundIdentityGuard);
    expect(Reflect.getMetadata(PATH_METADATA, RundBulkPreviewController)).toBe('internal/rund/v1/personas/previsualizacion-masiva');
    const method = RundBulkPreviewController.prototype.consultar;
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, method)).toBe(200);
    expect(Reflect.getMetadata(HEADERS_METADATA, method)).toContainEqual({ name: 'Cache-Control', value: 'private, no-store' });
    const s = setup(); expect(await new RundBulkPreviewController(s.service).consultar(consulta())).toEqual({ consulta: consulta(), ...absence(), reserva: false });
  });
});
