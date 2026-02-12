/**
 * ============================================
 * SERVICIOS - MÓDULO PLAN ANUAL OCIG
 * ============================================
 * 
 * Punto de entrada para todos los servicios del módulo Plan Anual.
 * Incluye exportación PDF/Excel y conexión a API.
 */

// Servicios de exportación
export * from './exportService';
export * from './pdfService';

// Re-export del API de plan anual desde el api.ts principal
export { planAnual5RolesApi } from '../api';
