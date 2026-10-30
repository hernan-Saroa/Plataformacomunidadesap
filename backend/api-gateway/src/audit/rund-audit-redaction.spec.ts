import { lastValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { isRundAuditUrl, redactRundAuditUrl } from './rund-audit-redaction';

describe('Gateway: la auditoría general no duplica datos sensibles RUND', () => {
  it.each([
    '/pta/api/v1/pta/fotos-perfil/docentes/1020304050/versiones/photo/decision?documento=1020304050',
    '/pta/api/v1/pta/fotos-perfil/masiva',
    '/auth/api/v1/portal/foto-perfil?personaId=1020304050',
  ])('protege fotos, observaciones e identidades en la auditoría de %s',async url=>{
    const audit={logRequest:jest.fn().mockResolvedValue(undefined)};
    const interceptor=new AuditInterceptor(audit as any);
    const req={method:'POST',originalUrl:url,path:url.split('?')[0],query:{documento:'1020304050'},headers:{},
      body:{nombre:'1020304050.jpg',observacion:'OBSERVACION_PRIVADA'}};
    const response={statusCode:201,locals:{auditResponseBody:{historial:[{nombre:'1020304050.jpg',observacion:'OBSERVACION_PRIVADA'}],url:'data:image/png;base64,CONTENIDO_PRIVADO'}}};
    const context={switchToHttp:()=>({getRequest:()=>req,getResponse:()=>response})};
    await lastValueFrom(interceptor.intercept(context as any,{handle:()=>of({success:true})}));
    expect(audit.logRequest).toHaveBeenCalledWith(expect.objectContaining({method:'POST',statusCode:201,requestBody:null,responseBody:null,queryParams:{}}));
    const log=JSON.stringify(audit.logRequest.mock.calls);
    for(const secret of ['1020304050','OBSERVACION_PRIVADA','CONTENIDO_PRIVADO']) expect(log).not.toContain(secret);
  });
  it('conserva sin cambios las rutas y cuerpos de auditoría de otros flujos',async()=>{
    const url='/auth/api/v1/users?active=true';
    expect(isRundAuditUrl(url)).toBe(false);expect(redactRundAuditUrl(url)).toBe(url);
    const audit={logRequest:jest.fn().mockResolvedValue(undefined)};
    const interceptor=new AuditInterceptor(audit as any);
    const req={method:'POST',originalUrl:url,path:'/auth/api/v1/users',query:{active:'true'},headers:{'content-type':'application/json'},body:{nombre:'USUARIO_SINTETICO'}};
    const response={statusCode:201,locals:{auditResponseBody:{id:'SYNTHETIC',nombre:'USUARIO_SINTETICO'}}};
    const context={switchToHttp:()=>({getRequest:()=>req,getResponse:()=>response})};
    await lastValueFrom(interceptor.intercept(context as any,{handle:()=>of({success:true})}));
    expect(audit.logRequest).toHaveBeenCalledWith(expect.objectContaining({url,queryParams:{active:'true'},requestBody:{nombre:'USUARIO_SINTETICO'},responseBody:{id:'SYNTHETIC',nombre:'USUARIO_SINTETICO'}}));
  });
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
