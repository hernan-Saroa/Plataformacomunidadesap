import { RundExtraccionService } from './rund-extraccion.service';

const actor = { actorId: 'ocr', roles: ['SUPER_ADMIN'], fullAccess: true } as any;
const build = (campo: string | undefined, enabled: boolean) => {
  const db = { query: jest.fn().mockResolvedValue(campo ? [{ campo }] : []), transaction: jest.fn().mockRejectedValue(new Error('flujo anterior')) };
  const correction = { enabled, handles: jest.fn((field: string) => ['documentNumber', 'nombreCompleto'].includes(field)), confirm: jest.fn().mockResolvedValue('coordinado') };
  const service = new RundExtraccionService(db as any, {} as any, {} as any, correction as any);
  return { service, db, correction };
};

describe('Confirmación OCR: reparto entre el flujo coordinado con Auth y el anterior', () => {
  it('con la API de correcciones activa, un campo de identidad usa el flujo coordinado y no abre la transacción anterior', async () => {
    const { service, db, correction } = build('documentNumber', true);
    await expect(service.confirm('doc-1', 'sug-1', actor)).resolves.toBe('coordinado');
    expect(correction.confirm).toHaveBeenCalledWith('doc-1', 'sug-1', actor); expect(db.transaction).not.toHaveBeenCalled();
    expect(db.query.mock.calls[0][1]).toEqual(['sug-1', 'doc-1']);
  });
  it('un campo que no es de identidad sigue por el flujo anterior aunque la API esté activa', async () => {
    const { service, correction } = build('pregrado', true);
    await expect(service.confirm('doc-1', 'sug-1', actor)).rejects.toThrow('flujo anterior');
    expect(correction.confirm).not.toHaveBeenCalled();
  });
  it('con la API apagada ni siquiera consulta el campo: todo sigue por el flujo anterior', async () => {
    const { service, db, correction } = build('documentNumber', false);
    await expect(service.confirm('doc-1', 'sug-1', actor)).rejects.toThrow('flujo anterior');
    expect(correction.confirm).not.toHaveBeenCalled(); expect(db.query).not.toHaveBeenCalled();
  });
  it('una sugerencia ajena o inexistente deja que el flujo anterior dé su error de siempre', async () => {
    const { service, correction } = build(undefined, true);
    await expect(service.confirm('doc-1', 'sug-1', actor)).rejects.toThrow('flujo anterior');
    expect(correction.confirm).not.toHaveBeenCalled();
  });
  it('sin el servicio coordinado (instancia anterior) mantiene el comportamiento original', async () => {
    const db = { query: jest.fn(), transaction: jest.fn().mockRejectedValue(new Error('flujo anterior')) };
    await expect(new RundExtraccionService(db as any, {} as any, {} as any).confirm('doc-1', 'sug-1', actor)).rejects.toThrow('flujo anterior');
    expect(db.query).not.toHaveBeenCalled();
  });
});
