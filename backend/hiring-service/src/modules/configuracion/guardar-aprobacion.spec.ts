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

  it('deja configurarle aprobación al estudio previo, como a las demás', async () => {
    // Antes se rechazaba: su ciclo estaba escrito en el código y el envío la
    // dejaba en revisión siempre, así que una segunda aprobación habría creado
    // dos trámites sobre la misma columna de estado. Ya no: el envío consulta
    // esta configuración, de modo que el trámite es uno solo.
    const transaccion = jest.fn().mockResolvedValue({ requiereAprobacion: true });
    const srv = new ConfiguracionService({ transaction: transaccion } as never);

    await srv.guardarAprobacion('3.1', {
      requiereAprobacion: true,
      roles: ['DIRECTOR_CONTRATACION'],
    } as never);

    expect(transaccion).toHaveBeenCalled();
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
