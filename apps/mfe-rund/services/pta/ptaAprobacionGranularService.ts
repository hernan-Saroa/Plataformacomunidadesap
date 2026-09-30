/**
 * SERVICIO DE APROBACIÓN GRANULAR POR ACTIVIDAD - PTA ESAP
 * 
 * Permite aprobar/rechazar actividades individuales en lugar de todo el PTA
 * Cada actividad tiene su propio flujo de aprobación y observaciones
 * 
 * Documento Maestro v3.0 - Sección 12.4
 * 
 * Fecha: 23 de diciembre de 2024
 */

import type { NivelAprobacion } from '../../data/ptaEstadosYFlujo';

export type EstadoAprobacionActividad = 
  | 'PENDIENTE'           // No ha sido revisada
  | 'EN_REVISION'         // Aprobador la está revisando
  | 'APROBADA_NIVEL_1'    // Aprobada por Coordinador
  | 'APROBADA_NIVEL_2'    // Aprobada por Director
  | 'APROBADA_NIVEL_3'    // Aprobada por Subdirección (Final)
  | 'DEVUELTA_NIVEL_1'    // Rechazada por Coordinador
  | 'DEVUELTA_NIVEL_2'    // Rechazada por Director
  | 'DEVUELTA_NIVEL_3'    // Rechazada por Subdirección
  | 'APROBADA_FINAL';     // Aprobada por los 3 niveles

export interface AprobacionActividad {
  id: string;
  actividad_id: string;
  pta_id: string;
  componente: string;
  nivel: NivelAprobacion;
  estado: EstadoAprobacionActividad;
  aprobador_id: string;
  aprobador_nombre: string;
  aprobador_cargo: string;
  fecha_revision: string;
  observaciones?: string;
  cambios_sugeridos?: {
    campo: string;
    valor_actual: any;
    valor_sugerido: any;
    motivo: string;
  }[];
}

export interface EstadoActividadPTA {
  actividad_id: string;
  nombre_actividad: string;
  componente: string;
  horas: number;
  
  // Estados de aprobación por nivel
  estado_nivel_1: 'PENDIENTE' | 'APROBADA' | 'DEVUELTA';
  estado_nivel_2: 'PENDIENTE' | 'APROBADA' | 'DEVUELTA';
  estado_nivel_3: 'PENDIENTE' | 'APROBADA' | 'DEVUELTA';
  
  // Estado general de la actividad
  estado_general: EstadoAprobacionActividad;
  
  // Historial de aprobaciones
  aprobaciones: AprobacionActividad[];
  
  // Observaciones acumuladas
  observaciones_totales: string[];
  
  // Indicadores
  tiene_observaciones: boolean;
  requiere_atencion: boolean;
  completamente_aprobada: boolean;
}

export interface ResumenAprobacionPTA {
  pta_id: string;
  total_actividades: number;
  
  // Por nivel
  nivel_1: {
    aprobadas: number;
    devueltas: number;
    pendientes: number;
    porcentaje_avance: number;
  };
  nivel_2: {
    aprobadas: number;
    devueltas: number;
    pendientes: number;
    porcentaje_avance: number;
  };
  nivel_3: {
    aprobadas: number;
    devueltas: number;
    pendientes: number;
    porcentaje_avance: number;
  };
  
  // Estado general
  completamente_aprobado: boolean;
  puede_pasar_siguiente_nivel: boolean;
  nivel_actual: NivelAprobacion;
  siguiente_accion: string;
}

/**
 * Clase para gestionar aprobaciones granulares
 */
export class PTAAprobacionGranularService {
  
  /**
   * Aprobar una actividad individual
   */
  static aprobarActividad(
    ptaId: string,
    actividadId: string,
    componente: string,
    nivel: NivelAprobacion,
    aprobador: {
      id: string;
      nombre: string;
      cargo: string;
    },
    observaciones?: string
  ): AprobacionActividad {
    
    const estadoSegunNivel: Record<NivelAprobacion, EstadoAprobacionActividad> = {
      1: 'APROBADA_NIVEL_1',
      2: 'APROBADA_NIVEL_2',
      3: 'APROBADA_NIVEL_3'
    };
    
    const aprobacion: AprobacionActividad = {
      id: `aprob-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      actividad_id: actividadId,
      pta_id: ptaId,
      componente,
      nivel,
      estado: estadoSegunNivel[nivel],
      aprobador_id: aprobador.id,
      aprobador_nombre: aprobador.nombre,
      aprobador_cargo: aprobador.cargo,
      fecha_revision: new Date().toISOString(),
      observaciones
    };
    
    // Guardar aprobación
    this.guardarAprobacion(aprobacion);
    
    console.log('[AprobacionGranular] Actividad aprobada:', {
      actividad_id: actividadId,
      nivel,
      aprobador: aprobador.nombre
    });
    
    return aprobacion;
  }
  
  /**
   * Devolver (rechazar) una actividad individual
   */
  static devolverActividad(
    ptaId: string,
    actividadId: string,
    componente: string,
    nivel: NivelAprobacion,
    aprobador: {
      id: string;
      nombre: string;
      cargo: string;
    },
    observaciones: string,
    cambiosSugeridos?: AprobacionActividad['cambios_sugeridos']
  ): AprobacionActividad {
    
    const estadoSegunNivel: Record<NivelAprobacion, EstadoAprobacionActividad> = {
      1: 'DEVUELTA_NIVEL_1',
      2: 'DEVUELTA_NIVEL_2',
      3: 'DEVUELTA_NIVEL_3'
    };
    
    const aprobacion: AprobacionActividad = {
      id: `aprob-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      actividad_id: actividadId,
      pta_id: ptaId,
      componente,
      nivel,
      estado: estadoSegunNivel[nivel],
      aprobador_id: aprobador.id,
      aprobador_nombre: aprobador.nombre,
      aprobador_cargo: aprobador.cargo,
      fecha_revision: new Date().toISOString(),
      observaciones,
      cambios_sugeridos: cambiosSugeridos
    };
    
    // Guardar aprobación
    this.guardarAprobacion(aprobacion);
    
    console.log('[AprobacionGranular] Actividad devuelta:', {
      actividad_id: actividadId,
      nivel,
      aprobador: aprobador.nombre,
      observaciones
    });
    
    return aprobacion;
  }
  
  /**
   * Obtener estado de una actividad
   */
  static obtenerEstadoActividad(ptaId: string, actividadId: string): EstadoActividadPTA | null {
    const aprobaciones = this.obtenerAprobacionesActividad(ptaId, actividadId);
    
    if (aprobaciones.length === 0) {
      return null;
    }
    
    // Determinar estado por nivel
    const aprobacionNivel1 = aprobaciones.find(a => a.nivel === 1);
    const aprobacionNivel2 = aprobaciones.find(a => a.nivel === 2);
    const aprobacionNivel3 = aprobaciones.find(a => a.nivel === 3);
    
    const estadoNivel1: 'PENDIENTE' | 'APROBADA' | 'DEVUELTA' = 
      !aprobacionNivel1 ? 'PENDIENTE' :
      aprobacionNivel1.estado === 'APROBADA_NIVEL_1' ? 'APROBADA' :
      aprobacionNivel1.estado === 'DEVUELTA_NIVEL_1' ? 'DEVUELTA' :
      'PENDIENTE';
    
    const estadoNivel2: 'PENDIENTE' | 'APROBADA' | 'DEVUELTA' = 
      !aprobacionNivel2 ? 'PENDIENTE' :
      aprobacionNivel2.estado === 'APROBADA_NIVEL_2' ? 'APROBADA' :
      aprobacionNivel2.estado === 'DEVUELTA_NIVEL_2' ? 'DEVUELTA' :
      'PENDIENTE';
    
    const estadoNivel3: 'PENDIENTE' | 'APROBADA' | 'DEVUELTA' = 
      !aprobacionNivel3 ? 'PENDIENTE' :
      aprobacionNivel3.estado === 'APROBADA_NIVEL_3' ? 'APROBADA' :
      aprobacionNivel3.estado === 'DEVUELTA_NIVEL_3' ? 'DEVUELTA' :
      'PENDIENTE';
    
    // Determinar estado general
    let estadoGeneral: EstadoAprobacionActividad = 'PENDIENTE';
    
    if (estadoNivel1 === 'DEVUELTA' || estadoNivel2 === 'DEVUELTA' || estadoNivel3 === 'DEVUELTA') {
      // Si algún nivel la devolvió, ese es el estado
      if (estadoNivel3 === 'DEVUELTA') estadoGeneral = 'DEVUELTA_NIVEL_3';
      else if (estadoNivel2 === 'DEVUELTA') estadoGeneral = 'DEVUELTA_NIVEL_2';
      else if (estadoNivel1 === 'DEVUELTA') estadoGeneral = 'DEVUELTA_NIVEL_1';
    } else if (estadoNivel1 === 'APROBADA' && estadoNivel2 === 'APROBADA' && estadoNivel3 === 'APROBADA') {
      // Aprobada por los 3 niveles
      estadoGeneral = 'APROBADA_FINAL';
    } else if (estadoNivel1 === 'APROBADA' && estadoNivel2 === 'APROBADA') {
      // Aprobada por niveles 1 y 2
      estadoGeneral = 'APROBADA_NIVEL_2';
    } else if (estadoNivel1 === 'APROBADA') {
      // Solo aprobada por nivel 1
      estadoGeneral = 'APROBADA_NIVEL_1';
    }
    
    // Recopilar observaciones
    const observacionesTotales = aprobaciones
      .filter(a => a.observaciones)
      .map(a => `[${a.aprobador_cargo} - Nivel ${a.nivel}] ${a.observaciones}`);
    
    const estado: EstadoActividadPTA = {
      actividad_id: actividadId,
      nombre_actividad: aprobaciones[0]?.componente || '',
      componente: aprobaciones[0]?.componente || '',
      horas: 0, // Se debe obtener del PTA
      estado_nivel_1: estadoNivel1,
      estado_nivel_2: estadoNivel2,
      estado_nivel_3: estadoNivel3,
      estado_general: estadoGeneral,
      aprobaciones,
      observaciones_totales: observacionesTotales,
      tiene_observaciones: observacionesTotales.length > 0,
      requiere_atencion: estadoNivel1 === 'DEVUELTA' || estadoNivel2 === 'DEVUELTA' || estadoNivel3 === 'DEVUELTA',
      completamente_aprobada: estadoGeneral === 'APROBADA_FINAL'
    };
    
    return estado;
  }
  
  /**
   * Obtener resumen de aprobación del PTA completo
   */
  static obtenerResumenPTA(ptaId: string, actividadesIds: string[]): ResumenAprobacionPTA {
    const estadosActividades = actividadesIds
      .map(id => this.obtenerEstadoActividad(ptaId, id))
      .filter(e => e !== null) as EstadoActividadPTA[];
    
    const total = estadosActividades.length;
    
    // Estadísticas Nivel 1
    const nivel1Aprobadas = estadosActividades.filter(e => 
      e.estado_nivel_1 === 'APROBADA'
    ).length;
    const nivel1Devueltas = estadosActividades.filter(e => 
      e.estado_nivel_1 === 'DEVUELTA'
    ).length;
    const nivel1Pendientes = estadosActividades.filter(e => 
      e.estado_nivel_1 === 'PENDIENTE'
    ).length;
    
    // Estadísticas Nivel 2
    const nivel2Aprobadas = estadosActividades.filter(e => 
      e.estado_nivel_2 === 'APROBADA'
    ).length;
    const nivel2Devueltas = estadosActividades.filter(e => 
      e.estado_nivel_2 === 'DEVUELTA'
    ).length;
    const nivel2Pendientes = estadosActividades.filter(e => 
      e.estado_nivel_2 === 'PENDIENTE'
    ).length;
    
    // Estadísticas Nivel 3
    const nivel3Aprobadas = estadosActividades.filter(e => 
      e.estado_nivel_3 === 'APROBADA'
    ).length;
    const nivel3Devueltas = estadosActividades.filter(e => 
      e.estado_nivel_3 === 'DEVUELTA'
    ).length;
    const nivel3Pendientes = estadosActividades.filter(e => 
      e.estado_nivel_3 === 'PENDIENTE'
    ).length;
    
    // Determinar nivel actual
    let nivelActual: NivelAprobacion = 1;
    if (nivel1Aprobadas === total) nivelActual = 2;
    if (nivel2Aprobadas === total) nivelActual = 3;
    
    // Determinar si puede pasar al siguiente nivel
    const puedeNivel2 = nivel1Aprobadas === total && nivel1Devueltas === 0;
    const puedeNivel3 = nivel2Aprobadas === total && nivel2Devueltas === 0;
    const completamenteAprobado = nivel3Aprobadas === total && nivel3Devueltas === 0;
    
    const puedePasarSiguienteNivel = 
      (nivelActual === 1 && puedeNivel2) ||
      (nivelActual === 2 && puedeNivel3) ||
      (nivelActual === 3 && completamenteAprobado);
    
    // Siguiente acción
    let siguienteAccion = '';
    if (nivel1Pendientes > 0) {
      siguienteAccion = `Pendiente: Coordinador debe revisar ${nivel1Pendientes} actividades`;
    } else if (nivel1Devueltas > 0) {
      siguienteAccion = `Devueltas: Docente debe corregir ${nivel1Devueltas} actividades`;
    } else if (nivel2Pendientes > 0) {
      siguienteAccion = `Pendiente: Director debe revisar ${nivel2Pendientes} actividades`;
    } else if (nivel2Devueltas > 0) {
      siguienteAccion = `Devueltas: Docente debe corregir ${nivel2Devueltas} actividades`;
    } else if (nivel3Pendientes > 0) {
      siguienteAccion = `Pendiente: Subdirección debe revisar ${nivel3Pendientes} actividades`;
    } else if (nivel3Devueltas > 0) {
      siguienteAccion = `Devueltas: Docente debe corregir ${nivel3Devueltas} actividades`;
    } else if (completamenteAprobado) {
      siguienteAccion = 'PTA completamente aprobado - Listo para pasar a EN FIRME';
    }
    
    const resumen: ResumenAprobacionPTA = {
      pta_id: ptaId,
      total_actividades: total,
      nivel_1: {
        aprobadas: nivel1Aprobadas,
        devueltas: nivel1Devueltas,
        pendientes: nivel1Pendientes,
        porcentaje_avance: total > 0 ? Math.round((nivel1Aprobadas / total) * 100) : 0
      },
      nivel_2: {
        aprobadas: nivel2Aprobadas,
        devueltas: nivel2Devueltas,
        pendientes: nivel2Pendientes,
        porcentaje_avance: total > 0 ? Math.round((nivel2Aprobadas / total) * 100) : 0
      },
      nivel_3: {
        aprobadas: nivel3Aprobadas,
        devueltas: nivel3Devueltas,
        pendientes: nivel3Pendientes,
        porcentaje_avance: total > 0 ? Math.round((nivel3Aprobadas / total) * 100) : 0
      },
      completamente_aprobado: completamenteAprobado,
      puede_pasar_siguiente_nivel: puedePasarSiguienteNivel,
      nivel_actual: nivelActual,
      siguiente_accion: siguienteAccion
    };
    
    return resumen;
  }
  
  /**
   * Guardar aprobación en localStorage (MOCK - en producción usar BD)
   */
  private static guardarAprobacion(aprobacion: AprobacionActividad): void {
    const key = `pta_aprobaciones_${aprobacion.pta_id}`;
    const existentes = this.obtenerTodasAprobaciones(aprobacion.pta_id);
    
    // Reemplazar si ya existe una aprobación del mismo nivel para esta actividad
    const index = existentes.findIndex(
      a => a.actividad_id === aprobacion.actividad_id && a.nivel === aprobacion.nivel
    );
    
    if (index >= 0) {
      existentes[index] = aprobacion;
    } else {
      existentes.push(aprobacion);
    }
    
    localStorage.setItem(key, JSON.stringify(existentes));
  }
  
  /**
   * Obtener todas las aprobaciones de un PTA
   */
  static obtenerTodasAprobaciones(ptaId: string): AprobacionActividad[] {
    try {
      const key = `pta_aprobaciones_${ptaId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[AprobacionGranular] Error al obtener aprobaciones:', error);
      return [];
    }
  }
  
  /**
   * Obtener aprobaciones de una actividad específica
   */
  static obtenerAprobacionesActividad(ptaId: string, actividadId: string): AprobacionActividad[] {
    const todas = this.obtenerTodasAprobaciones(ptaId);
    return todas.filter(a => a.actividad_id === actividadId);
  }
  
  /**
   * Aprobar todas las actividades de un componente
   */
  static aprobarComponenteCompleto(
    ptaId: string,
    componente: string,
    actividadesIds: string[],
    nivel: NivelAprobacion,
    aprobador: {
      id: string;
      nombre: string;
      cargo: string;
    },
    observaciones?: string
  ): AprobacionActividad[] {
    return actividadesIds.map(actividadId => 
      this.aprobarActividad(ptaId, actividadId, componente, nivel, aprobador, observaciones)
    );
  }
  
  /**
   * Verificar si todas las actividades están aprobadas en un nivel
   */
  static todasAprobadasEnNivel(ptaId: string, actividadesIds: string[], nivel: NivelAprobacion): boolean {
    const estadosActividades = actividadesIds
      .map(id => this.obtenerEstadoActividad(ptaId, id))
      .filter(e => e !== null) as EstadoActividadPTA[];
    
    return estadosActividades.every(estado => {
      if (nivel === 1) return estado.estado_nivel_1 === 'APROBADA';
      if (nivel === 2) return estado.estado_nivel_2 === 'APROBADA';
      if (nivel === 3) return estado.estado_nivel_3 === 'APROBADA';
      return false;
    });
  }
  
  /**
   * Obtener actividades pendientes de revisión en un nivel
   */
  static obtenerActividadesPendientes(ptaId: string, actividadesIds: string[], nivel: NivelAprobacion): string[] {
    const estadosActividades = actividadesIds
      .map(id => ({ id, estado: this.obtenerEstadoActividad(ptaId, id) }))
      .filter(({ estado }) => estado !== null) as { id: string; estado: EstadoActividadPTA }[];
    
    return estadosActividades
      .filter(({ estado }) => {
        if (nivel === 1) return estado.estado_nivel_1 === 'PENDIENTE';
        if (nivel === 2) return estado.estado_nivel_2 === 'PENDIENTE';
        if (nivel === 3) return estado.estado_nivel_3 === 'PENDIENTE';
        return false;
      })
      .map(({ id }) => id);
  }
  
  /**
   * Obtener actividades devueltas en un nivel
   */
  static obtenerActividadesDevueltas(ptaId: string, actividadesIds: string[], nivel: NivelAprobacion): string[] {
    const estadosActividades = actividadesIds
      .map(id => ({ id, estado: this.obtenerEstadoActividad(ptaId, id) }))
      .filter(({ estado }) => estado !== null) as { id: string; estado: EstadoActividadPTA }[];
    
    return estadosActividades
      .filter(({ estado }) => {
        if (nivel === 1) return estado.estado_nivel_1 === 'DEVUELTA';
        if (nivel === 2) return estado.estado_nivel_2 === 'DEVUELTA';
        if (nivel === 3) return estado.estado_nivel_3 === 'DEVUELTA';
        return false;
      })
      .map(({ id }) => id);
  }
}

/**
 * Utilidades para visualización
 */
export const COLORES_ESTADO_ACTIVIDAD = {
  PENDIENTE: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    badge: 'bg-gray-500'
  },
  EN_REVISION: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    badge: 'bg-blue-500'
  },
  APROBADA_NIVEL_1: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    badge: 'bg-green-500'
  },
  APROBADA_NIVEL_2: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    badge: 'bg-green-600'
  },
  APROBADA_NIVEL_3: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    badge: 'bg-green-700'
  },
  DEVUELTA_NIVEL_1: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    badge: 'bg-red-500'
  },
  DEVUELTA_NIVEL_2: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    badge: 'bg-red-600'
  },
  DEVUELTA_NIVEL_3: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    badge: 'bg-red-700'
  },
  APROBADA_FINAL: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
    badge: 'bg-purple-600'
  }
};

export const LABELS_ESTADO_ACTIVIDAD: Record<EstadoAprobacionActividad, string> = {
  PENDIENTE: 'Pendiente de Revisión',
  EN_REVISION: 'En Revisión',
  APROBADA_NIVEL_1: 'Aprobada - Nivel 1',
  APROBADA_NIVEL_2: 'Aprobada - Nivel 2',
  APROBADA_NIVEL_3: 'Aprobada - Nivel 3',
  DEVUELTA_NIVEL_1: 'Devuelta - Nivel 1',
  DEVUELTA_NIVEL_2: 'Devuelta - Nivel 2',
  DEVUELTA_NIVEL_3: 'Devuelta - Nivel 3',
  APROBADA_FINAL: 'Aprobada - Final'
};