import { BadRequestException } from '@nestjs/common';

import { PARAMETROS_POR_DEFECTO, ParametrosAlertaService } from './parametros-alerta.service';

/** Los plazos de las alertas, dentro de sus límites (EFDS-1183). */
describe('ParametrosAlertaService', () => {
  const acceso = { userId: 'u1', userName: 'director@esap.edu.co', roles: [], puedeEditar: true } as never;

  it('sin la tabla, usa los valores de siempre en vez de caerse', async () => {
    // La migración 069 sin aplicar no debe tumbar las alertas.
    const srv = new ParametrosAlertaService({ query: jest.fn().mockRejectedValue(new Error('no existe')) } as never);

    expect(await srv.listar()).toEqual(PARAMETROS_POR_DEFECTO);
    expect((await srv.valores()).hora_aviso).toBe(7);
  });

  it('lee lo que la Dirección configuró', async () => {
    const srv = new ParametrosAlertaService({
      query: jest.fn().mockResolvedValue([
        { clave: 'anticipacion_amparo', valor: '45', minimo: '1', maximo: '180', descripcion: 'x' },
      ]),
    } as never);

    const valores = await srv.valores();
    expect(valores.anticipacion_amparo).toBe(45);
    expect(valores.anticipacion_cdp).toBe(30);
  });

  it('rechaza un valor fuera de su rango, diciendo cuál es', async () => {
    const transaction = jest.fn();
    const srv = new ParametrosAlertaService({
      query: jest.fn().mockRejectedValue(new Error('sin tabla')),
      transaction,
    } as never);

    await expect(srv.guardar({ hora_aviso: 24 }, acceso)).rejects.toThrow(BadRequestException);
    await expect(srv.guardar({ hora_aviso: 7.5 }, acceso)).rejects.toThrow('entre 0 y 23');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rechaza claves que no existen', async () => {
    const srv = new ParametrosAlertaService({ query: jest.fn().mockRejectedValue(new Error('x')) } as never);

    await expect(srv.guardar({ inventado: 3 }, acceso)).rejects.toThrow('No existe el parámetro inventado');
  });
});
