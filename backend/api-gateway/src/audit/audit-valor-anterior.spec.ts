import { lastValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { datosAntesYDespues } from './audit-valor-anterior';

const URL = '/legal/api/v1/configurations/sigl-entes-control-pm';
const antes = [{ id: 'OCI', nombre: 'Oficina Control Interno', activo: true }];
const despues = [{ id: 'OCI', nombre: 'Oficina Control Interno', activo: false }];

async function auditar(method: string, auditResponseBody: unknown, body: unknown = { value: despues }) {
  const audit = { logRequest: jest.fn().mockResolvedValue(undefined) };
  const interceptor = new AuditInterceptor(audit as any);
  const req = { method, originalUrl: URL, path: URL, query: {}, headers: {}, body };
  const response = { statusCode: 200, locals: { auditResponseBody } };
  const context = { switchToHttp: () => ({ getRequest: () => req, getResponse: () => response }) };
  await lastValueFrom(interceptor.intercept(context as any, { handle: () => of({}) }));
  return audit.logRequest.mock.calls[0][0];
}

describe('Gateway: Auditoría del valor anterior (configuraciones)', () => {
  it('arma previousData y newData cuando la respuesta trae previousValue y value', () => {
    expect(datosAntesYDespues('PUT', { key: 'k', value: despues, previousValue: antes })).toEqual({
      previousData: { value: antes },
      newData: { value: despues },
    });
  });

  it('una clave nueva (previousValue null) también queda con antes vacío', () => {
    expect(datosAntesYDespues('PUT', { value: despues, previousValue: null })).toEqual({
      previousData: { value: null },
      newData: { value: despues },
    });
  });

  it('no actúa sin previousValue, sin value, en POST/DELETE ni con cuerpos que no son objeto', () => {
    expect(datosAntesYDespues('PUT', { id: 1, nombre: 'x' })).toBeUndefined();
    expect(datosAntesYDespues('PUT', { previousValue: antes })).toBeUndefined();
    expect(datosAntesYDespues('POST', { value: despues, previousValue: antes })).toBeUndefined();
    expect(datosAntesYDespues('DELETE', { value: despues, previousValue: antes })).toBeUndefined();
    expect(datosAntesYDespues('PUT', null)).toBeUndefined();
    expect(datosAntesYDespues('PUT', [antes])).toBeUndefined();
  });

  it('el interceptor registra el valor anterior y el nuevo en un PUT de configuración', async () => {
    const log = await auditar('PUT', { key: 'sigl-entes-control-pm', value: despues, previousValue: antes });
    expect(log.previousData).toEqual({ value: antes });
    expect(log.newData).toEqual({ value: despues });
    expect(log.statusCode).toBe(200);
  });

  it('un PUT de otro módulo sigue igual: newData es la respuesta y no hay previousData', async () => {
    const log = await auditar('PUT', { id: 7, activo: false });
    expect(log.newData).toEqual({ id: 7, activo: false });
    expect(log).not.toHaveProperty('previousData');
  });

  it('un POST sigue registrando el cuerpo enviado', async () => {
    const log = await auditar('POST', { id: 9 }, { nombre: 'nuevo' });
    expect(log.newData).toEqual({ nombre: 'nuevo' });
    expect(log).not.toHaveProperty('previousData');
  });
});
