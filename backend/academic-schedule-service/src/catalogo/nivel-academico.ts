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

/** Tipos concretos que componen un nivel binario, para filtrar en SQL. */
export function tiposDeNivel(nivel: NivelAcademico, tiposExistentes: string[]): string[] {
  return tiposExistentes.filter((t) => nivelDeProgramaTipo(t) === nivel);
}
