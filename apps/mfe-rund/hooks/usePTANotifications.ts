/**
 * HOOK: usePTANotifications
 * 
 * Hook para gestionar notificaciones PTA de forma sencilla
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  PTANotificationsService,
  PlantillasEmailPTA,
  type NotificacionPTA,
  type TipoNotificacionPTA 
} from '../services/notifications/ptaNotificationsService';
import { toast } from 'sonner';

interface UsePTANotificationsOptions {
  usuarioId: string;
  autoCargar?: boolean;
  intervaloRecarga?: number; // en milisegundos
}

export function usePTANotifications({ 
  usuarioId, 
  autoCargar = true,
  intervaloRecarga = 30000 // 30 segundos por defecto
}: UsePTANotificationsOptions) {
  
  const [notificaciones, setNotificaciones] = useState<NotificacionPTA[]>([]);
  const [cargando, setCargando] = useState(false);
  
  // Cargar notificaciones
  const cargar = useCallback(() => {
    setCargando(true);
    const notifs = PTANotificationsService.obtenerNotificacionesInApp(usuarioId);
    setNotificaciones(notifs);
    setCargando(false);
  }, [usuarioId]);
  
  // Auto-cargar y recargar periódicamente
  useEffect(() => {
    if (autoCargar) {
      cargar();
      
      if (intervaloRecarga > 0) {
        const interval = setInterval(cargar, intervaloRecarga);
        return () => clearInterval(interval);
      }
    }
  }, [autoCargar, intervaloRecarga, cargar]);
  
  // Enviar notificación
  const enviar = useCallback(async (
    tipo: TipoNotificacionPTA,
    destinatario: NotificacionPTA['destinatario'],
    datos: NotificacionPTA['datos']
  ) => {
    try {
      // Crear notificación
      const notificacion = PTANotificationsService.crearNotificacion(
        tipo,
        destinatario,
        datos
      );
      
      // Agregar plantilla HTML si es email
      if (tipo === 'PTA_DEVUELTO' && datos.observaciones) {
        const plantilla = PlantillasEmailPTA.ptaDevuelto({
          nombre_docente: destinatario.nombre,
          periodo: datos.periodo || '',
          nombre_aprobador: datos.aprobador_nombre || '',
          cargo_aprobador: datos.aprobador_cargo || '',
          observaciones: datos.observaciones,
          fecha_limite: datos.fecha_limite || '',
          url_pta: datos.url_pta || '#'
        });
        notificacion.mensajeHTML = plantilla.cuerpoHTML;
      }
      
      // Enviar
      const resultado = await PTANotificationsService.enviarNotificacion(notificacion);
      
      // Recargar notificaciones
      cargar();
      
      return resultado;
    } catch (error) {
      console.error('[usePTANotifications] Error al enviar:', error);
      toast.error('Error al enviar notificación');
      return { emailEnviado: false, inAppGuardada: false };
    }
  }, [cargar]);
  
  // Marcar como leída
  const marcarLeida = useCallback((notificacionId: string) => {
    PTANotificationsService.marcarComoLeida(usuarioId, notificacionId);
    cargar();
  }, [usuarioId, cargar]);
  
  // Marcar todas como leídas
  const marcarTodasLeidas = useCallback(() => {
    notificaciones
      .filter(n => !n.leida)
      .forEach(n => PTANotificationsService.marcarComoLeida(usuarioId, n.id));
    cargar();
    toast.success('Todas las notificaciones marcadas como leídas');
  }, [notificaciones, usuarioId, cargar]);
  
  // Eliminar notificación
  const eliminar = useCallback((notificacionId: string) => {
    const actualizadas = notificaciones.filter(n => n.id !== notificacionId);
    localStorage.setItem(
      `pta_notifications_${usuarioId}`,
      JSON.stringify(actualizadas)
    );
    cargar();
  }, [notificaciones, usuarioId, cargar]);
  
  // Estadísticas
  const stats = {
    total: notificaciones.length,
    noLeidas: notificaciones.filter(n => !n.leida).length,
    alta: notificaciones.filter(n => n.prioridad === 'ALTA').length,
    altaNoLeidas: notificaciones.filter(n => !n.leida && n.prioridad === 'ALTA').length
  };
  
  return {
    notificaciones,
    cargando,
    stats,
    cargar,
    enviar,
    marcarLeida,
    marcarTodasLeidas,
    eliminar
  };
}

/**
 * Hook simplificado para enviar notificaciones de flujo PTA
 */
export function usePTANotificationsSender() {
  
  /**
   * Notificar cuando un PTA es enviado a aprobación
   */
  const notificarPTAEnviado = useCallback(async (datos: {
    coordinador: { id: string; nombre: string; email: string };
    docente_nombre: string;
    territorial: string;
    periodo: string;
    pta_id: string;
  }) => {
    const notificacion = PTANotificationsService.crearNotificacion(
      'PTA_ENVIADO_APROBACION',
      {
        id: datos.coordinador.id,
        nombre: datos.coordinador.nombre,
        email: datos.coordinador.email,
        rol: 'Coordinador Académico'
      },
      {
        docente_nombre: datos.docente_nombre,
        territorial: datos.territorial,
        periodo: datos.periodo,
        pta_id: datos.pta_id,
        url_pta: `/gestion-profesoral/pta/${datos.pta_id}`
      }
    );
    
    // Agregar plantilla HTML
    const plantilla = PlantillasEmailPTA.ptaEnviadoAprobacion({
      nombre_coordinador: datos.coordinador.nombre,
      docente_nombre: datos.docente_nombre,
      periodo: datos.periodo,
      territorial: datos.territorial,
      url_pta: `/gestion-profesoral/pta/${datos.pta_id}`
    });
    notificacion.mensajeHTML = plantilla.cuerpoHTML;
    
    return await PTANotificationsService.enviarNotificacion(notificacion);
  }, []);
  
  /**
   * Notificar cuando un PTA es devuelto
   */
  const notificarPTADevuelto = useCallback(async (datos: {
    docente: { id: string; nombre: string; email: string };
    aprobador_nombre: string;
    aprobador_cargo: string;
    observaciones: string;
    periodo: string;
    fecha_limite: string;
    pta_id: string;
  }) => {
    const notificacion = PTANotificationsService.crearNotificacion(
      'PTA_DEVUELTO',
      {
        id: datos.docente.id,
        nombre: datos.docente.nombre,
        email: datos.docente.email,
        rol: 'Docente'
      },
      {
        aprobador_nombre: datos.aprobador_nombre,
        aprobador_cargo: datos.aprobador_cargo,
        observaciones: datos.observaciones,
        periodo: datos.periodo,
        fecha_limite: datos.fecha_limite,
        pta_id: datos.pta_id,
        url_pta: `/gestion-profesoral/mis-ptas/${datos.pta_id}`
      }
    );
    
    // Agregar plantilla HTML
    const plantilla = PlantillasEmailPTA.ptaDevuelto({
      nombre_docente: datos.docente.nombre,
      periodo: datos.periodo,
      nombre_aprobador: datos.aprobador_nombre,
      cargo_aprobador: datos.aprobador_cargo,
      observaciones: datos.observaciones,
      fecha_limite: datos.fecha_limite,
      url_pta: `/gestion-profesoral/mis-ptas/${datos.pta_id}`
    });
    notificacion.mensajeHTML = plantilla.cuerpoHTML;
    
    return await PTANotificationsService.enviarNotificacion(notificacion);
  }, []);
  
  /**
   * Notificar cuando un PTA es aprobado
   */
  const notificarPTAAprobado = useCallback(async (datos: {
    docente: { id: string; nombre: string; email: string };
    aprobador_nombre: string;
    nivel: number;
    periodo: string;
    siguiente_paso?: string;
    pta_id: string;
  }) => {
    const tipo = datos.nivel === 1 ? 'PTA_APROBADO_NIVEL_1' : 'PTA_APROBADO_NIVEL_2';
    
    const notificacion = PTANotificationsService.crearNotificacion(
      tipo,
      {
        id: datos.docente.id,
        nombre: datos.docente.nombre,
        email: datos.docente.email,
        rol: 'Docente'
      },
      {
        aprobador_nombre: datos.aprobador_nombre,
        nivel: datos.nivel,
        periodo: datos.periodo,
        siguiente_paso: datos.siguiente_paso,
        pta_id: datos.pta_id,
        url_pta: `/gestion-profesoral/mis-ptas/${datos.pta_id}`
      }
    );
    
    // Agregar plantilla HTML
    const plantilla = PlantillasEmailPTA.ptaAprobado({
      nombre_docente: datos.docente.nombre,
      periodo: datos.periodo,
      nivel: datos.nivel,
      aprobador_nombre: datos.aprobador_nombre,
      siguiente_paso: datos.siguiente_paso,
      url_pta: `/gestion-profesoral/mis-ptas/${datos.pta_id}`
    });
    notificacion.mensajeHTML = plantilla.cuerpoHTML;
    
    return await PTANotificationsService.enviarNotificacion(notificacion);
  }, []);
  
  /**
   * Notificar fecha límite cercana (5 días)
   */
  const notificarFechaLimiteCercana = useCallback(async (datos: {
    docente: { id: string; nombre: string; email: string };
    dias_restantes: number;
    fecha_limite: string;
    periodo: string;
  }) => {
    const notificacion = PTANotificationsService.crearNotificacion(
      'FECHA_LIMITE_CERCANA',
      {
        id: datos.docente.id,
        nombre: datos.docente.nombre,
        email: datos.docente.email,
        rol: 'Docente'
      },
      {
        dias_restantes: datos.dias_restantes,
        fecha_limite: datos.fecha_limite,
        periodo: datos.periodo,
        url_crear_pta: '/gestion-profesoral/crear-pta'
      }
    );
    
    // Agregar plantilla HTML
    const plantilla = PlantillasEmailPTA.fechaLimiteCercana({
      nombre_docente: datos.docente.nombre,
      dias_restantes: datos.dias_restantes,
      fecha_limite: datos.fecha_limite,
      periodo: datos.periodo,
      url_crear_pta: '/gestion-profesoral/crear-pta'
    });
    notificacion.mensajeHTML = plantilla.cuerpoHTML;
    
    return await PTANotificationsService.enviarNotificacion(notificacion);
  }, []);
  
  return {
    notificarPTAEnviado,
    notificarPTADevuelto,
    notificarPTAAprobado,
    notificarFechaLimiteCercana
  };
}
