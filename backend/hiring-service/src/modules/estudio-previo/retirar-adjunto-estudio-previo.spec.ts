import { BadRequestException, ConflictException } from '@nestjs/common';

import { EstudioPrevioService } from './estudio-previo.service';
import { NUMERAL_ESTUDIO_PREVIO } from '../../entities/proceso-actividad.entity';
import { Documento } from '../../entities/documento.entity';

/**
 * Retirar un documento adjuntado al estudio previo (numeral 3.1).
 *
 * Cargar existía desde EFDS-1183 pero no su contraparte: una vez adjuntado,
 * el gestor no podía quitar un documento equivocado sin abrir un caso con
 * soporte. Replica el mismo criterio que ya usa `documentos-actividad` para
 * el resto de actividades: se borra la fila y se conserva el archivo en
 * disco, porque el expediente debe poder probar qué se entregó.
 */
describe('EstudioPrevioService · retirarAdjunto', () => {
  const actividad = (estado: string) => ({ id: 'act-1', procesoId: 'p-1', numeral: NUMERAL_ESTUDIO_PREVIO, estado });
  const expediente = { id: 'exp-1', procesoId: 'p-1' };
  const documento = (extra: Partial<Documento> = {}) =>
    ({
      id: 'doc-1',
      expedienteId: 'exp-1',
      numeral: NUMERAL_ESTUDIO_PREVIO,
      tipo: 'ADJUNTO',
      nombre: 'anexo.pdf',
      archivoNombreOriginal: 'anexo.pdf',
      ...extra,
    }) as Documento;

  const servicio = (opts: { actividad: any; expediente: any; documento: any }) => {
    const removido: any[] = [];
    const trazas: any[] = [];

    const em = {
      findOne: async (entidad: any, criterio: any) => {
        if (entidad?.name === 'ProcesoActividad') return opts.actividad;
        if (entidad?.name === 'Expediente') return opts.expediente;
        if (entidad?.name === 'Documento') return opts.documento;
        return null;
      },
      save: async (_entidad: any, valores: any) => {
        trazas.push(valores);
        return valores;
      },
      getRepository: () => ({
        remove: async (doc: any) => {
          removido.push(doc);
          return doc;
        },
      }),
    };

    const dataSource = {
      transaction: async (cb: (em: any) => Promise<any>) => cb(em),
    };

    const instancia = new EstudioPrevioService(
      dataSource as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    return { instancia, removido, trazas };
  };

  it('retira el adjunto, deja la traza y conserva el archivo en disco', async () => {
    const { instancia, removido, trazas } = servicio({
      actividad: actividad('BORRADOR'),
      expediente,
      documento: documento(),
    });

    await expect(
      instancia.retirarAdjunto('p-1', 'doc-1', { userId: 'u-1', userName: 'gestor@esap.edu.co' } as never),
    ).resolves.toEqual({ retirado: true });

    // La fila se borra...
    expect(removido).toHaveLength(1);
    expect(removido[0].id).toBe('doc-1');

    // ...pero queda la traza de que se cargó y de que se retiró.
    expect(trazas).toHaveLength(1);
    expect(trazas[0]).toMatchObject({ entidad: 'documento', entidadId: 'doc-1', accion: 'ANULAR' });
  });

  it('no admite retirar adjuntos si el estudio previo ya fue enviado a revisión', async () => {
    const { instancia } = servicio({
      actividad: actividad('EN_REVISION'),
      expediente,
      documento: documento(),
    });

    await expect(
      instancia.retirarAdjunto('p-1', 'doc-1', { userId: 'u-1', userName: 'gestor@esap.edu.co' } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('no deja retirar el snapshot de lo que ya se envió a revisión', async () => {
    const { instancia } = servicio({
      actividad: actividad('BORRADOR'),
      expediente,
      documento: documento({ tipo: 'SNAPSHOT_FORMULARIO' }),
    });

    await expect(
      instancia.retirarAdjunto('p-1', 'doc-1', { userId: 'u-1', userName: 'gestor@esap.edu.co' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
