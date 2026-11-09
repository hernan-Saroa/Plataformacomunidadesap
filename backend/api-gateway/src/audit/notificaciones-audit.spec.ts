import { lastValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { accionNotificaciones } from './notificaciones-audit';
import { getModuleFromService } from './microservice.enum';

const BASE = '/notificaciones/api/v1/configuracion';

describe('Gateway: Auditoría de la configuración de notificaciones', () => {
  it('nombra cada acción de la consola', () => {
    expect(accionNotificaciones('PATCH', `${BASE}/modulos/pta`, { activo: false })).toBe('desactivar módulo de notificaciones');
    expect(accionNotificaciones('PATCH', `${BASE}/modulos/pta`, { activo: true })).toBe('activar módulo de notificaciones');
    expect(accionNotificaciones('PATCH', `${BASE}/modulos/pta`, { canal_defecto: 'correo' })).toBe('configurar módulo de notificaciones');
    expect(accionNotificaciones('PATCH', `${BASE}/modulos/pta`, { correo_desvio: 'buzon@esap.edu.co' })).toBe('configurar módulo de notificaciones');
    expect(accionNotificaciones('PATCH', `${BASE}/modulos/pta/eventos/pta_aprobado`, { activo: false })).toBe('desactivar evento de notificación');
    expect(accionNotificaciones('PATCH', `${BASE}/modulos/pta/eventos/pta_aprobado`, { canal: 'plataforma' })).toBe('configurar evento de notificación');
    expect(accionNotificaciones('POST', `${BASE}/modulos/pta/eventos/pta_aprobado/prueba`)).toBe('enviar notificación de prueba');
    expect(accionNotificaciones('GET', `${BASE}/modulos/pta/eventos`)).toBeUndefined();
  });

  it('no toca el resto del servicio de notificaciones ni otros módulos', () => {
    expect(accionNotificaciones('POST', '/notificaciones/api/v1/notifications')).toBeUndefined();
    expect(accionNotificaciones('PUT', '/notificaciones/api/v1/notifications/1/mark-read')).toBeUndefined();
    expect(accionNotificaciones('POST', '/auth/api/v1/roles')).toBeUndefined();
  });

  it('las registra en el módulo Configuración de Notificaciones', () => {
    expect(getModuleFromService('notificaciones', `${BASE}/modulos/pta`)).toBe('Configuración de Notificaciones');
    expect(getModuleFromService('notificaciones', '/notificaciones/api/v1/notifications')).toBe('Notificaciones');
  });

  it('el interceptor guarda la acción, el módulo y el valor anterior y nuevo (RN5)', async () => {
    const audit = { logRequest: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditInterceptor(audit as any);
    const req = {
      method: 'PATCH', originalUrl: `${BASE}/modulos/pta`, path: `${BASE}/modulos/pta`,
      query: {}, headers: {}, body: { activo: false },
    };
    const response = { statusCode: 200, locals: { auditResponseBody: { codigo: 'pta', activo: false } } };
    const context = { switchToHttp: () => ({ getRequest: () => req, getResponse: () => response }) };
    await lastValueFrom(interceptor.intercept(context as any, { handle: () => of({ codigo: 'pta' }) }));
    expect(audit.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'Configuración de Notificaciones',
        action: 'desactivar módulo de notificaciones',
        statusCode: 200,
        requestBody: { activo: false },
        newData: { codigo: 'pta', activo: false },
      }),
    );
  });
});
