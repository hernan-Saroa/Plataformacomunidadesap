import { BancoDocentesService } from './banco-docentes.service';
import { RUND_IDENTITY_WRITER } from './rund-identity-writer';

const raw = { DOCUMENTO_IDENTIDAD: '1020304050', TIPO_DOCUMENTO: 'CC', NOMBRE_COMPLETO: 'PERSONA FICTICIA PRUEBA', GENERO: 'Femenino', FECHA_NACIMIENTO: '17/01/1980',
  CORREO_INSTITUCIONAL: 'prueba@esap.edu.co', VINCULACION: 'Ocasional', TERRITORIAL: 'Sede Central', DEDICACION: 'Tiempo Completo', CATEGORIA_ESCALAFON: 'Asociado',
  INICIO_VINCULACION: '20/01/2025', ACTO_ADMINISTRATIVO: 'Resolución ficticia', NIVEL_FORMACION: 'Maestría', TITULO_PREGRADO: 'Administración',
  NUCLEO_TEMATICO: 'Administración', PERFIL_ACADEMICO: 'Docencia', PERIODO_CARGA: '2026-2', canal_origen: 'MASIVO', cargadoPor: 'actor-1' };
const options = (extra: Record<string, unknown> = {}) => ({ bulkImport: true, preserveTerritorial: true, territoriales: [{ id: '31', nombre: 'Sede Central', codigo: null }],
  audit: { actorId: 'actor-1', canalOrigen: 'MASIVO' }, ...extra }) as any;

function build(writer?: any) {
  const manager = { query: jest.fn().mockRejectedValue(new Error('ESCRITOR ANTERIOR')), findOne: jest.fn() };
  const dataSource = { transaction: jest.fn(async (cb: any) => cb(manager)), query: jest.fn() };
  const moduleRef = { get: jest.fn((token: string) => { if (token !== RUND_IDENTITY_WRITER) throw new Error('token inesperado'); if (!writer) throw new Error('no registrado'); return writer; }) };
  const service = new BancoDocentesService({} as any, {} as any, {} as any, {} as any, {} as any, dataSource as any, {} as any, {} as any, {} as any, moduleRef as any);
  const welcome = jest.spyOn(service as any, 'sendWelcomeEmail').mockResolvedValue({ sent: true });
  return { service, dataSource, manager, moduleRef, welcome };
}
const okPlan = (result: Record<string, unknown>) => ({ plan: jest.fn((input: any) => ({ ok: true, input, command: {} })), write: jest.fn().mockResolvedValue(result) });

describe('upsertDocente con la escritura de identidad por Auth', () => {
  afterEach(() => { delete process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API; });
  const on = () => { process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API = 'true'; };

  it('con la bandera activa y un plan válido usa el escritor por Auth y no abre la transacción anterior', async () => {
    on(); const writer = okPlan({ action: 'insert', authUserCreated: false });
    const { service, dataSource } = build(writer);
    await expect(service.upsertDocente(raw, options())).resolves.toMatchObject({ action: 'insert' });
    expect(writer.write).toHaveBeenCalledTimes(1); expect(dataSource.transaction).not.toHaveBeenCalled();
    const input = writer.plan.mock.calls[0][0];
    expect(input).toMatchObject({ emailFinal: 'prueba@esap.edu.co', finalFullName: 'PERSONA FICTICIA PRUEBA', territorial: expect.objectContaining({ id: '31' }) });
    expect(input.options.audit.actorId).toBe('actor-1');
  });

  it('envía la bienvenida después del commit solo cuando Auth creó la cuenta, igual que antes', async () => {
    on(); const created = okPlan({ action: 'insert', authUserCreated: true, email: 'a@esap.edu.co', documentNumber: '1020304050', fullName: 'PERSONA' });
    const first = build(created);
    await expect(first.service.upsertDocente(raw, options())).resolves.toMatchObject({ welcomeEmail: { sent: true } });
    expect(first.welcome).toHaveBeenCalledWith('a@esap.edu.co', 'a@esap.edu.co', '1020304050', 'PERSONA');
    const existing = build(okPlan({ action: 'update', authUserCreated: false }));
    await existing.service.upsertDocente(raw, options()); expect(existing.welcome).not.toHaveBeenCalled();
  });

  it.each([
    ['vista previa', { previewOnly: true }], ['transacción externa del llamador', { outerManager: { query: jest.fn().mockRejectedValue(new Error('ESCRITOR ANTERIOR')) } }],
  ])('%s nunca usa el escritor por Auth', async (_name, extra) => {
    on(); const writer = okPlan({}); const { service } = build(writer);
    await expect(service.upsertDocente(raw, options(extra))).rejects.toThrow();
    expect(writer.plan).not.toHaveBeenCalled(); expect(writer.write).not.toHaveBeenCalled();
  });

  it('con la bandera apagada, ni siquiera busca el escritor', async () => {
    const writer = okPlan({}); const { service, moduleRef, dataSource } = build(writer);
    await expect(service.upsertDocente(raw, options())).rejects.toThrow('ESCRITOR ANTERIOR');
    expect(moduleRef.get).not.toHaveBeenCalled(); expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('si el plan no es aplicable o el módulo no está registrado, falla sin tocar el escritor SQL anterior', async () => {
    on(); const declined = { plan: jest.fn(() => ({ ok: false, reason: 'contexto incompatible' })), write: jest.fn() };
    const a = build(declined); await expect(a.service.upsertDocente(raw, options())).rejects.toThrow('contexto de escritura');
    expect(declined.write).not.toHaveBeenCalled(); expect(a.dataSource.transaction).not.toHaveBeenCalled(); expect(a.manager.query).not.toHaveBeenCalled();
    const b = build(undefined); await expect(b.service.upsertDocente(raw, options())).rejects.toThrow('no está disponible');
    expect(b.dataSource.transaction).not.toHaveBeenCalled(); expect(b.manager.query).not.toHaveBeenCalled();
  });

  it('rechaza una transacción externa antes de escribir o abrir otra transacción', async () => {
    on(); const writer = okPlan({}), outerManager = { query: jest.fn() }; const { service, dataSource } = build(writer);
    await expect(service.upsertDocente(raw, options({ outerManager }))).rejects.toThrow('transacción externa');
    expect(outerManager.query).not.toHaveBeenCalled(); expect(dataSource.transaction).not.toHaveBeenCalled(); expect(writer.write).not.toHaveBeenCalled();
  });

  it('un resultado vacío del escritor no habilita la alternativa SQL', async () => {
    on(); const writer = okPlan({}); writer.write.mockResolvedValue(undefined); const { service, dataSource } = build(writer);
    await expect(service.upsertDocente(raw, options())).rejects.toThrow('no confirmó'); expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('un error del escritor por Auth se propaga sin ejecutar además el escritor anterior', async () => {
    on(); const writer = okPlan({}); writer.write.mockRejectedValue(new Error('Auth no disponible'));
    const { service, dataSource } = build(writer);
    await expect(service.upsertDocente(raw, options())).rejects.toThrow('Auth no disponible'); expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
