/**
 * TIPOS: SISTEMA DE ROLES Y PERMISOS
 * Integrado con la estructura organizacional de ESAP
 * Jerarquía: Nacional > Territorial > CETAP
 * 
 * NOTA: Los datos de roles se cargan desde la BD vía auth-service.
 * Este archivo solo contiene tipos e interfaces.
 * Usar obtenerRolesAsync() de rolesPermisosSync.ts para datos reales.
 */

export type AlcanceRol = 'nacional' | 'territorial' | 'cetap' | 'sin-alcance';

export type CategoriaRol = 
  | 'academico'      // Docentes, Estudiantes, Investigadores
  | 'administrativo' // Personal administrativo
  | 'directivo'      // Directores, Coordinadores
  | 'operativo'      // Soporte, mantenimiento
  | 'sistema';       // Super Admin, Admin de Sistema

export interface RolSistema {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaRol;
  alcance: AlcanceRol;
  
  // Jerarquía y restricciones
  requiereUnidadOrganizacional: boolean;
  puedeAplicarEnMultiplesUnidades: boolean;
  
  // Permisos y capacidades
  permisos: string[];
  modulos: string[];
  
  // Metadata
  nivelJerarquico: number;
  esActivo: boolean;
  fechaCreacion: string;
  creadoPor: string;
}

export interface AsignacionRol {
  id: string;
  usuarioId: string;
  rolId: string;
  
  // Contexto organizacional
  unidadOrganizacionalId?: string;
  alcanceAsignacion: AlcanceRol;
  
  // Vigencia
  fechaInicio: string;
  fechaFin?: string;
  esActivo: boolean;
  
  // Metadata
  asignadoPor: string;
  fechaAsignacion: string;
  motivoAsignacion?: string;
  documentoSoporte?: string;
}

export interface PermisoSistema {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  modulo: string;
  categoria: 'lectura' | 'escritura' | 'eliminacion' | 'administracion';
  requiereAprobacion: boolean;
}

// ============================================================================
// NOTA: ROLES_SISTEMA ha sido eliminado. Los roles se cargan desde la BD.
// Usar: import { obtenerRolesAsync } from '../utils/rolesPermisosSync';
// ============================================================================

export const ROLES_SISTEMA: RolSistema[] = [];

// ============================================================================
// UTILIDADES (consultan la BD indirectamente vía caché de rolesPermisosSync)
// ============================================================================

export function getRolPorCodigo(codigo: string): RolSistema | undefined {
  return ROLES_SISTEMA.find(r => r.codigo === codigo);
}

export function getRolesPorCategoria(categoria: CategoriaRol): RolSistema[] {
  return ROLES_SISTEMA.filter(r => r.categoria === categoria);
}

export function getRolesPorAlcance(alcance: AlcanceRol): RolSistema[] {
  return ROLES_SISTEMA.filter(r => r.alcance === alcance);
}

export function rolRequiereUnidad(rolId: string): boolean {
  const rol = ROLES_SISTEMA.find(r => r.id === rolId);
  return rol?.requiereUnidadOrganizacional ?? false;
}
