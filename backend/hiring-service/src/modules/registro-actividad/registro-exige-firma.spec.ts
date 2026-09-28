import { BadRequestException } from '@nestjs/common';

import { RegistroActividadService } from './registro-actividad.service';

/**
 * La firma con el token institucional, cuando la matriz la configuró
 * (EFDS-2070).
 *
 * El auth-service ya validó el código OTP antes de que esto se llame: lo que
 * este servicio comprueba es que llegó una evidencia con la forma esperada y
 * que no es una firma vieja reciclada de otro registro.
 */
describe('RegistroActividadService · la firma con el token institucional', () => {
  const servicio = () =>
    new RegistroActividadService({} as never, {} as never, {} as never, {} as never) as never as {
      exigirFirmaValida(firma: { id: string; fechaFirma: string; metodo: string } | undefined): void;
      exigeFirma(em: unknown, numeral: string): Promise<boolean>;
    };

  it('rechaza registrar sin evidencia cuando la actividad la exige', () => {
    expect(() => servicio().exigirFirmaValida(undefined)).toThrow(BadRequestException);
  });

  it('rechaza una firma vencida', () => {
    const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    expect(() =>
      servicio().exigirFirmaValida({ id: 'OTP-1', fechaFirma: haceUnaHora, metodo: 'OTP_EMAIL' }),
    ).toThrow(BadRequestException);
  });

  it('acepta una firma reciente', () => {
    const haceUnInstante = new Date().toISOString();

    expect(() =>
      servicio().exigirFirmaValida({
        id: 'OTP-1',
        fechaFirma: haceUnInstante,
        metodo: 'OTP_EMAIL',
      }),
    ).not.toThrow();
  });

  it('consulta la regla EXIGE_FIRMA vigente de la actividad', async () => {
    const em = {
      getRepository: () => ({
        findOne: async (opciones: any) => {
          expect(opciones.where.numeral).toBe('5.10');
          expect(opciones.where.tipo).toBe('EXIGE_FIRMA');
          return { id: 'regla-1' };
        },
      }),
    };

    await expect(servicio().exigeFirma(em, '5.10')).resolves.toBe(true);
  });

  it('no exige firma cuando no hay regla vigente', async () => {
    const em = { getRepository: () => ({ findOne: async () => null }) };

    await expect(servicio().exigeFirma(em, '5.10')).resolves.toBe(false);
  });
});
