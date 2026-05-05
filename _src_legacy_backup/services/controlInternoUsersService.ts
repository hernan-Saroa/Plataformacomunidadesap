/**
 * Servicio especializado para búsqueda de usuarios en el módulo de Control Interno
 * 
 * Este servicio se encarga de:
 * 1. Obtener los IDs de los roles de Control Interno desde sus códigos
 * 2. Buscar usuarios que NO tengan roles de Control Interno
 * 3. Implementar búsqueda con filtro por texto (mínimo 3 letras)
 * 
 * IMPORTANTE: Este servicio usa los IDs de los roles, no los códigos, para las consultas al backend
 */

import { usersService, type User, type PaginatedUsersResponse, type UserFilters } from './usersService';
import { rolesService, type SystemRole } from './api';

// Roles de Control Interno (por código)
const ROLES_CONTROL_INTERNO_CODES = [
  'JEFE_OCI',
  'PROFESIONAL_AUDITOR',
  'AUXILIAR_AUDITORIA',
  'CONSULTA',
  'JEFE_CONTROL_INTERNO',
  'AUDITOR_LIDER',
  'CONTROL_INTERNO'
] as const;

// Cache para los IDs de roles (se actualiza si es necesario)
let rolesControlInternoIdsCache: string[] | null = null;
let rolesControlInternoDataCache: SystemRole[] | null = null;

/**
 * Obtener los IDs de los roles de Control Interno desde sus códigos
 * Utiliza cache para evitar múltiples llamadas al API
 */
async function obtenerIdsRolesControlInterno(): Promise<{ ids: string[], roles: SystemRole[] }> {
  // Si ya tenemos el cache, retornarlo
  if (rolesControlInternoIdsCache && rolesControlInternoDataCache) {
    return {
      ids: rolesControlInternoIdsCache,
      roles: rolesControlInternoDataCache
    };
  }

  try {
    // Obtener todos los roles disponibles
    const rolesResponse = await rolesService.getRoles({ limit: 1000 });
    
    if (!rolesResponse.roles) {
      console.warn('⚠️ No se pudieron obtener los roles del sistema');
      return { ids: [], roles: [] };
    }

    // Buscar los roles de Control Interno por código
    // El backend devuelve roles con campo 'code' en roles.controller.ts línea 36
    const rolesControlInterno: SystemRole[] = [];
    const idsControlInterno: string[] = [];

    for (const role of rolesResponse.roles) {
      // Obtener código y nombre del rol (el backend garantiza que tiene 'code')
      const roleCode = (role as any).code?.toUpperCase().trim() || '';
      const roleName = role.name?.toUpperCase().trim() || '';
      
      // Verificar si el rol coincide con alguno de los códigos de Control Interno
      const tieneCodigoControlInterno = ROLES_CONTROL_INTERNO_CODES.some(codigo => {
        const codigoUpper = codigo.toUpperCase();
        // Coincidencia exacta por código (preferida)
        if (roleCode === codigoUpper) return true;
        // Coincidencia por nombre si el código no está disponible
        if (!roleCode && roleName.includes(codigoUpper)) return true;
        // Coincidencia parcial (por si acaso)
        if (roleCode.includes(codigoUpper) || codigoUpper.includes(roleCode)) return true;
        return false;
      });

      if (tieneCodigoControlInterno) {
        rolesControlInterno.push(role);
        idsControlInterno.push(role.id);
      }
    }

    // Actualizar cache
    rolesControlInternoIdsCache = idsControlInterno;
    rolesControlInternoDataCache = rolesControlInterno;

    console.log('✅ IDs de roles de Control Interno obtenidos:', {
      ids: idsControlInterno,
      roles: rolesControlInterno.map(r => ({ id: r.id, name: r.name }))
    });

    return {
      ids: idsControlInterno,
      roles: rolesControlInterno
    };
  } catch (error) {
    console.error('❌ Error obteniendo IDs de roles de Control Interno:', error);
    return { ids: [], roles: [] };
  }
}

/**
 * Verificar si un usuario tiene alguno de los roles de Control Interno
 */
function tieneRolControlInterno(user: User, idsRolesControlInterno: string[]): boolean {
  if (!user.roles || user.roles.length === 0) return false;
  
  // Verificar por ID
  return user.roles.some(role => idsRolesControlInterno.includes(role.id));
}

/**
 * Buscar usuarios disponibles para asignar a Control Interno
 * 
 * @param searchTerm - Término de búsqueda (mínimo 3 caracteres para buscar en el servidor)
 * @param filters - Filtros adicionales
 * @param equipoActual - IDs de usuarios que ya están en el equipo (para excluirlos)
 * @returns Usuarios que NO tienen roles de Control Interno y coinciden con la búsqueda
 */
export async function buscarUsuariosParaControlInterno(
  searchTerm: string = '',
  filters: Omit<UserFilters, 'search'> = {},
  equipoActual: string[] = []
): Promise<PaginatedUsersResponse> {
  // Obtener IDs de roles de Control Interno
  const { ids: idsRolesControlInterno } = await obtenerIdsRolesControlInterno();

  // Si hay término de búsqueda con 3+ caracteres, buscar en el servidor
  // Si no, retornar vacío (no queremos cargar todos los usuarios de golpe)
  let usuariosEncontrados: User[] = [];

  if (searchTerm.trim().length >= 3) {
    try {
      // Buscar usuarios con el término de búsqueda
      const response = await usersService.searchUsers(searchTerm.trim(), {
        ...filters,
        limit: filters.limit || 50, // Limitar resultados
        status: filters.status || 'active'
      });

      usuariosEncontrados = response.data || [];
    } catch (error) {
      console.error('❌ Error buscando usuarios:', error);
      return {
        data: [],
        meta: {
          total: 0,
          totalActive: 0,
          totalBlocked: 0,
          page: filters.page || 1,
          limit: filters.limit || 50,
          totalPages: 0
        }
      };
    }
  } else {
    // Si hay menos de 3 caracteres, retornar vacío
    return {
      data: [],
      meta: {
        total: 0,
        totalActive: 0,
        totalBlocked: 0,
        page: filters.page || 1,
        limit: filters.limit || 50,
        totalPages: 0
      }
    };
  }

  // Crear Set con IDs del equipo actual para filtrado rápido
  const idsEquipoActual = new Set(equipoActual);

  // Filtrar usuarios:
  // 1. Que NO estén ya en el equipo
  // 2. Que NO tengan roles de Control Interno
  const usuariosDisponibles = usuariosEncontrados.filter((user: User) => {
    // Excluir si ya está en el equipo
    if (idsEquipoActual.has(user.id_user)) {
      return false;
    }

    // Excluir si ya tiene rol de Control Interno
    if (tieneRolControlInterno(user, idsRolesControlInterno)) {
      return false;
    }

    return true;
  });

  return {
    data: usuariosDisponibles,
    meta: {
      total: usuariosDisponibles.length,
      totalActive: usuariosDisponibles.filter(u => u.is_active).length,
      totalBlocked: usuariosDisponibles.filter(u => !u.is_active).length,
      page: filters.page || 1,
      limit: filters.limit || usuariosDisponibles.length,
      totalPages: Math.ceil(usuariosDisponibles.length / (filters.limit || usuariosDisponibles.length))
    }
  };
}

/**
 * Obtener usuarios que ya tienen roles de Control Interno
 * (para la vista del equipo)
 */
export async function obtenerUsuariosConControlInterno(
  filters: Omit<UserFilters, 'search'> = {}
): Promise<PaginatedUsersResponse> {
  // Obtener IDs de roles de Control Interno
  const { ids: idsRolesControlInterno } = await obtenerIdsRolesControlInterno();

  try {
    // Obtener usuarios con paginación
    const response = await usersService.getUsers({
      ...filters,
      limit: filters.limit || 1000,
      status: filters.status || 'active'
    });

    // Filtrar solo usuarios que tienen roles de Control Interno
    const usuariosConControlInterno = (response.data || []).filter((user: User) => {
      return tieneRolControlInterno(user, idsRolesControlInterno);
    });

    return {
      data: usuariosConControlInterno,
      meta: {
        total: usuariosConControlInterno.length,
        totalActive: usuariosConControlInterno.filter(u => u.is_active).length,
        totalBlocked: usuariosConControlInterno.filter(u => !u.is_active).length,
        page: filters.page || 1,
        limit: filters.limit || usuariosConControlInterno.length,
        totalPages: Math.ceil(usuariosConControlInterno.length / (filters.limit || usuariosConControlInterno.length))
      }
    };
  } catch (error) {
    console.error('❌ Error obteniendo usuarios con Control Interno:', error);
    return {
      data: [],
      meta: {
        total: 0,
        totalActive: 0,
        totalBlocked: 0,
        page: filters.page || 1,
        limit: filters.limit || 50,
        totalPages: 0
      }
    };
  }
}

/**
 * Invalidar el cache de IDs de roles (útil si se crean nuevos roles)
 */
export function invalidarCacheRoles(): void {
  rolesControlInternoIdsCache = null;
  rolesControlInternoDataCache = null;
}

// Exportar constantes para uso externo
export { ROLES_CONTROL_INTERNO_CODES };
