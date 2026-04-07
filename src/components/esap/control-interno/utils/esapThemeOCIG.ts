/**
 * ═════════════════════════════════════════════════════════════════════════
 * TEMA CORPORATIVO ESAP - OCI (Oficina de Control Interno de Gestión)
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Sistema de diseño oficial para el módulo de Control Interno
 * Basado en las especificaciones de PROMPT_FIGMA_OCI_COMPLETO.md
 * 
 * @version 2.0
 * @updated 30 Enero 2025
 */

// ═════════════════════════════════════════════════════════════════════════
// PALETA DE COLORES PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export const ESAP_COLORS = {
  // PRIMARIOS (Institucional ESAP)
  primary: {
    dark: '#1B4F72',    // Headers, botones primarios, texto importante
    medium: '#2874A6',  // Hover states, enlaces, acentos
    light: '#2E86AB',   // Iconos, bordes activos
  },

  // SECUNDARIOS (Funcionales)
  neutral: {
    white: '#FFFFFF',   // Fondos principales, tarjetas
    gray100: '#F8F9FA', // Fondos secundarios, filas alternas
    gray200: '#E9ECEF', // Bordes, divisores
    gray500: '#6C757D', // Texto secundario
    gray900: '#2C3E50', // Texto principal
  },

  // ESTADOS KANBAN (Distintivos por columna)
  kanban: {
    backlog: '#E8F4F8',      // Azul muy pálido (pendiente)
    planeacion: '#FEF9E7',   // Amarillo pálido (preparando)
    ejecucion: '#D4EFDF',    // Verde pálido (en curso)
    comunicacion: '#FADBD8', // Rosa pálido (finalizando)
    cerrado: '#D5D8DC',      // Gris pálido (completado)
  },

  // SEMÁFOROS (Cumplimiento)
  semaforo: {
    verde: '#27AE60',   // ≥80% cumplimiento, éxito
    amarillo: '#F39C12', // 50-79% cumplimiento, advertencia
    rojo: '#E74C3C',    // <50% cumplimiento, alerta crítica
  },

  // ALERTAS
  alert: {
    success: {
      bg: '#D4EFDF',
      text: '#27AE60',
    },
    warning: {
      bg: '#FEF9E7',
      text: '#F39C12',
    },
    error: {
      bg: '#FADBD8',
      text: '#E74C3C',
    },
    info: {
      bg: '#E8F4F8',
      text: '#3498DB',
    },
  },
} as const;

// ═════════════════════════════════════════════════════════════════════════
// CLASES TAILWIND PRECONFIGURADAS
// ═════════════════════════════════════════════════════════════════════════

export const ESAP_CLASSES = {
  // BOTONES
  button: {
    primary: 'bg-[#1B4F72] hover:bg-[#2874A6] text-white font-medium px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow-md',
    secondary: 'bg-white hover:bg-gray-50 text-[#1B4F72] border border-[#2874A6] font-medium px-4 py-2 rounded-lg transition-all',
    ghost: 'hover:bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-lg transition-all',
  },

  // CARDS
  card: {
    base: 'bg-white rounded-lg border border-gray-200 shadow-sm p-4',
    hover: 'hover:shadow-md hover:border-[#2E86AB] transition-all cursor-pointer',
    dragging: 'opacity-80 shadow-xl border-[#2874A6] border-2',
  },

  // ESTADOS KANBAN
  kanban: {
    backlog: 'bg-[#E8F4F8] border-[#2E86AB]',
    planeacion: 'bg-[#FEF9E7] border-[#F39C12]',
    ejecucion: 'bg-[#D4EFDF] border-[#27AE60]',
    comunicacion: 'bg-[#FADBD8] border-[#E74C3C]',
    cerrado: 'bg-[#D5D8DC] border-[#6C757D]',
  },

  // SEMÁFOROS
  semaforo: {
    verde: 'w-3 h-3 rounded-full bg-[#27AE60]',
    amarillo: 'w-3 h-3 rounded-full bg-[#F39C12]',
    rojo: 'w-3 h-3 rounded-full bg-[#E74C3C]',
  },

  // BADGES
  badge: {
    base: 'px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide',
    primary: 'bg-[#E8F4F8] text-[#1B4F72]',
    success: 'bg-[#D4EFDF] text-[#27AE60]',
    warning: 'bg-[#FEF9E7] text-[#F39C12]',
    error: 'bg-[#FADBD8] text-[#E74C3C]',
  },

  // TEXTO
  text: {
    h1: 'text-3xl font-bold text-[#1B4F72]',
    h2: 'text-2xl font-semibold text-[#2C3E50]',
    h3: 'text-xl font-semibold text-[#2C3E50]',
    body: 'text-base text-[#2C3E50]',
    small: 'text-sm text-[#6C757D]',
    caption: 'text-xs font-medium text-[#6C757D] uppercase tracking-wide',
  },
} as const;

// ═════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═════════════════════════════════════════════════════════════════════════

/**
 * Obtiene el color de semáforo según el porcentaje de cumplimiento
 */
export function getSemaforoColor(porcentaje: number): keyof typeof ESAP_COLORS.semaforo {
  if (porcentaje >= 80) return 'verde';
  if (porcentaje >= 50) return 'amarillo';
  return 'rojo';
}

/**
 * Obtiene el color de semáforo según días restantes
 */
export function getSemaforoPorDias(diasRestantes: number): keyof typeof ESAP_COLORS.semaforo {
  if (diasRestantes > 7) return 'verde';
  if (diasRestantes > 2) return 'amarillo';
  return 'rojo';
}

/**
 * Obtiene la clase de Tailwind para el semáforo
 */
export function getSemaforoClass(porcentaje: number): string {
  const color = getSemaforoColor(porcentaje);
  return ESAP_CLASSES.semaforo[color];
}

/**
 * Obtiene el color de fondo para una columna Kanban
 */
export function getKanbanColumnColor(estado: keyof typeof ESAP_COLORS.kanban): string {
  return ESAP_COLORS.kanban[estado];
}

/**
 * Obtiene la clase completa para una columna Kanban
 */
export function getKanbanColumnClass(estado: keyof typeof ESAP_COLORS.kanban): string {
  return ESAP_CLASSES.kanban[estado];
}

/**
 * Formatea un código de auditoría con estilo monospace
 */
export function formatCodigoAuditoria(codigo: string): string {
  return codigo; // En producción, aplicar fuente monospace
}

/**
 * Calcula días restantes desde hoy hasta una fecha
 */
export function calcularDiasRestantes(fechaFin: string): number {
  const hoy = new Date();
  const fin = new Date(fechaFin);
  const diff = fin.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Obtiene el texto de alerta según días restantes
 */
export function getTextoAlerta(diasRestantes: number): string {
  if (diasRestantes < 0) return `Vencida hace ${Math.abs(diasRestantes)} días`;
  if (diasRestantes === 0) return 'Vence hoy';
  if (diasRestantes === 1) return 'Vence mañana';
  if (diasRestantes <= 5) return `Vence en ${diasRestantes} días`;
  return '';
}

// ═════════════════════════════════════════════════════════════════════════
// CONSTANTES DE DISEÑO
// ═════════════════════════════════════════════════════════════════════════

export const DESIGN_TOKENS = {
  // Espaciado (múltiplos de 4)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  // Border radius
  radius: {
    small: '4px',
    medium: '8px',
    large: '12px',
    full: '9999px',
  },

  // Tamaños de iconos
  iconSizes: {
    inline: '16px',
    button: '20px',
    nav: '24px',
    featured: '32px',
  },

  // Sombras
  shadows: {
    card: '0 2px 4px rgba(0,0,0,0.1)',
    cardHover: '0 4px 8px rgba(0,0,0,0.15)',
    cardDragging: '0 8px 16px rgba(0,0,0,0.2)',
  },

  // Dimensiones de card de auditoría
  auditCard: {
    width: '280px',
    minHeight: '180px',
    padding: '16px',
    borderRadius: '8px',
  },
} as const;

// ═════════════════════════════════════════════════════════════════════════
// TIPOS PARA ESTADOS
// ═════════════════════════════════════════════════════════════════════════

export type EstadoKanban = keyof typeof ESAP_COLORS.kanban;
export type ColorSemaforo = keyof typeof ESAP_COLORS.semaforo;
export type TipoAlerta = keyof typeof ESAP_COLORS.alert;

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS POR DEFECTO
// ═════════════════════════════════════════════════════════════════════════

export default {
  colors: ESAP_COLORS,
  classes: ESAP_CLASSES,
  tokens: DESIGN_TOKENS,
  utils: {
    getSemaforoColor,
    getSemaforoPorDias,
    getSemaforoClass,
    getKanbanColumnColor,
    getKanbanColumnClass,
    formatCodigoAuditoria,
    calcularDiasRestantes,
    getTextoAlerta,
  },
};
