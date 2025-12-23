/**
 * ============================================
 * HOOK: useAuditLog
 * ============================================
 * 
 * Hook personalizado para integración automática de Auditoría de Cambios
 * en todos los módulos del sistema CIG
 * 
 * FUNCIONALIDADES:
 * - Registro automático de todas las operaciones CRUD
 * - Captura de usuario actual (desde contexto)
 * - Determinación automática de criticidad
 * - Manejo de errores graceful
 * - TypeScript type-safe
 * 
 * USO:
 * ```typescript
 * const { registrarCambio } = useAuditLog();
 * 
 * // Crear auditoría
 * await registrarCambio('crear', 'auditoria', auditoria.id, {
 *   despues: auditoria
 * }, 'Crear auditoría ' + auditoria.codigo);
 * 
 * // Actualizar hallazgo
 * await registrarCambio('actualizar', 'hallazgo', hallazgo.id, {
 *   antes: hallazgoAnterior,
 *   despues: hallazgoNuevo
 * }, 'Actualizar hallazgo crítico');
 * ```
 * 
 * ÚLTIMA ACTUALIZACIÓN: 23 Diciembre 2025
 */

import { useCallback } from 'react';
import {
  auditLogService,
  type TipoAccion,
  type TipoEntidad
} from '../services/auditLogService';

// Simulación de usuario actual (en producción vendría del contexto de auth)
const USUARIO_MOCK = {
  id: 'u1',
  nombre: 'María González',
  email: 'mgonzalez@esap.edu.co',
  rol: 'Jefe OCI'
};

/**
 * Hook para registro de auditoría de cambios
 */
export function useAuditLog() {
  /**
   * Registrar un cambio en el sistema
   */
  const registrarCambio = useCallback(async (
    accion: TipoAccion,
    tabla: TipoEntidad,
    registroId: string,
    cambios: {
      antes?: any;
      despues?: any;
    },
    descripcion: string,
    opciones?: {
      criticidad?: 'baja' | 'media' | 'alta' | 'critica';
      modulo?: string;
    }
  ) => {
    try {
      // En producción, obtener usuario desde contexto de autenticación
      const usuario = USUARIO_MOCK; // TODO: useAuth() en producción

      await auditLogService.registrar(
        usuario.id,
        usuario.nombre,
        usuario.email,
        usuario.rol,
        accion,
        descripcion,
        tabla,
        registroId,
        cambios,
        {
          criticidad: opciones?.criticidad,
          modulo: opciones?.modulo || obtenerModuloPorTabla(tabla),
          ip: obtenerIP(),
          userAgent: navigator.userAgent
        }
      );
    } catch (error) {
      console.error('Error al registrar cambio en audit log:', error);
      // No lanzar error para que no afecte la operación principal
    }
  }, []);

  /**
   * Registro simplificado para crear entidad
   */
  const registrarCreacion = useCallback(async (
    tabla: TipoEntidad,
    registroId: string,
    datos: any,
    descripcion: string
  ) => {
    await registrarCambio('crear', tabla, registroId, { despues: datos }, descripcion);
  }, [registrarCambio]);

  /**
   * Registro simplificado para actualizar entidad
   */
  const registrarActualizacion = useCallback(async (
    tabla: TipoEntidad,
    registroId: string,
    datosAnteriores: any,
    datosNuevos: any,
    descripcion: string
  ) => {
    await registrarCambio('actualizar', tabla, registroId, {
      antes: datosAnteriores,
      despues: datosNuevos
    }, descripcion);
  }, [registrarCambio]);

  /**
   * Registro simplificado para eliminar entidad
   */
  const registrarEliminacion = useCallback(async (
    tabla: TipoEntidad,
    registroId: string,
    datos: any,
    descripcion: string
  ) => {
    await registrarCambio('eliminar', tabla, registroId, { antes: datos }, descripcion, {
      criticidad: 'critica'
    });
  }, [registrarCambio]);

  /**
   * Registro simplificado para aprobar
   */
  const registrarAprobacion = useCallback(async (
    tabla: TipoEntidad,
    registroId: string,
    descripcion: string
  ) => {
    await registrarCambio('aprobar', tabla, registroId, {}, descripcion, {
      criticidad: 'alta'
    });
  }, [registrarCambio]);

  /**
   * Registro simplificado para rechazar
   */
  const registrarRechazo = useCallback(async (
    tabla: TipoEntidad,
    registroId: string,
    motivo: string,
    descripcion: string
  ) => {
    await registrarCambio('rechazar', tabla, registroId, {
      despues: { motivo }
    }, descripcion, {
      criticidad: 'critica'
    });
  }, [registrarCambio]);

  /**
   * Registro simplificado para cambio de estado
   */
  const registrarCambioEstado = useCallback(async (
    tabla: TipoEntidad,
    registroId: string,
    estadoAnterior: string,
    estadoNuevo: string,
    descripcion: string
  ) => {
    await registrarCambio('cambiar_estado', tabla, registroId, {
      antes: { estado: estadoAnterior },
      despues: { estado: estadoNuevo }
    }, descripcion);
  }, [registrarCambio]);

  /**
   * Registro simplificado para asignación
   */
  const registrarAsignacion = useCallback(async (
    tabla: TipoEntidad,
    registroId: string,
    asignadoA: string,
    descripcion: string
  ) => {
    await registrarCambio('asignar', tabla, registroId, {
      despues: { asignadoA }
    }, descripcion);
  }, [registrarCambio]);

  return {
    registrarCambio,
    registrarCreacion,
    registrarActualizacion,
    registrarEliminacion,
    registrarAprobacion,
    registrarRechazo,
    registrarCambioEstado,
    registrarAsignacion
  };
}

// ============ UTILIDADES ============

function obtenerModuloPorTabla(tabla: TipoEntidad): string {
  const mapeo: Record<TipoEntidad, string> = {
    plan_anual: 'Planificación',
    actividad: 'Planificación',
    auditoria: 'Proceso Auditoría',
    programa_anual: 'Planificación',
    hallazgo: 'Proceso Auditoría',
    evidencia: 'Proceso Auditoría',
    plan_mejoramiento: 'Planes de Mejoramiento',
    accion_correctiva: 'Planes de Mejoramiento',
    informe_ley: 'Soporte',
    documento: 'Soporte',
    notificacion: 'Soporte',
    usuario: 'Configuración',
    rol: 'Configuración',
    permiso: 'Configuración',
    configuracion: 'Configuración',
    reporte: 'Soporte'
  };
  return mapeo[tabla] || 'Sistema';
}

function obtenerIP(): string {
  // En producción, esto se obtendría del backend
  // El browser no puede conocer la IP real del cliente
  return '192.168.1.100'; // IP simulada
}

export default useAuditLog;
