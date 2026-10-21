import { BadRequestException } from '@nestjs/common';

import { EstudioPrevioService } from './estudio-previo.service';

/**
 * Corregir el valor estimado del proceso.
 *
 * Se digitaba al crear el proceso y no había dónde corregirlo: 100 millones
 * que eran 10 se quedaban así, aunque el abogado devolviera el estudio previo
 * por eso. La corrección pasa por los mismos umbrales que la creación.
 */
describe('EstudioPrevioService · cambiarCuantia', () => {
  const MINIMA = { codigo: 'MINIMA_CUANTIA', nombre: 'Mínima Cuantía', activa: true };
  const LICITACION = { codigo: 'LICITACION_PUBLICA', nombre: 'Licitación Pública', activa: true };
  const acceso = { userId: 'u-1', userName: 'area@esap.edu.co' } as never;

  const servicio = (opts: { valor: number; modalidad: string; umbralRechaza?: boolean }) => {
    const proceso = { id: 'p-1', valorEstimado: opts.valor, modalidad: opts.modalidad };
    const guardados: any[] = [];
    const trazas: any[] = [];
    const reaplicadas: string[] = [];

    const em = {
      findOne: async (_entidad: any, { where }: any) =>
        [MINIMA, LICITACION].find((m) => m.codigo === where.codigo) ?? null,
      save: async (entidad: any, valores: any) => {
        (entidad?.name === 'Proceso' ? guardados : trazas).push({ ...valores });
        return valores;
      },
    };

    const umbrales = {
      exigirModalidadPermitida: async (_valor: number, modalidad: any) => {
        if (opts.umbralRechaza && modalidad.codigo !== LICITACION.codigo) {
          throw new BadRequestException('supera el umbral de licitación pública');
        }
      },
    };
    const configuracion = {
      reaplicarModalidad: async (_em: any, _id: string, codigo: string) => {
        reaplicadas.push(codigo);
        return [];
      },
    };

    const instancia = new EstudioPrevioService(
      { transaction: async (cb: (em: any) => Promise<any>) => cb(em) } as never,
      umbrales as never,
      configuracion as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    Object.assign(instancia as any, {
      exigirPaqueteEditable: async () => undefined,
      validarEtapa: async () => proceso,
      obtenerActividad: async () => ({ id: 'act-1' }),
      obtener: async () => ({ proceso }),
    });

    return { instancia, proceso, guardados, trazas, reaplicadas };
  };

  it('corrige el valor sin tocar la modalidad y deja la traza con el anterior', async () => {
    const { instancia, guardados, trazas, reaplicadas } = servicio({
      valor: 100_000_000,
      modalidad: 'MINIMA_CUANTIA',
    });

    await instancia.cambiarCuantia('p-1', { valorEstimado: 10_000_000 }, acceso);

    expect(guardados).toEqual([
      expect.objectContaining({ valorEstimado: 10_000_000, modalidad: 'MINIMA_CUANTIA' }),
    ]);
    expect(reaplicadas).toEqual([]);
    expect(trazas).toEqual([
      expect.objectContaining({
        accion: 'CAMBIAR_VALOR',
        detalle: { valorEstimado: 10_000_000, valorAnterior: 100_000_000 },
      }),
    ]);
  });

  it('rechaza un valor que obliga a licitación si la modalidad sigue siendo de menor cuantía', async () => {
    const { instancia, guardados } = servicio({
      valor: 10_000_000,
      modalidad: 'MINIMA_CUANTIA',
      umbralRechaza: true,
    });

    await expect(
      instancia.cambiarCuantia('p-1', { valorEstimado: 9_000_000_000 }, acceso),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(guardados).toEqual([]);
  });

  it('acepta ese valor si llega con la modalidad que exige, y recalcula las actividades', async () => {
    const { instancia, guardados, trazas, reaplicadas } = servicio({
      valor: 10_000_000,
      modalidad: 'MINIMA_CUANTIA',
      umbralRechaza: true,
    });

    await instancia.cambiarCuantia(
      'p-1',
      { valorEstimado: 9_000_000_000, modalidad: 'LICITACION_PUBLICA' },
      acceso,
    );

    expect(guardados[0]).toMatchObject({
      valorEstimado: 9_000_000_000,
      modalidad: 'LICITACION_PUBLICA',
    });
    expect(reaplicadas).toEqual(['LICITACION_PUBLICA']);
    expect(trazas.map((t) => t.accion)).toEqual(['CAMBIAR_VALOR', 'CAMBIAR_MODALIDAD']);
  });

  it('no escribe nada si no cambia ni el valor ni la modalidad', async () => {
    const { instancia, guardados, trazas } = servicio({
      valor: 10_000_000,
      modalidad: 'MINIMA_CUANTIA',
    });

    await instancia.cambiarCuantia('p-1', { valorEstimado: 10_000_000 }, acceso);

    expect(guardados).toEqual([]);
    expect(trazas).toEqual([]);
  });
});
