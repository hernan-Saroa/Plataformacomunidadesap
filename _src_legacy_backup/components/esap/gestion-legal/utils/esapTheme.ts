/**
 * CONSTANTES DE TEMA ESAP - GESTIÓN LEGAL
 * Colores corporativos y estilos reutilizables
 */

// ============================================================================
// COLORES CORPORATIVOS
// ============================================================================
export const ESAP_COLORS = {
  // Azul principal
  primary: '#003DA5',
  primaryLight: '#2962FF',
  primaryBg: '#E0EDFF',
  
  // Naranja corporativo
  secondary: '#F57C00',
  
  // Gradientes
  gradientPrimary: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
  
  // Grises
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Estados
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

// ============================================================================
// CLASES TAILWIND REUTILIZABLES
// ============================================================================
export const ESAP_CLASSES = {
  // Inputs
  input: 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5]',
  inputError: 'border-red-500 focus:ring-red-500 focus:border-red-500',
  
  // Botones
  buttonPrimary: 'px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg hover:shadow-lg transition-all',
  buttonSecondary: 'px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all',
  buttonDanger: 'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all',
  
  // Badges
  badgePrimary: 'bg-[#003DA5] text-white',
  badgeSecondary: 'bg-[#F57C00] text-white',
  badgeSuccess: 'bg-green-100 text-green-700',
  badgeWarning: 'bg-yellow-100 text-yellow-700',
  badgeError: 'bg-red-100 text-red-700',
  badgeInfo: 'bg-blue-100 text-blue-700',
  
  // Cards
  card: 'bg-white border border-gray-200 rounded-lg shadow-sm',
  cardHover: 'hover:shadow-md transition-shadow',
  
  // Tabs
  tabActive: 'border-[#003DA5] text-[#003DA5] bg-blue-50/50',
  tabInactive: 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300',
} as const;

// ============================================================================
// ESTILOS INLINE REUTILIZABLES
// ============================================================================
export const ESAP_STYLES = {
  // Backgrounds
  bgPrimary: { background: ESAP_COLORS.primary, color: '#FFFFFF' },
  bgPrimaryLight: { background: ESAP_COLORS.primaryBg },
  bgGradient: { background: ESAP_COLORS.gradientPrimary, color: '#FFFFFF' },
  
  // Textos
  textPrimary: { color: ESAP_COLORS.primary },
  textSecondary: { color: ESAP_COLORS.secondary },
  
  // Iconos
  iconPrimary: { color: ESAP_COLORS.primary },
  iconSecondary: { color: ESAP_COLORS.secondary },
} as const;

// ============================================================================
// UTILIDADES DE ESTADO
// ============================================================================
export const getEstadoColor = (estado: string): { bg: string; text: string; border: string } => {
  const estadoNormalizado = estado.toUpperCase();
  
  const mapeo: Record<string, { bg: string; text: string; border: string }> = {
    // Etapas judiciales
    'NOTIFICACION': { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
    'CONTESTACION': { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' },
    'PRUEBAS': { bg: '#E0E7FF', text: '#3730A3', border: '#6366F1' },
    'ALEGATOS': { bg: '#FCE7F3', text: '#831843', border: '#EC4899' },
    'SENTENCIA': { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
    
    // Estados generales
    'ACTIVO': { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
    'PENDIENTE': { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
    'COMPLETADO': { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
    'VENCIDO': { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
    'EN_REVISION': { bg: '#E0E7FF', text: '#3730A3', border: '#6366F1' },
    
    // Por defecto
    'DEFAULT': { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
  };
  
  return mapeo[estadoNormalizado] || mapeo['DEFAULT'];
};

// ============================================================================
// UTILIDADES DE PRIORIDAD
// ============================================================================
export const getPrioridadColor = (prioridad: string): { bg: string; text: string; icon: string } => {
  const prioridadNormalizada = prioridad.toUpperCase();
  
  const mapeo: Record<string, { bg: string; text: string; icon: string }> = {
    'ALTA': { bg: '#FEE2E2', text: '#991B1B', icon: '🔴' },
    'URGENTE': { bg: '#FEE2E2', text: '#991B1B', icon: '🚨' },
    'MEDIA': { bg: '#FEF3C7', text: '#92400E', icon: '🟡' },
    'BAJA': { bg: '#D1FAE5', text: '#065F46', icon: '🟢' },
    'DEFAULT': { bg: '#F3F4F6', text: '#374151', icon: '⚪' },
  };
  
  return mapeo[prioridadNormalizada] || mapeo['DEFAULT'];
};

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================
export const formatearFecha = (fecha: Date | string): string => {
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  return fechaObj.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatearFechaHora = (fecha: Date | string): string => {
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  return fechaObj.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const calcularDiasRestantes = (fechaVencimiento: Date | string): number => {
  const vencimiento = typeof fechaVencimiento === 'string' ? new Date(fechaVencimiento) : fechaVencimiento;
  const hoy = new Date();
  
  const diffTime = vencimiento.getTime() - hoy.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// ============================================================================
// UTILIDADES DE TAMAÑO DE ARCHIVO
// ============================================================================
export const formatearTamañoArchivo = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// ============================================================================
// CONFIGURACIÓN DE MODALES
// ============================================================================
export const MODAL_CONFIG = {
  sizes: {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw]',
  },
  heights: {
    auto: 'max-h-[90vh]',
    medium: 'max-h-[70vh]',
    large: 'max-h-[82vh]',
  },
} as const;
