/**
 * HOOK: usePTAEnFirme
 * 
 * Hook para gestionar el estado EN FIRME de un PTA
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState, useEffect, useCallback } from 'react';
import { PTAEnFirmeService, type PTAEnFirme, type SolicitudModificacionPTA } from '../services/pta/ptaEnFirmeService';
import { usePTANotificationsSender } from './usePTANotifications';
import { toast } from 'sonner';
import type { HistorialAprobacionPTA } from '../data/ptaEstadosYFlujo';

interface UsePTAEnFirmeOptions {
  ptaId: string;
  autoCargar?: boolean;
}

export function usePTAEnFirme({ ptaId, autoCargar = true }: UsePTAEnFirmeOptions) {
  
  const [ptaEnFirme, setPtaEnFirme] = useState<PTAEnFirme | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudModificacionPTA[]>([]);
  const [cargando, setCargando] = useState(false);
  
  // Cargar datos
  const cargar = useCallback(() => {
    setCargando(true);
    const data = PTAEnFirmeService.obtenerPTAEnFirme(ptaId);
    setPtaEnFirme(data);
    
    if (data) {
      const solic = PTAEnFirmeService.obtenerSolicitudesModificacion(ptaId);
      setSolicitudes(solic);
    }
    
    setCargando(false);
  }, [ptaId]);
  
  useEffect(() => {
    if (autoCargar) {
      cargar();
    }
  }, [autoCargar, cargar]);
  
  // Verificar si está EN FIRME
  const estaEnFirme = ptaEnFirme !== null;
  
  // Verificar integridad
  const integridadValida = ptaEnFirme ? PTAEnFirmeService.verificarIntegridad(ptaEnFirme) : false;
  
  // Verificar si puede modificar campo
  const puedeModificarCampo = useCallback((campo: string): boolean => {
    if (!estaEnFirme) return true;
    return PTAEnFirmeService.puedeModificarCampo(campo, 'NORMAL');
  }, [estaEnFirme]);
  
  // Estadísticas de solicitudes
  const stats = {
    total: solicitudes.length,
    pendientes: solicitudes.filter(s => s.estado === 'PENDIENTE').length,
    aprobadas: solicitudes.filter(s => s.estado === 'APROBADA').length,
    rechazadas: solicitudes.filter(s => s.estado === 'RECHAZADA').length
  };
  
  return {
    ptaEnFirme,
    solicitudes,
    cargando,
    estaEnFirme,
    integridadValida,
    stats,
    puedeModificarCampo,
    cargar
  };
}

/**
 * Hook para pasar un PTA a EN FIRME
 */
export function usePasarAEnFirme() {
  
  const { notificarPTAAprobado } = usePTANotificationsSender();
  const [procesando, setProcesando] = useState(false);
  
  const pasarAEnFirme = useCallback(async (
    pta: any,
    aprobadorNivel3: {
      id: string;
      nombre: string;
      cargo: string;
      email: string;
    },
    historialAprobaciones: HistorialAprobacionPTA[]
  ): Promise<boolean> => {
    setProcesando(true);
    
    try {
      // Verificar que puede pasar a EN FIRME
      const verificacion = PTAEnFirmeService.puedePasarAEnFirme(pta, historialAprobaciones);
      
      if (!verificacion.puede) {
        toast.error(verificacion.motivo || 'No se puede pasar a EN FIRME');
        setProcesando(false);
        return false;
      }
      
      // Pasar a EN FIRME
      const resultado = await PTAEnFirmeService.pasarAEnFirme(
        pta,
        aprobadorNivel3,
        historialAprobaciones
      );
      
      if (!resultado.exito) {
        toast.error(resultado.error || 'Error al pasar a EN FIRME');
        setProcesando(false);
        return false;
      }
      
      // Notificar al docente
      if (pta.docente_id && pta.docente_email) {
        await notificarPTAAprobado({
          docente: {
            id: pta.docente_id,
            nombre: pta.docente_nombre,
            email: pta.docente_email
          },
          aprobador_nombre: aprobadorNivel3.nombre,
          nivel: 3,
          periodo: pta.periodo,
          siguiente_paso: 'Tu PTA ha pasado a estado EN FIRME. Ya puedes comenzar la ejecución.',
          pta_id: pta.id
        });
      }
      
      toast.success('✅ PTA pasado a EN FIRME exitosamente', {
        description: 'El PTA ha sido congelado y está listo para ejecución',
        duration: 5000
      });
      
      setProcesando(false);
      return true;
      
    } catch (error) {
      console.error('[usePasarAEnFirme] Error:', error);
      toast.error('Error al procesar la solicitud');
      setProcesando(false);
      return false;
    }
  }, [notificarPTAAprobado]);
  
  return {
    pasarAEnFirme,
    procesando
  };
}

/**
 * Hook para crear solicitud de modificación
 */
export function useSolicitudModificacion(ptaId: string) {
  
  const [creando, setCreando] = useState(false);
  
  const crearSolicitud = useCallback(async (
    solicitante: {
      id: string;
      nombre: string;
    },
    motivoSolicitud: string,
    cambiosPropuestos: SolicitudModificacionPTA['cambios_propuestos']
  ): Promise<boolean> => {
    setCreando(true);
    
    try {
      const solicitud = PTAEnFirmeService.crearSolicitudModificacion(
        ptaId,
        solicitante,
        motivoSolicitud,
        cambiosPropuestos
      );
      
      toast.success('✅ Solicitud de modificación creada', {
        description: 'La solicitud será revisada por la Subdirección Nacional Académica',
        duration: 5000
      });
      
      // TODO: Enviar notificación al aprobador
      
      setCreando(false);
      return true;
      
    } catch (error) {
      console.error('[useSolicitudModificacion] Error:', error);
      toast.error('Error al crear la solicitud');
      setCreando(false);
      return false;
    }
  }, [ptaId]);
  
  return {
    crearSolicitud,
    creando
  };
}

/**
 * Hook para aprobar/rechazar solicitudes
 */
export function useGestionarSolicitudes(ptaId: string) {
  
  const [procesando, setProcesando] = useState(false);
  
  const aprobarSolicitud = useCallback(async (
    solicitudId: string,
    aprobador: {
      id: string;
      nombre: string;
    },
    observaciones?: string
  ): Promise<boolean> => {
    setProcesando(true);
    
    try {
      const exito = PTAEnFirmeService.aprobarSolicitudModificacion(
        solicitudId,
        ptaId,
        aprobador,
        observaciones
      );
      
      if (exito) {
        toast.success('Solicitud aprobada exitosamente');
        // TODO: Notificar al solicitante
      } else {
        toast.error('Error al aprobar la solicitud');
      }
      
      setProcesando(false);
      return exito;
      
    } catch (error) {
      console.error('[useGestionarSolicitudes] Error al aprobar:', error);
      toast.error('Error al procesar la solicitud');
      setProcesando(false);
      return false;
    }
  }, [ptaId]);
  
  const rechazarSolicitud = useCallback(async (
    solicitudId: string,
    aprobador: {
      id: string;
      nombre: string;
    },
    observaciones: string
  ): Promise<boolean> => {
    setProcesando(true);
    
    try {
      const exito = PTAEnFirmeService.rechazarSolicitudModificacion(
        solicitudId,
        ptaId,
        aprobador,
        observaciones
      );
      
      if (exito) {
        toast.success('Solicitud rechazada');
        // TODO: Notificar al solicitante
      } else {
        toast.error('Error al rechazar la solicitud');
      }
      
      setProcesando(false);
      return exito;
      
    } catch (error) {
      console.error('[useGestionarSolicitudes] Error al rechazar:', error);
      toast.error('Error al procesar la solicitud');
      setProcesando(false);
      return false;
    }
  }, [ptaId]);
  
  return {
    aprobarSolicitud,
    rechazarSolicitud,
    procesando
  };
}
