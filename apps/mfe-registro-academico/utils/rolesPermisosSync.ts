/**
 * ============================================
 * SINCRONIZACIÓN DE ROLES Y PERMISOS
 * ============================================
 * 
 * Este módulo actúa como adaptador entre la BD (auth-service) y los módulos del sistema.
 * TODOS los datos se leen desde la base de datos — nada hardcodeado.
 * 
 * Endpoints consumidos del auth-service:
 * - GET /auth/api/v1/roles → Todos los roles con conteos
 * - GET /auth/api/v1/roles/:id/permissions → Permisos de un rol
 * - GET /auth/api/v1/roles/permissions/all → Todos los permisos disponibles
 * - GET /auth/api/v1/roles/stats → Estadísticas
 * 
 * ÚLTIMA ACTUALIZACIÓN: 17 Abril 2026 — Migración desde datos hardcodeados a BD
 */

// ============ TIPOS ============

export type TipoRol = 'Sistema' | 'Personalizado';
export type EstadoRol = 'Activo' | 'Inactivo';
export type PermisoAccion = 'crear' | 'leer' | 'actualizar' | 'eliminar' | 'aprobar' | 'exportar';
export type CategoriaModulo = 
  | 'General' 
  | 'Estructura' 
  | 'Académica' 
  | 'Control Interno' 
  | 'Control Disciplinario' 
  | 'Gestión Legal'
  | 'Comunidad';

export interface Permiso {
  id: string;
  modulo: string;
  categoria: CategoriaModulo;
  acciones: PermisoAccion[];
  descripcion: string;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoRol;
  estado: EstadoRol;
  usuariosAsignados: number;
  permisos: Permiso[];
  color: string;
  icono: string;
  creadoPor?: string;
  fechaCreacion?: string;
  modificadoPor?: string;
  fechaModificacion?: string;
  // Categoría del rol para filtrado
  categoriaRol: CategoriaModulo;
}

// ============ CONFIGURACIÓN API ============

function getAuthApiBaseUrl(): string {
  // Detectar si estamos en un navegador
  if (typeof window !== 'undefined') {
    // En el navegador, usar la URL del gateway
    const origin = window.location.origin;
    return `${origin}/auth/api/v1`;
  }
  return 'http://localhost:3000/auth/api/v1';
}

async function fetchFromAuthService<T>(endpoint: string): Promise<T | null> {
  try {
    const baseUrl = getAuthApiBaseUrl();
    const token = typeof localStorage !== 'undefined' 
      ? sessionStorage.getItem('esap_auth_token') 
      : null;
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok) {
      console.warn(`[rolesPermisosSync] Error fetching ${endpoint}: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.warn(`[rolesPermisosSync] Error fetching ${endpoint}:`, error);
    return null;
  }
}

// ============ INTERFAZ DEL BACKEND ============

interface RoleFromBackend {
  id: string;
  code?: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  type: 'sistema' | 'personalizado';
  category?: string;
  is_active: boolean;
  requires_2fa: boolean;
  usuarios_count: number;
  permisos_count: number;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

interface PermissionFromBackend {
  id: string;
  code?: string;
  name: string;
  description?: string;
}

// ============ CACHÉ LOCAL ============

let _rolesCache: Rol[] | null = null;
let _cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 60000; // 1 minuto

function isCacheValid(): boolean {
  return _rolesCache !== null && (Date.now() - _cacheTimestamp) < CACHE_DURATION_MS;
}

// ============ MAPEO DE CATEGORÍAS ============

function mapCategoryToCategoria(category?: string): CategoriaModulo {
  if (!category) return 'General';
  const map: Record<string, CategoriaModulo> = {
    'sistema': 'General',
    'backoffice': 'Control Interno',
    'Control Interno': 'Control Interno',
    'control_interno': 'Control Interno',
    'academica': 'Académica',
    'control_disciplinario': 'Control Disciplinario',
    'gestion_legal': 'Gestión Legal',
    'comunidad': 'Comunidad',
    'estructura': 'Estructura',
  };
  return map[category] || 'General';
}

function mapBackendRoleToRol(role: RoleFromBackend): Rol {
  return {
    id: role.id,
    nombre: role.name,
    descripcion: role.description || '',
    tipo: role.type === 'sistema' ? 'Sistema' : 'Personalizado',
    estado: role.is_active ? 'Activo' : 'Inactivo',
    usuariosAsignados: role.usuarios_count || 0,
    permisos: [], // Se cargan bajo demanda
    color: role.color || '#6B7280',
    icono: role.icon || '📋',
    categoriaRol: mapCategoryToCategoria(role.category),
    creadoPor: role.created_by,
    fechaCreacion: role.created_at,
    modificadoPor: role.updated_by,
    fechaModificacion: role.updated_at,
  };
}

// ============ FUNCIONES PRINCIPALES ============

/**
 * Obtener todos los roles del sistema DESDE LA BD
 */
export async function obtenerRolesAsync(): Promise<Rol[]> {
  if (isCacheValid()) {
    return _rolesCache!;
  }

  const result = await fetchFromAuthService<{ roles: RoleFromBackend[], total: number }>('/roles');
  
  if (result && result.roles) {
    _rolesCache = result.roles.map(mapBackendRoleToRol);
    _cacheTimestamp = Date.now();
    return _rolesCache;
  }
  
  // Si falla, retornar caché anterior o array vacío
  return _rolesCache || [];
}

/**
 * Obtener roles sincrónicamente (usa caché, devuelve vacío si no hay)
 * NOTA: Preferir obtenerRolesAsync() cuando sea posible
 */
export function obtenerRoles(): Rol[] {
  // Trigger async refresh en background
  obtenerRolesAsync().catch(() => {});
  return _rolesCache || [];
}

/**
 * Obtener roles por categoría
 */
export async function obtenerRolesPorCategoriaAsync(categoria: CategoriaModulo): Promise<Rol[]> {
  const roles = await obtenerRolesAsync();
  return roles.filter(rol => rol.categoriaRol === categoria);
}

export function obtenerRolesPorCategoria(categoria: CategoriaModulo): Rol[] {
  return (_rolesCache || []).filter(rol => rol.categoriaRol === categoria);
}

/**
 * Obtener un rol por ID
 */
export async function obtenerRolPorIdAsync(id: string): Promise<Rol | undefined> {
  const roles = await obtenerRolesAsync();
  return roles.find(rol => rol.id === id);
}

export function obtenerRolPorId(id: string): Rol | undefined {
  return (_rolesCache || []).find(rol => rol.id === id);
}

/**
 * Obtener permisos de un rol específico DESDE LA BD
 */
export async function obtenerPermisosRolAsync(rolId: string): Promise<PermissionFromBackend[]> {
  const result = await fetchFromAuthService<PermissionFromBackend[]>(`/roles/${rolId}/permissions`);
  return result || [];
}

/**
 * Obtener permisos de un rol específico para un módulo
 */
export function obtenerPermisosRolModulo(rolId: string, modulo: string): Permiso | undefined {
  const rol = obtenerRolPorId(rolId);
  return rol?.permisos.find(p => p.modulo === modulo);
}

/**
 * Verificar si un rol tiene un permiso específico
 */
export function tienePermiso(
  rolId: string, 
  modulo: string, 
  accion: PermisoAccion
): boolean {
  const permiso = obtenerPermisosRolModulo(rolId, modulo);
  return permiso?.acciones.includes(accion) || false;
}

/**
 * Obtener todos los permisos disponibles del sistema
 */
export async function obtenerTodosLosPermisosAsync(): Promise<PermissionFromBackend[]> {
  const result = await fetchFromAuthService<PermissionFromBackend[]>('/roles/permissions/all');
  return result || [];
}

/**
 * Obtener módulos del sistema
 * Los módulos se derivan de los permisos registrados en la BD
 */
export async function obtenerModulosAsync(): Promise<{ nombre: string; categoria: CategoriaModulo }[]> {
  const permisos = await obtenerTodosLosPermisosAsync();
  const modulosSet = new Map<string, CategoriaModulo>();
  
  for (const p of permisos) {
    const nombre = p.name || '';
    // Derivar categoría del nombre del permiso
    let categoria: CategoriaModulo = 'General';
    if (nombre.includes('Control Interno') || nombre.includes('Plan Anual') || nombre.includes('Auditor')) {
      categoria = 'Control Interno';
    } else if (nombre.includes('Disciplinario')) {
      categoria = 'Control Disciplinario';
    } else if (nombre.includes('Legal')) {
      categoria = 'Gestión Legal';
    } else if (nombre.includes('Académic') || nombre.includes('Programa')) {
      categoria = 'Académica';
    }
    
    if (!modulosSet.has(nombre)) {
      modulosSet.set(nombre, categoria);
    }
  }
  
  return Array.from(modulosSet.entries()).map(([nombre, categoria]) => ({
    nombre,
    categoria,
  }));
}

export function obtenerModulos(): { nombre: string; categoria: CategoriaModulo }[] {
  // Retorna array vacío sincrónicamente — preferir obtenerModulosAsync()
  return [];
}

/**
 * Obtener módulos por categoría
 */
export function obtenerModulosPorCategoria(categoria: CategoriaModulo) {
  return [];
}

/**
 * Estadísticas de roles DESDE LA BD
 */
export async function obtenerEstadisticasRolesAsync() {
  const result = await fetchFromAuthService<{
    total_roles: number;
    roles_sistema: number;
    usuarios_asignados: number;
    permisos_disponibles: number;
  }>('/roles/stats');
  
  if (result) {
    return {
      totalRoles: result.total_roles,
      rolesActivos: result.total_roles, // Se puede refinar
      rolesInactivos: 0,
      usuariosConRol: result.usuarios_asignados,
      rolesPorCategoria: {} as Record<string, number>,
    };
  }
  
  return {
    totalRoles: 0,
    rolesActivos: 0,
    rolesInactivos: 0,
    usuariosConRol: 0,
    rolesPorCategoria: {},
  };
}

export function obtenerEstadisticasRoles() {
  // Versión sincrónica — retorna valores del caché
  const roles = _rolesCache || [];
  return {
    totalRoles: roles.length,
    rolesActivos: roles.filter(r => r.estado === 'Activo').length,
    rolesInactivos: roles.filter(r => r.estado === 'Inactivo').length,
    usuariosConRol: roles.reduce((sum, r) => sum + r.usuariosAsignados, 0),
    rolesPorCategoria: {} as Record<string, number>,
  };
}

/**
 * Forzar recarga de datos desde la BD
 */
export function invalidarCache(): void {
  _rolesCache = null;
  _cacheTimestamp = 0;
}

/**
 * Pre-cargar roles en el caché (llamar al inicio de la aplicación)
 */
export async function precargarRoles(): Promise<void> {
  await obtenerRolesAsync();
}
