import { Logger } from '@nestjs/common';
import { EmailsService } from './emails.service';

/**
 * EFDS-2238 — reglas que se integraron sobre el cambio de Codex:
 *   · «Sin evento es un correo del sistema y sale siempre» (EFDS-2406) SIGUE vigente, también cuando el
 *     correo trae `modulo`: no pasa por la configuración de notificaciones (ni compuerta, ni copias, ni desvío).
 *   · Única excepción intencional: un correo de Control Disciplinario sin evento NO sale hacia el buzón de
 *     Judiciales. A Judiciales solo llega el traslado explícito (evento PLIEGO_CARGOS_TRASLADO_JURIDICA).
 *   · Sin configuración de buzones no sale ningún correo: se avisa al ARRANCAR y en producción no arranca.
 */
describe('EFDS-2238 :: correo del sistema, buzón judicial y arranque', () => {
  const judicial = 'judicial@qa.invalid';
  const entorno = process.env;
  const qa = { MAIL_ENVIRONMENT: 'qa', JURIDICA_EMAIL: judicial, MAIL_TEST_INBOX: 'avisos@qa.invalid', EMAIL_PROVIDER: 'smtp' };
  let compuerta: { evaluar: jest.Mock; destinatariosAdicionales: jest.Mock; reservarCopiaCorreo: jest.Mock };
  let service: EmailsService;
  let enviado: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...entorno, ...qa };
    compuerta = {
      evaluar: jest.fn().mockResolvedValue({ permitido: true, modulo: 'control-disciplinario', clave: 'X' }),
      destinatariosAdicionales: jest.fn().mockResolvedValue([]),
      reservarCopiaCorreo: jest.fn().mockResolvedValue(true),
    };
    service = new EmailsService(compuerta as any);
    enviado = jest.spyOn(service, 'sendEmail').mockResolvedValue({ sent: true } as any);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { process.env = entorno; jest.restoreAllMocks(); });

  it('sin evento, aunque traiga modulo, es correo del sistema: sale sin pasar por la configuración', async () => {
    const r = await service.enviarSiPermitido({ to: 'profesional@example.test', subject: 'S', html: '<p>x</p>', modulo: 'control-disciplinario' } as any);
    expect(r).toMatchObject({ sent: true });
    expect(compuerta.evaluar).not.toHaveBeenCalled();
    expect(compuerta.destinatariosAdicionales).not.toHaveBeenCalled();
    expect(enviado).toHaveBeenCalledTimes(1);
  });

  it('un correo de Disciplinario sin evento hacia Judiciales no sale', async () => {
    const r = await service.enviarSiPermitido({ to: 'Judicial@QA.invalid ', subject: 'S', html: '<p>x</p>', modulo: 'control-disciplinario' } as any);
    expect(r).toMatchObject({ sent: false, omitida: true, motivo: 'destino_judicial_reservado' });
    expect(enviado).not.toHaveBeenCalled();
  });

  it('el traslado explícito (PLIEGO_CARGOS_TRASLADO_JURIDICA) sí llega a Judiciales', async () => {
    const r = await service.enviarSiPermitido({ to: judicial, subject: 'S', html: '<p>x</p>', modulo: 'control-disciplinario', evento: 'PLIEGO_CARGOS_TRASLADO_JURIDICA' } as any);
    expect(r).toMatchObject({ sent: true });
    expect(enviado).toHaveBeenCalledTimes(1);
  });

  it('otro aviso con evento de Disciplinario hacia Judiciales no sale (aprobación de autos, asignación, noticias…)', async () => {
    const r = await service.enviarSiPermitido({ to: judicial, subject: 'S', html: '<p>x</p>', modulo: 'control-disciplinario', evento: 'AUTO_APROBADO' } as any);
    expect(r).toMatchObject({ sent: false, omitida: true, motivo: 'destino_judicial_reservado' });
    expect(enviado).not.toHaveBeenCalled();
  });

  describe('configuración de buzones al arrancar', () => {
    const arrancar = (env: Record<string, string | undefined>) => {
      process.env = { ...entorno, MAIL_ENVIRONMENT: undefined, JURIDICA_EMAIL: undefined, MAIL_TEST_INBOX: undefined, EMAIL_PROVIDER: undefined, ...env };
      const s = new EmailsService();
      return () => s.onModuleInit();
    };

    it('producción SIN buzón judicial: el servicio NO arranca, con un mensaje claro', () => {
      const error = jest.spyOn(Logger.prototype, 'error');
      expect(arrancar({ MAIL_ENVIRONMENT: 'prod' })).toThrow(/Falta la configuración de buzones: no se enviarán correos .*JURIDICA_EMAIL/);
      expect(error).toHaveBeenCalledWith(expect.stringMatching(/^Falta la configuración de buzones/));
    });

    it('producción con buzón judicial: arranca', () => {
      expect(arrancar({ MAIL_ENVIRONMENT: 'prod', JURIDICA_EMAIL: 'judicial@ejemplo.invalid' })).not.toThrow();
    });

    it('fuera de producción sin configuración: arranca, pero deja el error visible en el log', () => {
      const error = jest.spyOn(Logger.prototype, 'error');
      expect(arrancar({ MAIL_ENVIRONMENT: 'qa' })).not.toThrow();
      expect(error).toHaveBeenCalledWith(expect.stringMatching(/^Falta la configuración de buzones: no se enviarán correos/));
    });

    it('QA bien configurado (capturador .invalid y SMTP): arranca sin error', () => {
      const error = jest.spyOn(Logger.prototype, 'error');
      expect(arrancar(qa)).not.toThrow();
      expect(error).not.toHaveBeenCalled();
    });

    it('al arrancar se usa la MISMA regla que bloquea cada envío', () => {
      process.env = { ...entorno, MAIL_ENVIRONMENT: 'qa', JURIDICA_EMAIL: 'judicial@esap.edu.co', MAIL_TEST_INBOX: 'avisos@qa.invalid', EMAIL_PROVIDER: 'smtp' };
      expect(new EmailsService().problemaDeBuzones()).toMatch(/buzón de prueba/);
    });
  });
});
