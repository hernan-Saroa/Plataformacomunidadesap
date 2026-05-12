/**
 * Hook para gestionar notificaciones de Control Interno
 * Consulta datos reales desde el backend
 */

import { useState, useEffect, useCallback } from 'react';
import { controlInternoApi } from '../services/api';
import { useAuth } from '../../../../hooks/useAuth';
import { toast } from 'sonner';

interface Notificacion {
  id: string;
  usuarioId: string;
  tipoNotificacion: string;
  titulo: string;
  mensaje: string;
  estado: string;
  canal: string;
  leida: boolean;
  fechaLectura?: string;
  enviadaEmail: boolean;
  fechaEnvioEmail?: string;
  metadata?: any;
  accionUrl?: string;
  prioridad: string;
  createdAt: string;
  updatedAt: string;
}

export function useNotificacionesControlInterno() {
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener el ID del usuario (puede ser userId o id)
  // Extraer valores primitivos para evitar re-renders innecesarios
  const userIdValue = (user as any)?.userId;
  const userIdAlt = (user as any)?.id;
  const usuarioId = userIdValue || userIdAlt;
  
  // Verificar si es super administrador o admin
  // Calcular directamente sin useMemo para evitar problemas de dependencias
  const esSuperAdmin = user?.roles?.some((role: any) => {
    // Si el rol es un string
    if (typeof role === 'string') {
      const roleLower = role.toLowerCase();
      return roleLower.includes('super') || 
             roleLower.includes('administrador') ||
             roleLower.includes('jefe') ||
             role === 'SUPER_ADMIN' ||
             role === 'ADMIN' ||
             role === 'JEFE_CONTROL_INTERNO';
    }
    // Si el rol es un objeto, buscar en propiedades comunes
    if (typeof role === 'object' && role !== null) {
      const roleCode = role.code || '';
      const roleName = String(role.name || '').toLowerCase();
      const roleStr = String(role.name || role.code || role.role || role).toLowerCase();
      
      return roleStr.includes('super') || 
             roleStr.includes('administrador') ||
             roleStr.includes('jefe') ||
             roleCode === 'SUPER_ADMIN' ||
             roleCode === 'ADMIN' ||
             roleCode === 'JEFE_CONTROL_INTERNO' ||
             role.name === 'SUPER_ADMIN' ||
             role.name === 'ADMIN' ||
             role.name === 'Jefe de Control Interno';
    }
    return false;
  }) || false;

  /**
   * Cargar notificaciones del usuario actual
   */
  const cargarNotificaciones = useCallback(async () => {
    const currentUsuarioId = (user as any)?.userId || (user as any)?.id;
    
    if (!currentUsuarioId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Siempre obtener solo las notificaciones del usuario actual,
      // sin importar si es super admin o no. Cada usuario solo debe ver sus propias notificaciones.
      // Consultar notificaciones del backend usando el UUID del usuario
      // El backend se encargará de convertir UUID a id_tercero
      console.log('[useNotificacionesControlInterno] Consultando para:', currentUsuarioId);
      const response = await controlInternoApi.notificaciones.obtenerPorUsuario(currentUsuarioId);
      console.log('[useNotificacionesControlInterno] Respuesta:', response);
      
      if (response.success && response.data) {
        setNotificaciones(response.data);
      } else {
        setError(response.error || 'Error al cargar notificaciones');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Cargar al montar y cuando cambie el usuario
   */
  useEffect(() => {
    // Esperar a que el usuario se cargue antes de hacer la petición
    if (usuarioId || esSuperAdmin) {
      cargarNotificaciones();
    } else {
      setLoading(false);
    }
    // Solo ejecutar cuando cambie el usuario, no cuando cambie cargarNotificaciones
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId, esSuperAdmin]);

  /**
   * Marcar notificación como leída
   */
  const marcarLeida = useCallback(async (notificacionId: string) => {
    if (!usuarioId) {
      console.warn('[useNotificacionesControlInterno] No hay usuarioId para marcar como leída');
      return;
    }

    try {
      const response = await controlInternoApi.notificaciones.marcarLeida(notificacionId, usuarioId);
      
      if (response.success) {
        // Actualizar estado local
        setNotificaciones(prev =>
          prev.map(n => (n.id === notificacionId ? { ...n, leida: true, fechaLectura: new Date().toISOString() } : n))
        );
        
        // Recargar notificaciones desde el backend para asegurar sincronización
        setTimeout(() => {
          cargarNotificaciones();
        }, 500);
        
        toast.success('Notificación marcada como leída');
      } else {
        toast.error('Error al marcar notificación como leída');
      }
    } catch (err) {
      toast.error('Error al marcar notificación como leída');
    }
  }, [usuarioId, cargarNotificaciones]);

  /**
   * Marcar todas como leídas
   */
  const marcarTodasLeidas = useCallback(async () => {
    const currentUsuarioId = (user as any)?.userId || (user as any)?.id;
    
    if (!currentUsuarioId) {
      console.warn('[useNotificacionesControlInterno] No hay usuarioId para marcar todas como leídas');
      toast.error('No se pudo identificar el usuario');
      return;
    }

    try {
      const response = await controlInternoApi.notificaciones.marcarTodasLeidas(currentUsuarioId);
      
      if (response.success) {
        // Recargar las notificaciones desde el backend para asegurar sincronización
        await cargarNotificaciones();
        toast.success('Todas las notificaciones marcadas como leídas');
      } else {
        toast.error(response.error || 'Error al marcar notificaciones');
      }
    } catch (err) {
      toast.error('Error al marcar notificaciones');
    }
  }, [user, cargarNotificaciones]);

  /**
   * Eliminar notificación
   */
  const eliminarNotificacion = useCallback(async (notificacionId: string) => {
    if (!usuarioId) {
      toast.error('No se puede eliminar: usuario no autenticado');
      return;
    }

    try {
      const response = await controlInternoApi.notificaciones.eliminar(notificacionId, usuarioId);
      
      if (response.success) {
        setNotificaciones(prev => prev.filter(n => n.id !== notificacionId));
        toast.success('Notificación eliminada');
      } else {
        toast.error('Error al eliminar notificación');
      }
    } catch (err) {
      console.error('Error al eliminar:', err);
      toast.error('Error al eliminar notificación');
    }
  }, [usuarioId]);

  /**
   * Obtener conteo de notificaciones no leídas
   */
  const conteoNoLeidas = notificaciones.filter(n => !n.leida).length;

  return {
    notificaciones,
    loading,
    error,
    conteoNoLeidas,
    cargarNotificaciones,
    marcarLeida,
    marcarTodasLeidas,
    eliminarNotificacion,
  };
}
