import { ConflictException } from '@nestjs/common';

import { AprobacionService } from './aprobacion.service';

/**
 * No se aprueba una actividad con formatos sin entregar (EFDS-1183).
 *
 * La pantalla ya deshabilitaba el botón, pero eso solo protege a quien lo
 * mira: el servicio aceptaba la aprobación de una actividad cuyo formato
 * seguía en blanco. En la base local quedó un proceso aprobado sin ninguno de
 * sus documentos, que es justo lo que la comprobación tiene que impedir.
 */
describe('AprobacionService · formatosPendientes', () => {
  const servicio = () => new AprobacionService({} as never);

  /** Llama al método privado, que nadie usa desde fuera del servicio. */
  const pendientes = (
    formatos: unknown[],
    entregados: unknown[],
    modalidad: string | null = 'LICITACION_PUBLICA',
    expediente: unknown = { id: 'exp-1' },
  ) => {
    const em = {
      getRepository: (entidad: { name: string }) => ({
        find: async () => (entidad.name === 'Plantilla' ? formatos : entregados),
        findOne: async () => expediente,
      }),
    };
    return (
      servicio() as unknown as {
        formatosPendientes(
          em: unknown,
          procesoId: string,
          numeral: string,
          modalidad: string | null,
        ): Promise<string[]>;
      }
    ).formatosPendientes(em, 'proc-1', '3.2', modalidad);
  };

  const formato = (id: string, codigo: string, modalidades: string[] = []) => ({
    id,
    codigo,
    modalidades,
  });

  it('nombra el formato que falta, no solo cuántos', async () => {
    // «Falta cargar BS-FO-101» le dice a quien aprueba qué pedir.
    await expect(pendientes([formato('f1', 'BS-FO-101')], [])).resolves.toEqual(['BS-FO-101']);
  });

  it('no reclama el que ya se entregó', async () => {
    await expect(
      pendientes([formato('f1', 'BS-FO-101')], [{ plantillaId: 'f1' }]),
    ).resolves.toEqual([]);
  });

  it('un adjunto suelto no cumple el requisito del formato', async () => {
    // Es el fallo que dejaba pasar la aprobación: el panel guardaba el soporte
    // sin atarlo al formato, así que el requisito seguía pendiente.
    await expect(
      pendientes([formato('f1', 'BS-FO-101')], [{ plantillaId: null }]),
    ).resolves.toEqual(['BS-FO-101']);
  });

  it('ignora los formatos de otra modalidad', async () => {
    await expect(
      pendientes([formato('f1', 'BS-FO-046', ['CONTRATACION_DIRECTA'])], []),
    ).resolves.toEqual([]);
  });

  it('sin formatos asignados no hay nada que exigir', async () => {
    // La mayoría de las actividades: exigir ahí bloquearía el flujo entero.
    await expect(pendientes([], [])).resolves.toEqual([]);
  });

  it('sin expediente abierto los da todos por pendientes', async () => {
    await expect(
      pendientes([formato('f1', 'BS-FO-101')], [], 'LICITACION_PUBLICA', null),
    ).resolves.toEqual(['BS-FO-101']);
  });

  it('el conflicto es el tipo que la pantalla sabe leer', () => {
    // Un 409 se muestra como aviso; un 500 se leería como caída.
    expect(new ConflictException('x')).toBeInstanceOf(ConflictException);
  });
});
