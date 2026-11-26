import { Logger } from '@nestjs/common';
import { JuridicaEmailService, problemaDeTraslado } from './juridica-email.service';

/**
 * EFDS-2238 — sin buzón judicial «Enviar a Jurídica» no llega a Judiciales. Que se note al ARRANCAR:
 * error visible en el log y, en producción, el servicio no arranca.
 */
describe('EFDS-2238 :: configuración del traslado a Judiciales al arrancar', () => {
  const entorno = process.env;
  const arrancar = (env: Record<string, string | undefined>) => {
    process.env = { ...entorno, MAIL_ENVIRONMENT: undefined, JURIDICA_EMAIL: undefined, ...env };
    const s = new JuridicaEmailService({} as any, {} as any);
    return () => s.onModuleInit();
  };
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => { process.env = entorno; jest.restoreAllMocks(); });

  it('qué falta, con la misma regla del envío', () => {
    expect(problemaDeTraslado({ MAIL_ENVIRONMENT: 'qa', JURIDICA_EMAIL: 'judicial@qa.invalid' })).toBeNull();
    expect(problemaDeTraslado({ MAIL_ENVIRONMENT: 'qa' })).toMatch(/JURIDICA_EMAIL/);
    expect(problemaDeTraslado({ JURIDICA_EMAIL: 'judicial@qa.invalid' })).toMatch(/MAIL_ENVIRONMENT/);
    expect(problemaDeTraslado({ MAIL_ENVIRONMENT: 'staging', JURIDICA_EMAIL: 'judicial@qa.invalid' })).toMatch(/MAIL_ENVIRONMENT/);
    expect(problemaDeTraslado({ MAIL_ENVIRONMENT: 'prod', JURIDICA_EMAIL: 'no-es-correo' })).toMatch(/JURIDICA_EMAIL/);
  });

  it('producción sin buzón judicial: NO arranca', () => {
    const error = jest.spyOn(Logger.prototype, 'error');
    expect(arrancar({ MAIL_ENVIRONMENT: 'prod' })).toThrow(/Falta la configuración de buzones: «Enviar a Jurídica» no llegará a Judiciales/);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('producción con buzón judicial: arranca', () => {
    expect(arrancar({ MAIL_ENVIRONMENT: 'prod', JURIDICA_EMAIL: 'judicial@ejemplo.invalid' })).not.toThrow();
  });

  it('QA sin buzón: arranca, pero deja el error visible', () => {
    const error = jest.spyOn(Logger.prototype, 'error');
    expect(arrancar({ MAIL_ENVIRONMENT: 'qa' })).not.toThrow();
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/^Falta la configuración de buzones/));
  });
});
