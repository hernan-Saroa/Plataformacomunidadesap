import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { isRundAuditUrl, redactRundAuditUrl } from './rund-audit-redaction';

describe('Gateway: la auditoría general no duplica datos sensibles RUND', () => {
  it('redacta tokens y documentos de la URL sin cambiar otras rutas', () => {
    expect(redactRundAuditUrl('/pta/api/v1/banco-docentes/1020304050?periodo=2026-2')).not.toContain('1020304050');
    expect(redactRundAuditUrl('http://localhost:3003/banco-docentes/drafts/secret-token')).not.toContain('secret-token');
    expect(redactRundAuditUrl('/auth/api/v1/roles?active=true')).toBe('/auth/api/v1/roles?active=true');
    expect(isRundAuditUrl('/pta/api/v1/pta/banco-docentes/bulk')).toBe(true);
  });

  it('conserva operación y resultado pero omite cuerpos de la petición y respuesta RUND', async () => {
    const audit = { logRequest: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditInterceptor(audit as any);
    const req = { method: 'PUT', originalUrl: '/pta/api/v1/banco-docentes/drafts/secret-token',
      path: '/pta/api/v1/banco-docentes/drafts/secret-token', query: { documento: '1020304050' },
      headers: {}, body: { documentNumber: '1020304050', puntajeSalarial: 145.5 },
    };
    const response = { statusCode: 200, locals: { auditResponseBody: { sessionToken: 'secret-session', documentNumber: '1020304050' } } };
    const context = { switchToHttp: () => ({ getRequest: () => req, getResponse: () => response }) };
    await lastValueFrom(interceptor.intercept(context as any, { handle: () => of({ success: true }) }));
    expect(audit.logRequest).toHaveBeenCalledWith(expect.objectContaining({ method: 'PUT', statusCode: 200, requestBody: null, responseBody: null }));
    const log = JSON.stringify(audit.logRequest.mock.calls);
    for (const secret of ['1020304050', '145.5', 'secret-token', 'secret-session']) expect(log).not.toContain(secret);
  });
});

describe('Cobertura de auditoría RUND y Carpeta Digital', () => {
  it.each([
    '/rund/api/v1/docentes/PERFIL_PRIVADO',
    '/services/rund-service/api/v2/soportes/SOPORTE_PRIVADO/validar',
    '/rund/api/v1/trayectoria/docente/PERFIL_PRIVADO/formacion',
    '/rund/api/v1/tarjeta-digital/verificar/CODIGO_PRIVADO',
    '/rund/api/v1/rund/interoperabilidad/perfiles/CEDULA_PRIVADA?periodo=2099-1',
    '/pta/api/v1/rund/interoperabilidad/perfiles/CEDULA_PRIVADA',
    '/auth/api/v1/carpeta-digital/persona/PERSONA_PRIVADA/perfiles-rund',
    '/services/auth/api/v1/portal/carpeta-digital/PERSONA_PRIVADA/documentos',
    '/auth/api/v1/carpeta-digital/documentos/ARCHIVO_PRIVADO/versiones/VERSION_PRIVADA/restaurar',
    '/auth/api/v1/portal/carpeta-digital/documentos/ARCHIVO_PRIVADO/reclassify',
    '/auth/api/v1/internal/carpeta-digital/personas/PERSONA_PRIVADA/estado-rund',
    '/rund/api/v1/internal/carpeta-digital/personas/PERSONA_PRIVADA/perfiles',
    '/auth/api/v1/uploads/carpeta-digital/PERSONA_PRIVADA/ARCHIVO_PRIVADO.pdf',
    '/auth/uploads/carpeta-digital/PERSONA_PRIVADA/ARCHIVO_PRIVADO.pdf',
    '/rund/uploads/rund-documentos/CEDULA_PRIVADA/ARCHIVO_PRIVADO.pdf',
    '/rund/autogestion/docentes?token=TOKEN_PRIVADO',
    'https://fixture.example.test/services/rund/api/v1/docentes/PERFIL_PRIVADO',
    '/%72und/api/v1/docentes/PERFIL_PRIVADO',
  ])('omite identificadores y consultas de %s', url => {
    expect(isRundAuditUrl(url)).toBe(true);
    const redacted = redactRundAuditUrl(url + (url.includes('?') ? '&' : '?') + 'token=TOKEN_PRIVADO#FRAGMENTO_PRIVADO');
    expect(redacted).not.toMatch(/PRIVAD[OA]|[?#]/);
  });

  it.each([
    '/registro-academico/api/v1/docentes/123?periodo=2026-1',
    '/programacion/api/v1/soportes/123',
    '/auth/api/v1/roles?active=true',
    '/auth/api/v1/portal/perfil/PERSONA',
    '/auth/api/v1/carpeta-digital-adicional/123',
    '/legal/api/v1/documentos/123/contenido',
    '/rund-ocr/api/v1/extract',
    '/services/rund-example/api/v1/docentes/123',
    'https://fixture.example.test/viaticos/api/v1/solicitudes?estado=pendiente',
  ])('conserva exactamente la URL ajena %s', url => {
    expect(isRundAuditUrl(url)).toBe(false);
    expect(redactRundAuditUrl(url)).toBe(url);
  });

  it('conserva operación y versión sin tratar un token igual a un literal como ruta', () => {
    expect(redactRundAuditUrl('/services/rund/api/v2/pta/banco-docentes/PROFILE/documentos/FILE/reemplazo?token=secret'))
      .toBe('/services/rund/api/v2/pta/banco-docentes/[REDACTED]/documentos/[REDACTED]/reemplazo');
    expect(redactRundAuditUrl('/rund/api/v1/banco-docentes/drafts/stats')).toContain('/drafts/[REDACTED]');
    expect(redactRundAuditUrl('/auth/api/v1/carpeta-digital/persona/documentos')).toContain('/persona/[REDACTED]');
  });

  it('conserva la omisión histórica de cuerpos si una consulta ya referenciaba autogestión', () => {
    const url = '/auth/api/v1/login?token=TOKEN_PRIVADO&next=/autogestion/docentes';
    expect(isRundAuditUrl(url)).toBe(true);
    expect(redactRundAuditUrl(url)).toBe('/auth/api/v1/login');
  });

  it('redacta el destino interno con contexto explícito y elimina credenciales de la autoridad', () => {
    expect(redactRundAuditUrl('http://USER_PRIVADO:PASS_PRIVADO@127.0.0.1:3016/docentes/PERFIL_PRIVADO?token=TOKEN_PRIVADO', true))
      .toBe('http://127.0.0.1:3016/docentes/[REDACTED]');
  });

  it.each(['PUT', 'POST', 'PATCH', 'DELETE'])('audita %s conservando resultado y actor, sin cuerpos ni referer', async method => {
    const audit = { logRequest: jest.fn().mockResolvedValue(undefined) };
    const req = { method, originalUrl: '/services/auth/api/v1/portal/carpeta-digital/documentos/ARCHIVO_PRIVADO/reclassify?token=TOKEN_PRIVADO',
      path: '/services/auth/api/v1/portal/carpeta-digital/documentos/ARCHIVO_PRIVADO/reclassify', query: { token: 'TOKEN_PRIVADO' },
      body: { nested: { documentNumber: 'CEDULA_PRIVADA', signedUrl: 'URL_PRIVADA' } },
      user: { userId: 42, username: 'operador-ficticio', roles: ['GESTION_PROFESORAL'] },
      ip: '127.0.0.1', headers: { referer: 'https://fixture.example.test/?token=REFERER_PRIVADO' } };
    const data = { secret: 'RESPUESTA_PRIVADA' };
    const response = { statusCode: 409, locals: { auditResponseBody: data } };
    const context = { switchToHttp: () => ({ getRequest: () => req, getResponse: () => response }) };
    const interceptor = new AuditInterceptor(audit as any);
    expect(await lastValueFrom(interceptor.intercept(context as any, { handle: () => of(data) }))).toBe(data);
    expect(audit.logRequest).toHaveBeenCalledWith(expect.objectContaining({ method, statusCode: 409, userId: 42,
      requestBody: null, responseBody: null, referer: undefined, queryParams: {}, responseTimeMs: expect.any(Number) }));
    expect(JSON.stringify(audit.logRequest.mock.calls)).not.toMatch(/PRIVAD[OA]/);
    expect(req.body.nested.documentNumber).toBe('CEDULA_PRIVADA');
  });

  it('un error conserva la excepción del caller pero no su mensaje/stack privado en auditoría', async () => {
    const error = Object.assign(new Error('MENSAJE_PRIVADO'), { status: 503 });
    const audit = { logRequest: jest.fn().mockResolvedValue(undefined) };
    const req = { method: 'POST', originalUrl: '/rund/api/v1/docentes/PERFIL_PRIVADO', path: '/rund/api/v1/docentes/PERFIL_PRIVADO',
      query: {}, headers: {}, body: { datos: 'CUERPO_PRIVADO' } };
    const context = { switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }) };
    await expect(lastValueFrom(new AuditInterceptor(audit as any).intercept(context as any,
      { handle: () => throwError(() => error) }))).rejects.toBe(error);
    expect(audit.logRequest).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503, requestBody: null,
      errorMessage: 'Error HTTP 503', errorStack: undefined }));
    expect(JSON.stringify(audit.logRequest.mock.calls)).not.toMatch(/PRIVAD[OA]/);
  });

  it('mantiene cuerpos, consultas y error detallado de otros módulos según su política anterior', async () => {
    const audit = { logRequest: jest.fn().mockResolvedValue(undefined) };
    const req = { method: 'PUT', originalUrl: '/legal/api/v1/expedientes/123?estado=abierto', path: '/legal/api/v1/expedientes/123',
      query: { estado: 'abierto' }, headers: { referer: 'https://fixture.example.test/legal' }, body: { titulo: 'Expediente de prueba' } };
    const response = { statusCode: 200, locals: { auditResponseBody: { titulo: 'Guardado' } } };
    const context = { switchToHttp: () => ({ getRequest: () => req, getResponse: () => response }) };
    await lastValueFrom(new AuditInterceptor(audit as any).intercept(context as any, { handle: () => of({ ok: true }) }));
    expect(audit.logRequest).toHaveBeenLastCalledWith(expect.objectContaining({ url: req.originalUrl, requestBody: req.body,
      queryParams: req.query, responseBody: response.locals.auditResponseBody, referer: req.headers.referer }));
    const error = Object.assign(new Error('Detalle legal'), { status: 409 });
    await expect(lastValueFrom(new AuditInterceptor(audit as any).intercept(context as any,
      { handle: () => throwError(() => error) }))).rejects.toBe(error);
    expect(audit.logRequest).toHaveBeenLastCalledWith(expect.objectContaining({ errorMessage: 'Detalle legal', errorStack: error.stack }));
  });
});
