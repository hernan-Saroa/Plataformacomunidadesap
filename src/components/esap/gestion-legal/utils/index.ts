/**
 * Utilidades para SIGL v5.0
 */

import { SemaforoEstado } from '../core/types';
import { SIGL_COLORS } from '../design-system/tokens';

// ============================================================================
// CÁLCULO DE DÍAS HÁBILES
// ============================================================================

/**
 * Festivos de Colombia 2025 (actualizar anualmente)
 */
const festivosColombia2025: Date[] = [
  new Date('2025-01-01'), // Año Nuevo
  new Date('2025-01-06'), // Reyes Magos
  new Date('2025-03-24'), // San José
  new Date('2025-04-17'), // Jueves Santo
  new Date('2025-04-18'), // Viernes Santo
  new Date('2025-05-01'), // Día del Trabajo
  new Date('2025-05-26'), // Ascensión del Señor
  new Date('2025-06-16'), // Corpus Christi
  new Date('2025-06-23'), // Sagrado Corazón
  new Date('2025-06-30'), // San Pedro y San Pablo
  new Date('2025-07-20'), // Día de la Independencia
  new Date('2025-08-07'), // Batalla de Boyacá
  new Date('2025-08-18'), // Asunción de la Virgen
  new Date('2025-10-13'), // Día de la Raza
  new Date('2025-11-03'), // Todos los Santos
  new Date('2025-11-17'), // Independencia de Cartagena
  new Date('2025-12-08'), // Inmaculada Concepción
  new Date('2025-12-25'), // Navidad
];

/**
 * Verifica si una fecha es festivo
 */
export function esFestivo(fecha: Date): boolean {
  return festivosColombia2025.some(
    (festivo) =>
      festivo.getFullYear() === fecha.getFullYear() &&
      festivo.getMonth() === fecha.getMonth() &&
      festivo.getDate() === fecha.getDate()
  );
}

/**
 * Verifica si una fecha es fin de semana
 */
export function esFinDeSemana(fecha: Date): boolean {
  const dia = fecha.getDay();
  return dia === 0 || dia === 6; // 0 = Domingo, 6 = Sábado
}

/**
 * Verifica si una fecha es día hábil
 */
export function esDiaHabil(fecha: Date): boolean {
  return !esFinDeSemana(fecha) && !esFestivo(fecha);
}

/**
 * Calcula días hábiles entre dos fechas
 */
export function calcularDiasHabiles(fechaInicio: Date, fechaFin: Date): number {
  let diasHabiles = 0;
  const fechaActual = new Date(fechaInicio);

  while (fechaActual <= fechaFin) {
    if (esDiaHabil(fechaActual)) {
      diasHabiles++;
    }
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return diasHabiles;
}

/**
 * Agrega días hábiles a una fecha
 */
export function agregarDiasHabiles(fecha: Date, diasHabiles: number): Date {
  const fechaResultado = new Date(fecha);
  let diasAgregados = 0;

  while (diasAgregados < diasHabiles) {
    fechaResultado.setDate(fechaResultado.getDate() + 1);
    if (esDiaHabil(fechaResultado)) {
      diasAgregados++;
    }
  }

  return fechaResultado;
}

// ============================================================================
// LÓGICA DE SEMÁFORO
// ============================================================================

/**
 * Determina el estado del semáforo según días restantes
 */
export function determinarSemaforo(diasRestantes: number, diasTotales: number): SemaforoEstado {
  const porcentajeRestante = diasTotales > 0 ? (diasRestantes / diasTotales) * 100 : 0;

  if (diasRestantes <= 0) {
    return {
      color: SIGL_COLORS.semaforoCritico,
      label: 'VENCIDO',
      diasRestantes,
      animate: true,
    };
  }

  if (porcentajeRestante < 25) {
    return {
      color: SIGL_COLORS.semaforoRojo,
      label: 'URGENTE',
      diasRestantes,
      animate: false,
    };
  }

  if (porcentajeRestante < 50) {
    return {
      color: SIGL_COLORS.semaforoAmarillo,
      label: 'ATENCIÓN',
      diasRestantes,
      animate: false,
    };
  }

  return {
    color: SIGL_COLORS.semaforoVerde,
    label: 'AL DÍA',
    diasRestantes,
    animate: false,
  };
}

/**
 * Alias para determinarSemaforo (compatibilidad)
 */
export const calcularSemaforo = determinarSemaforo;

// ============================================================================
// FORMATEO DE DATOS
// ============================================================================

/**
 * Formatea una fecha a formato colombiano
 */
export function formatearFecha(fecha: Date, formato: 'corto' | 'largo' | 'completo' = 'corto'): string {
  const opciones: Intl.DateTimeFormatOptions = {
    corto: { day: '2-digit', month: '2-digit', year: 'numeric' },
    largo: { day: 'numeric', month: 'long', year: 'numeric' },
    completo: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  };

  return fecha.toLocaleDateString('es-CO', opciones[formato]);
}

/**
 * Formatea un monto en pesos colombianos
 */
export function formatearMoneda(monto: number, compacto: boolean = false): string {
  if (monto === 0) return 'Sin cuantía';

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    notation: compacto ? 'compact' : 'standard',
  }).format(monto);
}

/**
 * Formatea un número de radicado
 */
export function formatearRadicado(radicado: string): string {
  return radicado.toUpperCase();
}

// ============================================================================
// VALIDACIONES
// ============================================================================

/**
 * Valida un código de expediente (formato: XX-AAAA-NNN)
 */
export function validarCodigoExpediente(codigo: string): boolean {
  const regex = /^[A-Z]{2}-\d{4}-\d{3}$/;
  return regex.test(codigo);
}

/**
 * Valida una cuantía (debe ser un número positivo o cero)
 */
export function validarCuantia(cuantia: number): boolean {
  return typeof cuantia === 'number' && cuantia >= 0;
}

/**
 * Valida un email
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// ============================================================================
// GENERADORES
// ============================================================================

/**
 * Genera un ID único para documentos
 */
export function generarIdDocumento(): string {
  return `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Genera un ID único para actuaciones
 */
export function generarIdActuacion(): string {
  return `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Genera un ID único para eventos de timeline
 */
export function generarIdTimeline(): string {
  return `TL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// HELPERS DE TEXTO
// ============================================================================

/**
 * Trunca un texto a una longitud máxima
 */
export function truncarTexto(texto: string, longitudMaxima: number): string {
  if (texto.length <= longitudMaxima) return texto;
  return texto.substring(0, longitudMaxima) + '...';
}

/**
 * Capitaliza la primera letra de cada palabra
 */
export function capitalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .split(' ')
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

// ============================================================================
// HELPERS DE ARRAYS
// ============================================================================

/**
 * Ordena expedientes por días restantes (urgentes primero)
 */
export function ordenarPorUrgencia<T extends { diasRestantes: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.diasRestantes - b.diasRestantes);
}

/**
 * Filtra expedientes urgentes (< 10 días o vencidos)
 */
export function filtrarUrgentes<T extends { diasRestantes: number }>(items: T[]): T[] {
  return items.filter((item) => item.diasRestantes < 10);
}

/**
 * Filtra expedientes vencidos
 */
export function filtrarVencidos<T extends { diasRestantes: number }>(items: T[]): T[] {
  return items.filter((item) => item.diasRestantes <= 0);
}