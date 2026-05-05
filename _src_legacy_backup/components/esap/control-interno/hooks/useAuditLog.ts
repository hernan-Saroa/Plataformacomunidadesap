/**
 * Hook para gestionar logs de auditoría
 * Permite registrar acciones del usuario de forma centralizada
 */

import { useCallback } from 'react';
import { registrarAuditoriaLocal } from '../services/auditLogService';
import type { AuditAction, AuditModule } from '../services/types';

// ⚠️ Usuario mock removido
// En producción, obtener del contexto de autenticación
const getUserFromAuth = () => ({
  id: 'current-user',
  nombre: 'Usuario Actual',
  email: 'usuario@esap.edu.co'
});

export function useAuditLog() {
  
  const registrar = useCallback(async (
    modulo: AuditModule,
    accion: AuditAction,
    detalles: string,
    entidadId?: string
  ) => {
    try {
      // En producción, obtener usuario desde contexto de autenticación
      const usuario = getUserFromAuth();

      await registrarAuditoriaLocal({
        modulo,
        accion,
        usuarioId: usuario.id,
        usuarioNombre: usuario.nombre,
        detalles,
        entidadId,
      });
      
    } catch (error) {
      console.error('Error al registrar log de auditoría:', error);
    }
  }, []);

  return { registrar };
}