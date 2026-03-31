/**
 * Design Tokens SIGL v5.0
 * Sistema de tokens de diseño centralizado para Gestión Legal
 */

// ============================================================================
// COLORES
// ============================================================================

export const SIGL_COLORS = {
  // Colores corporativos ESAP
  primary: '#003DA5',        // Azul principal ESAP
  primaryLight: '#2962FF',   // Azul claro
  primaryDark: '#002C7A',    // Azul oscuro
  
  secondary: '#F57C00',      // Naranja corporativo ESAP
  secondaryLight: '#FF9800',
  secondaryDark: '#E65100',
  
  // Colores de fondo
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F9FAFB',
  bgTertiary: '#F3F4F6',
  
  // Colores de texto
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textDisabled: '#D1D5DB',
  
  // Colores de borde
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
  
  // Colores de estado (semáforo)
  semaforoVerde: '#10B981',
  semaforoAmarillo: '#F59E0B',
  semaforoRojo: '#EF4444',
  semaforoCritico: '#DC2626',
  
  // Colores de notificación
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Colores de estados específicos
  draft: '#9CA3AF',
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  archived: '#6B7280',
};

// ============================================================================
// BORDES Y RADIOS
// ============================================================================

export const SIGL_BORDERS = {
  // Border radius
  radiusNone: '0px',
  radiusSm: '4px',
  radiusMd: '8px',
  radiusLg: '12px',
  radiusXl: '16px',
  radiusFull: '9999px',
  
  // Border radius específicos por componente
  radiusButton: '8px',
  radiusCard: '12px',
  radiusInput: '8px',
  radiusModal: '16px',
  radiusBadge: '6px',
  
  // Border widths
  widthNone: '0px',
  widthThin: '1px',
  widthMedium: '2px',
  widthThick: '3px',
};

// ============================================================================
// SOMBRAS
// ============================================================================

export const SIGL_SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  
  // Sombras específicas
  card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  button: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
};

// ============================================================================
// ESPACIADO
// ============================================================================

export const SIGL_SPACING = {
  none: '0px',
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '40px',
  '3xl': '48px',
  '4xl': '64px',
  '5xl': '80px',
  
  // Espaciado específico por componente
  cardPadding: '24px',
  buttonPadding: '12px 24px',
  inputPadding: '10px 12px',
  modalPadding: '32px',
  sectionGap: '32px',
};

// ============================================================================
// ALTURAS
// ============================================================================

export const SIGL_HEIGHTS = {
  buttonSm: '32px',
  buttonMd: '40px',
  buttonLg: '48px',
  
  inputSm: '32px',
  inputMd: '40px',
  inputLg: '48px',
  
  navbarHeight: '64px',
  sidebarWidth: '280px',
  sidebarCollapsed: '72px',
};

// ============================================================================
// TIPOGRAFÍA
// ============================================================================

export const SIGL_TYPOGRAPHY = {
  // Font families
  fontSans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontMono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  
  // Font sizes
  textXs: '12px',
  textSm: '14px',
  textBase: '16px',
  textLg: '18px',
  textXl: '20px',
  text2Xl: '24px',
  text3Xl: '30px',
  text4Xl: '36px',
  
  // Font weights
  weightNormal: 400,
  weightMedium: 500,
  weightSemibold: 600,
  weightBold: 700,
  
  // Line heights
  leadingTight: '1.25',
  leadingNormal: '1.5',
  leadingRelaxed: '1.75',
};

// ============================================================================
// Z-INDEX
// ============================================================================

export const SIGL_Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080,
};

// ============================================================================
// TRANSICIONES Y ANIMACIONES
// ============================================================================

export const SIGL_TRANSITIONS = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Transiciones específicas
  button: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  modal: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)',
  dropdown: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
};

// ============================================================================
// BREAKPOINTS (para consistencia)
// ============================================================================

export const SIGL_BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ============================================================================
// EXPORTACIÓN CONSOLIDADA
// ============================================================================

export const SIGL_TOKENS = {
  colors: SIGL_COLORS,
  borders: SIGL_BORDERS,
  shadows: SIGL_SHADOWS,
  spacing: SIGL_SPACING,
  heights: SIGL_HEIGHTS,
  typography: SIGL_TYPOGRAPHY,
  zIndex: SIGL_Z_INDEX,
  transitions: SIGL_TRANSITIONS,
  breakpoints: SIGL_BREAKPOINTS,
};

export default SIGL_TOKENS;
