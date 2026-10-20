/**
 * Nivel académico binario (Pregrado / Posgrado) para RN-08.
 *
 * ⚠️ COPIA DELIBERADA — reportada, no silenciosa.
 * El origen es `POSGRADO_PROGRAMA_TIPOS` en
 * `backend/academic-work-plan-service/src/pta/pta.service.ts`, pero NO se puede
 * importar: es un `const` privado de módulo (no exportado), dentro de OTRO
 * microservicio NestJS con su propio tsconfig, package.json e imagen Docker. No
 * hay paquete compartido que consuman los servicios de backend (verificado: solo
 * los MFE consumen `@esap-mfe/shared-types`).
 *
 * Mientras no exista ese paquete compartido, cualquier cambio en la lista de
 * origen debe replicarse aquí. El test
 * `EFDS-1368 :: RN-08 :: la lista de tipos de posgrado coincide con la del PTA`
 * existe para que la divergencia se detecte y no se descubra en producción.
 *
 * `academic_work_plan.programa.tipo` admite: pregrado, tecnico_profesional,
 * tecnologico, especializacion, maestria, doctorado (migración 355).
 */
export const POSGRADO_PROGRAMA_TIPOS: ReadonlySet<string> = new Set([
  'especializacion',
  'maestria',
  'doctorado',
]);

export type NivelAcademico = 'pregrado' | 'posgrado';

export const NIVELES_ACADEMICOS: readonly NivelAcademico[] = ['pregrado', 'posgrado'];

/** ¿El valor recibido es un nivel binario válido? */
export function esNivelAcademico(valor: unknown): valor is NivelAcademico {
  return NIVELES_ACADEMICOS.includes(String(valor ?? '').trim().toLowerCase() as NivelAcademico);
}

/**
 * Traduce el `tipo` específico del programa al nivel binario que usa RN-08.
 * Todo lo que no sea posgrado cuenta como pregrado (incluye tecnico_profesional
 * y tecnologico), mismo criterio que aplica el PTA al repartir Docencia.
 */
export function nivelDeProgramaTipo(tipo: string | null | undefined): NivelAcademico {
  const normalizado = String(tipo ?? '').trim().toLowerCase();
  return POSGRADO_PROGRAMA_TIPOS.has(normalizado) ? 'posgrado' : 'pregrado';
}

/**
 * Condición SQL que deja solo los programas de los niveles dados — RN-08 en las
 * LISTAS (EFDS-2302). `columnaTipo` es la columna `programa.tipo` del JOIN.
 *
 * Fail-closed: sin niveles no pasa nada; con los dos no filtra. Un registro
 * cuyo programa no se resuelve (tipo NULL) solo lo ve quien ve ambos niveles.
 * Los tipos de posgrado van como parámetro, nunca concatenados.
 */
export function condicionNivelSql(
  columnaTipo: string,
  niveles: readonly NivelAcademico[],
  indiceParametro: number,
): { sql: string; params: unknown[] } {
  const posgrado = [...POSGRADO_PROGRAMA_TIPOS];
  if (niveles.includes('pregrado') && niveles.includes('posgrado')) return { sql: 'TRUE', params: [] };
  if (niveles.includes('posgrado')) {
    return { sql: `lower(${columnaTipo}) = ANY($${indiceParametro}::text[])`, params: [posgrado] };
  }
  if (niveles.includes('pregrado')) {
    return {
      sql: `(${columnaTipo} IS NOT NULL AND lower(${columnaTipo}) <> ALL($${indiceParametro}::text[]))`,
      params: [posgrado],
    };
  }
  return { sql: 'FALSE', params: [] };
}

/** Tipos concretos que componen un nivel binario, para filtrar en SQL. */
export function tiposDeNivel(nivel: NivelAcademico, tiposExistentes: string[]): string[] {
  return tiposExistentes.filter((t) => nivelDeProgramaTipo(t) === nivel);
}
