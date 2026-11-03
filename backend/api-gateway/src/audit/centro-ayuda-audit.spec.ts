import { lastValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { accionCentroAyuda } from './centro-ayuda-audit';
import { getModuleFromService } from './microservice.enum';

const BASE = '/auth/api/v1/centro-ayuda/admin';

describe('Gateway: Auditoría del Centro de Ayuda', () => {
  it('nombra cada acción de la administración', () => {
    expect(accionCentroAyuda('POST', `${BASE}/secciones`)).toBe('crear sección');
    expect(accionCentroAyuda('PUT', `${BASE}/recursos/7`)).toBe('editar recurso');
    expect(accionCentroAyuda('PATCH', `${BASE}/recursos/7/visibilidad`, { activo: false })).toBe('ocultar recurso');
    expect(accionCentroAyuda('PATCH', `${BASE}/secciones/3/visibilidad`, { activo: true })).toBe('mostrar sección');
    expect(accionCentroAyuda('DELETE', `${BASE}/recursos/7`)).toBe('enviar recurso a la papelera');
    expect(accionCentroAyuda('POST', `${BASE}/secciones/3/restaurar`)).toBe('restaurar sección');
    expect(accionCentroAyuda('PUT', `${BASE}/secciones/orden`)).toBe('ordenar secciones');
  });

  it('no toca las rutas de otros módulos', () => {
    expect(accionCentroAyuda('POST', '/auth/api/v1/roles')).toBeUndefined();
  });

  it('las registra en el módulo Centro de Ayuda, no en Gestión de Personas', () => {
    expect(getModuleFromService('auth', `${BASE}/recursos`)).toBe('Centro de Ayuda');
  });

  it('el interceptor guarda la acción y el módulo', async () => {
    const audit = { logRequest: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditInterceptor(audit as any);
    const req = {
      method: 'PATCH', originalUrl: `${BASE}/recursos/7/visibilidad`, path: `${BASE}/recursos/7/visibilidad`,
      query: {}, headers: {}, body: { activo: false },
    };
    const response = { statusCode: 200, locals: { auditResponseBody: { id: 7, activo: false } } };
    const context = { switchToHttp: () => ({ getRequest: () => req, getResponse: () => response }) };
    await lastValueFrom(interceptor.intercept(context as any, { handle: () => of({ id: 7 }) }));
    expect(audit.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ module: 'Centro de Ayuda', action: 'ocultar recurso', statusCode: 200 }),
    );
  });
});
