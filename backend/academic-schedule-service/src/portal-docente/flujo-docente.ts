/**
 * Flujo del docente en la programación — EFDS-2348.
 *
 * La reunión del 20 de octubre cambió el flujo: el docente YA NO TOMA franjas.
 * Un rol de asignación (PROGRAMADOR_DOCENTE_<NIVEL>, EFDS-2342) le asigna los
 * grupos y el docente recibe su programación ya armada en el portal.
 *
 * ⚠️ INTERRUPTOR, NO BORRADO: PROG_PORTAL_TOMA_FRANJAS.
 *   · sin definir o distinto de 'true' → flujo NUEVO: tomar y soltar se rechazan
 *     en el servidor (aunque se llame la API directo) y no hay franjas disponibles;
 *     la asignación del backoffice deja las franjas del grupo en TOMADA, que aquí
 *     significa «con docente, pendiente de concertación».
 *   · 'true' → flujo anterior (EFDS-1938): el docente toma y suelta franjas.
 * Tomás está confirmando si el docente sigue aceptando su docencia en la
 * concertación: si el negocio vuelve atrás, se cambia la variable y nada más.
 */
export function tomaDeFranjasHabilitada(): boolean {
  return String(process.env.PROG_PORTAL_TOMA_FRANJAS ?? '').trim().toLowerCase() === 'true';
}

export const MENSAJE_TOMA_DESHABILITADA =
  'El docente ya no toma franjas: su programación la asigna la decanatura. Consulte sus grupos asignados.';
