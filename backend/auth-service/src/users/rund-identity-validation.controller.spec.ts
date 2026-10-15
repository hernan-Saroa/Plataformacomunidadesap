import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { RundIdentityValidationController, RundIdentityValidationService } from './rund-identity-validation.controller';

describe('Prevalidación propietaria de identidad para RUND', () => {
  const consulta = { version: 1, operacionId: '11111111-1111-4111-8111-111111111111', documento: ' 00.123 ', correo: 'prueba@example.test', resolverPorCorreo: false };
  const resultado = { personaId: '22222222-2222-4222-8222-222222222222', usuarioId: null,
    rolDocenteId: '33333333-3333-4333-8333-333333333333', coincidencia: 'documento', conflictoCorreo: false };
  it('usa una única lectura parametrizada, con selección anterior y huella vinculada a operación/resultado', async () => {
    const query = jest.fn().mockResolvedValue([resultado]);
    const actual = await new RundIdentityValidationController(new RundIdentityValidationService({ query } as any)).validar(consulta);
    expect(actual).toEqual({ consulta, resultado, reserva: false, huella: createHash('sha256').update(JSON.stringify([
      1, consulta.operacionId, consulta.documento, consulta.correo, false, resultado.personaId, null, resultado.rolDocenteId, 'documento', false,
    ])).digest('hex') });
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0]; expect(params).toEqual([consulta.documento, consulta.correo, false]);
    expect(sql).toContain("UPPER(code)='DOCENTE' OR UPPER(name)='DOCENTE'");
    expect(sql).toContain("ORDER BY CASE WHEN UPPER(code)='DOCENTE' THEN 0 ELSE 1 END LIMIT 1");
    expect(sql).toContain('owner_id IS NULL'); expect(sql).not.toMatch(/password|INSERT|UPDATE|DELETE|LOCK|nextval|FOR UPDATE|rund\.|academic_work_plan\./i);
  });
  it('ausencia, conflicto y rol faltante son resultados explícitos sin reservar IDs ni declarar escritura aprobada', async () => {
    const resultado = { personaId: null, usuarioId: null, rolDocenteId: null, coincidencia: 'ninguna', conflictoCorreo: true };
    const query = jest.fn().mockResolvedValue([resultado]);
    expect((await new RundIdentityValidationService({ query } as any).validar(consulta)).resultado).toEqual(resultado);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it.each([null, [], {}, { ...consulta, version: 2 }, { ...consulta, operacionId: 'no-uuid' }, { ...consulta, operacionId: null },
    { ...consulta, documento: '' }, { ...consulta, documento: 1 }, { ...consulta, correo: '' }, { ...consulta, correo: null },
    { ...consulta, correo: ' MAYUSCULAS@example.test ' }, { ...consulta, resolverPorCorreo: 'true' },
    { ...consulta, password: 'no-admitido' }, { ...consulta, commit: true }])('rechaza contrato inválido antes de SQL %s', async raw => {
    const query = jest.fn(); await expect(new RundIdentityValidationService({ query } as any).validar(raw)).rejects.toBeInstanceOf(BadRequestException); expect(query).not.toHaveBeenCalled();
  });
  it('los caracteres especiales se transmiten como parámetros sin cambiar documento ni correo', async () => {
    const query = jest.fn().mockResolvedValue([resultado]), raw = { ...consulta, documento: "' OR true --", correo: "' or true --" };
    await new RundIdentityValidationService({ query } as any).validar(raw);
    expect(query.mock.calls[0][1]).toEqual([raw.documento, raw.correo, false]); expect(query.mock.calls[0][0]).not.toContain(raw.documento);
  });
  it('fallo SQL o respuesta ausente no se convierte en prevalidación exitosa', async () => {
    const query = jest.fn().mockRejectedValueOnce(new Error('Auth caído')).mockResolvedValue([]), service = new RundIdentityValidationService({ query } as any);
    await expect(service.validar(consulta)).rejects.toThrow('Auth caído'); await expect(service.validar(consulta)).rejects.toThrow('no confirmó');
  });
  it('repite la consulta aunque se reutilice el ID; no finge una reserva o recibo persistido', async () => {
    const query = jest.fn().mockResolvedValueOnce([resultado]).mockResolvedValueOnce([{ ...resultado, usuarioId: resultado.personaId }]), service = new RundIdentityValidationService({ query } as any);
    const a = await service.validar(consulta), b = await service.validar(consulta); expect(a.huella).not.toBe(b.huella); expect(query).toHaveBeenCalledTimes(2);
  });
});
