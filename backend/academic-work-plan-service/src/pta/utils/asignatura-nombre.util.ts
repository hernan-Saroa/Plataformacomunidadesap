const SUFIJO_TECNICO_JORNADA = /\s*\(\s*AP\s*[_-]?\s*(?:D[IÍ]A|NOCHE)\s*\)\s*$/iu;

const texto = (value: unknown): string => String(value ?? '').trim().replace(/\s+/g, ' ');

/**
 * Retira exclusivamente la codificación técnica legacy de jornada. No modifica
 * otros paréntesis que puedan formar parte legítima de la denominación.
 */
export function limpiarSufijoTecnicoJornada(value: unknown): string {
  const nombre = texto(value);
  return nombre.replace(SUFIJO_TECNICO_JORNADA, '').trim() || nombre;
}

/** Nombre destinado a interfaces y PTA; prioriza el nombre_base de la plantilla. */
export function obtenerNombreVisibleAsignatura(asignatura: any): string {
  if (typeof asignatura !== 'object' || asignatura === null) {
    return limpiarSufijoTecnicoJornada(asignatura);
  }

  const nombre = [
    asignatura.nombreBase,
    asignatura.nombre_base,
    asignatura.nombreVisible,
    asignatura.asignatura_nombre_base,
    asignatura.asignatura_nombre,
    asignatura.nombre,
    asignatura.asignatura,
  ].map(texto).find(Boolean) || '';
  return limpiarSufijoTecnicoJornada(nombre);
}
