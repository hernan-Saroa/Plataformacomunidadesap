import { BadRequestException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { RundIdentityWriteRecovery, RundIdentityWriteViaAuth } from './rund-identity-write.module';

const state = (extra: Record<string, unknown> = {}) => ({ decisionNativa: 'EN_CURSO', estadoNativo: 'PREPARADA', estadoAuth: 'AUTH_APLICADA', resolucionAuth: null, ...extra });
function build() {
  const execution: any = { preparar: jest.fn().mockResolvedValue(state()), ejecutar: jest.fn(), consultar: jest.fn().mockResolvedValue(state()),
    abortar: jest.fn().mockResolvedValue(state({ decisionNativa: 'ABORTADA' })), resolverAborto: jest.fn().mockResolvedValue(state()) };
  const compensation: any = { resolver: jest.fn().mockResolvedValue(state()) };
  return { execution, compensation, writer: new RundIdentityWriteViaAuth(execution, compensation) };
}
const plan: any = { ok: true, command: { version: 1 }, input: { payload: {} } };
const confirmed = { estadoNativo: 'CONFIRMADA', resultadoNativo: { action: 'insert', docenteId: 'd1' } };

describe('Escritor de identidad por API de Auth', () => {
  it('prepara el contexto congelado con un UUID nuevo, lo ejecuta y devuelve el resultado nativo', async () => {
    const { writer, execution } = build(); execution.ejecutar.mockResolvedValue(confirmed);
    await expect(writer.write(plan)).resolves.toEqual(confirmed.resultadoNativo);
    const [id, command, input] = execution.preparar.mock.calls[0];
    expect(id).toMatch(/^[0-9a-f-]{36}$/); expect(command).toBe(plan.command); expect(input).toBe(plan.input);
    expect(execution.ejecutar).toHaveBeenCalledWith(id);
    const second = build(); second.execution.ejecutar.mockResolvedValue(confirmed); await second.writer.write(plan);
    expect(second.execution.preparar.mock.calls[0][0]).not.toBe(id);
  });

  it('si la ejecución no deja el perfil confirmado, no devuelve un éxito', async () => {
    const { writer, execution } = build(); execution.ejecutar.mockResolvedValue({ estadoNativo: 'PREPARADA', resultadoNativo: null });
    await expect(writer.write(plan)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each([[new BadRequestException('ya existe')], [new ConflictException('abortada')]])('un rechazo de negocio (%s) aborta y resuelve en Auth: compensa si se aplicó', async error => {
    const { writer, execution, compensation } = build(); execution.ejecutar.mockRejectedValue(error);
    execution.consultar.mockResolvedValueOnce(state()).mockResolvedValue(state({ decisionNativa: 'ABORTADA' }));
    await expect(writer.write(plan)).rejects.toBe(error);
    expect(execution.abortar).toHaveBeenCalledWith(expect.any(String), 'FALLO_NEGOCIO'); expect(compensation.resolver).toHaveBeenCalledTimes(1); expect(execution.resolverAborto).not.toHaveBeenCalled();
  });

  it('un rechazo de negocio antes de aplicar en Auth cancela la intención en lugar de compensar', async () => {
    const { writer, execution, compensation } = build(); execution.ejecutar.mockRejectedValue(new BadRequestException('x'));
    execution.consultar.mockResolvedValueOnce(state({ estadoAuth: 'AUTH_REGISTRADA' })).mockResolvedValue(state({ decisionNativa: 'ABORTADA', estadoAuth: 'AUTH_REGISTRADA' }));
    execution.resolverAborto.mockResolvedValue(state({ decisionNativa: 'ABORTADA', estadoAuth: 'CANCELADA' }));
    await expect(writer.write(plan)).rejects.toBeInstanceOf(BadRequestException);
    expect(execution.resolverAborto).toHaveBeenCalledTimes(1); expect(compensation.resolver).not.toHaveBeenCalled();
  });

  it('si al cancelar resulta que Auth sí aplicó (respuesta perdida), la compensa en lugar de dejarla sin resolver', async () => {
    const { writer, execution, compensation } = build();
    execution.consultar.mockResolvedValue(state({ decisionNativa: 'ABORTADA', estadoAuth: 'AUTH_REGISTRADA' }));
    execution.resolverAborto.mockResolvedValue(state({ decisionNativa: 'ABORTADA', estadoAuth: 'AUTH_APLICADA' }));
    await writer.settleAborted('x');
    expect(execution.resolverAborto).toHaveBeenCalledTimes(1); expect(compensation.resolver).toHaveBeenCalledTimes(1);
  });

  it('un fallo técnico (503 o error inesperado) NO revierte: la intención queda para el recuperador', async () => {
    for (const error of [new ServiceUnavailableException('Auth caído'), new Error('FALLO FICTICIO')]) {
      const { writer, execution, compensation } = build(); execution.ejecutar.mockRejectedValue(error);
      await expect(writer.write(plan)).rejects.toBe(error);
      expect(execution.abortar).not.toHaveBeenCalled(); expect(compensation.resolver).not.toHaveBeenCalled();
    }
  });

  it('si la reversión falla, el error original de la solicitud no se pierde', async () => {
    const { writer, execution } = build(); const original = new BadRequestException('ya existe'); execution.ejecutar.mockRejectedValue(original);
    execution.abortar.mockRejectedValue(new Error('no se pudo abortar'));
    await expect(writer.write(plan)).rejects.toBe(original);
  });

  it('rollback no toca una intención ya confirmada ni repite el aborto, y settleAborted respeta lo ya resuelto', async () => {
    const { writer, execution, compensation } = build();
    execution.consultar.mockResolvedValue(state({ estadoNativo: 'CONFIRMADA' })); await writer.rollback('x');
    expect(execution.abortar).not.toHaveBeenCalled();
    execution.consultar.mockResolvedValue(state({ decisionNativa: 'ABORTADA', estadoAuth: 'CANCELADA' })); await writer.settleAborted('x');
    execution.consultar.mockResolvedValue(state({ decisionNativa: 'ABORTADA', resolucionAuth: { estado: 'COMPENSADA' } })); await writer.settleAborted('x');
    execution.consultar.mockResolvedValue(state({ decisionNativa: 'ABORTADA', resolucionAuth: { estado: 'REVISION_REQUERIDA' } })); await writer.settleAborted('x');
    execution.consultar.mockResolvedValue(state({ decisionNativa: 'EN_CURSO' })); await writer.settleAborted('x');
    expect(compensation.resolver).not.toHaveBeenCalled(); expect(execution.resolverAborto).not.toHaveBeenCalled();
  });
});

describe('Recuperador de escrituras de identidad', () => {
  const flag = () => { process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API = 'true'; };
  afterEach(() => { delete process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API; });
  const buildRecovery = (open: any[] = [], aborted: any[] = []) => {
    const writer: any = { run: jest.fn().mockResolvedValue({}), rollback: jest.fn().mockResolvedValue({}), settleAborted: jest.fn().mockResolvedValue({}) };
    const db: any = { query: jest.fn().mockResolvedValueOnce(open).mockResolvedValueOnce(aborted) };
    return { writer, db, recovery: new RundIdentityWriteRecovery(db, writer) };
  };

  it('con la bandera apagada no consulta ni actúa', async () => {
    const { recovery, db } = buildRecovery(); await expect(recovery.recover()).resolves.toEqual({ resumed: 0, cancelled: 0, settled: 0 }); expect(db.query).not.toHaveBeenCalled();
  });

  it('cancela lo que Auth no aplicó (sin publicar o solo registrada), reanuda solo lo ya aplicado con su mismo ID y resuelve los abortos pendientes', async () => {
    flag();
    const { recovery, writer, db } = buildRecovery([{ intencion_id: 'a', estado_auth: 'PREPARADA' }, { intencion_id: 'b', estado_auth: 'AUTH_REGISTRADA' }, { intencion_id: 'c', estado_auth: 'AUTH_APLICADA' }], [{ intencion_id: 'd' }]);
    await expect(recovery.recover(7, 30)).resolves.toEqual({ resumed: 1, cancelled: 2, settled: 1 });
    expect(writer.rollback.mock.calls.map(([id]: [string]) => id)).toEqual(['a', 'b']); expect(writer.run.mock.calls.map(([id]: [string]) => id)).toEqual(['c']); expect(writer.settleAborted).toHaveBeenCalledWith('d');
    expect(db.query.mock.calls[0][1]).toEqual([30, 7]); expect(db.query.mock.calls[0][0]).toMatch(/decision='EN_CURSO' AND n\.estado='PREPARADA'/);
    expect(db.query.mock.calls[1][0]).toMatch(/decision='ABORTADA'.*r\.intencion_id IS NULL/s);
  });

  it('el fallo de una intención no detiene las demás ni se cuenta como resuelta', async () => {
    flag();
    const { recovery, writer } = buildRecovery([{ intencion_id: 'a', estado_auth: 'AUTH_APLICADA' }, { intencion_id: 'b', estado_auth: 'AUTH_APLICADA' }], [{ intencion_id: 'c' }]);
    writer.run.mockRejectedValueOnce(new Error('Auth caído')); writer.settleAborted.mockRejectedValue(new Error('aún no'));
    await expect(recovery.recover()).resolves.toEqual({ resumed: 1, cancelled: 0, settled: 0 });
    expect(writer.run).toHaveBeenCalledTimes(2);
  });

  it('no se solapa consigo mismo', async () => {
    flag(); const { recovery, db } = buildRecovery(); let release!: () => void;
    db.query.mockReset(); db.query.mockImplementationOnce(() => new Promise(resolve => { release = () => resolve([]); })).mockResolvedValue([]);
    const first = recovery.recover(); await expect(recovery.recover()).resolves.toEqual({ resumed: 0, cancelled: 0, settled: 0 });
    release(); await first; expect(db.query).toHaveBeenCalledTimes(2);
  });

  it('el temporizador solo se arma con la bandera activa y no retiene el proceso', () => {
    const { recovery } = buildRecovery(); recovery.onModuleInit(); expect((recovery as any).timer).toBeUndefined();
    flag(); recovery.onModuleInit(); const timer = (recovery as any).timer as NodeJS.Timeout; expect(timer).toBeDefined(); expect(timer.hasRef()).toBe(false);
    recovery.onModuleDestroy(); clearInterval(timer);
  });
});
