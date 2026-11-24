import { createServer, type AddressInfo } from 'node:net';
import { createInterface } from 'node:readline';
import { Logger } from '@nestjs/common';
import { EmailsService } from './emails.service';

describe('EFDS-2238, entrega SMTP local', () => {
  const mensajes: string[] = [];
  const judicial = 'judicial@qa.invalid';
  const profesional = 'profesional@example.test';
  const modulo = 'control-disciplinario';
  const entornoOriginal = process.env;
  const smtp = createServer(socket => {
    socket.write('220 capturador local\r\n');
    let contenido: string[] | undefined;
    createInterface({ input: socket }).on('line', linea => {
      if (contenido) {
        if (linea !== '.') {
          contenido.push(linea);
          return;
        }
        mensajes.push(contenido.join('\n'));
        contenido = undefined;
      } else if (linea === 'DATA') {
        contenido = [];
        socket.write('354 fin con punto\r\n');
        return;
      } else if (linea === 'QUIT') {
        socket.end('221 fin\r\n');
        return;
      }
      socket.write('250 OK\r\n');
    });
  });
  beforeAll(async () => {
    await new Promise<void>(resolve => smtp.listen(0, '127.0.0.1', resolve));
  });
  beforeEach(() => {
    mensajes.length = 0;
    process.env = { ...entornoOriginal, MAIL_ENVIRONMENT: 'qa', JURIDICA_EMAIL: judicial,
      MAIL_TEST_INBOX: 'avisos@qa.invalid', EMAIL_PROVIDER: 'smtp', SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String((smtp.address() as AddressInfo).port), SMTP_FROM: 'avisos@qa.invalid',
      SMTP_USER: '', SMTP_PASS: '' };
  });
  afterEach(() => { process.env = entornoOriginal; jest.restoreAllMocks(); });
  afterAll(() => new Promise<void>(resolve => smtp.close(() => resolve())));

  it('entrega exactamente un traslado con los bytes del adjunto y la marca de QA', async () => {
    const bytes = Buffer.from('documento del expediente').toString('base64');
    await new EmailsService().enviarSiPermitido({ modulo, evento: 'PLIEGO_CARGOS_TRASLADO_JURIDICA',
      subject: 'Traslado', to: judicial, attachments: [{ filename: 'auto.pdf', contentBase64: bytes }] });
    expect(mensajes).toHaveLength(1);
    for (const texto of ['To: ' + judicial, 'Subject: [QA] Traslado', 'X-Esap-Environment: qa', 'auto.pdf', bytes]) {
      expect(mensajes[0].toLowerCase()).toContain(texto.toLowerCase());
    }
  });

  it.each(['AUTO_APROBADO_RADICADOR', 'PROCESO_REASIGNADO', 'NUEVA_NOTICIA', 'PLIEGO_CARGOS_APROBADO'])
  ('%s conserva el destinatario legítimo y excluye Judiciales de todas las copias', async evento => {
    const compuerta = {
      evaluar: jest.fn().mockResolvedValue({ permitido: true, modulo, clave: evento }),
      destinatariosAdicionales: jest.fn().mockResolvedValue([{ email: judicial }, { email: 'rol@example.test' }]),
      reservarCopiaCorreo: jest.fn().mockResolvedValue(true),
    };
    const servicio = new EmailsService(compuerta as any);
    await servicio.enviarSiPermitido({ modulo, evento, to: profesional, subject: evento });
    expect(mensajes).toHaveLength(2);
    expect(mensajes.join(' ')).toContain(profesional);
    expect(mensajes.join(' ')).toContain('rol@example.test');
    expect(mensajes.join(' ')).not.toContain(judicial);
    expect(compuerta.reservarCopiaCorreo.mock.calls.map(call => call[3])).toEqual(['rol@example.test']);
    await expect(servicio.enviarSiPermitido({ modulo, evento, to: judicial, subject: evento }))
      .resolves.toMatchObject({ sent: false });
    expect(mensajes).toHaveLength(2);
  });

  it('mantiene en producción el destinatario del aviso antes del transporte', async () => {
    process.env.MAIL_ENVIRONMENT = 'prod';
    // El capturador local no autentica; el transporte de producción requiere credenciales.
    const servicio = new EmailsService();
    const envio = jest.spyOn(servicio as any, 'sendWithSmtp').mockResolvedValue({ sent: true });
    await servicio.enviarSiPermitido({ modulo, evento: 'AUTO_APROBADO', to: profesional, subject: 'Auto' });
    expect(envio).toHaveBeenCalledWith(expect.objectContaining({ to: profesional, subject: '[PROD] Auto' }));
  });

  it.each(['MAIL_ENVIRONMENT', 'JURIDICA_EMAIL', 'MAIL_TEST_INBOX'])('sin %s registra el error y no entrega nada', async variable => {
    process.env.EMAIL_REDIRECT_TO = 'PRE;legado@example.test';
    delete process.env[variable];
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    await expect(new EmailsService().enviarSiPermitido({ modulo, to: profesional, subject: 'Prueba' })).rejects.toThrow();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Envío cancelado'));
    expect(mensajes).toHaveLength(0);
  });
});
