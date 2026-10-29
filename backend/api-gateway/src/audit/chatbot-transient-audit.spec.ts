import { BadRequestException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';

function fixture(url: string) {
  const audit = { logRequest: jest.fn().mockResolvedValue(undefined) };
  const request = { method: 'POST', originalUrl: url, path: url.split('?')[0], query: { pregunta: 'mensaje-temporal' },
    headers: {}, body: { contenido: 'mensaje-temporal' } };
  const response = { statusCode: 200, locals: { auditResponseBody: { respuesta: 'respuesta-temporal' } } };
  const context = { switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }) };
  return { audit, interceptor: new AuditInterceptor(audit as any), context, request };
}

describe('Auditoría del chatbot temporal', () => {
  it.each(['/chatbot/api/v1/public/consultas', '/services/chatbot/api/v1/public/consultas/'])('conserva auditoría técnica sin persistir preguntas ni respuestas en %s', async path => {
    const { audit, interceptor, context } = fixture(path+'?pregunta=mensaje-temporal');
    await lastValueFrom(interceptor.intercept(context as any, { handle: () => of({ respuesta: 'respuesta-temporal' }) }));
    const record = audit.logRequest.mock.calls[0][0];
    expect(record).toMatchObject({ statusCode: 200, url: path, queryParams: {}, requestBody: null, responseBody: null });
    expect(JSON.stringify(record)).not.toMatch(/mensaje-temporal|respuesta-temporal/);
  });
  it('tampoco guarda el contenido en errores o stacks', async () => {
    const { audit, interceptor, context } = fixture('/chatbot/api/v1/public/consultas');
    await expect(lastValueFrom(interceptor.intercept(context as any, { handle: () => throwError(() => new BadRequestException('mensaje-temporal')) }))).rejects.toBeInstanceOf(BadRequestException);
    const record = audit.logRequest.mock.calls[0][0];
    expect(record.errorMessage).toBe('Error HTTP 400');expect(record.errorStack).toBeUndefined();
    expect(JSON.stringify(record)).not.toContain('mensaje-temporal');
  });
  it('conserva el comportamiento existente para otras operaciones', async () => {
    const { audit, interceptor, context } = fixture('/auth/api/v1/personas');
    await lastValueFrom(interceptor.intercept(context as any, { handle: () => of({ id: 1 }) }));
    expect(audit.logRequest.mock.calls[0][0]).toMatchObject({ requestBody: { contenido: 'mensaje-temporal' }, responseBody: { respuesta: 'respuesta-temporal' } });
  });
});
