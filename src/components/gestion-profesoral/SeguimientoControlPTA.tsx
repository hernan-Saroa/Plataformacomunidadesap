/**
 * SISTEMA DE SEGUIMIENTO Y CONTROL DEL PTA
 * 
 * Gestiona el ciclo completo de seguimiento de actividades del PTA:
 * - Registro de progreso mensual/semanal
 * - Comparación programado vs ejecutado
 * - Alertas automáticas de desviación
 * - Reportes de cumplimiento
 * - Base para evaluación de desempeño
 * 
 * REQ-MOD-PTA-004.5: Seguimiento y Control
 * 
 * Creado: 22 de diciembre de 2024
 */

import { PTAConAprobacion, ActividadPTA } from './FlujoAprobacionPTA';
import { ComponentePTA } from './MotorReglasPTA';

// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================

/**
 * Registro de progreso de una actividad específica
 */
export interface RegistroProgreso {
  id: string;
  actividadId: string;
  actividadCodigo: string;
  actividadNombre: string;
  ptaId: string;
  
  // Período del registro
  periodo: string; // "2025-1"
  mes: number; // 1-6 para semestral, 1-12 para anual
  semana?: number; // Opcional para seguimiento semanal
  
  // Horas
  horasProgramadas: number; // Horas que debían ejecutarse este mes
  horasEjecutadas: number; // Horas realmente ejecutadas
  horasAcumuladasProgramadas: number; // Horas acumuladas hasta este mes
  horasAcumuladasEjecutadas: number; // Horas ejecutadas acumuladas
  
  // Evidencias
  descripcionActividades: string; // Descripción de lo realizado
  evidencias: EvidenciaProgreso[];
  
  // Metadata
  registradoPor: string;
  registradoNombre: string;
  fechaRegistro: string; // ISO timestamp
  aprobadoPor?: string;
  fechaAprobacion?: string;
  estado: EstadoRegistro;
  observaciones?: string;
}

/**
 * Estados de un registro de progreso
 */
export type EstadoRegistro = 
  | 'pendiente-aprobacion'
  | 'aprobado'
  | 'rechazado'
  | 'en-revision';

/**
 * Evidencia de progreso de una actividad
 */
export interface EvidenciaProgreso {
  id: string;
  tipo: TipoEvidencia;
  nombre: string;
  descripcion: string;
  url?: string; // URL del archivo en repositorio
  fechaCarga: string;
  tamano?: number; // En bytes
}

/**
 * Tipos de evidencia según componente
 */
export type TipoEvidencia =
  | 'documento'
  | 'foto'
  | 'video'
  | 'enlace'
  | 'certificado'
  | 'publicacion'
  | 'acta'
  | 'listado-asistencia'
  | 'plan-clase'
  | 'informe'
  | 'otro';

/**
 * Resultado de comparación programado vs ejecutado
 */
export interface ComparacionProgramadoEjecutado {
  ptaId: string;
  periodo: string;
  
  // Global
  totalProgramado: number;
  totalEjecutado: number;
  porcentajeCumplimiento: number;
  desviacion: number; // En horas
  desviacionPorcentaje: number;
  estado: EstadoCumplimiento;
  
  // Por componente
  componentesComparacion: ComparacionComponente[];
  
  // Por actividad
  actividadesComparacion: ComparacionActividad[];
  
  // Temporal
  progresoMensual: ProgresoMensual[];
  
  // Alertas
  alertas: AlertaDesviacion[];
  
  // Metadata
  ultimaActualizacion: string;
  porcentajeProgresoPeriodo: number; // % del periodo transcurrido
}

/**
 * Estados de cumplimiento
 */
export type EstadoCumplimiento = 
  | 'excelente' // >= 95%
  | 'bueno' // 85-94%
  | 'aceptable' // 75-84%
  | 'regular' // 65-74%
  | 'critico'; // < 65%

/**
 * Comparación por componente
 */
export interface ComparacionComponente {
  componente: ComponentePTA;
  programado: number;
  ejecutado: number;
  porcentajeCumplimiento: number;
  desviacion: number;
  estado: EstadoCumplimiento;
  actividadesCount: number;
  actividadesCompletadas: number;
}

/**
 * Comparación por actividad individual
 */
export interface ComparacionActividad {
  actividadId: string;
  codigo: string;
  nombre: string;
  componente: ComponentePTA;
  programado: number;
  ejecutado: number;
  porcentajeCumplimiento: number;
  desviacion: number;
  ultimoRegistro?: string; // Fecha del último registro
  tieneEvidencias: boolean;
  cantidadEvidencias: number;
}

/**
 * Progreso mensual acumulado
 */
export interface ProgresoMensual {
  mes: number;
  nombreMes: string;
  programadoMes: number;
  ejecutadoMes: number;
  programadoAcumulado: number;
  ejecutadoAcumulado: number;
  porcentajeCumplimiento: number;
  desviacionAcumulada: number;
}

/**
 * Alerta de desviación
 */
export interface AlertaDesviacion {
  id: string;
  tipo: TipoAlerta;
  severidad: SeveridadAlerta;
  componente?: ComponentePTA;
  actividadId?: string;
  actividadNombre?: string;
  mensaje: string;
  descripcion: string;
  desviacion: number;
  porcentajeDesviacion: number;
  fechaDeteccion: string;
  leida: boolean;
  accionSugerida?: string;
}

/**
 * Tipos de alerta
 */
export type TipoAlerta =
  | 'desviacion-global'
  | 'desviacion-componente'
  | 'desviacion-actividad'
  | 'actividad-sin-progreso'
  | 'sin-evidencias'
  | 'retraso-critico'
  | 'sobrecarga';

/**
 * Severidad de alerta
 */
export type SeveridadAlerta = 
  | 'info' // < 10% desviación
  | 'warning' // 10-20% desviación
  | 'error' // 20-30% desviación
  | 'critical'; // > 30% desviación

/**
 * Resumen de cumplimiento para dashboard
 */
export interface ResumenCumplimiento {
  ptaId: string;
  docenteNombre: string;
  periodo: string;
  
  // Métricas globales
  cumplimientoGlobal: number;
  horasProgramadas: number;
  horasEjecutadas: number;
  horasPendientes: number;
  
  // Por componente
  cumplimientoDocencia: number;
  cumplimientoInvestigacion: number;
  cumplimientoExtension: number;
  cumplimientoAdministrativo: number;
  
  // Estado
  estadoGeneral: EstadoCumplimiento;
  alertasActivas: number;
  alertasCriticas: number;
  
  // Progreso temporal
  semanasTrscurridas: number;
  semanasTotal: number;
  porcentajeTiempoTranscurrido: number;
  
  // Tendencia
  tendencia: 'mejorando' | 'estable' | 'empeorando';
  proyeccionFinal: number; // Proyección de % final si continúa la tendencia
}

// ============================================================================
// GESTOR DE SEGUIMIENTO
// ============================================================================

/**
 * Gestor principal del sistema de seguimiento y control
 */
export class GestorSeguimientoPTA {
  
  /**
   * Registrar progreso de una actividad
   */
  public registrarProgreso(
    pta: PTAConAprobacion,
    actividadId: string,
    mes: number,
    horasEjecutadas: number,
    descripcion: string,
    evidencias: EvidenciaProgreso[],
    registradoPor: string,
    registradoNombre: string
  ): RegistroProgreso {
    const actividad = pta.actividades.find(a => a.id === actividadId);
    if (!actividad) {
      throw new Error(`Actividad ${actividadId} no encontrada en el PTA`);
    }
    
    // Calcular horas programadas para este mes
    const horasPorMes = actividad.horasAsignadas / 6; // Semestral: 6 meses
    
    // Obtener registros anteriores para calcular acumulados
    // En producción, esto vendría de la base de datos
    const registrosAnteriores: RegistroProgreso[] = []; // TODO: cargar de BD
    
    const horasAcumuladasEjecutadas = registrosAnteriores
      .filter(r => r.mes < mes)
      .reduce((sum, r) => sum + r.horasEjecutadas, 0) + horasEjecutadas;
    
    const horasAcumuladasProgramadas = horasPorMes * mes;
    
    const registro: RegistroProgreso = {
      id: `REG-${Date.now()}-${actividadId}`,
      actividadId,
      actividadCodigo: actividad.codigo,
      actividadNombre: actividad.nombre,
      ptaId: pta.id,
      periodo: pta.periodo,
      mes,
      horasProgramadas: horasPorMes,
      horasEjecutadas,
      horasAcumuladasProgramadas,
      horasAcumuladasEjecutadas,
      descripcionActividades: descripcion,
      evidencias,
      registradoPor,
      registradoNombre,
      fechaRegistro: new Date().toISOString(),
      estado: 'pendiente-aprobacion'
    };
    
    return registro;
  }
  
  /**
   * Aprobar un registro de progreso
   */
  public aprobarRegistro(
    registro: RegistroProgreso,
    aprobadorId: string,
    aprobadorNombre: string,
    observaciones?: string
  ): RegistroProgreso {
    return {
      ...registro,
      estado: 'aprobado',
      aprobadoPor: aprobadorId,
      fechaAprobacion: new Date().toISOString(),
      observaciones
    };
  }
  
  /**
   * Rechazar un registro de progreso
   */
  public rechazarRegistro(
    registro: RegistroProgreso,
    aprobadorId: string,
    aprobadorNombre: string,
    motivo: string
  ): RegistroProgreso {
    return {
      ...registro,
      estado: 'rechazado',
      aprobadoPor: aprobadorId,
      fechaAprobacion: new Date().toISOString(),
      observaciones: motivo
    };
  }
  
  /**
   * Comparar programado vs ejecutado
   */
  public compararProgramadoVsEjecutado(
    pta: PTAConAprobacion,
    registrosProgreso: RegistroProgreso[],
    mesActual: number
  ): ComparacionProgramadoEjecutado {
    // Filtrar solo registros aprobados
    const registrosAprobados = registrosProgreso.filter(r => r.estado === 'aprobado');
    
    // Calcular totales
    const totalProgramado = pta.horasTotalesAsignadas;
    const totalEjecutado = registrosAprobados.reduce(
      (sum, r) => sum + r.horasEjecutadas, 
      0
    );
    
    const porcentajeCumplimiento = (totalEjecutado / totalProgramado) * 100;
    const desviacion = totalEjecutado - totalProgramado;
    const desviacionPorcentaje = (desviacion / totalProgramado) * 100;
    
    // Determinar estado de cumplimiento
    const estado = this.determinarEstadoCumplimiento(porcentajeCumplimiento);
    
    // Comparación por componente
    const componentesComparacion = this.compararPorComponente(
      pta,
      registrosAprobados
    );
    
    // Comparación por actividad
    const actividadesComparacion = this.compararPorActividad(
      pta,
      registrosAprobados
    );
    
    // Progreso mensual
    const progresoMensual = this.calcularProgresoMensual(
      pta,
      registrosAprobados,
      mesActual
    );
    
    // Generar alertas
    const alertas = this.generarAlertas(
      pta,
      componentesComparacion,
      actividadesComparacion,
      mesActual
    );
    
    // Calcular % de progreso del periodo
    const semanasTranscurridas = mesActual * 4; // Aproximado
    const semanasTotal = 24; // 6 meses * 4 semanas
    const porcentajeProgresoPeriodo = (semanasTranscurridas / semanasTotal) * 100;
    
    return {
      ptaId: pta.id,
      periodo: pta.periodo,
      totalProgramado,
      totalEjecutado,
      porcentajeCumplimiento,
      desviacion,
      desviacionPorcentaje,
      estado,
      componentesComparacion,
      actividadesComparacion,
      progresoMensual,
      alertas,
      ultimaActualizacion: new Date().toISOString(),
      porcentajeProgresoPeriodo
    };
  }
  
  /**
   * Comparar por componente
   */
  private compararPorComponente(
    pta: PTAConAprobacion,
    registros: RegistroProgreso[]
  ): ComparacionComponente[] {
    const componentes: ComponentePTA[] = [
      'docencia',
      'investigacion',
      'extension',
      'academico-administrativo'
    ];
    
    return componentes.map(componente => {
      const actividadesComponente = pta.actividades.filter(
        a => a.componente === componente
      );
      
      const programado = actividadesComponente.reduce(
        (sum, a) => sum + a.horasAsignadas,
        0
      );
      
      const ejecutado = registros
        .filter(r => {
          const actividad = pta.actividades.find(a => a.id === r.actividadId);
          return actividad?.componente === componente;
        })
        .reduce((sum, r) => sum + r.horasEjecutadas, 0);
      
      const porcentajeCumplimiento = programado > 0 
        ? (ejecutado / programado) * 100 
        : 0;
      
      const desviacion = ejecutado - programado;
      const estado = this.determinarEstadoCumplimiento(porcentajeCumplimiento);
      
      const actividadesCompletadas = actividadesComponente.filter(actividad => {
        const horasEjecutadas = registros
          .filter(r => r.actividadId === actividad.id)
          .reduce((sum, r) => sum + r.horasEjecutadas, 0);
        return horasEjecutadas >= actividad.horasAsignadas;
      }).length;
      
      return {
        componente,
        programado,
        ejecutado,
        porcentajeCumplimiento,
        desviacion,
        estado,
        actividadesCount: actividadesComponente.length,
        actividadesCompletadas
      };
    });
  }
  
  /**
   * Comparar por actividad
   */
  private compararPorActividad(
    pta: PTAConAprobacion,
    registros: RegistroProgreso[]
  ): ComparacionActividad[] {
    return pta.actividades.map(actividad => {
      const registrosActividad = registros.filter(
        r => r.actividadId === actividad.id
      );
      
      const ejecutado = registrosActividad.reduce(
        (sum, r) => sum + r.horasEjecutadas,
        0
      );
      
      const porcentajeCumplimiento = (ejecutado / actividad.horasAsignadas) * 100;
      const desviacion = ejecutado - actividad.horasAsignadas;
      
      const ultimoRegistro = registrosActividad.length > 0
        ? registrosActividad[registrosActividad.length - 1].fechaRegistro
        : undefined;
      
      const evidencias = registrosActividad.flatMap(r => r.evidencias);
      
      return {
        actividadId: actividad.id,
        codigo: actividad.codigo,
        nombre: actividad.nombre,
        componente: actividad.componente,
        programado: actividad.horasAsignadas,
        ejecutado,
        porcentajeCumplimiento,
        desviacion,
        ultimoRegistro,
        tieneEvidencias: evidencias.length > 0,
        cantidadEvidencias: evidencias.length
      };
    });
  }
  
  /**
   * Calcular progreso mensual
   */
  private calcularProgresoMensual(
    pta: PTAConAprobacion,
    registros: RegistroProgreso[],
    mesActual: number
  ): ProgresoMensual[] {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'];
    const horasPorMes = pta.horasTotalesAsignadas / 6;
    
    const progreso: ProgresoMensual[] = [];
    let ejecutadoAcumulado = 0;
    
    for (let mes = 1; mes <= mesActual; mes++) {
      const registrosMes = registros.filter(r => r.mes === mes);
      const ejecutadoMes = registrosMes.reduce(
        (sum, r) => sum + r.horasEjecutadas,
        0
      );
      ejecutadoAcumulado += ejecutadoMes;
      
      const programadoAcumulado = horasPorMes * mes;
      const porcentajeCumplimiento = (ejecutadoAcumulado / programadoAcumulado) * 100;
      const desviacionAcumulada = ejecutadoAcumulado - programadoAcumulado;
      
      progreso.push({
        mes,
        nombreMes: meses[mes - 1],
        programadoMes: horasPorMes,
        ejecutadoMes,
        programadoAcumulado,
        ejecutadoAcumulado,
        porcentajeCumplimiento,
        desviacionAcumulada
      });
    }
    
    return progreso;
  }
  
  /**
   * Generar alertas automáticas
   */
  private generarAlertas(
    pta: PTAConAprobacion,
    componentesComparacion: ComparacionComponente[],
    actividadesComparacion: ComparacionActividad[],
    mesActual: number
  ): AlertaDesviacion[] {
    const alertas: AlertaDesviacion[] = [];
    
    // Alertas por componente
    componentesComparacion.forEach(comp => {
      const desviacionPorcentaje = Math.abs(comp.desviacion / comp.programado * 100);
      
      if (desviacionPorcentaje > 10) {
        const severidad = this.determinarSeveridad(desviacionPorcentaje);
        
        alertas.push({
          id: `ALERT-COMP-${comp.componente}-${Date.now()}`,
          tipo: 'desviacion-componente',
          severidad,
          componente: comp.componente,
          mensaje: `Desviación del ${desviacionPorcentaje.toFixed(1)}% en ${comp.componente}`,
          descripcion: comp.desviacion > 0
            ? `Se han ejecutado ${comp.desviacion.toFixed(0)} horas más de las programadas`
            : `Faltan ${Math.abs(comp.desviacion).toFixed(0)} horas por ejecutar`,
          desviacion: comp.desviacion,
          porcentajeDesviacion: desviacionPorcentaje,
          fechaDeteccion: new Date().toISOString(),
          leida: false,
          accionSugerida: comp.desviacion < 0
            ? 'Revisar el cronograma y acelerar la ejecución de actividades'
            : 'Verificar si las horas registradas son correctas'
        });
      }
    });
    
    // Alertas por actividades sin progreso
    actividadesComparacion.forEach(act => {
      if (!act.ultimoRegistro && mesActual >= 2) {
        alertas.push({
          id: `ALERT-ACT-${act.actividadId}-${Date.now()}`,
          tipo: 'actividad-sin-progreso',
          severidad: mesActual >= 3 ? 'error' : 'warning',
          actividadId: act.actividadId,
          actividadNombre: act.nombre,
          mensaje: `Actividad sin progreso registrado`,
          descripcion: `La actividad "${act.nombre}" no tiene registros de progreso en ${mesActual} meses`,
          desviacion: -act.programado,
          porcentajeDesviacion: 100,
          fechaDeteccion: new Date().toISOString(),
          leida: false,
          accionSugerida: 'Registrar el progreso de esta actividad o verificar su estado'
        });
      }
      
      // Alertas por falta de evidencias en actividades que requieren
      if (act.ejecutado > 0 && !act.tieneEvidencias) {
        const actividadCompleta = pta.actividades.find(a => a.id === act.actividadId);
        if (actividadCompleta?.requiereEvidencia) {
          alertas.push({
            id: `ALERT-EVID-${act.actividadId}-${Date.now()}`,
            tipo: 'sin-evidencias',
            severidad: 'warning',
            actividadId: act.actividadId,
            actividadNombre: act.nombre,
            mensaje: `Actividad sin evidencias`,
            descripcion: `La actividad "${act.nombre}" tiene ${act.ejecutado}h registradas pero no tiene evidencias cargadas`,
            desviacion: 0,
            porcentajeDesviacion: 0,
            fechaDeteccion: new Date().toISOString(),
            leida: false,
            accionSugerida: 'Cargar las evidencias de esta actividad'
          });
        }
      }
    });
    
    return alertas;
  }
  
  /**
   * Generar resumen de cumplimiento
   */
  public generarResumenCumplimiento(
    pta: PTAConAprobacion,
    comparacion: ComparacionProgramadoEjecutado,
    mesActual: number
  ): ResumenCumplimiento {
    const docentiaComp = comparacion.componentesComparacion.find(c => c.componente === 'docencia');
    const investigacionComp = comparacion.componentesComparacion.find(c => c.componente === 'investigacion');
    const extensionComp = comparacion.componentesComparacion.find(c => c.componente === 'extension');
    const administrativoComp = comparacion.componentesComparacion.find(c => c.componente === 'academico-administrativo');
    
    // Calcular tendencia
    const progresoMensual = comparacion.progresoMensual;
    const tendencia = this.calcularTendencia(progresoMensual);
    
    // Proyección final
    const proyeccionFinal = this.calcularProyeccion(comparacion, mesActual);
    
    return {
      ptaId: pta.id,
      docenteNombre: pta.docenteNombre,
      periodo: pta.periodo,
      cumplimientoGlobal: comparacion.porcentajeCumplimiento,
      horasProgramadas: comparacion.totalProgramado,
      horasEjecutadas: comparacion.totalEjecutado,
      horasPendientes: comparacion.totalProgramado - comparacion.totalEjecutado,
      cumplimientoDocencia: docentiaComp?.porcentajeCumplimiento || 0,
      cumplimientoInvestigacion: investigacionComp?.porcentajeCumplimiento || 0,
      cumplimientoExtension: extensionComp?.porcentajeCumplimiento || 0,
      cumplimientoAdministrativo: administrativoComp?.porcentajeCumplimiento || 0,
      estadoGeneral: comparacion.estado,
      alertasActivas: comparacion.alertas.length,
      alertasCriticas: comparacion.alertas.filter(a => a.severidad === 'critical' || a.severidad === 'error').length,
      semanasTrscurridas: mesActual * 4,
      semanasTotal: 24,
      porcentajeTiempoTranscurrido: comparacion.porcentajeProgresoPeriodo,
      tendencia,
      proyeccionFinal
    };
  }
  
  /**
   * Determinar estado de cumplimiento basado en porcentaje
   */
  private determinarEstadoCumplimiento(porcentaje: number): EstadoCumplimiento {
    if (porcentaje >= 95) return 'excelente';
    if (porcentaje >= 85) return 'bueno';
    if (porcentaje >= 75) return 'aceptable';
    if (porcentaje >= 65) return 'regular';
    return 'critico';
  }
  
  /**
   * Determinar severidad de alerta
   */
  private determinarSeveridad(desviacionPorcentaje: number): SeveridadAlerta {
    if (desviacionPorcentaje < 10) return 'info';
    if (desviacionPorcentaje < 20) return 'warning';
    if (desviacionPorcentaje < 30) return 'error';
    return 'critical';
  }
  
  /**
   * Calcular tendencia de cumplimiento
   */
  private calcularTendencia(progresoMensual: ProgresoMensual[]): 'mejorando' | 'estable' | 'empeorando' {
    if (progresoMensual.length < 2) return 'estable';
    
    const ultimosMeses = progresoMensual.slice(-3);
    const tendencias = [];
    
    for (let i = 1; i < ultimosMeses.length; i++) {
      const anterior = ultimosMeses[i - 1].porcentajeCumplimiento;
      const actual = ultimosMeses[i].porcentajeCumplimiento;
      tendencias.push(actual - anterior);
    }
    
    const promedioTendencia = tendencias.reduce((a, b) => a + b, 0) / tendencias.length;
    
    if (promedioTendencia > 2) return 'mejorando';
    if (promedioTendencia < -2) return 'empeorando';
    return 'estable';
  }
  
  /**
   * Calcular proyección final
   */
  private calcularProyeccion(
    comparacion: ComparacionProgramadoEjecutado,
    mesActual: number
  ): number {
    if (mesActual === 0) return 0;
    
    const ritmoActual = comparacion.totalEjecutado / mesActual;
    const mesesRestantes = 6 - mesActual;
    const proyeccionRestante = ritmoActual * mesesRestantes;
    const proyeccionTotal = comparacion.totalEjecutado + proyeccionRestante;
    
    return (proyeccionTotal / comparacion.totalProgramado) * 100;
  }
}

// ============================================================================
// HELPERS Y UTILIDADES
// ============================================================================

/**
 * Obtener color según estado de cumplimiento
 */
export function getColorEstadoCumplimiento(estado: EstadoCumplimiento): string {
  const colores = {
    'excelente': '#10B981', // Verde
    'bueno': '#3B82F6', // Azul
    'aceptable': '#F59E0B', // Amarillo
    'regular': '#EF4444', // Rojo
    'critico': '#DC2626' // Rojo oscuro
  };
  return colores[estado];
}

/**
 * Obtener icono según tipo de alerta
 */
export function getIconoTipoAlerta(tipo: TipoAlerta): string {
  const iconos = {
    'desviacion-global': '⚠️',
    'desviacion-componente': '📊',
    'desviacion-actividad': '📝',
    'actividad-sin-progreso': '⏸️',
    'sin-evidencias': '📎',
    'retraso-critico': '🚨',
    'sobrecarga': '⚡'
  };
  return iconos[tipo];
}

/**
 * Obtener etiqueta según tipo de evidencia
 */
export function getEtiquetaTipoEvidencia(tipo: TipoEvidencia): string {
  const etiquetas = {
    'documento': 'Documento',
    'foto': 'Fotografía',
    'video': 'Video',
    'enlace': 'Enlace',
    'certificado': 'Certificado',
    'publicacion': 'Publicación',
    'acta': 'Acta',
    'listado-asistencia': 'Listado de Asistencia',
    'plan-clase': 'Plan de Clase',
    'informe': 'Informe',
    'otro': 'Otro'
  };
  return etiquetas[tipo];
}

// Exportar instancia singleton
export const gestorSeguimiento = new GestorSeguimientoPTA();
