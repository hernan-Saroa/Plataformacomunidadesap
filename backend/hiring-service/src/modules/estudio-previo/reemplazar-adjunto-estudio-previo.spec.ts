import { BadRequestException, ConflictException } from '@nestjs/common';

import { EstudioPrevioService } from './estudio-previo.service';
import { NUMERAL_ESTUDIO_PREVIO } from '../../entities/proceso-actividad.entity';
import { Documento } from '../../entities/documento.entity';

/**
 * Reemplazar un documento adjuntado al estudio previo (EFDS-2067).
 *
 * `retirarAdjunto` (EFDS-1146) resolvió quitar un adjunto equivocado, pero
 * cargar el correcto seguía siendo una segunda operación suelta, sin nada
 * que dijera que las dos estaban relacionadas. Reemplazar es retirar y
 * adjuntar en una transacción, con una sola fila de traza que enlaza el
 * documento que salió con el que entró en su lugar.
 */
describe('EstudioPrevioService · reemplazarAdjunto', () => {
  const actividad = (estado: string) => ({ id: 'act-1', procesoId: 'p-1', numeral: NUMERAL_ESTUDIO_PREVIO, estado });
  const expediente = { id: 'exp-1', procesoId: 'p-1' };
  const anterior = (extra: Partial<Documento> = {}) =>
    ({
      id: 'doc-viejo',
      expedienteId: 'exp-1',
      numeral: NUMERAL_ESTUDIO_PREVIO,
      tipo: 'ADJUNTO',
      nombre: 'anexo-v1.pdf',
      archivoNombreOriginal: 'anexo-v1.pdf',
      ...extra,
    }) as Documento;

  const archivoNuevo = {
    filename: 'hash-nuevo.pdf',
    originalname: 'anexo-v2.pdf',
    mimetype: 'application/pdf',
    size: 1024,
  };

  const servicio = (opts: { actividad: any; expediente: any; documento: any }) => {
    const removidos: any[] = [];
    const documentosCreados: any[] = [];
    const trazas: any[] = [];

    const em = {
      findOne: async (entidad: any) => {
        if (entidad?.name === 'ProcesoActividad') return opts.actividad;
        if (entidad?.name === 'Expediente') return opts.expediente;
        if (entidad?.name === 'Documento') return opts.documento;
        return null;
      },
      save: async (entidad: any, valores: any) => {
        if (entidad?.name === 'Trazabilidad') {
          trazas.push(valores);
          return valores;
        }
        // Documento: se distingue de la traza por ser el otro save de la
        // transacción — es el documento nuevo, no el que se retira.
        documentosCreados.push(valores);
        return { id: 'doc-nuevo', ...valores };
      },
      getRepository: () => ({
        remove: async (doc: any) => {
          removidos.push(doc);
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
      {} as never,
      {} as never,
    );

    return { instancia, removidos, documentosCreados, trazas };
  };

  const acceso = { userId: 'u-1', userName: 'gestor@esap.edu.co' } as never;

  it('retira el anterior, adjunta el nuevo y deja una sola traza que los enlaza', async () => {
    const { instancia, removidos, documentosCreados, trazas } = servicio({
      actividad: actividad('BORRADOR'),
      expediente,
      documento: anterior(),
    });

    const nuevo = await instancia.reemplazarAdjunto(
      'p-1',
      'doc-viejo',
      archivoNuevo,
      'hash-abc',
      acceso,
    );

    expect(nuevo.id).toBe('doc-nuevo');

    // El anterior se borra, igual que en retirarAdjunto...
    expect(removidos).toHaveLength(1);
    expect(removidos[0].id).toBe('doc-viejo');

    // ...el nuevo queda creado con los datos del archivo que entró...
    expect(documentosCreados).toHaveLength(1);
    expect(documentosCreados[0]).toMatchObject({
      numeral: NUMERAL_ESTUDIO_PREVIO,
      tipo: 'ADJUNTO',
      nombre: 'anexo-v2.pdf',
      hashSha256: 'hash-abc',
    });

    // ...y una sola fila de traza dice que fue un reemplazo, no dos acciones
    // sueltas sin relación aparente.
    expect(trazas).toHaveLength(1);
    expect(trazas[0]).toMatchObject({
      entidad: 'documento',
      accion: 'REEMPLAZAR',
      detalle: expect.objectContaining({ reemplaza: 'doc-viejo', nombreAnterior: 'anexo-v1.pdf' }),
    });
  });

  it('no admite reemplazar si el estudio previo ya fue enviado a revisión', async () => {
    const { instancia } = servicio({
      actividad: actividad('EN_REVISION'),
      expediente,
      documento: anterior(),
    });

    await expect(
      instancia.reemplazarAdjunto('p-1', 'doc-viejo', archivoNuevo, 'hash-abc', acceso),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('no deja reemplazar el snapshot de lo que ya se envió a revisión', async () => {
    const { instancia } = servicio({
      actividad: actividad('BORRADOR'),
      expediente,
      documento: anterior({ tipo: 'SNAPSHOT_FORMULARIO' }),
    });

    await expect(
      instancia.reemplazarAdjunto('p-1', 'doc-viejo', archivoNuevo, 'hash-abc', acceso),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no admite reemplazar un documento de otra actividad', async () => {
    const { instancia } = servicio({
      actividad: actividad('BORRADOR'),
      expediente,
      documento: anterior({ numeral: '5.1' }),
    });

    await expect(
      instancia.reemplazarAdjunto('p-1', 'doc-viejo', archivoNuevo, 'hash-abc', acceso),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
