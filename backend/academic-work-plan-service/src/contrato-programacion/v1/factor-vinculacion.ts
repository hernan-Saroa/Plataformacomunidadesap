/**
 * Factor de vinculación para el impacto en el PTA — RN-03 (EFDS-1373).
 *
 * ⚠️ Esto es LÓGICA NUEVA del contrato, no una modificación del calculador. El
 * `HorasPtaCalculator` calcula la base de carrera/ocasional (×3, según la
 * Circular 003) y NO se toca. Aquí se decide, según la vinculación del docente,
 * si ese impacto es el pleno (carrera/ocasional) o solo las horas de clase
 * (cátedra de pregrado).
 *
 *   carrera / ocasional  → ×3  (horas clase + investigación + extensión)
 *   cátedra de pregrado  → ×1  (solo la docencia)
 *
 * El texto de vinculación del RUND no es un enumerado ("Carrera1", "Carrera2",
 * "Ocasional", "Hora Cátedra", …); se normaliza por patrón. Ante una vinculación
 * que no se reconoce como cátedra, se aplica el factor pleno (×3): es el
 * tratamiento conservador para el tope, no el que subestima el consumo.
 */

export type CategoriaVinculacion = 'CARRERA' | 'OCASIONAL' | 'CATEDRA';

/** Sin tildes, minúsculas, espacios colapsados. */
function normalizar(v: string | null | undefined): string {
  return String(v || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza el texto de vinculación del RUND a la categoría que decide el factor.
 * Espeja los patrones de `banco-docentes.service.ts` del PTA (catedra / carrera /
 * ocasional), sin importarlos: aquel es de uso interno del PTA.
 */
export function categoriaVinculacion(vinculacion: string | null | undefined): CategoriaVinculacion {
  const n = normalizar(vinculacion);
  if (n.includes('catedra') || n === 'hc') return 'CATEDRA';
  if (n.includes('carrera')) return 'CARRERA';
  // Ocasional, periodo de prueba, especial, visitante: consumen como plena carga.
  return 'OCASIONAL';
}

/**
 * Factor de horas según RN-03. Cátedra de pregrado ×1; carrera y ocasional ×3.
 *
 * @param vinculacion  texto de vinculación del RUND.
 * @param esPregrado   la cátedra ×1 aplica solo en pregrado; en posgrado un
 *                     docente de cátedra sigue el tratamiento pleno.
 */
export function factorVinculacion(
  vinculacion: string | null | undefined,
  esPregrado: boolean,
): { factor: number; categoria: CategoriaVinculacion } {
  const categoria = categoriaVinculacion(vinculacion);
  if (categoria === 'CATEDRA' && esPregrado) {
    return { factor: 1, categoria };
  }
  return { factor: 3, categoria };
}
