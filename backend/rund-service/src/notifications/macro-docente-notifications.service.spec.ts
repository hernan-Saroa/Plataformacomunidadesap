import { Test } from '@nestjs/testing';
import { MacroDocenteNotificationsService } from './macro-docente-notifications.service';

describe('Correo propio de acceso externo Macro Docente', () => {
  let send: jest.SpiedFunction<typeof fetch>;
  const previous = { ...process.env };
  const service = new MacroDocenteNotificationsService();
  const opts = { enteNombre: 'ENTE FICTICIO', enteContacto: ' externo@example.test ',
    path: '/services/rund/api/v1/pta/macro-docente/externo/token-ficticio', fechaFin: new Date('2030-06-20T12:00:00Z') };
  beforeEach(() => {
    process.env = { ...previous, NODE_ENV: 'test', NOTIFICATIONS_SERVICE_URL: 'http://receptor.test/', PUBLIC_APP_URL: 'https://portal.test/' };
    delete process.env.NOTIFICATION_SERVICE_URL; delete process.env.FRONTEND_URL;
    send = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => {});
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { process.env = { ...previous }; jest.restoreAllMocks(); });

  it('se inyecta sin conexión de base de datos ni cliente Auth', async () => {
    const module = await Test.createTestingModule({ providers: [MacroDocenteNotificationsService] }).compile();
    try { expect(module.get(MacroDocenteNotificationsService)).toBeInstanceOf(MacroDocenteNotificationsService); }
    finally { await module.close(); }
  });
  it('conserva destinatario, ruta del receptor, enlace, textos y cabeceras sin reenviar credenciales', async () => {
    process.env.AUTH_INTERNAL_SERVICE_TOKEN = 'no-reenviar';
    await expect(service.notifyAccesoExternoOtorgado(opts)).resolves.toBe(true);
    const [url, options] = send.mock.calls[0];
    expect(url).toBe('http://receptor.test/api/v1/emails/send');
    expect(options?.headers).toEqual({ 'Content-Type': 'application/json' });
    const body = JSON.parse(options!.body as string);
    expect(Object.keys(body)).toEqual(['to', 'subject', 'text', 'html']);
    expect(body.to).toBe('externo@example.test'); expect(body.subject).toBe('Acceso temporal al Macro Docente RUND — ENTE FICTICIO');
    expect(body.text).toContain('https://portal.test' + opts.path); expect(body.html).toContain('https://portal.test' + opts.path);
    expect(body.text).toContain(opts.fechaFin.toLocaleDateString('es-CO'));
    expect(JSON.stringify(body)).not.toContain('no-reenviar');
  });
  it.each([null, '', ' ', 'sin-arroba'])('no intenta enviar cuando el contacto es %s', async enteContacto => {
    await expect(service.notifyAccesoExternoOtorgado({ ...opts, enteContacto })).resolves.toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it('conserva el criterio histórico de contacto con @ sin agregar validaciones nuevas', async () => {
    await expect(service.notifyAccesoExternoOtorgado({ ...opts, enteContacto: '@' })).resolves.toBe(true);
    expect(JSON.parse(send.mock.calls[0][1]!.body as string).to).toBe('@');
  });
  it('escapa el enlace en HTML y conserva el texto plano', async () => {
    const path = '/enlace?x=<ficticio>&y="comillas"';
    await service.notifyAccesoExternoOtorgado({ ...opts, path });
    const body = JSON.parse(send.mock.calls[0][1]!.body as string);
    expect(body.html).toContain('/enlace?x=&lt;ficticio&gt;&amp;y=&quot;comillas&quot;'); expect(body.text).toContain(path);
  });
  it.each([400, 500, 503])('HTTP %s no interrumpe el flujo; true conserva el significado de intento, no certifica entrega', async status => {
    send.mockResolvedValue({ ok: false, status } as Response);
    await expect(service.notifyAccesoExternoOtorgado(opts)).resolves.toBe(true); expect(send).toHaveBeenCalledTimes(1);
  });
  it('error de red no interrumpe el flujo ni inicia un reintento automático', async () => {
    send.mockRejectedValue(new Error('receptor ficticio caído'));
    await expect(service.notifyAccesoExternoOtorgado(opts)).resolves.toBe(true); expect(send).toHaveBeenCalledTimes(1);
  });
  it('conserva NOTIFICATION_SERVICE_URL y FRONTEND_URL como alternativas', async () => {
    delete process.env.NOTIFICATIONS_SERVICE_URL; delete process.env.PUBLIC_APP_URL;
    process.env.NOTIFICATION_SERVICE_URL = 'http://alternativo.test/'; process.env.FRONTEND_URL = 'https://frontend.test/';
    await service.notifyAccesoExternoOtorgado(opts);
    expect(send.mock.calls[0][0]).toBe('http://alternativo.test/api/v1/emails/send');
    expect(JSON.parse(send.mock.calls[0][1]!.body as string).text).toContain('https://frontend.test' + opts.path);
  });
  it.each([['production', 'http://notifications-service:3009'], ['development', 'http://localhost:3009']])('conserva defaults de %s', async (mode, base) => {
    process.env.NODE_ENV = mode; delete process.env.NOTIFICATIONS_SERVICE_URL; delete process.env.PUBLIC_APP_URL;
    await service.notifyAccesoExternoOtorgado(opts);
    expect(send.mock.calls[0][0]).toBe(base + '/api/v1/emails/send');
    expect(JSON.parse(send.mock.calls[0][1]!.body as string).text).toContain('http://localhost:3000' + opts.path);
  });
  it('el envío externo funciona sin configuración ni consultas de Auth', async () => {
    process.env.AUTH_SERVICE_URL = 'dirección inválida'; delete process.env.AUTH_INTERNAL_SERVICE_TOKEN; delete process.env.INTERNAL_SERVICE_TOKEN;
    await service.notifyAccesoExternoOtorgado(opts);
    expect(send).toHaveBeenCalledTimes(1); expect(String(send.mock.calls[0][0])).toContain('receptor.test');
  });
});
