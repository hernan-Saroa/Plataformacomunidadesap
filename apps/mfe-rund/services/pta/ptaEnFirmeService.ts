/**
 * SERVICIO DE ESTADO "EN FIRME" - PTA ESAP
 * 
 * Gestiona el paso del PTA a estado EN FIRME después de aprobaciones
 * Incluye congelamiento, validaciones y solicitud de modificaciones
 * 
 * Documento Maestro v3.0 - Sección 11.3
 * 
 * Fecha: 23 de diciembre de 2024
 */

import type { EstadoPTA, HistorialAprobacionPTA } from '../../data/ptaEstadosYFlujo';

export interface PTAEnFirme {
  id: string;
  pta_id: string;
  fecha_paso_en_firme: string;
  aprobado_por_nivel_3: string;
  cargo_aprobador: string;
  version_congelada: any; // Snapshot completo del PTA
  hash_integridad: string; // Para verificar que no fue modificado
  puede_modificarse: boolean;
  motivo_bloqueo: string;
}

export interface SolicitudModificacionPTA {
  id: string;
  pta_id: string;
  solicitante_id: string;
  solicitante_nombre: string;
  fecha_solicitud: string;
  motivo_solicitud: string;
  cambios_propuestos: {
    componente: string;
    campo: string;
    valor_actual: any;
    valor_propuesto: any;
    justificacion: string;
  }[];
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  aprobador_id?: string;
  aprobador_nombre?: string;
  fecha_respuesta?: string;
  observaciones_respuesta?: string;
}

export interface HistorialModificacionesPTA {
  id: string;
  pta_id: string;
  fecha_modificacion: string;
  modificado_por: string;
  tipo_modificacion: 'NORMAL' | 'EXTRAORDINARIA' | 'CORRECTIVA';
  solicitud_id?: string;
  cambios: {
    campo: string;
    valor_anterior: any;
    valor_nuevo: any;
  }[];
  autorizado_por?: string;
}

/**
 * Clase para gestionar el estado EN FIRME
 */
export class PTAEnFirmeService {
  
  /**
   * Verificar si un PTA puede pasar a EN FIRME
   * 
   * Condiciones:
   * 1. Debe estar en estado APROBADO
   * 2. Debe haber sido aprobado por los 3 niveles
   * 3. No debe tener validaciones pendientes
   */
  static puedePasarAEnFirme(pta: any, historialAprobaciones: HistorialAprobacionPTA[]): {
    puede: boolean;
    motivo?: string;
  } {
    // Verificar estado actual
    if (pta.estado !== 'APROBADO') {
      return {
        puede: false,
        motivo: `El PTA debe estar en estado APROBADO. Estado actual: ${pta.estado}`
      };
    }
    
    // Verificar que hay aprobaciones de los 3 niveles
    const aprobacionesNiveles = historialAprobaciones.filter(
      h => h.ptaId === pta.id && h.accion === 'APROBAR'
    );
    
    const tieneNivel1 = aprobacionesNiveles.some(a => a.nivel === 1);
    const tieneNivel2 = aprobacionesNiveles.some(a => a.nivel === 2);
    const tieneNivel3 = aprobacionesNiveles.some(a => a.nivel === 3);
    
    if (!tieneNivel1 || !tieneNivel2 || !tieneNivel3) {
      return {
        puede: false,
        motivo: 'Faltan aprobaciones de algunos niveles. Se requieren aprobaciones de Nivel 1, 2 y 3.'
      };
    }
    
    // Verificar que no tenga errores de validación críticos
    if (pta.errores_validacion && pta.errores_validacion.length > 0) {
      return {
        puede: false,
        motivo: `El PTA tiene ${pta.errores_validacion.length} errores de validación pendientes`
      };
    }
    
    // Verificar que no esté ya EN FIRME
    if (pta.estado === 'EN_FIRME') {
      return {
        puede: false,
        motivo: 'El PTA ya se encuentra en estado EN FIRME'
      };
    }
    
    return { puede: true };
  }
  
  /**
   * Pasar PTA a estado EN FIRME
   * 
   * Este proceso:
   * 1. Crea un snapshot inmutable del PTA
   * 2. Calcula hash de integridad
   * 3. Cambia el estado a EN_FIRME
   * 4. Registra en historial
   * 5. Envía notificaciones
   */
  static async pasarAEnFirme(
    pta: any,
    aprobadorNivel3: {
      id: string;
      nombre: string;
      cargo: string;
    },
    historialAprobaciones: HistorialAprobacionPTA[]
  ): Promise<{
    exito: boolean;
    ptaEnFirme?: PTAEnFirme;
    error?: string;
  }> {
    // Verificar que puede pasar a EN FIRME
    const verificacion = this.puedePasarAEnFirme(pta, historialAprobaciones);
    if (!verificacion.puede) {
      return {
        exito: false,
        error: verificacion.motivo
      };
    }
    
    try {
      // Crear snapshot del PTA (versión congelada)
      const versionCongelada = this.crearSnapshotPTA(pta);
      
      // Calcular hash de integridad
      const hashIntegridad = this.calcularHashIntegridad(versionCongelada);
      
      // Crear registro EN FIRME
      const ptaEnFirme: PTAEnFirme = {
        id: `enfirme-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pta_id: pta.id,
        fecha_paso_en_firme: new Date().toISOString(),
        aprobado_por_nivel_3: aprobadorNivel3.nombre,
        cargo_aprobador: aprobadorNivel3.cargo,
        version_congelada: versionCongelada,
        hash_integridad: hashIntegridad,
        puede_modificarse: false,
        motivo_bloqueo: 'PTA en estado EN FIRME - Requiere solicitud formal para modificaciones'
      };
      
      // TODO: En producción, guardar en base de datos
      // await fetch('/api/pta/enfirme', {
      //   method: 'POST',
      //   body: JSON.stringify(ptaEnFirme)
      // });
      
      // MOCK: Guardar en localStorage
      localStorage.setItem(
        `pta_enfirme_${pta.id}`,
        JSON.stringify(ptaEnFirme)
      );
      
      console.log('[PTAEnFirme] PTA pasado a EN FIRME:', {
        pta_id: pta.id,
        fecha: ptaEnFirme.fecha_paso_en_firme,
        aprobador: aprobadorNivel3.nombre,
        hash: hashIntegridad
      });
      
      return {
        exito: true,
        ptaEnFirme
      };
      
    } catch (error) {
      console.error('[PTAEnFirme] Error al pasar a EN FIRME:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * Crear snapshot inmutable del PTA
   */
  private static crearSnapshotPTA(pta: any): any {
    return {
      // Datos básicos
      id: pta.id,
      codigo: pta.codigo,
      periodo: pta.periodo,
      docente_id: pta.docente_id,
      docente_nombre: pta.docente_nombre,
      docente_email: pta.docente_email,
      tipo_vinculacion: pta.tipo_vinculacion,
      horas_programables: pta.horas_programables,
      
      // Componentes del PTA (frozen)
      componente_docencia: { ...pta.componente_docencia },
      componente_investigacion: { ...pta.componente_investigacion },
      componente_extension: { ...pta.componente_extension },
      componente_complementarias: { ...pta.componente_complementarias },
      componente_administrativas: { ...pta.componente_administrativas },
      
      // Metadatos de aprobación
      fecha_aprobacion_nivel_1: pta.fecha_aprobacion_nivel_1,
      fecha_aprobacion_nivel_2: pta.fecha_aprobacion_nivel_2,
      fecha_aprobacion_nivel_3: pta.fecha_aprobacion_nivel_3,
      aprobador_nivel_1: pta.aprobador_nivel_1,
      aprobador_nivel_2: pta.aprobador_nivel_2,
      aprobador_nivel_3: pta.aprobador_nivel_3,
      
      // Timestamp del snapshot
      snapshot_fecha: new Date().toISOString(),
      snapshot_version: '1.0'
    };
  }
  
  /**
   * Calcular hash de integridad del PTA
   * Usa un algoritmo simple de hash para verificar que no fue modificado
   */
  private static calcularHashIntegridad(pta: any): string {
    const ptaString = JSON.stringify(pta);
    
    // Simple hash function (en producción usar SHA-256 real)
    let hash = 0;
    for (let i = 0; i < ptaString.length; i++) {
      const char = ptaString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `ESAP-PTA-${Math.abs(hash).toString(16).toUpperCase()}`;
  }
  
  /**
   * Verificar integridad del PTA EN FIRME
   */
  static verificarIntegridad(ptaEnFirme: PTAEnFirme): boolean {
    const hashCalculado = this.calcularHashIntegridad(ptaEnFirme.version_congelada);
    return hashCalculado === ptaEnFirme.hash_integridad;
  }
  
  /**
   * Obtener estado EN FIRME de un PTA
   */
  static obtenerPTAEnFirme(ptaId: string): PTAEnFirme | null {
    try {
      const data = localStorage.getItem(`pta_enfirme_${ptaId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[PTAEnFirme] Error al obtener:', error);
      return null;
    }
  }
  
  /**
   * Verificar si un PTA está EN FIRME
   */
  static estaEnFirme(ptaId: string): boolean {
    const ptaEnFirme = this.obtenerPTAEnFirme(ptaId);
    return ptaEnFirme !== null;
  }
  
  /**
   * Verificar si un campo puede modificarse
   * Solo ciertos campos pueden modificarse incluso en EN FIRME
   */
  static puedeModificarCampo(
    campo: string,
    tipoModificacion: 'NORMAL' | 'EXTRAORDINARIA' | 'CORRECTIVA'
  ): boolean {
    // Campos que NUNCA pueden modificarse en EN FIRME
    const camposInmutables = [
      'id',
      'codigo',
      'periodo',
      'docente_id',
      'horas_programables',
      'estado',
      'fecha_aprobacion_nivel_1',
      'fecha_aprobacion_nivel_2',
      'fecha_aprobacion_nivel_3'
    ];
    
    if (camposInmutables.includes(campo)) {
      return false;
    }
    
    // Campos que pueden modificarse con solicitud EXTRAORDINARIA
    const camposModificablesConSolicitud = [
      'componente_docencia.actividades',
      'componente_investigacion.actividades',
      'componente_extension.actividades',
      'componente_complementarias.actividades'
    ];
    
    if (tipoModificacion === 'EXTRAORDINARIA' && camposModificablesConSolicitud.includes(campo)) {
      return true;
    }
    
    // Campos que siempre pueden modificarse (evidencias, cumplimiento)
    const camposSiempreModificables = [
      'evidencias',
      'porcentaje_cumplimiento',
      'observaciones_seguimiento'
    ];
    
    return camposSiempreModificables.includes(campo);
  }
  
  /**
   * Crear solicitud de modificación para PTA EN FIRME
   */
  static crearSolicitudModificacion(
    ptaId: string,
    solicitante: {
      id: string;
      nombre: string;
    },
    motivoSolicitud: string,
    cambiosPropuestos: SolicitudModificacionPTA['cambios_propuestos']
  ): SolicitudModificacionPTA {
    const solicitud: SolicitudModificacionPTA = {
      id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pta_id: ptaId,
      solicitante_id: solicitante.id,
      solicitante_nombre: solicitante.nombre,
      fecha_solicitud: new Date().toISOString(),
      motivo_solicitud: motivoSolicitud,
      cambios_propuestos: cambiosPropuestos,
      estado: 'PENDIENTE'
    };
    
    // Guardar solicitud
    const solicitudes = this.obtenerSolicitudesModificacion(ptaId);
    solicitudes.push(solicitud);
    localStorage.setItem(
      `pta_solicitudes_mod_${ptaId}`,
      JSON.stringify(solicitudes)
    );
    
    console.log('[PTAEnFirme] Solicitud de modificación creada:', solicitud.id);
    
    return solicitud;
  }
  
  /**
   * Obtener solicitudes de modificación de un PTA
   */
  static obtenerSolicitudesModificacion(ptaId: string): SolicitudModificacionPTA[] {
    try {
      const data = localStorage.getItem(`pta_solicitudes_mod_${ptaId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[PTAEnFirme] Error al obtener solicitudes:', error);
      return [];
    }
  }
  
  /**
   * Aprobar solicitud de modificación
   */
  static aprobarSolicitudModificacion(
    solicitudId: string,
    ptaId: string,
    aprobador: {
      id: string;
      nombre: string;
    },
    observaciones?: string
  ): boolean {
    try {
      const solicitudes = this.obtenerSolicitudesModificacion(ptaId);
      const index = solicitudes.findIndex(s => s.id === solicitudId);
      
      if (index === -1) return false;
      
      solicitudes[index] = {
        ...solicitudes[index],
        estado: 'APROBADA',
        aprobador_id: aprobador.id,
        aprobador_nombre: aprobador.nombre,
        fecha_respuesta: new Date().toISOString(),
        observaciones_respuesta: observaciones
      };
      
      localStorage.setItem(
        `pta_solicitudes_mod_${ptaId}`,
        JSON.stringify(solicitudes)
      );
      
      console.log('[PTAEnFirme] Solicitud aprobada:', solicitudId);
      
      return true;
    } catch (error) {
      console.error('[PTAEnFirme] Error al aprobar solicitud:', error);
      return false;
    }
  }
  
  /**
   * Rechazar solicitud de modificación
   */
  static rechazarSolicitudModificacion(
    solicitudId: string,
    ptaId: string,
    aprobador: {
      id: string;
      nombre: string;
    },
    observaciones: string
  ): boolean {
    try {
      const solicitudes = this.obtenerSolicitudesModificacion(ptaId);
      const index = solicitudes.findIndex(s => s.id === solicitudId);
      
      if (index === -1) return false;
      
      solicitudes[index] = {
        ...solicitudes[index],
        estado: 'RECHAZADA',
        aprobador_id: aprobador.id,
        aprobador_nombre: aprobador.nombre,
        fecha_respuesta: new Date().toISOString(),
        observaciones_respuesta: observaciones
      };
      
      localStorage.setItem(
        `pta_solicitudes_mod_${ptaId}`,
        JSON.stringify(solicitudes)
      );
      
      console.log('[PTAEnFirme] Solicitud rechazada:', solicitudId);
      
      return true;
    } catch (error) {
      console.error('[PTAEnFirme] Error al rechazar solicitud:', error);
      return false;
    }
  }
  
  /**
   * Obtener historial de modificaciones de un PTA
   */
  static obtenerHistorialModificaciones(ptaId: string): HistorialModificacionesPTA[] {
    try {
      const data = localStorage.getItem(`pta_historial_mod_${ptaId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[PTAEnFirme] Error al obtener historial:', error);
      return [];
    }
  }
  
  /**
   * Registrar modificación en historial
   */
  static registrarModificacion(
    ptaId: string,
    modificadoPor: string,
    tipoModificacion: HistorialModificacionesPTA['tipo_modificacion'],
    cambios: HistorialModificacionesPTA['cambios'],
    solicitudId?: string,
    autorizadoPor?: string
  ): void {
    const historial = this.obtenerHistorialModificaciones(ptaId);
    
    const modificacion: HistorialModificacionesPTA = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pta_id: ptaId,
      fecha_modificacion: new Date().toISOString(),
      modificado_por: modificadoPor,
      tipo_modificacion: tipoModificacion,
      solicitud_id: solicitudId,
      cambios,
      autorizado_por: autorizadoPor
    };
    
    historial.push(modificacion);
    
    localStorage.setItem(
      `pta_historial_mod_${ptaId}`,
      JSON.stringify(historial)
    );
    
    console.log('[PTAEnFirme] Modificación registrada:', modificacion.id);
  }
}

/**
 * Mensajes de bloqueo predefinidos
 */
export const MENSAJES_BLOQUEO_EN_FIRME = {
  EDICION_BLOQUEADA: 'Este PTA está en estado EN FIRME y no puede ser modificado directamente. Para realizar cambios, debes solicitar una modificación extraordinaria.',
  ELIMINACION_BLOQUEADA: 'No puedes eliminar actividades de un PTA en estado EN FIRME. Solicita una modificación extraordinaria si es necesario.',
  COMPONENTE_BLOQUEADO: 'Los componentes de este PTA están bloqueados. El PTA se encuentra en estado EN FIRME.',
  REQUIERE_SOLICITUD: 'Este cambio requiere una solicitud de modificación extraordinaria aprobada por la Subdirección Nacional Académica.',
  SOLO_EVIDENCIAS: 'En estado EN FIRME solo puedes cargar evidencias y actualizar el cumplimiento de actividades.'
};
