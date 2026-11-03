import { ActoAdjudicacion } from '../../entities/acto-adjudicacion.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { InformeDefinitivo } from '../../entities/informe-definitivo.entity';
import { Oferente } from '../../entities/oferente.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ContratosService } from './contratos.service';

/**
 * La TVEC no tiene acto de adjudicación (la matriz excluye la 7.3): se compra
 * por la tienda virtual. Desde que la 8.1 mira el acto, la TVEC no llegaba al
 * contrato; vale entonces el informe definitivo publicado (7.2).
 *
 * Servicio con la base de datos fuera del camino: un `em` que responde por
 * entidad.
 */
function emCon(datos: Map<unknown, unknown>) {
  return {
    getRepository: (entidad: unknown) => ({
      findOne: async () => datos.get(entidad) ?? null,
    }),
  } as any;
}

const servicio = () =>
  new ContratosService({} as any, {} as any, {} as any) as unknown as {
    adjudicacionVigente: (em: any, procesoId: string) => Promise<any>;
  };

describe('adjudicacionVigente sin acto de adjudicación', () => {
  it('en la TVEC toma la ganadora y el valor del informe definitivo', async () => {
    const em = emCon(
      new Map<unknown, unknown>([
        [ActoAdjudicacion, null],
        [Proceso, { id: 'p-1', modalidad: 'ABREVIADA_TVEC' }],
        [ActividadExcluida, { numeral: '7.3', modalidad: 'ABREVIADA_TVEC' }],
        [
          InformeDefinitivo,
          {
            estado: 'PUBLICADO',
            resultado: {
              ganadora: { oferenteId: 'of-1', nombre: 'Proveedor SAS', identificacion: '900111222' },
              valorEvaluado: 93_000_000,
            },
          },
        ],
        [Oferente, { id: 'of-1', identificacion: '900111222', valorOfertado: '95000000' }],
      ]),
    );

    const vigente = await servicio().adjudicacionVigente(em, 'p-1');

    expect(vigente).toEqual({
      fuente: 'el informe definitivo (7.2)',
      valor: 93_000_000,
      contratista: { nombre: 'Proveedor SAS', documento: '900111222', tipo: null },
    });
  });

  it('donde la 7.3 aplica, sin acto no hay adjudicación', async () => {
    const em = emCon(
      new Map<unknown, unknown>([
        [ActoAdjudicacion, null],
        [Proceso, { id: 'p-1', modalidad: 'LICITACION_PUBLICA' }],
        [ActividadExcluida, null],
      ]),
    );

    expect(await servicio().adjudicacionVigente(em, 'p-1')).toBeNull();
  });
});
