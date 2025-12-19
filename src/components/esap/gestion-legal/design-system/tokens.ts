/**
 * DESIGN TOKENS SIGL - Sistema Integral de Gestión Legal ESAP
 * Basado en: DISEÑO_UI_SIGL_DETALLADO_PARA_FIGMA.md
 * Versión: 1.0
 * Fecha: Diciembre 17, 2025
 */

export const DESIGN_TOKENS = {
  // 1. COLORES PRIMARIOS
  colors: {
    primary: {
      blue: '#1F4788',        // Headers, botones primarios
      blueHover: '#0d2856',   // Hover states primarios
      blueActive: '#0a1f3f',  // Active states primarios
      secondary: '#2E5C8A',   // Secondary actions
      light: '#E8F0F8',       // Backgrounds, inputs
      white: '#FFFFFF',       // Base
    },

    // 2. COLORES DE ESTADO (Semáforo de plazos)
    status: {
      green: '#28A745',       // OK/Plazo normal
      yellow: '#FFC107',      // Alerta (Día 25)
      orange: '#FF9800',      // Atención (< 10 días)
      red: '#DC3545',         // Crítico/Vencido
      gray: '#6C757D',        // Inactivo
    },

    // 3. COLORES NEUTROS
    neutral: {
      darkGray: '#2C3E50',    // Texto principal
      mediumGray: '#95A5A6',  // Texto secundario
      lightGray: '#ECF0F1',   // Bordes, divisores
      veryLightGray: '#F5F6FA', // Backgrounds secundarios
    },

    // 4. GRADIENTES
    gradients: {
      blue: 'linear-gradient(135deg, #1F4788 0%, #2E5C8A 100%)', // Headers
      alert: 'linear-gradient(135deg, #FFC107 0%, #FF9800 100%)', // Warning banners
    },

    // 5. COLORES POR ESTADO DE EXPEDIENTE (Badges)
    badge: {
      recibida: { bg: '#1F4788', text: '#FFFFFF' },
      enDefensa: { bg: '#FFC107', text: '#2C3E50' },
      respondida: { bg: '#28A745', text: '#FFFFFF' },
      vencida: { bg: '#DC3545', text: '#FFFFFF' },
      sentenciada: { bg: '#6C757D', text: '#FFFFFF' },
      enProceso: { bg: '#FF9800', text: '#FFFFFF' },
      extendida: { bg: '#2E5C8A', text: '#FFFFFF' },
    },

    // 6. COLORES ESPECÍFICOS PARA MÓDULO LEGAL
    legal: {
      purple: '#6F42C1',      // Color actual del módulo legal
      purpleLight: '#F3E8FF', // Backgrounds púrpura claro
      purpleDark: '#5A2D9C',  // Hover púrpura
    },
  },

  // 2. TIPOGRAFÍA
  typography: {
    fontFamily: {
      primary: 'Inter, Arial, sans-serif',
      monospace: 'Courier New, monospace', // Para IDs, números
    },

    fontSize: {
      h1: '32px',       // Títulos Página
      h2: '24px',       // Subtítulos
      h3: '18px',       // Títulos Sección
      body: '14px',     // Body Regular
      small: '12px',    // Body Small
      label: '12px',    // Label
      button: '14px',   // Button Text
      code: '13px',     // Code/Monospace
    },

    fontWeight: {
      regular: 400,     // Body text
      semibold: 600,    // Labels, button text
      bold: 700,        // Headings
    },

    lineHeight: {
      h1: 1.2,
      h2: 1.3,
      h3: 1.4,
      body: 1.6,
      small: 1.5,
      label: 1.4,
      button: 1.4,
    },
  },

  // 3. SPACING (base 8px)
  spacing: {
    xs: '4px',        // Inner spacing en botones pequeños
    s: '8px',         // Default spacing entre elementos
    m: '16px',        // Spacing entre secciones menores
    l: '24px',        // Spacing entre secciones principales
    xl: '32px',       // Spacing entre grandes bloques
    xxl: '48px',      // Page-level spacing
  },

  // 4. PADDING ESPECÍFICO
  padding: {
    button: {
      vertical: '12px',
      horizontal: '16px',
    },
    input: {
      vertical: '10px',
      horizontal: '12px',
    },
    card: '24px',
    cardHeader: '16px',
    cardFooter: '16px',
  },

  // 5. MARGINS
  margin: {
    betweenCards: '16px',
    betweenFields: '16px',
    betweenSections: '32px',
  },

  // 6. BORDES Y ESQUINAS
  borderRadius: {
    small: '4px',     // Inputs, buttons
    medium: '8px',    // Cards, modals
    large: '12px',    // Large cards
    round: '50%',     // Avatares, badges circulares
  },

  borderWidth: {
    thin: '1px',
    normal: '2px',
    thick: '3px',
  },

  borderStyle: {
    input: '1px solid #ECF0F1',
    card: '1px solid #E8F0F8',
    divider: '1px solid #ECF0F1',
    focus: '2px solid #1F4788',
  },

  // 7. SOMBRAS (Elevación)
  shadows: {
    level1: '0 2px 4px rgba(0,0,0,0.1)',     // Cards, modals
    level2: '0 4px 8px rgba(0,0,0,0.15)',    // Dropdowns, popovers
    level3: '0 8px 16px rgba(0,0,0,0.2)',    // Modals elevated
    none: 'none',                             // Flat design
  },

  // 8. TAMAÑOS DE COMPONENTES
  componentSizes: {
    button: {
      height: '40px',
      minWidth: '100px',
    },
    buttonIcon: {
      size: '36px',
    },
    input: {
      height: '40px',
    },
    textarea: {
      minHeight: '100px',
      maxHeight: '400px',
    },
    avatar: {
      small: '32px',
      medium: '40px',
      large: '64px',
    },
    checkbox: '18px',
    radio: '20px',
    tableRow: '44px',
  },

  // 9. Z-INDEX
  zIndex: {
    dropdown: 100,
    sticky: 200,
    fixed: 300,
    modalOverlay: 900,
    modal: 1000,
    toast: 1100,
    tooltip: 1200,
  },

  // 10. TRANSICIONES
  transitions: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    verySlow: '500ms',
  },

  // 11. OPACIDADES
  opacity: {
    disabled: 0.6,
    hover: 0.8,
    placeholder: 0.6,
  },

  // 12. BREAKPOINTS RESPONSIVE
  breakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px',
  },
} as const;

// Tipos TypeScript para autocompletado
export type ColorToken = typeof DESIGN_TOKENS.colors;
export type TypographyToken = typeof DESIGN_TOKENS.typography;
export type SpacingToken = typeof DESIGN_TOKENS.spacing;

// Helper functions para acceso rápido
export const getStatusColor = (status: string) => {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '');
  const statusMap: Record<string, { bg: string; text: string }> = {
    recibida: DESIGN_TOKENS.colors.badge.recibida,
    endefensa: DESIGN_TOKENS.colors.badge.enDefensa,
    respondida: DESIGN_TOKENS.colors.badge.respondida,
    vencida: DESIGN_TOKENS.colors.badge.vencida,
    sentenciada: DESIGN_TOKENS.colors.badge.sentenciada,
    enproceso: DESIGN_TOKENS.colors.badge.enProceso,
    extendida: DESIGN_TOKENS.colors.badge.extendida,
  };
  return statusMap[normalizedStatus] || { bg: DESIGN_TOKENS.colors.neutral.lightGray, text: DESIGN_TOKENS.colors.neutral.darkGray };
};

// Función para calcular color según días restantes (Semáforo)
export const getPlazoColor = (diasRestantes: number, vencido: boolean = false) => {
  if (vencido || diasRestantes < 0) {
    return DESIGN_TOKENS.colors.status.red; // Rojo - Vencido
  }
  if (diasRestantes < 5) {
    return DESIGN_TOKENS.colors.status.orange; // Naranja - < 5 días
  }
  if (diasRestantes < 15) {
    return DESIGN_TOKENS.colors.status.yellow; // Amarillo - 5-15 días
  }
  return DESIGN_TOKENS.colors.status.green; // Verde - > 15 días
};

// Función para obtener color de fondo según días restantes
export const getPlazoBackgroundColor = (diasRestantes: number, vencido: boolean = false) => {
  const color = getPlazoColor(diasRestantes, vencido);
  // Retornar versión semi-transparente del color
  return `${color}10`; // 10% opacity
};

// Función para determinar si el texto debe ser claro u oscuro según el fondo
export const getContrastText = (backgroundColor: string) => {
  // Simple heurística: si el color es oscuro, usar texto blanco
  const darkColors = [
    DESIGN_TOKENS.colors.primary.blue,
    DESIGN_TOKENS.colors.primary.blueHover,
    DESIGN_TOKENS.colors.status.red,
    DESIGN_TOKENS.colors.status.green,
    DESIGN_TOKENS.colors.legal.purple,
  ];
  
  return darkColors.includes(backgroundColor) 
    ? DESIGN_TOKENS.colors.primary.white 
    : DESIGN_TOKENS.colors.neutral.darkGray;
};

export default DESIGN_TOKENS;
