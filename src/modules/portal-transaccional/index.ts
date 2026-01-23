/**
 * Módulo Portal Transaccional Unificado - ESAP
 * 
 * Portal único para todos los usuarios autenticados (@esap.edu.co)
 * Dashboard dinámico según roles y permisos del usuario.
 */

// Componentes
export { PortalDashboard } from './components/PortalDashboard';
export { PortalNavbar } from './components/PortalNavbar';
export { PortalRoute } from './components/PortalRoute';
export { ServiceCard } from './components/ServiceCard';

// Hooks
export { useUserServices } from './hooks/useUserServices';
export type { Servicio, UsuarioPersona } from './hooks/useUserServices';
