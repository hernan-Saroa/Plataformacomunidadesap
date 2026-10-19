import { BadRequestException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityCorrectionConflict } from '../../common/auth-identity-correction.client';
import { RundOcrIdentityCorrection } from './rund-ocr-identity-correction';

const events: string[] = [];
jest.mock('./rund-access-audit', () => ({ recordRundAccess: jest.fn(async () => { events.push('acceso'); }) }));
jest.mock('./rund-evidence-workflow', () => ({ invalidateEditedEvidence: jest.fn(async () => { events.push('evidencia'); }) }));
jest.mock('./rund-extraccion-fields', () => ({ ...jest.requireActual('./rund-extraccion-fields'),
  confirmExtractionSuggestions: jest.fn(async () => { events.push('confirmar-sugerencia'); }) }));

const docente = 'doc-1', persona = '22222222-2222-4222-8222-222222222222', sugerencia = '33333333-3333-4333-8333-333333333333';
const actor = { actorId: 'ocr', roles: ['SUPER_ADMIN'], fullAccess: true, ip: '10.0.0.1' } as any;
const suggestion = (extra: Record<string, unknown> = {}) => ({ id: sugerencia, campo: 'nombreCompleto', valor: 'NOMBRE NUEVO', valor_previo: 'NOMBRE VIEJO', estado: 'PENDIENTE',
  documento_estado: 'ACTIVO', trabajo_estado: 'COMPLETADO', documento_id: 'pdf-1', trabajo_id: 'job-1', ...extra });
const ficha = (extra: Record<string, unknown> = {}) => ({ personaId: persona, num_identificacion: '1000000001', tip_identificacion: 'CC', nom_largo: 'NOMBRE VIEJO',
  nom_tercero: null, pri_apellido: null, seg_apellido: null, gen_tercero: 'F', fec_nacimiento: '1980-01-17', dir_email: null, tel_celular: null, ...extra });

function build(options: { s?: any; live?: any; ficha?: any; journalState?: string } = {}) {
  events.length = 0;
  const s = options.s ?? suggestion();
  const manager = { query: jest.fn(async (sql: string, params: unknown[] = []) => {
    if (/FROM rund\."Docente" WHERE id::text=\$1 FOR UPDATE/.test(sql)) return [];
    if (/FROM rund\."RundExtraccionSugerencia" s/.test(sql) && /JOIN rund\."RundExtraccionTrabajo" j/.test(sql)) return [s];
    if (/FROM rund\.identidad_correccion_ocr WHERE sugerencia_id/.test(sql)) return options.live ? [options.live] : [];
    if (/INSERT INTO rund\.identidad_correccion_ocr/.test(sql)) { events.push('diario-reservado'); return [{ operacion_id: params[0], sugerencia_id: s.id, docente_id: docente, persona_id: persona, campo: s.campo,
      valor_previo: params[5], valor_nuevo: params[6], huella: params[7], actor_id: 'ocr', ip: null, estado: 'RESERVADA', intentos: 0 }]; }
    if (/SELECT estado FROM rund\.identidad_correccion_ocr/.test(sql)) return [{ estado: options.journalState ?? 'APLICADA_AUTH' }];
    if (/SELECT \* FROM rund\.identidad_correccion_ocr WHERE operacion_id/.test(sql)) return [{ operacion_id: params[0], huella: 'f'.repeat(64), estado: 'APLICADA_AUTH' }];
    if (/SET estado='CONFIRMADA'/.test(sql)) events.push('diario-confirmado');
    if (/RundAprobacionLog/.test(sql)) events.push('auditoria');
    return [];
  }) };
  const db = { query: jest.fn(async (sql: string, params: unknown[] = []) => {
    if (/SELECT "personaId" FROM rund\."Docente"/.test(sql)) return [{ personaId: persona }];
    if (/UPDATE rund\.identidad_correccion_ocr SET estado=\$3/.test(sql)) { events.push(`diario-${params[2]}`); return []; }
    return [];
  }), transaction: jest.fn(async (cb: any) => cb(manager)) };
  const identities = { fichaPorPersona: jest.fn().mockResolvedValue(options.ficha === undefined ? ficha() : options.ficha) };
  const auth: any = { enabled: true, aplicar: jest.fn(async () => { events.push('auth-aplicar'); return {}; }), consultar: jest.fn().mockResolvedValue(null), compensar: jest.fn(async () => { events.push('auth-compensar'); return {}; }) };
  return { service: new RundOcrIdentityCorrection(db as any, identities as any, auth), db, manager, identities, auth };
}

describe('Confirmación OCR de identidad coordinada con Auth', () => {
  it('solo maneja los campos de identidad y solo con la bandera activa', () => {
    const { service, auth } = build();
    for (const campo of ['documentNumber', 'documentType', 'nombreCompleto', 'genero', 'fechaNacimiento']) expect(service.handles(campo)).toBe(true);
    for (const campo of ['pregrado', 'escalafon', 'sexoBiologico', 'fechaInicioVinculacion', '__proto__']) expect(service.handles(campo)).toBe(false);
    auth.enabled = false; expect(service.handles('documentNumber')).toBe(false);
  });

  it('orden: reserva en el diario, aplica en Auth y solo después confirma en RUND (sugerencia, auditoría, acceso, evidencia) y cierra el diario', async () => {
    const { service, auth } = build();
    await expect(service.confirm(docente, sugerencia, actor)).resolves.toEqual({ confirmed: true, changed: true, campo: 'nombreCompleto', valor: 'NOMBRE NUEVO' });
    expect(events).toEqual(['diario-reservado', 'auth-aplicar', 'diario-APLICADA_AUTH', 'confirmar-sugerencia', 'auditoria', 'acceso', 'evidencia', 'diario-confirmado']);
    const command = auth.aplicar.mock.calls[0][0];
    expect(command).toMatchObject({ version: 1, personaId: persona, campo: 'nombreCompleto', valorPrevio: 'NOMBRE VIEJO', valorNuevo: 'NOMBRE NUEVO', actorId: 'ocr', sugerenciaId: sugerencia });
    expect(command.operacionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('manda a Auth el valor exacto que se leyó (compare-and-set) y los valores normalizados por campo', async () => {
    const cases: Array<[string, string, string, Record<string, unknown>, string]> = [
      ['documentNumber', '1234567890', '1000000001', {}, '1234567890'], ['documentType', 'CE', 'CC', {}, 'CE'], ['genero', 'Masculino', 'F', {}, 'M'],
      ['fechaNacimiento', '1975-06-30', '1980-01-17', {}, '1975-06-30'],
    ];
    for (const [campo, valor, previo, , esperado] of cases) {
      const { service, auth } = build({ s: suggestion({ campo, valor, valor_previo: previo }) });
      await service.confirm(docente, sugerencia, actor);
      expect(auth.aplicar.mock.calls[0][0]).toMatchObject({ valorPrevio: campo === 'documentNumber' ? '1000000001' : campo === 'documentType' ? 'CC' : campo === 'genero' ? 'F' : '1980-01-17', valorNuevo: esperado });
    }
  });

  it('una coincidencia verificada no llama a Auth ni abre diario', async () => {
    const { service, auth } = build({ s: suggestion({ valor: 'nombre viejo' }) });
    await expect(service.confirm(docente, sugerencia, actor)).resolves.toMatchObject({ changed: false });
    expect(auth.aplicar).not.toHaveBeenCalled(); expect(events).not.toContain('diario-reservado'); expect(events).toContain('confirmar-sugerencia');
  });

  it('si el perfil cambió desde la extracción, se rechaza antes de reservar o llamar a Auth', async () => {
    const { service, auth } = build({ ficha: ficha({ nom_largo: 'OTRO NOMBRE' }) });
    await expect(service.confirm(docente, sugerencia, actor)).rejects.toThrow(/cambió desde la extracción/);
    expect(auth.aplicar).not.toHaveBeenCalled(); expect(events).toEqual([]);
  });

  it.each([
    ['sugerencia ya revisada', { estado: 'APROBADA' }], ['PDF no vigente', { documento_estado: 'REEMPLAZADO' }], ['trabajo no completado', { trabajo_estado: 'ERROR' }],
  ])('%s: conflicto sin diario ni llamada a Auth', async (_name, extra) => {
    const { service, auth } = build({ s: suggestion(extra) });
    await expect(service.confirm(docente, sugerencia, actor)).rejects.toBeInstanceOf(ConflictException);
    expect(auth.aplicar).not.toHaveBeenCalled(); expect(events).toEqual([]);
  });

  it.each([
    ['número con letras para CC', { campo: 'documentNumber', valor: 'ABC12345', valor_previo: '1000000001' }, BadRequestException],
    ['tipo de documento desconocido', { campo: 'documentType', valor: 'XX', valor_previo: 'CC' }, BadRequestException],
    ['género no reconocido', { campo: 'genero', valor: 'Otro', valor_previo: 'F' }, BadRequestException],
    ['menor de edad', { campo: 'fechaNacimiento', valor: '2020-01-01', valor_previo: '1980-01-17' }, BadRequestException],
  ])('valida como el flujo anterior: %s', async (_name, extra, type) => {
    const { service, auth } = build({ s: suggestion(extra) });
    await expect(service.confirm(docente, sugerencia, actor)).rejects.toBeInstanceOf(type as any);
    expect(auth.aplicar).not.toHaveBeenCalled(); expect(events).toEqual([]);
  });

  it('un rechazo de negocio de Auth cierra el diario como COMPENSADA, no confirma y informa el motivo', async () => {
    const { service, auth } = build();
    auth.aplicar.mockRejectedValue(new AuthIdentityCorrectionConflict('x', 'VALOR_PREVIO_CAMBIO'));
    await expect(service.confirm(docente, sugerencia, actor)).rejects.toThrow(/cambió desde la extracción/);
    expect(events).toEqual(['diario-reservado', 'diario-COMPENSADA']); expect(auth.compensar).not.toHaveBeenCalled();
    const dup = build(); dup.auth.aplicar.mockRejectedValue(new AuthIdentityCorrectionConflict('x', 'DOCUMENTO_DUPLICADO'));
    await expect(dup.service.confirm(docente, sugerencia, actor)).rejects.toThrow(/ya está asociado a otra persona/);
  });

  it('si no se sabe si Auth aplicó (503), el diario conserva la reserva: no confirma ni compensa a ciegas', async () => {
    const { service, auth } = build();
    auth.aplicar.mockRejectedValue(new ServiceUnavailableException('caído'));
    await expect(service.confirm(docente, sugerencia, actor)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(events).toEqual(['diario-reservado']); expect(auth.compensar).not.toHaveBeenCalled();
  });

  it('si RUND no puede confirmar después de aplicar, compensa en Auth y cierra el diario', async () => {
    const { service, auth, manager } = build();
    const original = manager.query.getMockImplementation()!;
    let calls = 0;
    manager.query.mockImplementation(async (sql: string, params: unknown[]) => {
      if (/SELECT estado FROM rund\.identidad_correccion_ocr/.test(sql) && ++calls) return [{ estado: 'APLICADA_AUTH' }];
      if (/FROM rund\."RundExtraccionSugerencia" s/.test(sql) && calls > 0) return [suggestion({ estado: 'DESCARTADA' })];
      return original(sql, params);
    });
    auth.consultar.mockResolvedValue({ estado: 'APLICADA' });
    await expect(service.confirm(docente, sugerencia, actor)).rejects.toThrow(/ya fue revisada/);
    expect(auth.compensar).toHaveBeenCalledTimes(1); expect(events).not.toContain('diario-confirmado'); expect(events).not.toContain('auditoria');
  });

  it('reanuda un diario vivo con SU operación (no crea otro) y no repite la aplicación si ya estaba aplicada', async () => {
    const live = { operacion_id: '44444444-4444-4444-8444-444444444444', sugerencia_id: sugerencia, docente_id: docente, persona_id: persona, campo: 'nombreCompleto',
      valor_previo: 'NOMBRE VIEJO', valor_nuevo: 'NOMBRE NUEVO', huella: 'a'.repeat(64), actor_id: 'ocr', ip: null, intentos: 1 };
    const reserved = build({ live: { ...live, estado: 'RESERVADA' } });
    await reserved.service.confirm(docente, sugerencia, actor);
    expect(reserved.auth.aplicar.mock.calls[0][0].operacionId).toBe(live.operacion_id); expect(events).not.toContain('diario-reservado');
    const applied = build({ live: { ...live, estado: 'APLICADA_AUTH' } });
    await applied.service.confirm(docente, sugerencia, actor);
    expect(applied.auth.aplicar).not.toHaveBeenCalled(); expect(events).toContain('diario-confirmado');
  });

  it('una corrección en REVISION no se reanuda: requiere soporte', async () => {
    const { service, auth } = build({ live: { operacion_id: 'x', estado: 'REVISION' } });
    await expect(service.confirm(docente, sugerencia, actor)).rejects.toThrow(/revisión de soporte/);
    expect(auth.aplicar).not.toHaveBeenCalled();
  });

  it('si el diario ya está CONFIRMADA por otra solicitud simultánea, esta se rechaza sin compensar', async () => {
    const live = { operacion_id: '44444444-4444-4444-8444-444444444444', sugerencia_id: sugerencia, docente_id: docente, persona_id: persona, campo: 'nombreCompleto',
      valor_previo: 'NOMBRE VIEJO', valor_nuevo: 'NOMBRE NUEVO', huella: 'a'.repeat(64), actor_id: 'ocr', ip: null, estado: 'APLICADA_AUTH', intentos: 0 };
    const { service, auth } = build({ live, journalState: 'CONFIRMADA' });
    await expect(service.confirm(docente, sugerencia, actor)).rejects.toBeInstanceOf(ConflictException);
    expect(auth.compensar).not.toHaveBeenCalled(); expect(events).not.toContain('auditoria');
  });

  it('falla de forma explícita si el perfil o la ficha de identidad no existen', async () => {
    const noFicha = build({ ficha: null }); await expect(noFicha.service.confirm(docente, sugerencia, actor)).rejects.toBeInstanceOf(BadRequestException);
    const noDocente = build(); noDocente.db.query.mockResolvedValueOnce([]);
    await expect(noDocente.service.confirm(docente, sugerencia, actor)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('Reconciliación de correcciones a medias', () => {
  it('no hace nada con la bandera apagada y evita ejecuciones solapadas', async () => {
    const off = build(); off.auth.enabled = false; await expect(off.service.reconcile()).resolves.toBe(0); expect(off.db.transaction).not.toHaveBeenCalled();
    const { service, db } = build(); let release!: () => void;
    db.transaction.mockImplementationOnce(() => new Promise(resolve => { release = () => resolve([]); }));
    const first = service.reconcile(); await expect(service.reconcile()).resolves.toBe(0); release(); await expect(first).resolves.toBe(0);
  });

  it('reclama solo las inactivas con SKIP LOCKED, cuenta el intento y compensa cada una', async () => {
    const { service, db, manager, auth } = build();
    const rows = [{ operacion_id: 'a', intentos: 0 }, { operacion_id: 'b', intentos: 0 }];
    manager.query.mockImplementation(async (sql: string) => {
      if (/FOR UPDATE SKIP LOCKED/.test(sql)) return rows;
      if (/SELECT \* FROM rund\.identidad_correccion_ocr WHERE operacion_id/.test(sql)) return [{ operacion_id: 'x', huella: 'f'.repeat(64), estado: 'APLICADA_AUTH' }];
      return [];
    });
    auth.consultar.mockResolvedValue(null);
    await expect(service.reconcile(5, 60)).resolves.toBe(2);
    const claim = manager.query.mock.calls.find(([sql]) => /SKIP LOCKED/.test(sql))!;
    expect(claim[0]).toMatch(/estado IN \('RESERVADA','APLICADA_AUTH'\)/); expect(claim[1]).toEqual([60, 5]);
    expect(manager.query.mock.calls.some(([sql]) => /intentos=intentos\+1/.test(sql))).toBe(true);
    expect(db.transaction).toHaveBeenCalledTimes(3);
  });

  it('tras 10 intentos fallidos pasa a REVISION en lugar de reintentar indefinidamente', async () => {
    const { service, db, manager, auth } = build();
    manager.query.mockImplementation(async (sql: string) => {
      if (/FOR UPDATE SKIP LOCKED/.test(sql)) return [{ operacion_id: 'a', intentos: 9 }];
      if (/SELECT \* FROM rund\.identidad_correccion_ocr WHERE operacion_id/.test(sql)) return [{ operacion_id: 'a', huella: 'f'.repeat(64), estado: 'RESERVADA' }];
      return [];
    });
    auth.consultar.mockRejectedValue(new ServiceUnavailableException('caído'));
    await service.reconcile();
    expect(db.query.mock.calls.some(([, params]) => Array.isArray(params) && params[2] === 'REVISION')).toBe(true);
  });
});
