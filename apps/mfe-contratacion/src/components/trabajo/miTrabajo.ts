import { ProcesoResumen } from '../../types';
import { Situacion } from '../proceso/situacionDelProceso';

/** Un proceso en la bandeja, con lo que está pasando en él. */
export interface ElementoDeTrabajo {
  proceso: ProcesoResumen;
  situacion: Situacion;
}

export interface MiTrabajo {
  /** Me toca redactar, corregir o trabajar una actividad. */
  porHacer: ElementoDeTrabajo[];
  /** Me toca recibir el proceso o asignarle abogado. */
  porAsignar: ElementoDeTrabajo[];
  /** Estoy en el proceso, pero la siguiente acción es de otro. */
  enEspera: ElementoDeTrabajo[];
}

/** Si quien mira está en el proceso: lo radicó o tiene un papel en él. */
function estoyEnElProceso(p: ProcesoResumen): boolean {
  const participacion = p.participacion;
  return (
    !!p.radicadoPorMi ||
    !!participacion?.contratacion?.esMio ||
    !!participacion?.abogado?.esMio ||
    !!participacion?.financiera?.esMio
  );
}

/**
 * Reparte los procesos entre las pestañas de «Mi trabajo».
 *
 * No añade reglas: cada proceso cae donde lo pone su situación, que es la
 * misma que pinta el listado y la ficha. Lo que se revisa no entra aquí: la
 * pestaña «Por revisar» sale de su propio endpoint, que sabe qué aprobaciones
 * le tocan a quien mira aunque no participe en el proceso.
 *
 * Dentro de cada pestaña va primero lo que lleva más tiempo quieto: es lo que
 * más probablemente alguien está esperando.
 */
export function clasificarMiTrabajo(elementos: ElementoDeTrabajo[]): MiTrabajo {
  const trabajo: MiTrabajo = { porHacer: [], porAsignar: [], enEspera: [] };

  for (const e of elementos) {
    const { momento, teToca } = e.situacion;
    if (momento === 'terminado' || momento === 'negado') continue;

    if (teToca) {
      if (momento === 'revision') continue;
      if (momento === 'asignacion') trabajo.porAsignar.push(e);
      else trabajo.porHacer.push(e);
      continue;
    }

    if (estoyEnElProceso(e.proceso)) trabajo.enEspera.push(e);
  }

  const masQuieto = (a: ElementoDeTrabajo, b: ElementoDeTrabajo) =>
    (a.situacion.ultimoMovimiento ?? '').localeCompare(b.situacion.ultimoMovimiento ?? '');
  trabajo.porHacer.sort(masQuieto);
  trabajo.porAsignar.sort(masQuieto);
  trabajo.enEspera.sort(masQuieto);
  return trabajo;
}
