import { AuthIdentityMailClient } from './auth-identity-mail.client';

describe('Adaptador opcional de correo RUND sin reintentos', () => {
  const mail = { to: 'ficticio@example.test', username: 'ficticio@example.test', temporaryPassword: '123456', fullName: '<DOCENTE & FICTICIO>' };
  const originalFetch = global.fetch;
  const originalUrl = process.env.NOTIFICATIONS_SERVICE_URL;
  beforeEach(() => {
    process.env.NOTIFICATIONS_SERVICE_URL = 'http://127.0.0.1:3019/';
    global.fetch = jest.fn().mockResolvedValue({ status: 201, json: async () => ({ message: 'Correo enviado' }) });
  });
  afterEach(() => {
    jest.useRealTimers(); global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NOTIFICATIONS_SERVICE_URL; else process.env.NOTIFICATIONS_SERVICE_URL = originalUrl;
  });
  it('conserva contrato de bienvenida y escapa HTML sin credenciales de sesión o clave extra en el body', async () => {
    expect(await new AuthIdentityMailClient().enviar(mail)).toBe(true);
    const [url, options] = (fetch as jest.Mock).mock.calls[0], body = JSON.parse(options.body);
    expect(url).toBe('http://127.0.0.1:3019/api/v1/emails/send');
    expect(Object.keys(body).sort()).toEqual(['html', 'subject', 'text', 'to']);
    expect(body.text).toContain('Contraseña temporal: 123456'); expect(body.text).toContain(mail.fullName);
    expect(body.html).toContain('&lt;DOCENTE &amp; FICTICIO&gt;'); expect(body.html).not.toContain(mail.fullName);
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' }); expect(options.redirect).toBe('error');
  });
  it.each([200, 202, 400, 401, 500, 503])('HTTP %s no confirma SMTP y nunca se reintenta', async status => {
    (fetch as jest.Mock).mockResolvedValue({ status, json: async () => ({ message: 'Correo enviado' }) });
    expect(await new AuthIdentityMailClient().enviar(mail)).toBe(false); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([null, [], {}, { sent: true }, { message: 'Correo enviado', extra: true }])('recibo %j no confirma envío', async receipt => {
    (fetch as jest.Mock).mockResolvedValue({ status: 201, json: async () => receipt });
    expect(await new AuthIdentityMailClient().enviar(mail)).toBe(false); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('fallo de red o JSON privado queda incierto sin propagar detalles', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('CUERPO PRIVADO'));
    expect(await new AuthIdentityMailClient().enviar(mail)).toBe(false);
    (fetch as jest.Mock).mockResolvedValueOnce({ status: 201, json: async () => { throw new Error('CUERPO PRIVADO'); } });
    expect(await new AuthIdentityMailClient().enviar(mail)).toBe(false);
  });
  it('timeout aborta y descarta incluso respuesta tardía con forma correcta', async () => {
    jest.useFakeTimers(); let finish!: (value: any) => void;
    (fetch as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = new AuthIdentityMailClient().enviar(mail); await jest.advanceTimersByTimeAsync(15_000);
    expect((fetch as jest.Mock).mock.calls[0][1].signal.aborted).toBe(true);
    finish({ status: 201, json: async () => ({ message: 'Correo enviado' }) }); expect(await pending).toBe(false);
  });
  it.each(['ftp://example.test', 'http://usuario:clave@example.test', 'http://example.test/?token=privado'])('destino incompatible no inicia HTTP: %s', async url => {
    process.env.NOTIFICATIONS_SERVICE_URL = url; expect(await new AuthIdentityMailClient().enviar(mail)).toBe(false); expect(fetch).not.toHaveBeenCalled();
  });
  it('datos inválidos no envían HTTP', async () => {
    expect(await new AuthIdentityMailClient().enviar({ ...mail, to: 'NO-EMAIL' })).toBe(false);
    expect(await new AuthIdentityMailClient().enviar({ ...mail, fullName: '\0' })).toBe(false); expect(fetch).not.toHaveBeenCalled();
  });
});
