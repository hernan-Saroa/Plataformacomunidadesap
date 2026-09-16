/**
 * Situaciones administrativas que impiden asignar carga a un docente.
 *
 * ⚠️ ESTO ES CONFIGURACIÓN, NO LÓGICA. Está aquí y no dentro de un `if` porque la
 * lista cambia por decisión administrativa, no por cambio de reglas: hoy son año
 * sabático y comisión; mañana pueden agregar licencia no remunerada o encargo.
 * Si está parametrizada, ampliarla es editar un dato; si estuviera en el código,
 * sería un despliegue.
 *
 * Cada entrada declara los patrones que la reconocen en el texto libre del RUND,
 * porque el campo no es un enumerado: llega como frase completa, por ejemplo
 * "En Año Sabático hasta 1-10-2026 Resol.2052 30-09-2024".
 */
export interface SituacionNoAsignable {
  /** Identificador estable, para reportes y pruebas. */
  categoria: string;
  /** Cómo se le explica al usuario por qué no puede asignarse. */
  motivo: string;
  /** Fragmentos que identifican la situación, ya normalizados (sin tildes). */
  patrones: string[];
}

/**
 * Lista vigente, confirmada por el equipo.
 *
 * NO incluye "En Periodo de Prueba": esos docentes están en servicio activo y SÍ
 * son asignables. Son 32 de los 263 del RUND, y bloquearlos sin respaldo
 * normativo sería peor error que el contrario.
 */
export const SITUACIONES_NO_ASIGNABLES: SituacionNoAsignable[] = [
  {
    categoria: 'ano_sabatico',
    motivo: 'El docente se encuentra en año sabático',
    patrones: ['ano sabatico', 'año sabatico', 'sabatico'],
  },
  {
    categoria: 'comision',
    motivo: 'El docente se encuentra en comisión',
    // Cubre comisión de servicios, de estudios y la forma corta "En comisión".
    patrones: ['comision'],
  },
];

/**
 * Categorias del RUND que SI permiten asignar.
 *
 * ⚠️ Se listan las CATEGORIAS (situacionCategoria), no las frases libres. El
 * campo de texto trae el nombre del cargo --'Subdirectora Nacional Academica',
 * 'Decana de Posgrados Resol. 1065'-- y ninguna palabra en el revela que la
 * persona esta en servicio. Clasificar por el texto dejaba 5 cargos directivos
 * cayendo en el fail-closed; lo detecto la prueba del agregado, no los ejemplos.
 */
export const SITUACIONES_ASIGNABLES: string[] = [
  'servicio activo',
  'no aplica',
  'periodo de prueba',
  'dedicacion exclusiva',
  'cargo directivo',
];
