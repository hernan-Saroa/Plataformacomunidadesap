import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { RundIdentityCorrectionController, RundIdentityCorrectionService, correccionIdentidad, huellaCorreccion } from './rund-identity-correction.controller';

const op = '11111111-1111-4111-8111-111111111111';
const persona = '22222222-2222-4222-8222-222222222222';
const sugerencia = '33333333-3333-4333-8333-333333333333';
const valid = { version: 1, operacionId: op, personaId: persona, campo: 'documentNumber', valorPrevio: '1000000001', valorNuevo: '1000000002', actorId: 'actor-1', sugerenciaId: sugerencia };
// Mismo vector que el spec del consumidor (rund-service): si cambia el orden o el formato, ambos fallan.
const VECTOR = '570551b11e1f5807637ca307ff724495265a688e5e722d5a40a96ced9ccce2b5';

describe('Corrección de identidad RUND en Auth: contrato', () => {
  it('la huella coincide con el vector compartido con el consumidor', () => {
    expect(huellaCorreccion(correccionIdentidad(valid))).toBe(VECTOR);
  });
  it('normaliza IDs a minúsculas y conserva el orden canónico', () => {
    const c = correccionIdentidad({ ...valid, operacionId: op.toUpperCase(), personaId: persona.toUpperCase() });
    expect(Object.keys(c)).toEqual(['version', 'operacionId', 'personaId', 'campo', 'valorPrevio', 'valorNuevo', 'actorId', 'sugerenciaId']);
    expect(huellaCorreccion(c)).toBe(VECTOR);
  });
  it.each([
    ['null', null], ['arreglo', []], ['sin sugerenciaId', (({ sugerenciaId, ...rest }) => rest)(valid)], ['clave extra', { ...valid, extra: 1 }],
    ['versión 2', { ...valid, version: 2 }], ['operación no UUID', { ...valid, operacionId: 'x' }], ['persona no UUID', { ...valid, personaId: 'x' }],
    ['campo no permitido', { ...valid, campo: 'dir_email' }], ['campo heredado', { ...valid, campo: '__proto__' }], ['valor nuevo vacío', { ...valid, valorNuevo: '  ' }],
    ['valor con NUL', { ...valid, valorNuevo: 'a\0b' }], ['valor demasiado largo', { ...valid, valorNuevo: 'x'.repeat(301) }], ['actor vacío', { ...valid, actorId: ' ' }],
    ['previo numérico', { ...valid, valorPrevio: 7 }], ['tipo de documento inválido', { ...valid, campo: 'documentType', valorNuevo: 'XX' }],
    ['género inválido', { ...valid, campo: 'genero', valorNuevo: 'X' }], ['documento con símbolos', { ...valid, valorNuevo: '1.000' }],
    ['fecha imposible', { ...valid, campo: 'fechaNacimiento', valorNuevo: '2020-02-31' }], ['fecha con formato libre', { ...valid, campo: 'fechaNacimiento', valorNuevo: '1/2/1990' }],
  ])('rechaza %s', (_name, raw) => { expect(() => correccionIdentidad(raw)).toThrow(BadRequestException); });
  it('acepta valor previo nulo y sugerencia nula', () => {
    expect(correccionIdentidad({ ...valid, valorPrevio: null, sugerenciaId: null }).valorPrevio).toBeNull();
  });
});

function build(rows: { persona?: any; existing?: any; duplicate?: any[]; compensation?: any } = {}) {
  const calls: Array<[string, unknown[]]> = [];
  const manager = {
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      calls.push([sql, params]);
      if (/FROM auth\.personas p WHERE p\.id_person=\$1 FOR UPDATE/.test(sql)) return rows.persona === undefined ? [{ valor: '1000000001' }] : rows.persona ? [rows.persona] : [];
      if (/FROM auth\.rund_identidad_correccion WHERE operacion_id=\$1 FOR UPDATE/.test(sql)) return rows.compensation ? [rows.compensation] : [];
      if (/FROM auth\.rund_identidad_correccion WHERE operacion_id=\$1/.test(sql)) return rows.existing ? [rows.existing] : [];
      if (/INSERT INTO auth\.rund_identidad_correccion/.test(sql)) return [{ operacionId: op, estado: 'APLICADA', huella: VECTOR }];
      if (/regexp_replace\(UPPER/.test(sql)) return rows.duplicate || [];
      return [];
    }),
  };
  const db = { transaction: jest.fn(async (cb: any) => cb(manager)), query: jest.fn() };
  return { service: new RundIdentityCorrectionService(db as any), manager, db, calls };
}

describe('Corrección de identidad RUND en Auth: aplicar', () => {
  it('compara el valor previo exacto bajo bloqueo, registra la corrección antes de actualizar y autoriza al trigger', async () => {
    const { service, calls } = build();
    await expect(service.aplicar(valid)).resolves.toEqual({ correccion: expect.objectContaining({ estado: 'APLICADA' }) });
    const order = calls.map(([sql]) => sql);
    const index = (re: RegExp) => order.findIndex(sql => re.test(sql));
    expect(index(/FOR UPDATE/)).toBeLessThan(index(/INSERT INTO auth\.rund_identidad_correccion/));
    expect(index(/INSERT INTO auth\.rund_identidad_correccion/)).toBeLessThan(index(/set_config\('app\.rund_identity_correction_id'/));
    expect(index(/set_config/)).toBeLessThan(index(/UPDATE auth\.personas SET num_identificacion/));
    expect(calls.find(([sql]) => /UPDATE auth\.personas/.test(sql))![1]).toEqual([persona, '1000000002']);
  });
  it('un mismo ID y contenido devuelve el recibo existente sin escribir', async () => {
    const { service, calls } = build({ existing: { operacionId: op, huella: VECTOR, estado: 'APLICADA' } });
    await expect(service.aplicar(valid)).resolves.toEqual({ correccion: expect.objectContaining({ huella: VECTOR }) });
    expect(calls.some(([sql]) => /UPDATE auth\.personas|INSERT INTO/.test(sql))).toBe(false);
  });
  it('el mismo ID con otro contenido es un conflicto con el motivo en el campo error', async () => {
    const { service } = build({ existing: { operacionId: op, huella: 'f'.repeat(64), estado: 'APLICADA' } });
    await expect(service.aplicar(valid)).rejects.toMatchObject({ response: { error: 'OPERACION_DISTINTA' } });
  });
  it('si el valor actual no es el que RUND vio, no cambia nada', async () => {
    const { service, calls } = build({ persona: { valor: '9999999999' } });
    await expect(service.aplicar(valid)).rejects.toMatchObject({ response: { error: 'VALOR_PREVIO_CAMBIO' } });
    expect(calls.some(([sql]) => /UPDATE auth\.personas|INSERT INTO/.test(sql))).toBe(false);
  });
  it('un documento ya asignado a otra persona se rechaza sin actualizar', async () => {
    const { service, calls } = build({ duplicate: [{ '?column?': 1 }] });
    await expect(service.aplicar(valid)).rejects.toMatchObject({ response: { error: 'DOCUMENTO_DUPLICADO' } });
    expect(calls.some(([sql]) => /UPDATE auth\.personas|INSERT INTO/.test(sql))).toBe(false);
  });
  it('persona inexistente es 404', async () => {
    await expect(build({ persona: null }).service.aplicar(valid)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('una violación de unicidad al actualizar se informa como documento duplicado', async () => {
    const { service, manager } = build();
    const original = manager.query.getMockImplementation()!;
    manager.query.mockImplementation(async (sql: string, params: unknown[]) => {
      if (/UPDATE auth\.personas SET/.test(sql)) throw Object.assign(new Error('dup'), { code: '23505' });
      return original(sql, params);
    });
    await expect(service.aplicar(valid)).rejects.toMatchObject({ response: { error: 'DOCUMENTO_DUPLICADO' } });
  });
  it.each(['42P01', '42883'])('si falta la migración 672 (%s) responde 503 con instrucción clara', async code => {
    const { service, db } = build();
    db.transaction.mockRejectedValue(Object.assign(new Error('x'), { code }));
    await expect(service.aplicar(valid)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('el trigger antiguo que bloquea la cédula también se traduce a 503 (migración pendiente)', async () => {
    const { service, db } = build();
    db.transaction.mockRejectedValue(Object.assign(new Error('REQ-RUND-F001: la cédula'), { code: 'P0001' }));
    await expect(service.aplicar(valid)).rejects.toMatchObject({ message: expect.stringContaining('migración 672') });
  });
  it('errores no previstos se propagan sin disfrazarse', async () => {
    const { service, db } = build(); db.transaction.mockRejectedValue(new Error('otro'));
    await expect(service.aplicar(valid)).rejects.toThrow('otro');
  });
});

describe('Corrección de identidad RUND en Auth: compensar y consultar', () => {
  const row = { operacionId: op, personaId: persona, campo: 'documentNumber', valorPrevio: '1000000001', valorNuevo: '1000000002', huella: VECTOR, estado: 'APLICADA' };
  it('restaura el valor previo solo si la persona conserva el valor corregido, y marca la compensación', async () => {
    const { service, calls } = build({ compensation: row, persona: { valor: '1000000002' } });
    await service.compensar(op, { huella: VECTOR });
    const update = calls.find(([sql]) => /UPDATE auth\.personas SET/.test(sql))!;
    expect(update[1]).toEqual([persona, '1000000001']);
    expect(calls.some(([sql]) => /SET estado='COMPENSADA'/.test(sql))).toBe(true);
  });
  it('si el valor ya era el previo, solo marca la compensación', async () => {
    const { service, calls } = build({ compensation: row, persona: { valor: '1000000001' } });
    await service.compensar(op, { huella: VECTOR });
    expect(calls.some(([sql]) => /UPDATE auth\.personas SET/.test(sql))).toBe(false);
    expect(calls.some(([sql]) => /SET estado='COMPENSADA'/.test(sql))).toBe(true);
  });
  it('si la persona cambió por otra vía no se pisa: CAMBIOS_POSTERIORES', async () => {
    const { service, calls } = build({ compensation: row, persona: { valor: '5555555555' } });
    await expect(service.compensar(op, { huella: VECTOR })).rejects.toMatchObject({ response: { error: 'CAMBIOS_POSTERIORES' } });
    expect(calls.some(([sql]) => /UPDATE auth\.personas SET|SET estado='COMPENSADA'/.test(sql))).toBe(false);
  });
  it('una corrección ya compensada es idempotente', async () => {
    const { service, calls } = build({ compensation: { ...row, estado: 'COMPENSADA' } });
    await expect(service.compensar(op, { huella: VECTOR })).resolves.toEqual({ correccion: expect.objectContaining({ estado: 'COMPENSADA' }) });
    expect(calls.some(([sql]) => /UPDATE auth./.test(sql))).toBe(false);
  });
  it('exige la huella de la corrección y rechaza IDs o cuerpos inválidos', async () => {
    const { service } = build({ compensation: row });
    await expect(service.compensar(op, { huella: 'a'.repeat(64) })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.compensar('x', { huella: VECTOR })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.compensar(op, { huella: 'corta' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.compensar(op, { huella: VECTOR, extra: 1 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(build().service.compensar(op, { huella: VECTOR })).rejects.toBeInstanceOf(NotFoundException);
  });
  it('consultar distingue ausencia de existencia y valida el ID', async () => {
    const { service, db } = build();
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([row]);
    await expect(service.consultar(op)).resolves.toEqual({ consulta: { operacionId: op }, encontrada: false, correccion: null });
    await expect(service.consultar(op.toUpperCase())).resolves.toMatchObject({ encontrada: true, correccion: row });
    await expect(service.consultar('x')).rejects.toBeInstanceOf(BadRequestException);
  });
  it('el controlador delega en el servicio', async () => {
    const service = { aplicar: jest.fn().mockResolvedValue('a'), consultar: jest.fn().mockResolvedValue('c'), compensar: jest.fn().mockResolvedValue('k') };
    const controller = new RundIdentityCorrectionController(service as any);
    expect(await controller.aplicar(valid)).toBe('a'); expect(await controller.consultar(op)).toBe('c'); expect(await controller.compensar(op, { huella: VECTOR })).toBe('k');
    expect(service.compensar).toHaveBeenCalledWith(op, { huella: VECTOR });
  });
});
