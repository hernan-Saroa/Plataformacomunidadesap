import { ProcesoResumen } from '../../types';
import { PasoConDatos } from '../proceso/situacionDelProceso';

/**
 * El flujo de un proceso a partir de la fila del listado.
 *
 * El listado no trae el catálogo con `aplica`: lo que la modalidad excluye se
 * instancia en NO_APLICA, así que de ahí se deduce. La 3.1 se asegura siempre,
 * con el estado del estudio previo: un proceso recién creado puede no tener
 * todavía sus filas, y sin ella la situación lo daría por terminado.
 *
 * `construida` llega de fuera porque es el mismo `TIENEN_PANEL` del riel: la
 * secuencia salta lo que nadie puede trabajar todavía, y el listado tiene que
 * saltar lo mismo.
 */
export function pasosDelResumen(
  proceso: Pick<ProcesoResumen, 'actividades' | 'estudioPrevio'>,
  construida: (numeral: string) => boolean,
): PasoConDatos[] {
  const estadoDelEstudio = proceso.estudioPrevio?.estado ?? null;

  const pasos: PasoConDatos[] = (proceso.actividades ?? []).map((a) => ({
    numeral: a.numeral,
    nombre: a.nombre ?? a.numeral,
    etapa: a.etapa ?? Number.parseInt(a.numeral, 10),
    estado: a.numeral === '3.1' ? (estadoDelEstudio ?? a.estado) : a.estado,
    aplica: a.estado !== 'NO_APLICA',
    construida: construida(a.numeral),
    actualizadoEn: a.actualizadoEn ?? null,
    responsableCargo: a.responsableCargo ?? null,
  }));

  if (!pasos.some((p) => p.numeral === '3.1')) {
    pasos.unshift({
      numeral: '3.1',
      nombre: 'Estudio previo',
      etapa: 3,
      estado: estadoDelEstudio,
      aplica: true,
      construida: true,
      actualizadoEn: proceso.estudioPrevio?.actualizadoEn ?? null,
    });
  }

  return pasos;
}
