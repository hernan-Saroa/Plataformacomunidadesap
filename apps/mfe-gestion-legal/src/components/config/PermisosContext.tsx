/**
 * PermisosContext - Sistema de Permisos y Control de Acceso
 * ✅ Gestión de permisos por usuario
 * ✅ Control de acceso a secciones protegidas
 * ✅ Basado en Usuario Persona ESAP
 */

import { createContext, useContext, useState, ReactNode } from 'react';

// ==================== TIPOS ====================
export interface UsuarioESAP {
  id: string;
  nombre: string;
  email: string;
  cargo: string;
  area: string;
  permisos: string[];
  rol: 'SUPER_ADMIN' | 'ADMIN_MODULO' | 'USUARIO_AVANZADO' | 'USUARIO_CONSULTA';
}

export interface PermisosContextType {
  usuario: UsuarioESAP;
  tienePermiso: (permiso: string) => boolean;
  tieneAlgunPermiso: (permisos: string[]) => boolean;
  tieneTodosPermisos: (permisos: string[]) => boolean;
  esAdmin: () => boolean;
}

// ==================== PERMISOS DISPONIBLES ====================
export const PERMISOS = {
  // Permisos de Archivados/Eliminados
  VER_ARCHIVADOS: 'VER_ARCHIVADOS',
  RESTAURAR_ITEMS: 'RESTAURAR_ITEMS',
  ELIMINAR_PERMANENTE: 'ELIMINAR_PERMANENTE',
  
  // Permisos de Gestión
  CREAR_PROCESOS: 'CREAR_PROCESOS',
  EDITAR_PROCESOS: 'EDITAR_PROCESOS',
  ELIMINAR_PROCESOS: 'ELIMINAR_PROCESOS',
  ARCHIVAR_PROCESOS: 'ARCHIVAR_PROCESOS',
  
  // Permisos de Configuración
  VER_CONFIGURACIONES: 'VER_CONFIGURACIONES',
  EDITAR_CONFIGURACIONES: 'EDITAR_CONFIGURACIONES',
  
  // Permisos de Exportación
  EXPORTAR_PDF: 'EXPORTAR_PDF',
  EXPORTAR_EXCEL: 'EXPORTAR_EXCEL',
  
  // Permisos Administrativos
  GESTIONAR_USUARIOS: 'GESTIONAR_USUARIOS',
  VER_AUDITORIA: 'VER_AUDITORIA',
} as const;

// ==================== USUARIO MOCK ====================
const usuarioMock: UsuarioESAP = {
  id: 'USR-001',
  nombre: 'Dr. Carlos Méndez',
  email: 'funcionario@esap.edu.co',
  cargo: 'Jefe Oficina Jurídica',
  area: 'Dirección Administrativa',
  rol: 'ADMIN_MODULO',
  permisos: [
    // Permisos completos para demo
    PERMISOS.VER_ARCHIVADOS,
    PERMISOS.RESTAURAR_ITEMS,
    PERMISOS.ELIMINAR_PERMANENTE,
    PERMISOS.CREAR_PROCESOS,
    PERMISOS.EDITAR_PROCESOS,
    PERMISOS.ELIMINAR_PROCESOS,
    PERMISOS.ARCHIVAR_PROCESOS,
    PERMISOS.VER_CONFIGURACIONES,
    PERMISOS.EDITAR_CONFIGURACIONES,
    PERMISOS.EXPORTAR_PDF,
    PERMISOS.EXPORTAR_EXCEL,
    PERMISOS.VER_AUDITORIA,
  ]
};

// ==================== CONTEXT ====================
const PermisosContext = createContext<PermisosContextType | undefined>(undefined);

export function PermisosProvider({ children }: { children: ReactNode }) {
  const [usuario] = useState<UsuarioESAP>(usuarioMock);

  const tienePermiso = (permiso: string): boolean => {
    // Super Admin tiene todos los permisos
    if (usuario.rol === 'SUPER_ADMIN') return true;
    return usuario.permisos.includes(permiso);
  };

  const tieneAlgunPermiso = (permisos: string[]): boolean => {
    if (usuario.rol === 'SUPER_ADMIN') return true;
    return permisos.some(p => usuario.permisos.includes(p));
  };

  const tieneTodosPermisos = (permisos: string[]): boolean => {
    if (usuario.rol === 'SUPER_ADMIN') return true;
    return permisos.every(p => usuario.permisos.includes(p));
  };

  const esAdmin = (): boolean => {
    return usuario.rol === 'SUPER_ADMIN' || usuario.rol === 'ADMIN_MODULO';
  };

  return (
    <PermisosContext.Provider
      value={{
        usuario,
        tienePermiso,
        tieneAlgunPermiso,
        tieneTodosPermisos,
        esAdmin
      }}
    >
      {children}
    </PermisosContext.Provider>
  );
}

export function usePermisos() {
  const context = useContext(PermisosContext);
  if (context === undefined) {
    throw new Error('usePermisos debe usarse dentro de PermisosProvider');
  }
  return context;
}
