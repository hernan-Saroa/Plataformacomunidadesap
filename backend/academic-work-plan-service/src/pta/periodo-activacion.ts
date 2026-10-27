/**
 * Efecto de activar un periodo sobre los DEMÁS periodos — EFDS-2328.
 *
 * Regla única que usan la activación (`PATCH /periodos-academicos/:id`) y su
 * vista previa (`GET /periodos-academicos/:id/impacto-activacion`): los
 * anteriores quedan cerrados y los posteriores en planeación. Antes vivía
 * inline en el controlador; se extrajo para que la confirmación que ve el
 * administrador no pueda diferir de lo que hace la activación.
 */
export interface PeriodoOrdenable {
  id: number | string;
  anio: number;
  /** null en un periodo personalizado (EFDS-2346): se ordena por fecha. */
  semestre: number | null;
  fechaInicio?: Date | string | null;
  estado?: string;
  extraordinario?: boolean;
}

export type EfectoActivacion = 'cerrado' | 'planeacion' | null;

/**
 * EFDS-2346: un periodo personalizado sigue las mismas reglas que un semestral y se
 * ordena por su fecha de inicio (las fechas no se cruzan). El periodo EXTRAORDINARIO
 * en curso no se toca: activar el principal no lo cierra.
 */
export function efectoDeActivar(activado: PeriodoOrdenable, otro: PeriodoOrdenable): EfectoActivacion {
  if (String(otro.id) === String(activado.id)) return null;
  if (otro.extraordinario && otro.estado === 'en_curso') return null;
  const orden = compararPeriodos(otro, activado);
  if (orden < 0) return 'cerrado'; // Histórico
  if (orden > 0) return 'planeacion'; // Planeación
  return null;
}

function compararPeriodos(a: PeriodoOrdenable, b: PeriodoOrdenable): number {
  if (a.semestre != null && b.semestre != null) {
    return a.anio - b.anio || a.semestre - b.semestre;
  }
  const fa = a.fechaInicio ? new Date(a.fechaInicio).getTime() : NaN;
  const fb = b.fechaInicio ? new Date(b.fechaInicio).getTime() : NaN;
  if (Number.isNaN(fa) || Number.isNaN(fb)) return a.anio - b.anio;
  return fa - fb;
}
