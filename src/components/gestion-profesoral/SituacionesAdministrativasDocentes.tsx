/**
 * SISTEMA DE GESTIÓN DE SITUACIONES ADMINISTRATIVAS DOCENTES
 * 
 * Gestiona el registro y seguimiento de situaciones administrativas que afectan
 * la disponibilidad y asignación de carga académica de los docentes:
 * - Licencias (médicas, maternidad/paternidad, estudios)
 * - Comisiones de servicio
 * - Años sabáticos
 * - Incapacidades
 * - Permisos especiales
 * - Suspensiones
 * 
 * REQ-MOD-PTA-004.6: Gestión de Situaciones Administrativas
 * 
 * Creado: 22 de diciembre de 2024
 */

// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================

/**
 * Tipos de situaciones administrativas
 */
export type TipoSituacionAdministrativa =
  | 'licencia-medica'
  | 'licencia-maternidad'
  | 'licencia-paternidad'
  | 'licencia-estudios'
  | 'comision-servicio'
  | 'comision-docente'
  | 'ano-sabatico'
  | 'incapacidad'
  | 'permiso-remunerado'
  | 'permiso-no-remunerado'
  | 'suspension'
  | 'vacaciones-compensatorias'
  | 'encargo'
  | 'otro';

/**
 * Estados de una situación administrativa
 */
export type EstadoSituacion =
  | 'solicitada'
  | 'aprobada'
  | 'rechazada'
  | 'activa'
  | 'finalizada'
  | 'cancelada';

/**
 * Impacto en la disponibilidad docente
 */
export type ImpactoDisponibilidad =
  | 'total' // 100% no disponible
  | 'parcial' // Parcialmente disponible
  | 'ninguno'; // No afecta disponibilidad

/**
 * Registro de situación administrativa
 */
export interface SituacionAdministrativa {
  id: string;
  docenteId: string;
  docenteNombre: string;
  docenteDocumento: string;
  
  // Tipo y descripción
  tipo: TipoSituacionAdministrativa;
  descripcion: string;
  motivo?: string;
  
  // Período
  fechaInicio: string; // ISO date
  fechaFin: string; // ISO date
  duracionDias: number;
  
  // Estado
  estado: EstadoSituacion;
  
  // Impacto
  impactoDisponibilidad: ImpactoDisponibilidad;
  porcentajeDisponibilidad: number; // 0-100
  afectaPTA: boolean;
  afectaCargaAcademica: boolean;
  
  // Documentación
  numeroActoAdministrativo?: string; // Resolución, acta, etc.
  urlDocumento?: string;
  evidencias: EvidenciaSituacion[];
  
  // Aprobación
  solicitadoPor: string;
  solicitadoFecha: string;
  aprobadoPor?: string;
  aprobadoFecha?: string;
  aprobadoCargo?: string;
  observacionesAprobacion?: string;
  
  // Talento Humano
  registradoTalentoHumano: boolean;
  fechaRegistroTH?: string;
  funcionarioTH?: string;
  codigoTH?: string; // Código en sistema de Talento Humano
  
  // Compensación
  requiereCompensacion: boolean;
  compensacionDescripcion?: string;
  horasCompensadas?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  observaciones?: string;
}

/**
 * Evidencia de situación administrativa
 */
export interface EvidenciaSituacion {
  id: string;
  tipo: TipoEvidenciaSituacion;
  nombre: string;
  descripcion: string;
  url?: string;
  fechaCarga: string;
  cargadoPor: string;
}

/**
 * Tipos de evidencia para situaciones
 */
export type TipoEvidenciaSituacion =
  | 'resolucion'
  | 'acta'
  | 'certificado-medico'
  | 'incapacidad-eps'
  | 'certificado-estudios'
  | 'comunicado-oficial'
  | 'formato-talento-humano'
  | 'otro';

/**
 * Alerta de disponibilidad docente
 */
export interface AlertaDisponibilidad {
  id: string;
  tipo: TipoAlertaDisponibilidad;
  severidad: 'info' | 'warning' | 'critical';
  docenteId: string;
  docenteNombre: string;
  mensaje: string;
  descripcion: string;
  fechaDeteccion: string;
  fechaVigencia?: string; // Hasta cuándo es relevante
  situacionRelacionada?: string; // ID de situación
  accionSugerida?: string;
  leida: boolean;
}

/**
 * Tipos de alerta de disponibilidad
 */
export type TipoAlertaDisponibilidad =
  | 'situacion-proxima' // Situación que comenzará pronto
  | 'situacion-activa' // Situación en curso
  | 'situacion-finalizando' // Situación que terminará pronto
  | 'sobrecarga-sin-situacion' // Docente sobrecargado sin situación registrada
  | 'disponibilidad-reducida' // Disponibilidad < 50%
  | 'no-disponible' // Docente completamente no disponible
  | 'reincorporacion-proxima' // Reincorporación próxima
  | 'conflicto-asignacion'; // Asignación conflictúa con situación

/**
 * Solicitud a Talento Humano
 */
export interface SolicitudTalentoHumano {
  id: string;
  tipo: 'reporte-semestral' | 'consulta-individual' | 'actualizacion';
  periodo: string;
  fechaSolicitud: string;
  solicitadoPor: string;
  estado: 'pendiente' | 'enviada' | 'respondida';
  fechaRespuesta?: string;
  situacionesRecibidas?: number;
  observaciones?: string;
}

/**
 * Reporte de disponibilidad docente
 */
export interface ReporteDisponibilidad {
  periodo: string;
  fechaGeneracion: string;
  
  // Totales
  totalDocentes: number;
  docentesDisponibles: number;
  docentesNoDisponibles: number;
  docentesParcialmenteDisponibles: number;
  
  // Por tipo de vinculación
  disponibilidadPorVinculacion: {
    carrera: DisponibilidadStats;
    ocasional: DisponibilidadStats;
    catedra: DisponibilidadStats;
  };
  
  // Por territorial
  disponibilidadPorTerritorial: Map<string, DisponibilidadStats>;
  
  // Situaciones activas
  situacionesActivas: SituacionAdministrativa[];
  situacionesProximas: SituacionAdministrativa[];
  
  // Alertas
  alertasCriticas: AlertaDisponibilidad[];
  
  // Proyección
  proyeccionProximoMes: {
    docentesDisponibles: number;
    situacionesIniciarán: number;
    situacionesFinalizarán: number;
  };
}

/**
 * Estadísticas de disponibilidad
 */
interface DisponibilidadStats {
  total: number;
  disponibles: number;
  noDisponibles: number;
  parciales: number;
  porcentajeDisponibilidad: number;
}

// ============================================================================
// GESTOR DE SITUACIONES ADMINISTRATIVAS
// ============================================================================

/**
 * Gestor principal del sistema de situaciones administrativas
 */
export class GestorSituacionesAdministrativas {
  
  /**
   * Crear nueva situación administrativa
   */
  public crearSituacion(
    docenteId: string,
    docenteNombre: string,
    docenteDocumento: string,
    tipo: TipoSituacionAdministrativa,
    descripcion: string,
    fechaInicio: string,
    fechaFin: string,
    solicitadoPor: string,
    datos: Partial<SituacionAdministrativa>
  ): SituacionAdministrativa {
    const duracionDias = this.calcularDuracionDias(fechaInicio, fechaFin);
    const impacto = this.determinarImpacto(tipo);
    
    const situacion: SituacionAdministrativa = {
      id: `SIT-${Date.now()}`,
      docenteId,
      docenteNombre,
      docenteDocumento,
      tipo,
      descripcion,
      fechaInicio,
      fechaFin,
      duracionDias,
      estado: 'solicitada',
      impactoDisponibilidad: impacto.impacto,
      porcentajeDisponibilidad: impacto.porcentaje,
      afectaPTA: impacto.afectaPTA,
      afectaCargaAcademica: impacto.afectaCarga,
      evidencias: [],
      solicitadoPor,
      solicitadoFecha: new Date().toISOString(),
      registradoTalentoHumano: false,
      requiereCompensacion: this.requiereCompensacion(tipo, duracionDias),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...datos
    };
    
    return situacion;
  }
  
  /**
   * Aprobar situación administrativa
   */
  public aprobarSituacion(
    situacion: SituacionAdministrativa,
    aprobadorId: string,
    aprobadorNombre: string,
    aprobadorCargo: string,
    numeroActo: string,
    observaciones?: string
  ): SituacionAdministrativa {
    return {
      ...situacion,
      estado: 'aprobada',
      aprobadoPor: aprobadorId,
      aprobadoFecha: new Date().toISOString(),
      aprobadoCargo,
      numeroActoAdministrativo: numeroActo,
      observacionesAprobacion: observaciones,
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Activar situación (cuando inicia)
   */
  public activarSituacion(
    situacion: SituacionAdministrativa
  ): SituacionAdministrativa {
    if (situacion.estado !== 'aprobada') {
      throw new Error('Solo se pueden activar situaciones aprobadas');
    }
    
    return {
      ...situacion,
      estado: 'activa',
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Finalizar situación (cuando termina)
   */
  public finalizarSituacion(
    situacion: SituacionAdministrativa,
    observaciones?: string
  ): SituacionAdministrativa {
    return {
      ...situacion,
      estado: 'finalizada',
      observaciones: observaciones || situacion.observaciones,
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Registrar en Talento Humano
   */
  public registrarEnTalentoHumano(
    situacion: SituacionAdministrativa,
    funcionarioTH: string,
    codigoTH: string
  ): SituacionAdministrativa {
    return {
      ...situacion,
      registradoTalentoHumano: true,
      fechaRegistroTH: new Date().toISOString(),
      funcionarioTH,
      codigoTH,
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Solicitar reporte semestral a Talento Humano
   */
  public solicitarReporteTH(
    periodo: string,
    solicitadoPor: string
  ): SolicitudTalentoHumano {
    return {
      id: `SOL-TH-${Date.now()}`,
      tipo: 'reporte-semestral',
      periodo,
      fechaSolicitud: new Date().toISOString(),
      solicitadoPor,
      estado: 'pendiente'
    };
  }
  
  /**
   * Procesar respuesta de Talento Humano
   */
  public procesarRespuestaTH(
    solicitud: SolicitudTalentoHumano,
    situaciones: SituacionAdministrativa[]
  ): SolicitudTalentoHumano {
    return {
      ...solicitud,
      estado: 'respondida',
      fechaRespuesta: new Date().toISOString(),
      situacionesRecibidas: situaciones.length
    };
  }
  
  /**
   * Generar alertas de disponibilidad
   */
  public generarAlertas(
    situaciones: SituacionAdministrativa[],
    fechaReferencia: string = new Date().toISOString()
  ): AlertaDisponibilidad[] {
    const alertas: AlertaDisponibilidad[] = [];
    const hoy = new Date(fechaReferencia);
    
    situaciones.forEach(sit => {
      const inicio = new Date(sit.fechaInicio);
      const fin = new Date(sit.fechaFin);
      const diasHastaInicio = this.calcularDiasEntre(hoy, inicio);
      const diasHastaFin = this.calcularDiasEntre(hoy, fin);
      
      // Alerta: Situación próxima (dentro de 30 días)
      if (sit.estado === 'aprobada' && diasHastaInicio > 0 && diasHastaInicio <= 30) {
        alertas.push({
          id: `ALERT-PROX-${sit.id}`,
          tipo: 'situacion-proxima',
          severidad: diasHastaInicio <= 7 ? 'warning' : 'info',
          docenteId: sit.docenteId,
          docenteNombre: sit.docenteNombre,
          mensaje: `Situación administrativa próxima en ${diasHastaInicio} días`,
          descripcion: `${sit.docenteNombre} iniciará ${this.getNombreTipo(sit.tipo)} el ${this.formatearFecha(sit.fechaInicio)}`,
          fechaDeteccion: new Date().toISOString(),
          fechaVigencia: sit.fechaInicio,
          situacionRelacionada: sit.id,
          accionSugerida: 'Revisar asignación de carga académica y planificar reemplazos si es necesario',
          leida: false
        });
      }
      
      // Alerta: Situación activa con impacto total
      if (sit.estado === 'activa' && sit.impactoDisponibilidad === 'total') {
        alertas.push({
          id: `ALERT-ACT-${sit.id}`,
          tipo: 'no-disponible',
          severidad: 'critical',
          docenteId: sit.docenteId,
          docenteNombre: sit.docenteNombre,
          mensaje: `Docente no disponible`,
          descripcion: `${sit.docenteNombre} no está disponible por ${this.getNombreTipo(sit.tipo)} hasta ${this.formatearFecha(sit.fechaFin)}`,
          fechaDeteccion: new Date().toISOString(),
          fechaVigencia: sit.fechaFin,
          situacionRelacionada: sit.id,
          accionSugerida: 'No asignar carga académica durante este período',
          leida: false
        });
      }
      
      // Alerta: Disponibilidad reducida (parcial)
      if (sit.estado === 'activa' && sit.impactoDisponibilidad === 'parcial') {
        alertas.push({
          id: `ALERT-RED-${sit.id}`,
          tipo: 'disponibilidad-reducida',
          severidad: 'warning',
          docenteId: sit.docenteId,
          docenteNombre: sit.docenteNombre,
          mensaje: `Disponibilidad reducida al ${sit.porcentajeDisponibilidad}%`,
          descripcion: `${sit.docenteNombre} tiene disponibilidad limitada por ${this.getNombreTipo(sit.tipo)}`,
          fechaDeteccion: new Date().toISOString(),
          fechaVigencia: sit.fechaFin,
          situacionRelacionada: sit.id,
          accionSugerida: `Ajustar carga académica según ${sit.porcentajeDisponibilidad}% de disponibilidad`,
          leida: false
        });
      }
      
      // Alerta: Reincorporación próxima (dentro de 15 días)
      if (sit.estado === 'activa' && diasHastaFin > 0 && diasHastaFin <= 15) {
        alertas.push({
          id: `ALERT-REINC-${sit.id}`,
          tipo: 'reincorporacion-proxima',
          severidad: 'info',
          docenteId: sit.docenteId,
          docenteNombre: sit.docenteNombre,
          mensaje: `Reincorporación próxima en ${diasHastaFin} días`,
          descripcion: `${sit.docenteNombre} se reincorporará el ${this.formatearFecha(sit.fechaFin)}`,
          fechaDeteccion: new Date().toISOString(),
          fechaVigencia: sit.fechaFin,
          situacionRelacionada: sit.id,
          accionSugerida: 'Preparar asignación de carga académica para el próximo período',
          leida: false
        });
      }
    });
    
    return alertas;
  }
  
  /**
   * Calcular disponibilidad de un docente
   */
  public calcularDisponibilidad(
    docenteId: string,
    situaciones: SituacionAdministrativa[],
    fechaReferencia: string = new Date().toISOString()
  ): {
    disponible: boolean;
    porcentajeDisponibilidad: number;
    situacionesActivas: SituacionAdministrativa[];
    razon?: string;
  } {
    const situacionesActivas = situaciones.filter(s => 
      s.docenteId === docenteId &&
      s.estado === 'activa' &&
      this.estaEnRango(fechaReferencia, s.fechaInicio, s.fechaFin)
    );
    
    if (situacionesActivas.length === 0) {
      return {
        disponible: true,
        porcentajeDisponibilidad: 100,
        situacionesActivas: []
      };
    }
    
    // Si hay situaciones con impacto total
    const impactoTotal = situacionesActivas.some(s => s.impactoDisponibilidad === 'total');
    if (impactoTotal) {
      const situacion = situacionesActivas.find(s => s.impactoDisponibilidad === 'total')!;
      return {
        disponible: false,
        porcentajeDisponibilidad: 0,
        situacionesActivas,
        razon: `${this.getNombreTipo(situacion.tipo)} hasta ${this.formatearFecha(situacion.fechaFin)}`
      };
    }
    
    // Calcular disponibilidad acumulada (producto de disponibilidades parciales)
    const porcentaje = situacionesActivas.reduce((acc, s) => 
      acc * (s.porcentajeDisponibilidad / 100), 100
    );
    
    return {
      disponible: porcentaje >= 50,
      porcentajeDisponibilidad: Math.round(porcentaje),
      situacionesActivas,
      razon: porcentaje < 50 ? 'Múltiples situaciones administrativas' : undefined
    };
  }
  
  /**
   * Generar reporte de disponibilidad
   */
  public generarReporteDisponibilidad(
    docentes: Array<{ id: string; nombre: string; vinculacion: string; territorial: string }>,
    situaciones: SituacionAdministrativa[],
    periodo: string
  ): ReporteDisponibilidad {
    const fechaActual = new Date().toISOString();
    
    // Calcular disponibilidad de cada docente
    const disponibilidades = docentes.map(d => ({
      docente: d,
      disponibilidad: this.calcularDisponibilidad(d.id, situaciones, fechaActual)
    }));
    
    // Totales
    const totalDocentes = docentes.length;
    const docentesDisponibles = disponibilidades.filter(d => d.disponibilidad.disponible && d.disponibilidad.porcentajeDisponibilidad === 100).length;
    const docentesNoDisponibles = disponibilidades.filter(d => d.disponibilidad.porcentajeDisponibilidad === 0).length;
    const docentesParciales = totalDocentes - docentesDisponibles - docentesNoDisponibles;
    
    // Situaciones activas y próximas
    const situacionesActivas = situaciones.filter(s => s.estado === 'activa');
    const situacionesProximas = situaciones.filter(s => {
      if (s.estado !== 'aprobada') return false;
      const diasHastaInicio = this.calcularDiasEntre(new Date(fechaActual), new Date(s.fechaInicio));
      return diasHastaInicio > 0 && diasHastaInicio <= 30;
    });
    
    // Alertas críticas
    const alertas = this.generarAlertas(situaciones, fechaActual);
    const alertasCriticas = alertas.filter(a => a.severidad === 'critical');
    
    return {
      periodo,
      fechaGeneracion: fechaActual,
      totalDocentes,
      docentesDisponibles,
      docentesNoDisponibles,
      docentesParcialmenteDisponibles: docentesParciales,
      disponibilidadPorVinculacion: {
        carrera: this.calcularStatsPorGrupo(disponibilidades, 'carrera'),
        ocasional: this.calcularStatsPorGrupo(disponibilidades, 'ocasional'),
        catedra: this.calcularStatsPorGrupo(disponibilidades, 'catedra')
      },
      disponibilidadPorTerritorial: new Map(),
      situacionesActivas,
      situacionesProximas,
      alertasCriticas,
      proyeccionProximoMes: {
        docentesDisponibles: docentesDisponibles - situacionesProximas.length,
        situacionesIniciarán: situacionesProximas.length,
        situacionesFinalizarán: situacionesActivas.filter(s => {
          const diasHastaFin = this.calcularDiasEntre(new Date(fechaActual), new Date(s.fechaFin));
          return diasHastaFin > 0 && diasHastaFin <= 30;
        }).length
      }
    };
  }
  
  // ========================================================================
  // MÉTODOS PRIVADOS
  // ========================================================================
  
  private calcularDuracionDias(fechaInicio: string, fechaFin: string): number {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diff = fin.getTime() - inicio.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  private calcularDiasEntre(fecha1: Date, fecha2: Date): number {
    const diff = fecha2.getTime() - fecha1.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  private determinarImpacto(tipo: TipoSituacionAdministrativa): {
    impacto: ImpactoDisponibilidad;
    porcentaje: number;
    afectaPTA: boolean;
    afectaCarga: boolean;
  } {
    const impactos: Record<TipoSituacionAdministrativa, any> = {
      'licencia-medica': { impacto: 'total', porcentaje: 0, afectaPTA: true, afectaCarga: true },
      'licencia-maternidad': { impacto: 'total', porcentaje: 0, afectaPTA: true, afectaCarga: true },
      'licencia-paternidad': { impacto: 'total', porcentaje: 0, afectaPTA: true, afectaCarga: true },
      'licencia-estudios': { impacto: 'parcial', porcentaje: 50, afectaPTA: true, afectaCarga: true },
      'comision-servicio': { impacto: 'parcial', porcentaje: 30, afectaPTA: true, afectaCarga: false },
      'comision-docente': { impacto: 'ninguno', porcentaje: 100, afectaPTA: false, afectaCarga: false },
      'ano-sabatico': { impacto: 'total', porcentaje: 0, afectaPTA: true, afectaCarga: true },
      'incapacidad': { impacto: 'total', porcentaje: 0, afectaPTA: true, afectaCarga: true },
      'permiso-remunerado': { impacto: 'parcial', porcentaje: 70, afectaPTA: false, afectaCarga: false },
      'permiso-no-remunerado': { impacto: 'total', porcentaje: 0, afectaPTA: true, afectaCarga: true },
      'suspension': { impacto: 'total', porcentaje: 0, afectaPTA: true, afectaCarga: true },
      'vacaciones-compensatorias': { impacto: 'total', porcentaje: 0, afectaPTA: false, afectaCarga: true },
      'encargo': { impacto: 'ninguno', porcentaje: 100, afectaPTA: false, afectaCarga: false },
      'otro': { impacto: 'parcial', porcentaje: 50, afectaPTA: true, afectaCarga: true }
    };
    
    return impactos[tipo];
  }
  
  private requiereCompensacion(tipo: TipoSituacionAdministrativa, duracionDias: number): boolean {
    const tiposConCompensacion: TipoSituacionAdministrativa[] = [
      'comision-servicio',
      'comision-docente',
      'permiso-remunerado'
    ];
    
    return tiposConCompensacion.includes(tipo) && duracionDias > 5;
  }
  
  private estaEnRango(fecha: string, inicio: string, fin: string): boolean {
    const f = new Date(fecha);
    const i = new Date(inicio);
    const fi = new Date(fin);
    return f >= i && f <= fi;
  }
  
  private getNombreTipo(tipo: TipoSituacionAdministrativa): string {
    const nombres: Record<TipoSituacionAdministrativa, string> = {
      'licencia-medica': 'Licencia Médica',
      'licencia-maternidad': 'Licencia de Maternidad',
      'licencia-paternidad': 'Licencia de Paternidad',
      'licencia-estudios': 'Licencia de Estudios',
      'comision-servicio': 'Comisión de Servicio',
      'comision-docente': 'Comisión Docente',
      'ano-sabatico': 'Año Sabático',
      'incapacidad': 'Incapacidad',
      'permiso-remunerado': 'Permiso Remunerado',
      'permiso-no-remunerado': 'Permiso No Remunerado',
      'suspension': 'Suspensión',
      'vacaciones-compensatorias': 'Vacaciones Compensatorias',
      'encargo': 'Encargo',
      'otro': 'Otra Situación'
    };
    return nombres[tipo];
  }
  
  private formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  private calcularStatsPorGrupo(
    disponibilidades: any[],
    vinculacion: string
  ): DisponibilidadStats {
    const grupo = disponibilidades.filter(d => d.docente.vinculacion === vinculacion);
    const total = grupo.length;
    
    if (total === 0) {
      return { total: 0, disponibles: 0, noDisponibles: 0, parciales: 0, porcentajeDisponibilidad: 0 };
    }
    
    const disponibles = grupo.filter(d => 
      d.disponibilidad.disponible && d.disponibilidad.porcentajeDisponibilidad === 100
    ).length;
    
    const noDisponibles = grupo.filter(d => 
      d.disponibilidad.porcentajeDisponibilidad === 0
    ).length;
    
    const parciales = total - disponibles - noDisponibles;
    const porcentajeDisponibilidad = Math.round((disponibles / total) * 100);
    
    return { total, disponibles, noDisponibles, parciales, porcentajeDisponibilidad };
  }
}

// ============================================================================
// HELPERS Y UTILIDADES
// ============================================================================

/**
 * Obtener color según tipo de situación
 */
export function getColorTipoSituacion(tipo: TipoSituacionAdministrativa): string {
  const colores: Record<TipoSituacionAdministrativa, string> = {
    'licencia-medica': '#EF4444',
    'licencia-maternidad': '#EC4899',
    'licencia-paternidad': '#3B82F6',
    'licencia-estudios': '#8B5CF6',
    'comision-servicio': '#10B981',
    'comision-docente': '#14B8A6',
    'ano-sabatico': '#F59E0B',
    'incapacidad': '#DC2626',
    'permiso-remunerado': '#06B6D4',
    'permiso-no-remunerado': '#6366F1',
    'suspension': '#B91C1C',
    'vacaciones-compensatorias': '#10B981',
    'encargo': '#059669',
    'otro': '#64748B'
  };
  return colores[tipo];
}

/**
 * Obtener icono según tipo de situación
 */
export function getIconoTipoSituacion(tipo: TipoSituacionAdministrativa): string {
  const iconos: Record<TipoSituacionAdministrativa, string> = {
    'licencia-medica': '🏥',
    'licencia-maternidad': '🤱',
    'licencia-paternidad': '👨‍👶',
    'licencia-estudios': '📚',
    'comision-servicio': '🧳',
    'comision-docente': '🎓',
    'ano-sabatico': '🌴',
    'incapacidad': '🚑',
    'permiso-remunerado': '✅',
    'permiso-no-remunerado': '⏸️',
    'suspension': '⛔',
    'vacaciones-compensatorias': '🏖️',
    'encargo': '📋',
    'otro': '📄'
  };
  return iconos[tipo];
}

// Exportar instancia singleton
export const gestorSituaciones = new GestorSituacionesAdministrativas();
