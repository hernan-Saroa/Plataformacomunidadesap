import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { TrasladoService } from './traslado.service';

/**
 * Anular el informe reabre la 6.5 y la 6.6.
 *
 * Lo recibido y respondido era sobre el informe anulado: si quedaran
 * aprobadas, el riel abriría la 6.7 al trasladar el siguiente, con su término
 * todavía corriendo.
 */
function conActividades(filas: Partial<ProcesoActividad>[]) {
  const guardadas: Partial<ProcesoActividad>[] = [];
  const em = {
    getRepository: () => ({
      find: async () => filas,
    }),
    save: async (fila: Partial<ProcesoActividad>) => {
      guardadas.push({ ...fila });
      return fila;
    },
  };
  const servicio = new TrasladoService({ manager: {} } as any, {} as any);
  const reabrir = (procesoId: string) =>
    (servicio as any).reabrirLasQueDependen(em, procesoId) as Promise<void>;
  return { reabrir, guardadas };
}

describe('TrasladoService · anular reabre lo que cuelga del informe', () => {
  it('devuelve a borrador la 6.5 y la 6.6 aprobadas', async () => {
    const { reabrir, guardadas } = conActividades([
      { numeral: '6.5', estado: 'APROBADO', revisadoPor: 'gestor', revisadoAt: new Date() },
      { numeral: '6.6', estado: 'APROBADO', revisadoPor: 'gestor', revisadoAt: new Date() },
    ]);

    await reabrir('p-1');

    expect(guardadas).toHaveLength(2);
    for (const fila of guardadas) {
      expect(fila.estado).toBe('BORRADOR');
      expect(fila.revisadoPor).toBeNull();
      expect(fila.revisadoAt).toBeNull();
    }
  });

  it('también la que estaba esperando aprobación', async () => {
    const { reabrir, guardadas } = conActividades([{ numeral: '6.6', estado: 'EN_REVISION' }]);

    await reabrir('p-1');

    expect(guardadas.map((f) => f.estado)).toEqual(['BORRADOR']);
  });

  it('no toca las que ya están en borrador ni las que no aplican', async () => {
    const { reabrir, guardadas } = conActividades([
      { numeral: '6.5', estado: 'BORRADOR' },
      { numeral: '6.6', estado: 'NO_APLICA' },
    ]);

    await reabrir('p-1');

    expect(guardadas).toHaveLength(0);
  });
});
