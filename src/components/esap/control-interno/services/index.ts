/**
 * PUNTO DE ENTRADA - SERVICIOS CONTROL INTERNO
 * Exporta todos los servicios, tipos y hooks
 */

// Tipos
export * from './types';

// API Services
export * from './api';

// Custom Hooks
export * from './hooks';

// Re-exportar controlInternoApi como default para facilitar importación
export { controlInternoApi as default } from './api';
