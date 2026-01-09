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

  /**
   * Cargar notificaciones del usuario actual
   */
  const cargarNotificaciones = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Consultar notificaciones del backend usando el UUID del usuario
      // El backend se encargará de convertir UUID a id_tercero
      const response = await controlInternoApi.notificaciones.obtenerPorUsuario(user.id);
      
      if (response.success && response.data) {
        setNotificaciones(response.data);
      } else {
        setError(response.error || 'Error al cargar notificaciones');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error al cargar notificaciones:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Cargar al montar y cuando cambie el usuario
   */
  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  /**
   * Marcar notificación como leída
   */
  const marcarLeida = useCallback(async (notificacionId: string) => {
    if (!user?.id) return;

    try {
      const response = await controlInternoApi.notificaciones.marcarLeida(notificacionId, user.id);
      
      if (response.success) {
        setNotificaciones(prev =>
          prev.map(n => (n.id === notificacionId ? { ...n, leida: true } : n))
        );
      } else {
        toast.error('Error al marcar notificación como leída');
      }
    } catch (err) {
      console.error('Error al marcar como leída:', err);
      toast.error('Error al marcar notificación como leída');
    }
  }, [user?.id]);

  /**
   * Marcar todas como leídas
   */
  const marcarTodasLeidas = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await controlInternoApi.notificaciones.marcarTodasLeidas(user.id);
      
      if (response.success) {
        setNotificaciones(prev =>
          prev.map(n => ({ ...n, leida: true }))
        );
        toast.success('Todas las notificaciones marcadas como leídas');
      } else {
        toast.error('Error al marcar notificaciones');
      }
    } catch (err) {
      console.error('Error al marcar todas leídas:', err);
      toast.error('Error al marcar notificaciones');
    }
  }, [user?.id]);

  /**
   * Eliminar notificación
   */
  const eliminarNotificacion = useCallback(async (notificacionId: string) => {
    try {
      const response = await controlInternoApi.notificaciones.eliminar(notificacionId);
      
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
  }, []);

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
