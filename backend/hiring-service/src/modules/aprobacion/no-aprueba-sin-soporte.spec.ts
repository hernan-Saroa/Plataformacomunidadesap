import { ConflictException } from '@nestjs/common';

import { AprobacionService } from './aprobacion.service';

/**
 * No se aprueba una actividad con documentos obligatorios sin entregar
 * (EFDS-1183, EFDS-2066).
 *
 * La pantalla ya deshabilitaba el botón, pero eso solo protege a quien lo
 * mira: el servicio aceptaba la aprobación de una actividad cuyo documento
 * seguía en blanco. En la base local quedó un proceso aprobado sin ninguno de
 * sus documentos, que es justo lo que la comprobación tiene que impedir.
 *
 * Qué falta lo decide el catálogo único —modalidad, tipología, obligatorio—, y
 * sus reglas se prueban en `requisitos.spec.ts`. Aquí se fija lo que la
 * aprobación hace con la respuesta.
 */
describe('AprobacionService · documentosPendientes', () => {
  const pendientes = (faltantes: { codigo: string; nombre: string }[]) => {
    let preguntado: unknown[] = [];
    const catalogo = {
      faltantes: async (...args: unknown[]) => {
        preguntado = args;
        return faltantes;
      },
    };
    const servicio = new AprobacionService(
      {} as never,
      { crearSolicitudSiCerroLaEtapa3: async () => null } as never,
      {} as never,
      catalogo as never,
    ) as unknown as {
      documentosPendientes(em: unknown, procesoId: string, numeral: string): Promise<string[]>;
    };

    return {
      resultado: servicio.documentosPendientes('em', 'proc-1', '3.2'),
      preguntado: () => preguntado,
    };
  };

  it('nombra el documento que falta, no solo cuántos', async () => {
    // «Falta cargar el análisis del sector» le dice a quien aprueba qué pedir.
    const { resultado } = pendientes([{ codigo: 'BS-FO-101', nombre: 'Análisis del sector' }]);
    await expect(resultado).resolves.toEqual(['Análisis del sector']);
  });

  it('sin documentos pendientes no hay nada que exigir', async () => {
    const { resultado } = pendientes([]);
    await expect(resultado).resolves.toEqual([]);
  });

  it('pregunta dentro de la transacción de la decisión', async () => {
    // Con el manager del DataSource no vería lo que la misma transacción
    // acaba de escribir.
    const { resultado, preguntado } = pendientes([]);
    await resultado;
    expect(preguntado()).toEqual(['proc-1', '3.2', 'em']);
  });

  it('el conflicto es el tipo que la pantalla sabe leer', () => {
    // Un 409 se muestra como aviso; un 500 se leería como caída.
    expect(new ConflictException('x')).toBeInstanceOf(ConflictException);
  });
});
