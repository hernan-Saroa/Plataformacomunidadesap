/**
 * UTILIDAD: CÁLCULO DE DÍAS HÁBILES
 * 
 * Calcula días hábiles (excluyendo sábados, domingos y festivos nacionales)
 * según normativa colombiana para plazos legales.
 * 
 * REQ-MOD02-001: Sistema de Órganos de Control - ESAP
 * 
 * REFERENCIAS LEGALES:
 * - Ley 1437 de 2011 (CPACA): Define días hábiles como aquellos en que
 *   despachan las autoridades públicas
 * - Decreto 019 de 2012: Reglamentación de plazos
 */

// ==================== FESTIVOS NACIONALES COLOMBIA ====================

/**
 * Festivos fijos en Colombia (mismo día cada año)
 */
const FESTIVOS_FIJOS = [
  { mes: 1, dia: 1 },   // Año Nuevo
  { mes: 5, dia: 1 },   // Día del Trabajo
  { mes: 7, dia: 20 },  // Día de la Independencia
  { mes: 8, dia: 7 },   // Batalla de Boyacá
  { mes: 12, dia: 8 },  // Inmaculada Concepción
  { mes: 12, dia: 25 }, // Navidad
];

/**
 * Festivos móviles en Colombia 2025
 * Estos se trasladan al lunes siguiente (Ley Emiliani)
 */
const FESTIVOS_2025: Date[] = [
  // Enero
  new Date('2025-01-01'), // Año Nuevo (miércoles)
  new Date('2025-01-06'), // Reyes Magos (lunes)
  
  // Marzo
  new Date('2025-03-24'), // San José (lunes)
  
  // Abril
  new Date('2025-04-17'), // Jueves Santo
  new Date('2025-04-18'), // Viernes Santo
  
  // Mayo
  new Date('2025-05-01'), // Día del Trabajo (jueves)
  new Date('2025-06-02'), // Ascensión (lunes)
  new Date('2025-06-23'), // Corpus Christi (lunes)
  new Date('2025-06-30'), // Sagrado Corazón (lunes)
  
  // Julio
  new Date('2025-07-07'), // San Pedro y San Pablo (lunes)
  new Date('2025-07-20'), // Independencia (domingo) → lunes 21
  new Date('2025-07-21'), // Día de la Independencia trasladado
  
  // Agosto
  new Date('2025-08-07'), // Batalla de Boyacá (jueves)
  new Date('2025-08-18'), // Asunción (lunes)
  
  // Octubre
  new Date('2025-10-13'), // Día de la Raza (lunes)
  
  // Noviembre
  new Date('2025-11-03'), // Todos los Santos (lunes)
  new Date('2025-11-17'), // Independencia de Cartagena (lunes)
  
  // Diciembre
  new Date('2025-12-08'), // Inmaculada Concepción (lunes)
  new Date('2025-12-25'), // Navidad (jueves)
];

/**
 * Festivos móviles 2026 (para cálculos que crucen el año)
 */
const FESTIVOS_2026: Date[] = [
  new Date('2026-01-01'), // Año Nuevo
  new Date('2026-01-12'), // Reyes Magos (lunes)
  new Date('2026-03-23'), // San José (lunes)
  new Date('2026-04-02'), // Jueves Santo
  new Date('2026-04-03'), // Viernes Santo
  new Date('2026-05-01'), // Día del Trabajo
  new Date('2026-05-18'), // Ascensión (lunes)
  new Date('2026-06-08'), // Corpus Christi (lunes)
  new Date('2026-06-15'), // Sagrado Corazón (lunes)
  new Date('2026-06-29'), // San Pedro y San Pablo (lunes)
  new Date('2026-07-20'), // Independencia
  new Date('2026-08-07'), // Batalla de Boyacá
  new Date('2026-08-17'), // Asunción (lunes)
  new Date('2026-10-12'), // Día de la Raza (lunes)
  new Date('2026-11-02'), // Todos los Santos (lunes)
  new Date('2026-11-16'), // Independencia de Cartagena (lunes)
  new Date('2026-12-08'), // Inmaculada Concepción
  new Date('2026-12-25'), // Navidad
];

// Combinar todos los festivos
const TODOS_FESTIVOS = [...FESTIVOS_2025, ...FESTIVOS_2026];

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Normaliza una fecha a medianoche (00:00:00) para comparaciones
 */
function normalizarFecha(fecha: Date): Date {
  const nuevaFecha = new Date(fecha);
  nuevaFecha.setHours(0, 0, 0, 0);
  return nuevaFecha;
}

/**
 * Verifica si una fecha es sábado o domingo
 */
function esFinDeSemana(fecha: Date): boolean {
  const dia = fecha.getDay();
  return dia === 0 || dia === 6; // 0 = Domingo, 6 = Sábado
}

/**
 * Verifica si una fecha es festivo nacional en Colombia
 */
function esFestivo(fecha: Date): boolean {
  const fechaNormalizada = normalizarFecha(fecha);
  
  return TODOS_FESTIVOS.some((festivo) => {
    const festivoNormalizado = normalizarFecha(festivo);
    return fechaNormalizada.getTime() === festivoNormalizado.getTime();
  });
}

/**
 * Verifica si una fecha es día hábil (no es fin de semana ni festivo)
 */
export function esDiaHabil(fecha: Date): boolean {
  return !esFinDeSemana(fecha) && !esFestivo(fecha);
}

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * Suma días hábiles a una fecha
 * 
 * @param fechaInicio - Fecha desde la cual se cuentan los días
 * @param diasHabiles - Cantidad de días hábiles a sumar
 * @returns Fecha resultante después de sumar los días hábiles
 * 
 * @example
 * // Si hoy es lunes 20 de enero de 2025
 * const vencimiento = sumarDiasHabiles(new Date('2025-01-20'), 30);
 * // Retorna: fecha que es 30 días hábiles después (excluyendo sábados, domingos y festivos)
 */
export function sumarDiasHabiles(fechaInicio: Date, diasHabiles: number): Date {
  let fechaActual = normalizarFecha(new Date(fechaInicio));
  let diasContados = 0;

  while (diasContados < diasHabiles) {
    // Avanzar un día
    fechaActual.setDate(fechaActual.getDate() + 1);

    // Si es día hábil, contar
    if (esDiaHabil(fechaActual)) {
      diasContados++;
    }
  }

  return fechaActual;
}

/**
 * Calcula días hábiles entre dos fechas
 * 
 * @param fechaInicio - Fecha de inicio (se excluye del conteo)
 * @param fechaFin - Fecha de fin (se excluye del conteo)
 * @returns Cantidad de días hábiles entre las fechas
 * 
 * @example
 * const dias = calcularDiasHabilesEntre(
 *   new Date('2025-01-20'), 
 *   new Date('2025-02-20')
 * );
 * // Retorna: número de días hábiles entre las dos fechas
 */
export function calcularDiasHabilesEntre(fechaInicio: Date, fechaFin: Date): number {
  let fechaActual = normalizarFecha(new Date(fechaInicio));
  const fechaFinNormalizada = normalizarFecha(fechaFin);
  let diasHabiles = 0;

  while (fechaActual < fechaFinNormalizada) {
    fechaActual.setDate(fechaActual.getDate() + 1);

    if (esDiaHabil(fechaActual) && fechaActual <= fechaFinNormalizada) {
      diasHabiles++;
    }
  }

  return diasHabiles;
}

/**
 * Calcula días hábiles restantes desde hoy hasta una fecha
 * 
 * @param fechaVencimiento - Fecha de vencimiento
 * @returns Cantidad de días hábiles restantes (puede ser negativo si ya venció)
 * 
 * @example
 * const restantes = calcularDiasHabilesRestantes(new Date('2025-02-20'));
 * // Retorna: número de días hábiles desde hoy hasta el 20 de febrero
 */
export function calcularDiasHabilesRestantes(fechaVencimiento: Date): number {
  const hoy = normalizarFecha(new Date());
  const vencimiento = normalizarFecha(fechaVencimiento);

  if (vencimiento < hoy) {
    // Ya venció: retornar negativo
    return -calcularDiasHabilesEntre(vencimiento, hoy);
  }

  return calcularDiasHabilesEntre(hoy, vencimiento);
}

/**
 * Calcula porcentaje de plazo transcurrido
 * 
 * @param fechaInicio - Fecha de inicio del plazo
 * @param fechaVencimiento - Fecha de vencimiento
 * @param diasTotales - Días hábiles totales del plazo
 * @returns Porcentaje transcurrido (0-100)
 * 
 * @example
 * const porcentaje = calcularPorcentajeTranscurrido(
 *   new Date('2025-01-05'), 
 *   new Date('2025-02-15'), 
 *   30
 * );
 * // Si hoy es 20 de enero, retorna ~50 (50% del plazo transcurrido)
 */
export function calcularPorcentajeTranscurrido(
  fechaInicio: Date,
  fechaVencimiento: Date,
  diasTotales: number
): number {
  const hoy = normalizarFecha(new Date());
  const inicio = normalizarFecha(fechaInicio);
  const vencimiento = normalizarFecha(fechaVencimiento);

  // Si aún no ha empezado
  if (hoy < inicio) return 0;

  // Si ya venció
  if (hoy > vencimiento) return 100;

  // Calcular días transcurridos
  const diasTranscurridos = calcularDiasHabilesEntre(inicio, hoy);
  const porcentaje = (diasTranscurridos / diasTotales) * 100;

  return Math.min(Math.max(porcentaje, 0), 100);
}

/**
 * Determina el color de alerta según días restantes
 * 
 * @param diasRestantes - Días hábiles restantes
 * @param diasTotales - Días hábiles totales del plazo
 * @returns Color de alerta: 'VERDE', 'AMARILLO', 'ROJO', 'VENCIDO'
 * 
 * LÓGICA (REQ-MOD02-001):
 * - VERDE: > 50% del plazo restante
 * - AMARILLO: 25-50% del plazo restante
 * - ROJO: < 25% del plazo restante
 * - VENCIDO: ≤ 0 días restantes
 */
export function determinarColorAlerta(
  diasRestantes: number,
  diasTotales: number
): 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO' {
  if (diasRestantes <= 0) return 'VENCIDO';

  const porcentajeRestante = (diasRestantes / diasTotales) * 100;

  if (porcentajeRestante > 50) return 'VERDE';
  if (porcentajeRestante >= 25) return 'AMARILLO';
  return 'ROJO';
}

// ==================== FUNCIONES DE FORMATO ====================

/**
 * Formatea una fecha al formato colombiano DD/MM/YYYY
 */
export function formatearFecha(fecha: Date): string {
  const dia = fecha.getDate().toString().padStart(2, '0');
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const año = fecha.getFullYear();
  return `${dia}/${mes}/${año}`;
}

/**
 * Formatea días restantes con texto descriptivo
 */
export function formatearDiasRestantes(diasRestantes: number): string {
  if (diasRestantes < 0) {
    return `Vencido hace ${Math.abs(diasRestantes)} días`;
  }
  if (diasRestantes === 0) {
    return 'Vence HOY';
  }
  if (diasRestantes === 1) {
    return '1 día restante';
  }
  return `${diasRestantes} días restantes`;
}

// ==================== VALIDACIONES ====================

/**
 * Valida si una fecha es válida y no es futura
 */
export function validarFechaRecepcion(fecha: Date): {
  valida: boolean;
  error?: string;
} {
  const hoy = normalizarFecha(new Date());
  const fechaInput = normalizarFecha(fecha);

  if (isNaN(fechaInput.getTime())) {
    return { valida: false, error: 'Fecha inválida' };
  }

  if (fechaInput > hoy) {
    return { valida: false, error: 'La fecha de recepción no puede ser futura' };
  }

  return { valida: true };
}

// ==================== INFORMACIÓN PARA UI ====================

/**
 * Genera información completa de plazo para mostrar en UI
 */
export interface InfoPlazo {
  diasTotales: number;
  diasRestantes: number;
  diasTranscurridos: number;
  porcentajeTranscurrido: number;
  porcentajeRestante: number;
  colorAlerta: 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';
  fechaInicio: Date;
  fechaVencimiento: Date;
  fechaInicioFormateada: string;
  fechaVencimientoFormateada: string;
  textoRestante: string;
  estaVencido: boolean;
  esUrgente: boolean; // < 3 días
  esCritico: boolean; // < 7 días
}

/**
 * Calcula información completa de un plazo
 */
export function calcularInfoPlazo(
  fechaRecepcion: Date,
  diasHabilesTotal: number
): InfoPlazo {
  const fechaInicio = normalizarFecha(fechaRecepcion);
  const fechaVencimiento = sumarDiasHabiles(fechaInicio, diasHabilesTotal);
  const hoy = normalizarFecha(new Date());
  
  const diasTranscurridos = calcularDiasHabilesEntre(fechaInicio, hoy);
  const diasRestantes = calcularDiasHabilesRestantes(fechaVencimiento);
  const porcentajeTranscurrido = calcularPorcentajeTranscurrido(
    fechaInicio,
    fechaVencimiento,
    diasHabilesTotal
  );
  const porcentajeRestante = 100 - porcentajeTranscurrido;
  const colorAlerta = determinarColorAlerta(diasRestantes, diasHabilesTotal);

  return {
    diasTotales: diasHabilesTotal,
    diasRestantes,
    diasTranscurridos,
    porcentajeTranscurrido,
    porcentajeRestante,
    colorAlerta,
    fechaInicio,
    fechaVencimiento,
    fechaInicioFormateada: formatearFecha(fechaInicio),
    fechaVencimientoFormateada: formatearFecha(fechaVencimiento),
    textoRestante: formatearDiasRestantes(diasRestantes),
    estaVencido: diasRestantes <= 0,
    esUrgente: diasRestantes > 0 && diasRestantes <= 3,
    esCritico: diasRestantes > 0 && diasRestantes <= 7,
  };
}

// ==================== EXPORTACIONES ADICIONALES ====================

/**
 * Obtiene lista de festivos de un año específico
 * Útil para mostrar en calendarios o ayudas visuales
 */
export function obtenerFestivos(año: number): Date[] {
  if (año === 2025) return [...FESTIVOS_2025];
  if (año === 2026) return [...FESTIVOS_2026];
  return [];
}

/**
 * Verifica si el sistema de cálculo está funcionando correctamente
 * Útil para tests y validación
 */
export function testCalculoDiasHabiles(): {
  exito: boolean;
  mensaje: string;
} {
  try {
    // Test 1: Verificar que lunes 20 de enero de 2025 es día hábil
    const lunes = new Date('2025-01-20');
    if (!esDiaHabil(lunes)) {
      return { exito: false, mensaje: 'Error: Lunes no reconocido como día hábil' };
    }

    // Test 2: Verificar que sábado no es día hábil
    const sabado = new Date('2025-01-18');
    if (esDiaHabil(sabado)) {
      return { exito: false, mensaje: 'Error: Sábado reconocido como día hábil' };
    }

    // Test 3: Verificar que 1 de enero (Año Nuevo) no es día hábil
    const añoNuevo = new Date('2025-01-01');
    if (esDiaHabil(añoNuevo)) {
      return { exito: false, mensaje: 'Error: Año Nuevo reconocido como día hábil' };
    }

    return { exito: true, mensaje: '✅ Sistema de días hábiles funcionando correctamente' };
  } catch (error) {
    return { exito: false, mensaje: `Error en test: ${error}` };
  }
}
