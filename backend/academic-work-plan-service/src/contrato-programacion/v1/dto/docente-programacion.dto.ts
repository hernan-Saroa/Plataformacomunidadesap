/**
 * Contrato PROG↔PTA v1 — vista del docente para Programación Académica.
 *
 * Es un DTO propio y NO la entidad `DocenteEntity`: exponer la entidad filtraría
 * cualquier cambio interno del PTA al módulo consumidor. Lo que se declara aquí
 * es lo que Programación Académica puede asumir estable.
 *
 * Todo es de SOLO LECTURA (RN-09): el RUND lo administra la Subdirección Nacional
 * de Servicios Académicos y las decanaturas lo consumen sin escribir.
 */
export interface DocenteProgramacionDto {
  /** Llave de búsqueda del AC-01. */
  documento: string;
  nombreCompleto: string;
  correoInstitucional: string | null;

  /** Territorial de vinculación del docente (no la de sus asignaturas). */
  territorial: { codigo: string; nombre: string } | null;

  vinculacion: string | null;
  dedicacion: string | null;
  /** 40 en tiempo completo, 20 en medio tiempo. */
  dedicacionHorasSemana: number | null;

  /** Asociado, Titular, Asistente, Auxiliar. Lo exige RN-12 para maestrías. */
  escalafon: string | null;

  /**
   * Régimen normativo: Circular Dispositiva 003/2025, Acuerdo 003/2018 o
   * Acuerdo 009/2004. ⚠️ Los topes NO son iguales entre regímenes, así que el
   * consumidor debe leerlo junto con `horasPta` y nunca asumir un tope único.
   */
  regimenNormativo: string | null;
  /** Horas del plan de trabajo según su régimen y dedicación: 800, 720, … */
  horasPta: number;

  /** Fechas de vinculación (RN-10). `fin` nulo significa vinculación indefinida. */
  vinculacion_desde: string | null;
  vinculacion_hasta: string | null;

  /**
   * Situación administrativa evaluada. El texto crudo del RUND se conserva en
   * `descripcion` porque trae la resolución y la vigencia dentro de la frase
   * ("En Año Sabático hasta 1-10-2026 Resol.2052 30-09-2024").
   */
  situacion: SituacionDocenteDto;

  estado: string | null;
  nivelFormacion: string | null;
  nucleoTematico: string | null;
}

/**
 * Resultado de evaluar la situación administrativa del docente.
 *
 * ⚠️ Criterio confirmado por el equipo: un docente en año sabático o en comisión
 * NO es asignable. "En Periodo de Prueba" SÍ lo es — están en servicio activo, y
 * son 32 de los 263.
 *
 * La vigencia importa: "hasta 1-10-2026" quiere decir que el mismo docente puede
 * no ser asignable hoy y sí el próximo semestre. No es una bandera permanente.
 */
export interface SituacionDocenteDto {
  /** Texto tal como viene del RUND, sin interpretar. */
  descripcion: string | null;
  /** Categoría reconocida, o `null` si el texto no se pudo clasificar. */
  categoria: string | null;
  asignable: boolean;
  /** Por qué no es asignable, en lenguaje presentable al usuario. */
  motivo: string | null;
  /** Hasta cuándo dura la situación, si el texto la declara. */
  vigenteHasta: string | null;
}
