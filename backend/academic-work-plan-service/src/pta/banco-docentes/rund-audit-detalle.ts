/**
 * HU 1365 (NF002): detalle campo a campo de las operaciones sobre el perfil para el log inmutable.
 *
 * - El puntaje salarial se registra con su valor real. Se protege al leer: quien no tenga acceso a datos sensibles
 *   lo recibe enmascarado (banco-docentes-sensitive-data.ts), igual que en el resto de respuestas del perfil.
 * - Los datos originales de la carga masiva (`datosCargaMasiva`) son un bloque grande con la fila completa del Excel,
 *   que ya se conserva íntegro e inmutable (RundCargaMasiva, con hash). En el log solo se anotan las columnas que
 *   cambiaron, sin repetir sus valores.
 */
export const PROTEGIDO = '[PROTEGIDO]';

export interface RundCambioCampo { anterior: unknown; nuevo: unknown }

/** Campos técnicos que no describen datos del perfil y no se enumeran al crear. */
const CAMPOS_TECNICOS = new Set([
  'id', 'personaId', 'territorialId', 'sedeId', 'estadoAprobacion', 'idRund', 'ordenListado', 'createdAt', 'updatedAt',
  'eliminadoRund', 'datosCargaMasiva',
]);

const vacio = (value: unknown) => value === null || value === undefined || value === '';

/** Anterior/nuevo de un campo modificado. `datosCargaMasiva` no se repite en el log (ver cabecera). */
export function describirCambio(campo: string, anterior: unknown, nuevo: unknown): RundCambioCampo {
  if (campo === 'datosCargaMasiva') return { anterior: PROTEGIDO, nuevo: PROTEGIDO };
  return { anterior: anterior ?? null, nuevo: nuevo ?? null };
}

/** Nombres de las columnas de la carga masiva cuyo valor cambió (sin los valores). */
export function columnasCargaModificadas(anterior: unknown, nuevo: unknown): string[] {
  const prev = (anterior && typeof anterior === 'object' ? anterior : {}) as Record<string, unknown>;
  const next = (nuevo && typeof nuevo === 'object' ? nuevo : {}) as Record<string, unknown>;
  return [...new Set([...Object.keys(prev), ...Object.keys(next)])]
    .filter((columna) => JSON.stringify(prev[columna] ?? null) !== JSON.stringify(next[columna] ?? null))
    .sort();
}

/** Crear un perfil: cada dato registrado (anterior vacío → valor nuevo), sin campos técnicos ni vacíos. */
export function cambiosDeCreacion(datos: Record<string, unknown>): Record<string, RundCambioCampo> {
  const cambios: Record<string, RundCambioCampo> = {};
  for (const [campo, valor] of Object.entries(datos)) {
    if (CAMPOS_TECNICOS.has(campo) || vacio(valor)) continue;
    if (Array.isArray(valor) && valor.length === 0) continue;
    cambios[campo] = { anterior: null, nuevo: valor };
  }
  // Al crear no hay valor anterior: solo se marca que la fila de la carga existe (su contenido íntegro está en RundCargaMasiva).
  if (!vacio(datos.datosCargaMasiva)) cambios.datosCargaMasiva = { anterior: null, nuevo: PROTEGIDO };
  return cambios;
}
