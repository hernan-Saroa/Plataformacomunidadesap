/**
 * UTILIDADES PARA CÁLCULO DE DÍAS HÁBILES EN COLOMBIA
 * ✅ Considera FECHA y HORA para términos procesales
 * ✅ Excluye sábados, domingos y festivos nacionales
 * ✅ Basado en Art. 121 del CPACA (Código de Procedimiento Administrativo y de lo Contencioso Administrativo)
 * 
 * IMPORTANTE: En derecho procesal colombiano, los términos no solo se cuentan por días,
 * sino que también se debe considerar la HORA exacta de notificación/actuación.
 * 
 * Ejemplo: Si una notificación se recibe el 3 de febrero de 2026 a las 14:30,
 * y el plazo es de 5 días hábiles, el vencimiento es el 10 de febrero de 2026 a las 14:30.
 */

/**
 * Festivos fijos y móviles de Colombia 2024-2027
 * Basado en la Ley 51 de 1983 (Festivos en Colombia)
 * 
 * FESTIVOS FIJOS (siempre en la misma fecha):
 * - 1 de enero: Año Nuevo
 * - 1 de mayo: Día del Trabajo
 * - 20 de julio: Día de la Independencia
 * - 7 de agosto: Batalla de Boyacá
 * - 8 de diciembre: Inmaculada Concepción
 * - 25 de diciembre: Navidad
 * 
 * FESTIVOS MÓVILES (se trasladan al lunes siguiente):
 * - Resto de festivos religiosos y civiles
 */
const FESTIVOS_COLOMBIA: Record<number, string[]> = {
  2024: [
    '2024-01-01', // Año Nuevo
    '2024-01-08', // Epifanía (lunes)
    '2024-03-25', // San José (lunes)
    '2024-03-28', // Jueves Santo
    '2024-03-29', // Viernes Santo
    '2024-05-01', // Día del Trabajo
    '2024-05-13', // Ascensión (lunes)
    '2024-06-03', // Corpus Christi (lunes)
    '2024-06-10', // Sagrado Corazón (lunes)
    '2024-07-01', // San Pedro y San Pablo (lunes)
    '2024-07-20', // Independencia
    '2024-08-07', // Batalla de Boyacá
    '2024-08-19', // Asunción (lunes)
    '2024-10-14', // Día de la Raza (lunes)
    '2024-11-04', // Todos los Santos (lunes)
    '2024-11-11', // Independencia de Cartagena (lunes)
    '2024-12-08', // Inmaculada Concepción
    '2024-12-25', // Navidad
  ],
  2025: [
    '2025-01-01', // Año Nuevo
    '2025-01-06', // Epifanía (lunes)
    '2025-03-24', // San José (lunes)
    '2025-04-17', // Jueves Santo
    '2025-04-18', // Viernes Santo
    '2025-05-01', // Día del Trabajo
    '2025-06-02', // Ascensión (lunes)
    '2025-06-23', // Corpus Christi (lunes)
    '2025-06-30', // Sagrado Corazón (lunes)
    '2025-07-07', // San Pedro y San Pablo (lunes)
    '2025-07-20', // Independencia
    '2025-08-07', // Batalla de Boyacá
    '2025-08-18', // Asunción (lunes)
    '2025-10-13', // Día de la Raza (lunes)
    '2025-11-03', // Todos los Santos (lunes)
    '2025-11-17', // Independencia de Cartagena (lunes)
    '2025-12-08', // Inmaculada Concepción
    '2025-12-25', // Navidad
  ],
  2026: [
    '2026-01-01', // Año Nuevo
    '2026-01-12', // Epifanía (lunes)
    '2026-03-23', // San José (lunes)
    '2026-04-02', // Jueves Santo
    '2026-04-03', // Viernes Santo
    '2026-05-01', // Día del Trabajo
    '2026-05-18', // Ascensión (lunes)
    '2026-06-08', // Corpus Christi (lunes)
    '2026-06-15', // Sagrado Corazón (lunes)
    '2026-06-29', // San Pedro y San Pablo (lunes)
    '2026-07-20', // Independencia
    '2026-08-07', // Batalla de Boyacá
    '2026-08-17', // Asunción (lunes)
    '2026-10-12', // Día de la Raza (lunes)
    '2026-11-02', // Todos los Santos (lunes)
    '2026-11-16', // Independencia de Cartagena (lunes)
    '2026-12-08', // Inmaculada Concepción
    '2026-12-25', // Navidad
  ],
  2027: [
    '2027-01-01', // Año Nuevo
    '2027-01-11', // Epifanía (lunes)
    '2027-03-22', // San José (lunes)
    '2027-03-25', // Jueves Santo
    '2027-03-26', // Viernes Santo
    '2027-05-01', // Día del Trabajo
    '2027-05-10', // Ascensión (lunes)
    '2027-05-31', // Corpus Christi (lunes)
    '2027-06-07', // Sagrado Corazón (lunes)
    '2027-06-28', // San Pedro y San Pablo (lunes)
    '2027-07-20', // Independencia
    '2027-08-07', // Batalla de Boyacá
    '2027-08-16', // Asunción (lunes)
    '2027-10-11', // Día de la Raza (lunes)
    '2027-11-01', // Todos los Santos (lunes)
    '2027-11-15', // Independencia de Cartagena (lunes)
    '2027-12-08', // Inmaculada Concepción
    '2027-12-25', // Navidad
  ],
};

/**
 * Verifica si una fecha es festivo en Colombia
 */
export function esFestivo(fecha: Date): boolean {
  const year = fecha.getFullYear();
  const fechaStr = fecha.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  
  const festivosDelAno = FESTIVOS_COLOMBIA[year] || [];
  return festivosDelAno.includes(fechaStr);
}

/**
 * Verifica si una fecha cae en fin de semana (sábado o domingo)
 */
export function esFinDeSemana(fecha: Date): boolean {
  const diaSemana = fecha.getDay();
  return diaSemana === 0 || diaSemana === 6; // 0 = Domingo, 6 = Sábado
}

/**
 * Verifica si una fecha es día hábil (no es fin de semana ni festivo)
 */
export function esDiaHabil(fecha: Date): boolean {
  return !esFinDeSemana(fecha) && !esFestivo(fecha);
}

/**
 * ✅ CÁLCULO DE DÍAS HÁBILES CONSIDERANDO FECHA Y HORA
 * 
 * Suma N días hábiles a una fecha/hora inicial
 * IMPORTANTE: Mantiene la HORA exacta de la fecha inicial
 * 
 * @param fechaInicio - Fecha/hora inicial (puede ser Date o string ISO)
 * @param diasHabiles - Número de días hábiles a sumar
 * @returns Fecha/hora de vencimiento (Date)
 * 
 * @example
 * // Notificación: 3 de feb 2026 a las 14:30
 * // Plazo: 5 días hábiles
 * // Resultado: 10 de feb 2026 a las 14:30
 * const inicio = new Date('2026-02-03T14:30:00');
 * const vencimiento = calcularDiasHabilesConHora(inicio, 5);
 */
export function calcularDiasHabilesConHora(
  fechaInicio: Date | string,
  diasHabiles: number
): Date {
  // Convertir a Date si es string
  const fecha = typeof fechaInicio === 'string' ? new Date(fechaInicio) : new Date(fechaInicio);
  
  // ✅ GUARDAR LA HORA ORIGINAL (importante para términos procesales)
  const horaOriginal = fecha.getHours();
  const minutosOriginales = fecha.getMinutes();
  const segundosOriginales = fecha.getSeconds();
  const milisegundosOriginales = fecha.getMilliseconds();
  
  let diasContados = 0;
  let fechaActual = new Date(fecha);
  
  // Avanzar día por día hasta completar los días hábiles
  while (diasContados < diasHabiles) {
    // Avanzar un día
    fechaActual.setDate(fechaActual.getDate() + 1);
    
    // Verificar si es día hábil
    if (esDiaHabil(fechaActual)) {
      diasContados++;
    }
  }
  
  // ✅ RESTAURAR LA HORA ORIGINAL
  fechaActual.setHours(horaOriginal, minutosOriginales, segundosOriginales, milisegundosOriginales);
  
  return fechaActual;
}

/**
 * ✅ CALCULAR DÍAS HÁBILES ENTRE DOS FECHAS CONSIDERANDO HORAS
 * 
 * Calcula cuántos días hábiles COMPLETOS hay entre dos fechas/horas
 * IMPORTANTE: Considera las HORAS para determinar si se cuenta el día completo
 * 
 * @param fechaInicio - Fecha/hora inicial
 * @param fechaFin - Fecha/hora final
 * @returns Número de días hábiles entre las fechas (puede ser decimal si considera horas)
 * 
 * @example
 * // Inicio: 3 de feb 2026 a las 14:30
 * // Fin: 10 de feb 2026 a las 14:30
 * // Resultado: 5.0 días hábiles
 * const inicio = new Date('2026-02-03T14:30:00');
 * const fin = new Date('2026-02-10T14:30:00');
 * const dias = calcularDiasHabilesEntreDosFechas(inicio, fin);
 */
export function calcularDiasHabilesEntreDosFechas(
  fechaInicio: Date | string,
  fechaFin: Date | string
): number {
  const inicio = typeof fechaInicio === 'string' ? new Date(fechaInicio) : new Date(fechaInicio);
  const fin = typeof fechaFin === 'string' ? new Date(fechaFin) : new Date(fechaFin);
  
  // Si la fecha fin es anterior al inicio, retornar negativo
  if (fin < inicio) {
    return -calcularDiasHabilesEntreDosFechas(fin, inicio);
  }
  
  let diasHabiles = 0;
  let fechaActual = new Date(inicio);
  
  // ✅ NORMALIZAR AMBAS FECHAS AL INICIO DEL DÍA PARA CONTAR DÍAS COMPLETOS
  const inicioDelDiaInicio = new Date(inicio);
  inicioDelDiaInicio.setHours(0, 0, 0, 0);
  
  const inicioDelDiaFin = new Date(fin);
  inicioDelDiaFin.setHours(0, 0, 0, 0);
  
  // Iterar día por día
  while (inicioDelDiaInicio < inicioDelDiaFin) {
    inicioDelDiaInicio.setDate(inicioDelDiaInicio.getDate() + 1);
    
    if (esDiaHabil(inicioDelDiaInicio)) {
      diasHabiles++;
    }
  }
  
  // ✅ AJUSTE POR HORAS: Si la hora de fin es menor que la de inicio, resta una fracción
  const horaInicio = inicio.getHours() + inicio.getMinutes() / 60;
  const horaFin = fin.getHours() + fin.getMinutes() / 60;
  
  // Si mismo día, calcular fracción
  if (inicioDelDiaInicio.getTime() === inicioDelDiaFin.getTime()) {
    if (esDiaHabil(inicio)) {
      const fraccionDelDia = (horaFin - horaInicio) / 24;
      return Math.max(0, fraccionDelDia);
    }
    return 0;
  }
  
  // Si las horas difieren, ajustar fracción del último día
  if (horaFin < horaInicio && diasHabiles > 0) {
    // La hora de vencimiento es anterior, por lo que técnicamente falta tiempo del día anterior
    const fraccionRestante = (horaInicio - horaFin) / 24;
    return Math.max(0, diasHabiles - fraccionRestante);
  }
  
  return diasHabiles;
}

/**
 * ✅ FORMATO DE FECHA Y HORA PARA TÉRMINOS LEGALES
 * 
 * Formatea una fecha/hora en formato colombiano estándar para documentos legales
 * 
 * @param fecha - Fecha a formatear
 * @param incluirHora - Si debe incluir la hora (por defecto true)
 * @returns String formateado
 * 
 * @example
 * const fecha = new Date('2026-02-03T14:30:00');
 * formatearFechaHoraLegal(fecha, true);
 * // "3 de febrero de 2026 a las 14:30"
 * 
 * formatearFechaHoraLegal(fecha, false);
 * // "3 de febrero de 2026"
 */
export function formatearFechaHoraLegal(
  fecha: Date | string,
  incluirHora: boolean = true
): string {
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  // Formato de fecha completo en español
  const opciones: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota'
  };
  
  const fechaFormateada = fechaObj.toLocaleDateString('es-CO', opciones);
  
  if (!incluirHora) {
    return fechaFormateada;
  }
  
  // Agregar hora
  const horas = fechaObj.getHours().toString().padStart(2, '0');
  const minutos = fechaObj.getMinutes().toString().padStart(2, '0');
  
  return `${fechaFormateada} a las ${horas}:${minutos}`;
}

/**
 * ✅ VALIDAR SI UN PLAZO HA VENCIDO (CONSIDERANDO HORA)
 * 
 * Determina si un plazo legal ya venció, considerando la hora exacta
 * 
 * @param fechaVencimiento - Fecha/hora de vencimiento
 * @returns true si ya venció, false si aún está vigente
 * 
 * @example
 * // Vencimiento: 10 de feb 2026 a las 14:30
 * // Hoy: 10 de feb 2026 a las 14:25 -> false (aún vigente)
 * // Hoy: 10 de feb 2026 a las 14:31 -> true (vencido)
 */
export function plazoVencido(fechaVencimiento: Date | string): boolean {
  const vencimiento = typeof fechaVencimiento === 'string' 
    ? new Date(fechaVencimiento) 
    : fechaVencimiento;
  
  const ahora = new Date();
  
  // Comparación exacta incluyendo hora, minutos, segundos
  return ahora > vencimiento;
}

/**
 * ✅ OBTENER ESTADO DE SEMÁFORO SEGÚN DÍAS RESTANTES Y HORA
 * 
 * Retorna el estado del semáforo para visualización de urgencia
 * Considera tanto días como horas restantes
 * 
 * @param fechaVencimiento - Fecha/hora de vencimiento
 * @returns 'rojo' | 'amarillo' | 'verde' | 'vencido'
 */
export function obtenerEstadoSemaforo(fechaVencimiento: Date | string): 'rojo' | 'amarillo' | 'verde' | 'vencido' {
  if (plazoVencido(fechaVencimiento)) {
    return 'vencido';
  }
  
  const ahora = new Date();
  const diasRestantes = calcularDiasHabilesEntreDosFechas(ahora, fechaVencimiento);
  
  if (diasRestantes <= 2) return 'rojo';      // 2 días o menos
  if (diasRestantes <= 5) return 'amarillo';  // 3-5 días
  return 'verde';                              // Más de 5 días
}

/**
 * ✅ HELPER: Crear fecha/hora desde inputs separados
 * 
 * Útil para formularios donde fecha y hora se capturan por separado
 * 
 * @param fecha - String en formato YYYY-MM-DD
 * @param hora - String en formato HH:mm (opcional, por defecto 08:00)
 * @returns Date object combinado
 */
export function combinarFechaHora(fecha: string, hora: string = '08:00'): Date {
  // Combinar fecha y hora en formato ISO
  const fechaHoraISO = `${fecha}T${hora}:00`;
  return new Date(fechaHoraISO);
}

/**
 * ✅ HELPER: Extraer componentes de fecha/hora
 * 
 * Separa una fecha en sus componentes para formularios
 * 
 * @param fechaCompleta - Date object
 * @returns Objeto con fecha (YYYY-MM-DD) y hora (HH:mm)
 */
export function separarFechaHora(fechaCompleta: Date | string): { fecha: string; hora: string } {
  const fechaObj = typeof fechaCompleta === 'string' ? new Date(fechaCompleta) : fechaCompleta;
  
  // Extraer fecha en formato YYYY-MM-DD
  const year = fechaObj.getFullYear();
  const month = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
  const day = fechaObj.getDate().toString().padStart(2, '0');
  const fecha = `${year}-${month}-${day}`;
  
  // Extraer hora en formato HH:mm
  const horas = fechaObj.getHours().toString().padStart(2, '0');
  const minutos = fechaObj.getMinutes().toString().padStart(2, '0');
  const hora = `${horas}:${minutos}`;
  
  return { fecha, hora };
}
