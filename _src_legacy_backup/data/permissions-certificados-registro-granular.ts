/**
 * PERMISOS GRANULARES - CERTIFICADOS Y REGISTRO - STUB
 * ⚠️ Datos eliminados para reducir tamaño del proyecto
 * 
 * Extensión de permisos detallados para:
 * - Certificados Laborales (65 permisos)
 * - Registro Académico (90 permisos)
 * 
 * TOTAL: 155 permisos nuevos granulares
 */

export interface PermissionDetallado {
  id: string;
  name: string;
  description: string;
  module: string;
  criticidad: 'baja' | 'media' | 'alta' | 'critica';
  categoria?: string;
}

/**
 * STUB: Arrays vacíos - Agregar datos reales cuando se requieran
 */
export const PERMISOS_CERTIFICADOS_LABORALES: PermissionDetallado[] = [];
export const PERMISOS_REGISTRO_ACADEMICO: PermissionDetallado[] = [];
export const TODOS_LOS_PERMISOS_GRANULARES: PermissionDetallado[] = [];
