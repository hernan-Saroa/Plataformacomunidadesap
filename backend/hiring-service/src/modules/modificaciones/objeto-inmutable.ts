/**
 * La regla del objeto — RF-MOD-04 (EFDS-1179).
 *
 * «El objeto del contrato nunca puede ser modificado»: la fuente la llama regla
 * de oro, y es la única del bloque de modificaciones que no admite excepción
 * por tipo. Una modificación puede darle más plata al contrato, más plazo, otro
 * contratista o precisar sus cláusulas; lo que no puede es cambiar qué se
 * contrató, porque entonces no es una modificación sino un contrato distinto
 * que se saltó la selección.
 *
 * Se protege en tres sitios a propósito, y ninguno sobra:
 *
 * 1. **En la puerta**, con `intentoDeModificarObjeto`: una solicitud que trae un
 *    objeto nuevo se rechaza diciendo la restricción, en vez de que el
 *    `whitelist` de la validación lo descarte en silencio y el gestor crea que
 *    su cambio entró.
 * 2. **Al aprobar**, comparando el objeto congelado en la modificación con el
 *    que el contrato tiene hoy: si cambió por fuera del trámite, aprobar la
 *    modificación la estaría suscribiendo sobre algo que ya no es lo que se
 *    solicitó.
 * 3. **En la base**, con el trigger de la migración 054, que es el único sitio
 *    que también cubre lo que no pasa por este servicio.
 *
 * Funciones puras: la regla se prueba sin base de datos y sin Nest.
 */

/**
 * Los nombres con los que llegaría un objeto nuevo.
 *
 * Se enumeran en vez de buscar cualquier clave que contenga «objeto» porque un
 * campo llamado `objetoDelActo` o `justificacionObjeto` es texto legítimo, y
 * rechazar una justificación por nombrar la palabra sería peor que el problema.
 *
 * La comparación es exacta y sin distinguir mayúsculas: es lo mismo que hace
 * `admiteRegistro` con los numerales, por lo mismo —parecerse no basta—.
 */
export const CAMPOS_DE_OBJETO = [
  'objeto',
  'objetonuevo',
  'nuevoobjeto',
  'objetocontrato',
  'objetodelcontrato',
];

/**
 * Por qué esta solicitud intenta cambiar el objeto, o `null` si no lo intenta.
 *
 * Devuelve el motivo y no un booleano por lo mismo que `porQueNoAdmiteTipo`: lo
 * que la historia pide es que el sistema «lo impida **e informe** la
 * restricción», y un rechazo sin explicación deja al gestor probando otra vez.
 */
export function intentoDeModificarObjeto(cuerpo: unknown): string | null {
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return null;

  for (const clave of Object.keys(cuerpo as Record<string, unknown>)) {
    if (!CAMPOS_DE_OBJETO.includes(clave.toLowerCase())) continue;

    // Mandar el campo vacío no es intentar cambiarlo: no hay objeto nuevo que
    // imponer, y rechazarlo obligaría a limpiar formularios que no cambian nada.
    const valor = (cuerpo as Record<string, unknown>)[clave];
    if (valor === null || valor === undefined || `${valor}`.trim() === '') continue;

    return (
      `El objeto del contrato no se modifica (RF-MOD-04): el campo «${clave}» no se puede enviar ` +
      'en una modificación contractual. Cambiar qué se contrató exige un contrato nuevo, no un otrosí.'
    );
  }

  return null;
}

/**
 * Si el objeto dejó de ser el que la modificación congeló al solicitarse.
 *
 * Se comparan los dos textos tal cual, sin normalizar espacios ni mayúsculas:
 * el objeto es la cláusula que define el contrato, y «cambiarle una coma» es
 * exactamente el cambio que esta regla existe para no dejar pasar inadvertido.
 *
 * Una modificación anterior a EFDS-1179 no congeló nada; sin foto que comparar
 * no hay diferencia que afirmar, y se deja pasar.
 */
export function objetoCambio(congelado: string | null, actual: string): boolean {
  return congelado !== null && congelado !== actual;
}
