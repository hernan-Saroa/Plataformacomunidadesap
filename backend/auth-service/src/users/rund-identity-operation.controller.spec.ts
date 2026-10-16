import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RundIdentityOperationController, RundIdentityOperationService } from './rund-identity-operation.controller';

describe('Recibo de intención RUND en Auth', () => {
  const id = 'abcdef00-1111-4111-8111-111111111111', hash = 'a'.repeat(64);
  const row = { operacionId: id, version: 1, huellaComando: hash, estado: 'REGISTRADA', registradaEn: '2026-10-15T00:00:00.000Z', canceladaEn: null };
  const body = { version: 1, operacionId: id, huellaComando: hash };
  it('registra solo metadatos sin tocar identidad ni devolver un éxito de aplicación', async () => {
    const query = jest.fn().mockResolvedValue([row]);
    expect(await new RundIdentityOperationController(new RundIdentityOperationService({ query } as any)).registrar(body)).toEqual({ operacion: { ...row, identidadAplicada: false } });
    expect(query).toHaveBeenCalledTimes(1); expect(query.mock.calls[0][1]).toEqual([id, hash]);
    expect(query.mock.calls[0][0]).toContain('ON CONFLICT (operacion_id) DO NOTHING');
    expect(query.mock.calls[0][0]).not.toMatch(/auth\.personas|auth\."user"|auth\.user_roles|nextval|password/);
  });
  it('reintenta sin actualizar timestamps y devuelve el recibo incluso si está cancelado', async () => {
    const cancelled = { ...row, estado: 'CANCELADA', canceladaEn: row.registradaEn };
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([cancelled]);
    const result = await new RundIdentityOperationService({ query } as any).registrar(body);
    expect(result.operacion.estado).toBe('CANCELADA'); expect(query.mock.calls.every(([sql]) => !sql.includes('DO UPDATE'))).toBe(true);
  });
  it('reutilizar ID con otro hash conserva el recibo y devuelve 409', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([row]);
    await expect(new RundIdentityOperationService({ query } as any).registrar({ ...body, huellaComando: 'b'.repeat(64) })).rejects.toBeInstanceOf(ConflictException);
  });
  it.each([null, [], {}, { ...body, version: 2 }, { ...body, operacionId: 'no-id' }, { ...body, huellaComando: 'A'.repeat(64) },
    { ...body, huellaComando: 'a' }, { ...body, password: 'no-admitido' }])('registro inválido no consulta la base %s', async raw => {
    const query = jest.fn(); await expect(new RundIdentityOperationService({ query } as any).registrar(raw)).rejects.toBeInstanceOf(BadRequestException); expect(query).not.toHaveBeenCalled();
  });
  it('la ausencia se confirma con echo y null, sin usar HTTP 404 como ausencia de contrato', async () => {
    const query = jest.fn().mockResolvedValue([]);
    expect(await new RundIdentityOperationService({ query } as any).consultar(id.toUpperCase())).toEqual({ consulta: { operacionId: id }, encontrada: false, operacion: null });
  });
  it('cancelar actualiza solo estado registrado y comprueba la huella en el UPDATE', async () => {
    const query = jest.fn().mockResolvedValue([{ ...row, estado: 'CANCELADA', canceladaEn: row.registradaEn }]);
    expect((await new RundIdentityOperationService({ query } as any).cancelar(id, { huellaComando: hash })).operacion.estado).toBe('CANCELADA');
    expect(query.mock.calls[0][0]).toContain("huella_comando=$2 AND estado='REGISTRADA'");
  });
  it('cancelación repetida devuelve el mismo recibo sin cambiar su fecha', async () => {
    const cancelled = { ...row, estado: 'CANCELADA', canceladaEn: row.registradaEn };
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([cancelled]);
    expect((await new RundIdentityOperationService({ query } as any).cancelar(id, { huellaComando: hash })).operacion).toEqual({ ...cancelled, identidadAplicada: false });
  });
  it.each([null, {}, { huellaComando: 'a' }, { huellaComando: hash, extra: true }])('cancelación inválida no escribe %s', async raw => {
    const query = jest.fn(); await expect(new RundIdentityOperationService({ query } as any).cancelar(id, raw)).rejects.toBeInstanceOf(BadRequestException); expect(query).not.toHaveBeenCalled();
  });
  it('cancelar inexistente o con hash diferente no declara éxito', async () => {
    const query = jest.fn().mockResolvedValue([]), service = new RundIdentityOperationService({ query } as any);
    await expect(service.cancelar(id, { huellaComando: hash })).rejects.toBeInstanceOf(NotFoundException);
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([row]);
    await expect(service.cancelar(id, { huellaComando: 'b'.repeat(64) })).rejects.toBeInstanceOf(ConflictException);
  });
  it('fallo de SQL/tabla ausente no se confirma como ausencia ni genera un recibo en memoria', async () => {
    const query = jest.fn().mockRejectedValue(new Error('tabla ausente')), service = new RundIdentityOperationService({ query } as any);
    await expect(service.consultar(id)).rejects.toThrow('tabla ausente'); await expect(service.registrar(body)).rejects.toThrow('tabla ausente');
  });
});
