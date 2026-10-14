import { RundStateSnapshotGuard } from './rund-state-snapshot.controller';
import { RundStateSnapshotService } from './rund-state-snapshot.service';

describe('Contrato interno Auth -> RUND', () => {
  const saved = { ...process.env };
  const context = (token?: unknown) => ({ switchToHttp: () => ({ getRequest: () => ({ headers: { 'x-rund-carpeta-sync-token': token } }) }) }) as any;
  afterEach(() => { process.env = { ...saved }; });
  it('sin credencial interna falla aunque exista JWT_SECRET', () => {
    delete process.env.RUND_CARPETA_SYNC_TOKEN; delete process.env.INTERNAL_SERVICE_TOKEN;
    process.env.JWT_SECRET = 'no-es-credencial-interna';
    expect(() => new RundStateSnapshotGuard().canActivate(context(process.env.JWT_SECRET))).toThrow(expect.objectContaining({ status: 503 }));
  });
  it.each([undefined, '', 'incorrecto', ['correcto']])('rechaza una credencial ausente o inválida', token => {
    process.env.RUND_CARPETA_SYNC_TOKEN = 'correcto';
    expect(() => new RundStateSnapshotGuard().canActivate(context(token))).toThrow(expect.objectContaining({ status: 401 }));
  });
  it('acepta solo la credencial explícita o la interna compartida configurada', () => {
    process.env.RUND_CARPETA_SYNC_TOKEN = 'específica'; process.env.INTERNAL_SERVICE_TOKEN = 'compartida';
    const guard = new RundStateSnapshotGuard();
    expect(guard.canActivate(context('específica'))).toBe(true);
    expect(() => guard.canActivate(context('compartida'))).toThrow();
    delete process.env.RUND_CARPETA_SYNC_TOKEN;
    expect(guard.canActivate(context('compartida'))).toBe(true);
  });
  it('apagado no consulta tablas ni inicia una transacción', async () => {
    process.env.RUND_CARPETA_SYNC_ENABLED = 'false';
    const db = { transaction: jest.fn() };
    await expect(new RundStateSnapshotService(db as any).snapshot('persona')).rejects.toMatchObject({ status: 409 });
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
