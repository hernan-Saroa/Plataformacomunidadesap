/**
 * Contrato PROG↔PTA v1 — cálculo de horas de una asignatura (EFDS-1373, EFDS-1651).
 *
 * El cálculo base lo hace `HorasPtaCalculator`, la MISMA lógica que usa el PTA:
 * no se reimplementa aquí. Exponerlo por el contrato es lo que garantiza que los
 * dos módulos calculen igual, y el test de paridad lo protege.
 */
export interface CalculoHorasDto {
  /** Código SNIES de la asignatura (llave maestra, RN-01). */
  codigo: string;
  nombre: string;
  creditos: number | null;

  /** Horas de clase del catálogo. Es la BASE sobre la que aplica el factor. */
  horasClase: number;

  /**
   * Horas PTA para docente de CARRERA u OCASIONAL (factor ×3, RN-03). Es el
   * valor que devuelve `HorasPtaCalculator` y coincide con `horas_pta` del
   * catálogo (paridad verificada).
   */
  horasPtaCarrera: number;

  /** Factor aplicado según la vinculación consultada (3 o 1). */
  factorVinculacion: number;
  /** Categoría de vinculación normalizada usada para el factor. */
  categoriaVinculacion: string;

  /**
   * Impacto real en el PTA del docente según su vinculación: `horasClase ×
   * factorVinculacion`. Para carrera/ocasional es igual a `horasPtaCarrera`;
   * para cátedra de pregrado es `horasClase`.
   */
  horasImpacto: number;

  /** true si es una excepción de horas fijas de la Circular 003. */
  esExcepcionHorasFijas: boolean;
  tipoExcepcion: string | null;
}
