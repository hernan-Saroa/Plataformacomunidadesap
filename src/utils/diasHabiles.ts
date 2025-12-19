/**
 * ============================================
 * UTILIDADES PARA CÁLCULO DE DÍAS HÁBILES
 * ============================================
 * 
 * Implementa el cálculo correcto de días hábiles según
 * la legislación colombiana, considerando:
 * 
 * ✅ Festivos colombianos (Ley 51 de 1983)
 * ✅ Fines de semana (sábado y domingo)
 * ✅ Años bisiestos
 * ✅ Emiliani (festivos trasladados al lunes)
 * 
 * CRÍTICO: Las fechas de vencimiento en procesos judiciales
 * DEBEN calcularse en días HÁBILES, no calendario.
 * 
 * Referencia legal:
 * - Ley 1437/2011 (CPACA): días hábiles para contencioso
 * - Decreto 2591/1991: 10 días hábiles para tutela
 * - CGP (Ley 1564/2012): días hábiles para ordinaria
 */

// ============================================
// FESTIVOS FIJOS DE COLOMBIA
// ============================================

/**
 * Festivos FIJOS que NO se trasladan (siempre misma fecha)
 */
const FESTIVOS_FIJOS: { mes: number; dia: number; nombre: string }[] = [
  { mes: 1, dia: 1, nombre: 'Año Nuevo' },
  { mes: 5, dia: 1, nombre: 'Día del Trabajo' },
  { mes: 7, dia: 20, nombre: 'Día de la Independencia' },
  { mes: 8, dia: 7, nombre: 'Batalla de Boyacá' },
  { mes: 12, dia: 8, nombre: 'Inmaculada Concepción' },
  { mes: 12, dia: 25, nombre: 'Navidad' },
];

/**
 * Festivos MOVIBLES (Ley Emiliani - se trasladan al siguiente lunes)
 * 
 * Ley 51 de 1983 (Ley Emiliani):
 * Si el festivo cae en día diferente al lunes, se traslada al lunes siguiente
 */
const FESTIVOS_EMILIANI: { mes: number; dia: number; nombre: string }[] = [
  { mes: 1, dia: 6, nombre: 'Día de los Reyes Magos' },
  { mes: 3, dia: 19, nombre: 'Día de San José' },
  { mes: 6, dia: 29, nombre: 'San Pedro y San Pablo' },
  { mes: 8, dia: 15, nombre: 'Asunción de la Virgen' },
  { mes: 10, dia: 12, nombre: 'Día de la Raza' },
  { mes: 11, dia: 1, nombre: 'Día de Todos los Santos' },
  { mes: 11, dia: 11, nombre: 'Independencia de Cartagena' },
];

/**
 * Festivos basados en PASCUA (fechas variables cada año)
 * 
 * Se calculan según el algoritmo de Computus (fecha de Pascua)
 * y se trasladan al lunes siguiente según Ley Emiliani
 */
const DIAS_DESDE_PASCUA: { dias: number; nombre: string; emiliani: boolean }[] = [
  { dias: -3, nombre: 'Jueves Santo', emiliani: false }, // Jueves antes de Pascua
  { dias: -2, nombre: 'Viernes Santo', emiliani: false }, // Viernes antes de Pascua
  { dias: 43, nombre: 'Ascensión del Señor', emiliani: true }, // 43 días después de Pascua, lunes siguiente
  { dias: 64, nombre: 'Corpus Christi', emiliani: true }, // 64 días después de Pascua, lunes siguiente
  { dias: 71, nombre: 'Sagrado Corazón de Jesús', emiliani: true }, // 71 días después de Pascua, lunes siguiente
];

// ============================================
// ALGORITMO DE COMPUTUS (CÁLCULO DE PASCUA)
// ============================================

/**
 * Calcula la fecha de Pascua para un año dado
 * 
 * Utiliza el algoritmo de Meeus/Jones/Butcher (1876)
 * Válido para años 1900-2199
 * 
 * @param year - Año para calcular la Pascua
 * @returns Fecha de domingo de Pascua
 */
function calcularPascua(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzo, 4 = abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, mes - 1, dia); // mes-1 porque Date usa 0-11
}

/**
 * Traslada una fecha al siguiente lunes (Ley Emiliani)
 * 
 * @param fecha - Fecha original del festivo
 * @returns Fecha del lunes siguiente
 */
function trasladarASiguienteLunes(fecha: Date): Date {
  const diaSemana = fecha.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
  
  if (diaSemana === 1) {
    // Ya es lunes, no se traslada
    return new Date(fecha);
  }
  
  // Calcular días hasta el siguiente lunes
  const diasHastaLunes = diaSemana === 0 ? 1 : 8 - diaSemana;
  
  const lunes = new Date(fecha);
  lunes.setDate(lunes.getDate() + diasHastaLunes);
  
  return lunes;
}

// ============================================
// GENERACIÓN DE FESTIVOS POR AÑO
// ============================================

/**
 * Genera la lista completa de festivos para un año dado
 * 
 * @param year - Año para generar festivos
 * @returns Array de fechas de festivos
 */
function generarFestivosAño(year: number): Date[] {
  const festivos: Date[] = [];

  // 1. Festivos FIJOS
  FESTIVOS_FIJOS.forEach(({ mes, dia }) => {
    festivos.push(new Date(year, mes - 1, dia));
  });

  // 2. Festivos EMILIANI (se trasladan al lunes)
  FESTIVOS_EMILIANI.forEach(({ mes, dia }) => {
    const fechaOriginal = new Date(year, mes - 1, dia);
    const fechaTrasladada = trasladarASiguienteLunes(fechaOriginal);
    festivos.push(fechaTrasladada);
  });

  // 3. Festivos basados en PASCUA
  const pascua = calcularPascua(year);
  
  DIAS_DESDE_PASCUA.forEach(({ dias, emiliani }) => {
    const fechaFestivo = new Date(pascua);
    fechaFestivo.setDate(fechaFestivo.getDate() + dias);
    
    if (emiliani) {
      // Se traslada al siguiente lunes
      const fechaTrasladada = trasladarASiguienteLunes(fechaFestivo);
      festivos.push(fechaTrasladada);
    } else {
      // No se traslada (Jueves/Viernes Santo)
      festivos.push(fechaFestivo);
    }
  });

  return festivos;
}

// ============================================
// CACHE DE FESTIVOS (PERFORMANCE)
// ============================================

/**
 * Cache de festivos por año para evitar recalcular
 * Se almacenan en memoria durante la sesión
 */
const cacheFestivos: Map<number, Date[]> = new Map();

/**
 * Obtiene los festivos de un año (con cache)
 * 
 * @param year - Año
 * @returns Array de fechas de festivos
 */
function obtenerFestivosAño(year: number): Date[] {
  if (!cacheFestivos.has(year)) {
    cacheFestivos.set(year, generarFestivosAño(year));
  }
  
  return cacheFestivos.get(year)!;
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Verifica si una fecha es festivo en Colombia
 * 
 * @param fecha - Fecha a verificar
 * @returns true si es festivo, false si no
 */
export function esFestivo(fecha: Date): boolean {
  const year = fecha.getFullYear();
  const festivos = obtenerFestivosAño(year);
  
  const fechaStr = formatearFecha(fecha);
  
  return festivos.some(festivo => formatearFecha(festivo) === fechaStr);
}

/**
 * Verifica si una fecha es fin de semana (sábado o domingo)
 * 
 * @param fecha - Fecha a verificar
 * @returns true si es fin de semana, false si no
 */
export function esFinDeSemana(fecha: Date): boolean {
  const diaSemana = fecha.getDay();
  return diaSemana === 0 || diaSemana === 6; // 0=domingo, 6=sábado
}

/**
 * Verifica si una fecha es día HÁBIL
 * 
 * Día hábil = NO es fin de semana Y NO es festivo
 * 
 * @param fecha - Fecha a verificar
 * @returns true si es día hábil, false si no
 */
export function esDiaHabil(fecha: Date): boolean {
  return !esFinDeSemana(fecha) && !esFestivo(fecha);
}

/**
 * Calcula la fecha de vencimiento sumando días HÁBILES a una fecha de inicio
 * 
 * CRÍTICO: Este es el cálculo usado para determinar fechas de vencimiento
 * en procesos judiciales según la ley colombiana
 * 
 * @param fechaInicio - Fecha de notificación/inicio
 * @param diasHabiles - Cantidad de días hábiles a sumar
 * @returns Fecha de vencimiento
 * 
 * @example
 * // Tutela: 10 días hábiles desde notificación
 * const fechaNotificacion = new Date('2024-12-10');
 * const fechaVencimiento = calcularFechaVencimiento(fechaNotificacion, 10);
 * // Salta fines de semana y festivos (Navidad, Año Nuevo, etc)
 */
export function calcularFechaVencimiento(
  fechaInicio: Date,
  diasHabiles: number
): Date {
  if (diasHabiles < 0) {
    throw new Error('Los días hábiles no pueden ser negativos');
  }

  let fecha = new Date(fechaInicio);
  let diasContados = 0;

  // Contar días hábiles hacia adelante
  while (diasContados < diasHabiles) {
    // Avanzar un día
    fecha.setDate(fecha.getDate() + 1);

    // Si es día hábil, contar
    if (esDiaHabil(fecha)) {
      diasContados++;
    }
  }

  return fecha;
}

/**
 * Calcula cuántos días HÁBILES hay entre dos fechas
 * 
 * @param fechaInicio - Fecha de inicio (no incluida en el conteo)
 * @param fechaFin - Fecha de fin (incluida en el conteo)
 * @returns Cantidad de días hábiles
 * 
 * @example
 * const inicio = new Date('2024-12-10');
 * const fin = new Date('2024-12-20');
 * const dias = calcularDiasHabilesEntre(inicio, fin);
 * // Cuenta solo días hábiles entre estas fechas
 */
export function calcularDiasHabilesEntre(
  fechaInicio: Date,
  fechaFin: Date
): number {
  if (fechaFin < fechaInicio) {
    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
  }

  let fecha = new Date(fechaInicio);
  let diasHabiles = 0;

  while (fecha < fechaFin) {
    fecha.setDate(fecha.getDate() + 1);

    if (esDiaHabil(fecha)) {
      diasHabiles++;
    }
  }

  return diasHabiles;
}

/**
 * Obtiene el próximo día hábil a partir de una fecha
 * 
 * Si la fecha ya es día hábil, la devuelve sin cambios
 * Si no, devuelve el siguiente día hábil
 * 
 * @param fecha - Fecha base
 * @returns Próximo día hábil (puede ser la misma fecha)
 */
export function obtenerProximoDiaHabil(fecha: Date): Date {
  let proximaFecha = new Date(fecha);

  while (!esDiaHabil(proximaFecha)) {
    proximaFecha.setDate(proximaFecha.getDate() + 1);
  }

  return proximaFecha;
}

/**
 * Calcula los días hábiles RESTANTES hasta una fecha de vencimiento
 * 
 * Útil para el sistema de alertas (VERDE/AMARILLO/ROJO/VENCIDO)
 * 
 * @param fechaVencimiento - Fecha de vencimiento
 * @returns Días hábiles restantes (puede ser negativo si ya venció)
 */
export function calcularDiasHabilesRestantes(fechaVencimiento: Date): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);

  if (vencimiento < hoy) {
    // Ya venció - calcular cuántos días hace
    return -calcularDiasHabilesEntre(vencimiento, hoy);
  }

  // Aún no vence - calcular cuántos días faltan
  return calcularDiasHabilesEntre(hoy, vencimiento);
}

// ============================================
// FUNCIONES DE INFORMACIÓN/DEBUGGING
// ============================================

/**
 * Obtiene información detallada sobre el cálculo de una fecha de vencimiento
 * 
 * Útil para debugging y transparencia en el cálculo
 * 
 * @param fechaInicio - Fecha de inicio
 * @param diasHabiles - Días hábiles a sumar
 * @returns Objeto con información detallada del cálculo
 */
export function obtenerInfoCalculoVencimiento(
  fechaInicio: Date,
  diasHabiles: number
) {
  const fechaVencimiento = calcularFechaVencimiento(fechaInicio, diasHabiles);
  
  // Contar días calendario entre inicio y vencimiento
  const diasCalendario = Math.floor(
    (fechaVencimiento.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Contar fines de semana
  let finesDeSemana = 0;
  let festivos = 0;
  let fecha = new Date(fechaInicio);
  
  while (fecha < fechaVencimiento) {
    fecha.setDate(fecha.getDate() + 1);
    
    if (esFinDeSemana(fecha)) {
      finesDeSemana++;
    } else if (esFestivo(fecha)) {
      festivos++;
    }
  }

  return {
    fechaInicio,
    fechaVencimiento,
    diasHabilesSolicitados: diasHabiles,
    diasCalendario,
    finesDeSemana,
    festivos,
    diasNoHabiles: finesDeSemana + festivos,
    porcentajeEficiencia: Math.round((diasHabiles / diasCalendario) * 100),
  };
}

/**
 * Obtiene la lista de festivos del año actual y siguiente
 * 
 * Útil para mostrar en UI o para debugging
 * 
 * @returns Array de festivos con nombre y fecha
 */
export function obtenerFestivosActuales(): Array<{ fecha: Date; nombre: string }> {
  const yearActual = new Date().getFullYear();
  const festivos: Array<{ fecha: Date; nombre: string }> = [];

  // Festivos año actual
  const festivosActual = obtenerFestivosAño(yearActual);
  festivosActual.forEach(fecha => {
    festivos.push({
      fecha,
      nombre: obtenerNombreFestivo(fecha),
    });
  });

  // Festivos año siguiente (para cálculos que cruzan año)
  const festivosSiguiente = obtenerFestivosAño(yearActual + 1);
  festivosSiguiente.forEach(fecha => {
    festivos.push({
      fecha,
      nombre: obtenerNombreFestivo(fecha),
    });
  });

  return festivos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

/**
 * Obtiene el nombre de un festivo (si aplica)
 * 
 * @param fecha - Fecha a verificar
 * @returns Nombre del festivo o cadena vacía
 */
function obtenerNombreFestivo(fecha: Date): string {
  const year = fecha.getFullYear();
  
  // Verificar festivos fijos
  for (const festivo of FESTIVOS_FIJOS) {
    const fechaFestivo = new Date(year, festivo.mes - 1, festivo.dia);
    if (formatearFecha(fechaFestivo) === formatearFecha(fecha)) {
      return festivo.nombre;
    }
  }
  
  // Verificar festivos Emiliani
  for (const festivo of FESTIVOS_EMILIANI) {
    const fechaOriginal = new Date(year, festivo.mes - 1, festivo.dia);
    const fechaTrasladada = trasladarASiguienteLunes(fechaOriginal);
    if (formatearFecha(fechaTrasladada) === formatearFecha(fecha)) {
      return festivo.nombre;
    }
  }
  
  // Verificar festivos de Pascua
  const pascua = calcularPascua(year);
  for (const festivo of DIAS_DESDE_PASCUA) {
    const fechaFestivo = new Date(pascua);
    fechaFestivo.setDate(fechaFestivo.getDate() + festivo.dias);
    
    const fechaFinal = festivo.emiliani 
      ? trasladarASiguienteLunes(fechaFestivo)
      : fechaFestivo;
    
    if (formatearFecha(fechaFinal) === formatearFecha(fecha)) {
      return festivo.nombre;
    }
  }
  
  return '';
}

// ============================================
// UTILIDADES AUXILIARES
// ============================================

/**
 * Formatea una fecha como YYYY-MM-DD para comparaciones
 * 
 * @param fecha - Fecha a formatear
 * @returns String en formato YYYY-MM-DD
 */
function formatearFecha(fecha: Date): string {
  return fecha.toISOString().split('T')[0];
}

/**
 * Verifica si un año es bisiesto
 * 
 * @param year - Año a verificar
 * @returns true si es bisiesto, false si no
 */
export function esAñoBisiesto(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// ============================================
// EXPORTS PARA TESTING
// ============================================

/**
 * Funciones exportadas solo para testing
 * NO usar en producción
 */
export const __testing__ = {
  calcularPascua,
  trasladarASiguienteLunes,
  generarFestivosAño,
  obtenerNombreFestivo,
};
