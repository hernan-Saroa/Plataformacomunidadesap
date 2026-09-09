import { BadRequestException } from '@nestjs/common';

import { ConfiguracionService } from './configuracion.service';

/**
 * Qué actividades admiten que se les configure una aprobación (EFDS-1183).
 *
 * El caso interesante es el estudio previo, que ya tiene la suya y guarda el
 * estado en la misma columna: si además se le configurara la genérica, la
 * pantalla mostraría dos trámites disputándose un único estado.
 */
describe('ConfiguracionService · guardarAprobacion', () => {
  /**
   * Sin base de datos: lo que se comprueba ocurre antes de abrir la
   * transacción, y montar el DataSource solo para eso probaría TypeORM.
   */
  const servicio = () => new ConfiguracionService({} as never);

  it('rechaza configurarle aprobación al estudio previo', async () => {
    await expect(
      servicio().guardarAprobacion('3.1', {
        requiereAprobacion: true,
        roles: ['DIRECTOR_CONTRATACION'],
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lo explica en vez de fallar sin más', async () => {
    // Quien configura tiene que entender que la 3.1 no está sin revisión, sino
    // revisada de otra forma; si no, lo intentará otra vez por otro camino.
    await expect(
      servicio().guardarAprobacion('3.1', {
        requiereAprobacion: true,
        roles: ['DIRECTOR_CONTRATACION'],
      } as never),
    ).rejects.toThrow(/ya tiene su propia aprobación/);
  });

  it('deja retirarla, que no crea ningún conflicto', async () => {
    // Guardar `requiereAprobacion: false` sobre la 3.1 solo deroga lo que
    // hubiera: negarlo dejaría sin salida a quien la marcó por error. Se
    // comprueba que la guarda deja pasar —llega a la transacción, que aquí no
    // existe— y no que la escritura funcione, que es cosa de la base.
    const transaccion = jest.fn().mockResolvedValue({ requiereAprobacion: false });
    const srv = new ConfiguracionService({ transaction: transaccion } as never);

    await srv.guardarAprobacion('3.1', { requiereAprobacion: false } as never);

    expect(transaccion).toHaveBeenCalled();
  });

  it('no estorba a las demás actividades', async () => {
    const transaccion = jest.fn().mockResolvedValue({ requiereAprobacion: true });
    const srv = new ConfiguracionService({ transaction: transaccion } as never);

    await srv.guardarAprobacion('5.9', {
      requiereAprobacion: true,
      roles: ['DIRECTOR_CONTRATACION'],
    } as never);

    expect(transaccion).toHaveBeenCalled();
  });
});
