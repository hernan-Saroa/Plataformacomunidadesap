/**
 * Clase del docente: Planta o Cátedra (solo esas dos).
 *
 * Regla: si la carga trae horas PTA mayores que 0 es de planta; con 0 o sin horas es de cátedra. La clase se
 * guarda en `Docente.claseDocente` al cargar o editar el perfil. Los registros anteriores no la tienen: para ellos
 * se deduce de las horas PTA que ya estaban guardadas con la misma regla.
 */
export type ClaseDocente = 'PLANTA' | 'CATEDRA';

export const CLASES_DOCENTE: readonly ClaseDocente[] = ['PLANTA', 'CATEDRA'];

export function claseDesdeHoras(horas: unknown): ClaseDocente {
  const valor = typeof horas === 'number' ? horas : Number(String(horas ?? '').trim().replace(',', '.'));
  return Number.isFinite(valor) && valor > 0 ? 'PLANTA' : 'CATEDRA';
}

/** Valor normalizado de la clase si es una de las dos admitidas; null en cualquier otro caso. */
export function normalizarClaseDocente(valor: unknown): ClaseDocente | null {
  const clave = String(valor ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
  return clave === 'PLANTA' || clave === 'CATEDRA' ? clave : null;
}

/** La clase guardada o, en registros anteriores, la que resulta de sus horas PTA; null si no hay ninguna de las dos. */
export function resolverClaseDocente(guardada: unknown, horas?: unknown): ClaseDocente | null {
  const clase = normalizarClaseDocente(guardada);
  if (clase) return clase;
  if (horas === null || horas === undefined || String(horas).trim() === '') return null;
  return claseDesdeHoras(horas);
}
