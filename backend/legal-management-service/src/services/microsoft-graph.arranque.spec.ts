import { Logger } from '@nestjs/common';
import { MicrosoftGraphService } from './microsoft-graph.service';

/**
 * EFDS-2238 — sin ambiente o sin buzón judicial, Gestión Legal rechaza los traslados de Disciplinario.
 * Que se note al ARRANCAR: error visible y, en producción, el servicio no arranca.
 */
describe('EFDS-2238 :: Centro de Comunicaciones, configuración de buzones al arrancar', () => {
  const entorno = process.env;
  const arrancar = (env: Record<string, string | undefined>) => {
    process.env = { ...entorno, MAIL_ENVIRONMENT: undefined, JURIDICA_EMAIL: undefined, ...env };
    const s = new MicrosoftGraphService();
    return () => s.onModuleInit();
  };
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => { process.env = entorno; jest.restoreAllMocks(); });

  it('producción sin buzón judicial: NO arranca', () => {
    expect(arrancar({ MAIL_ENVIRONMENT: 'prod' })).toThrow(/Falta la configuración de buzones: no se recibirán traslados/);
  });

  it('producción con buzón judicial: arranca', () => {
    expect(arrancar({ MAIL_ENVIRONMENT: 'prod', JURIDICA_EMAIL: 'judicial@ejemplo.invalid' })).not.toThrow();
  });

  it('fuera de producción sin configuración: arranca con el error visible', () => {
    const error = jest.spyOn(Logger.prototype, 'error');
    expect(arrancar({ MAIL_ENVIRONMENT: 'pre' })).not.toThrow();
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/^Falta la configuración de buzones/));
    expect(arrancar({})).not.toThrow(); // sin MAIL_ENVIRONMENT no se sabe si es producción: avisa, no tumba
  });
});
