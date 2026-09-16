import { BadRequestException } from '@nestjs/common';

import { AudienciaService } from './audiencia.service';

/**
 * La adjudicación va después de un traslado cerrado (EFDS-1485).
 *
 * Mientras el término corra o queden escritos sin responder, la evaluación
 * todavía se puede mover, y adjudicar sobre algo que se puede mover es lo que
 * el debido proceso quiere evitar.
 *
 * Lo que se prueba aquí no es que bloquee —eso lo haría cualquier `if`— sino
 * **que diga cuál de los pasos falta**: el usuario que llega a esta pantalla
 * necesita saber si le falta trasladar o cerrar, y son dos acciones distintas
 * en dos actividades distintas del riel.
 */
function servicio() {
  return new AudienciaService({ manager: {} } as any);
}

const em = (informes: any[]) =>
  ({
    getRepository: () => ({ find: async () => informes }),
  }) as any;

describe('exigirTrasladoCerrado', () => {
  it('deja seguir cuando el traslado está cerrado', async () => {
    const informe = { id: 'i1', numero: 1, estado: 'CERRADO' };

    await expect((servicio() as any).exigirTrasladoCerrado(em([informe]), 'p1')).resolves.toBe(
      informe,
    );
  });

  it('sin informe remite al traslado y no a la audiencia', async () => {
    await expect((servicio() as any).exigirTrasladoCerrado(em([]), 'p1')).rejects.toThrow(
      /va después del traslado/i,
    );
  });

  it('con el informe en borrador dice que falta trasladarlo', async () => {
    // El error tiene que distinguirse del siguiente: aquí los oferentes ni
    // siquiera se han enterado del resultado.
    await expect(
      (servicio() as any).exigirTrasladoCerrado(em([{ id: 'i1', estado: 'BORRADOR' }]), 'p1'),
    ).rejects.toThrow(/no se ha trasladado/i);
  });

  it('con el traslado corriendo dice que hay que cerrarlo', async () => {
    await expect(
      (servicio() as any).exigirTrasladoCerrado(em([{ id: 'i1', estado: 'TRASLADADO' }]), 'p1'),
    ).rejects.toThrow(/sigue abierto/i);
  });

  it('ignora los informes anulados y mira el que está en juego', async () => {
    // Un informe anulado y su reemplazo conviven en el expediente: mirar el
    // primero de la lista daría el estado equivocado.
    const em2 = em([
      { id: 'i2', numero: 2, estado: 'ANULADO' },
      { id: 'i1', numero: 1, estado: 'CERRADO' },
    ]);

    await expect((servicio() as any).exigirTrasladoCerrado(em2, 'p1')).resolves.toMatchObject({
      id: 'i1',
    });
  });

  it('todos los rechazos son de petición y no de servidor', async () => {
    // Que falte un paso previo es un problema del flujo, no un fallo: la
    // pantalla tiene que poder mostrarlo como una instrucción.
    await expect((servicio() as any).exigirTrasladoCerrado(em([]), 'p1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
