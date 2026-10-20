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
  semestre: number;
}

export type EfectoActivacion = 'cerrado' | 'planeacion' | null;

export function efectoDeActivar(activado: PeriodoOrdenable, otro: PeriodoOrdenable): EfectoActivacion {
  if (String(otro.id) === String(activado.id)) return null;
  if (otro.anio < activado.anio || (otro.anio === activado.anio && otro.semestre < activado.semestre)) {
    return 'cerrado'; // Histórico
  }
  if (otro.anio > activado.anio || (otro.anio === activado.anio && otro.semestre > activado.semestre)) {
    return 'planeacion'; // Planeación
  }
  return null;
}
