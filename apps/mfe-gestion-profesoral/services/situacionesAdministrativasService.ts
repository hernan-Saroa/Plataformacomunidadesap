/**
 * Servicio de Situaciones Administrativas Docentes - ESAP PTA
 * Gestiona años sabáticos, comisiones, licencias, permisos, etc.
 */

import {
  SituacionAdministrativa,
  AlertaSituacionAdministrativa,
  ReporteSituacionesTalentoHumano,
  TipoSituacionAdministrativa,
  EstadoSituacion,
  ImpactoDisponibilidad,
  HistorialCambioSituacion,
  CONFIGURACION_ALERTAS_DEFAULT,
} from '../types/situacionesAdministrativas';

const STORAGE_KEY = 'esap_situaciones_administrativas';
const ALERTAS_KEY = 'esap_alertas_situaciones';
const REPORTES_KEY = 'esap_reportes_situaciones';

class SituacionesAdministrativasService {
  /**
   * Crea una nueva situación administrativa
   */
  crearSituacion(
    docenteId: string,
    docenteNombre: string,
    docenteEmail: string,
    territorialId: string,
    territorialNombre: string,
    tipo: TipoSituacionAdministrativa,
    descripcion: string,
    fechaInicio: Date,
    fechaFin: Date,
    impactoDisponibilidad: ImpactoDisponibilidad,
    porcentajeDisponibilidad: number,
    afectaDocencia: boolean,
    afectaInvestigacion: boolean,
    afectaExtension: boolean,
    afectaAdministrativo: boolean,
    usuarioCreador: string,
    motivoDetallado?: string,
    documentosSoporte?: string[]
  ): SituacionAdministrativa {
    const situaciones = this.getSituaciones();

    const duracionDias = Math.ceil(
      (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)
    );

    const nuevaSituacion: SituacionAdministrativa = {
      id: `SIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      docenteId,
      docenteNombre,
      docenteEmail,
      territorialId,
      territorialNombre,
      tipo,
      descripcion,
      motivoDetallado,
      fechaSolicitud: new Date(),
      fechaInicio,
      fechaFin,
      duracionDias,
      impactoDisponibilidad,
      porcentajeDisponibilidad,
      afectaDocencia,
      afectaInvestigacion,
      afectaExtension,
      afectaAdministrativo,
      estado: 'SOLICITADA',
      documentosSoporte: documentosSoporte || [],
      alertaGenerada: false,
      notificacionesEnviadas: [],
      creadoPor: usuarioCreador,
      fechaCreacion: new Date(),
      historialCambios: [
        {
          fecha: new Date(),
          usuario: usuarioCreador,
          accion: 'CREACION',
          estadoNuevo: 'SOLICITADA',
          observaciones: 'Situación administrativa creada',
        },
      ],
    };

    situaciones.push(nuevaSituacion);
    this.saveSituaciones(situaciones);

    // Generar alerta automática si corresponde
    if (CONFIGURACION_ALERTAS_DEFAULT.tiposConAlertaAutomatica.includes(tipo)) {
      this.generarAlertaAutomatica(nuevaSituacion);
    }

    return nuevaSituacion;
  }

  /**
   * Actualiza una situación existente
   */
  actualizarSituacion(
    id: string,
    cambios: Partial<SituacionAdministrativa>,
    usuario: string
  ): SituacionAdministrativa | null {
    const situaciones = this.getSituaciones();
    const index = situaciones.findIndex((s) => s.id === id);

    if (index === -1) return null;

    const situacionAnterior = { ...situaciones[index] };
    const situacionActualizada = {
      ...situaciones[index],
      ...cambios,
      modificadoPor: usuario,
      fechaModificacion: new Date(),
      historialCambios: [
        ...situaciones[index].historialCambios,
        {
          fecha: new Date(),
          usuario,
          accion: 'ACTUALIZACION',
          observaciones: 'Situación administrativa actualizada',
        },
      ],
    };

    situaciones[index] = situacionActualizada;
    this.saveSituaciones(situaciones);

    return situacionActualizada;
  }

  /**
   * Cambiar estado de una situación
   */
  cambiarEstado(
    id: string,
    nuevoEstado: EstadoSituacion,
    usuario: string,
    observaciones?: string
  ): SituacionAdministrativa | null {
    const situaciones = this.getSituaciones();
    const index = situaciones.findIndex((s) => s.id === id);

    if (index === -1) return null;

    const estadoAnterior = situaciones[index].estado;

    const cambioHistorial: HistorialCambioSituacion = {
      fecha: new Date(),
      usuario,
      accion: `CAMBIO_ESTADO_${nuevoEstado}`,
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      observaciones,
    };

    situaciones[index] = {
      ...situaciones[index],
      estado: nuevoEstado,
      modificadoPor: usuario,
      fechaModificacion: new Date(),
      historialCambios: [...situaciones[index].historialCambios, cambioHistorial],
    };

    // Si se aprueba, registrar aprobación
    if (nuevoEstado === 'APROBADA') {
      situaciones[index].aprobadoPor = usuario;
      situaciones[index].fechaAprobacion = new Date();
      situaciones[index].observacionesAprobacion = observaciones;
    }

    this.saveSituaciones(situaciones);

    return situaciones[index];
  }

  /**
   * Obtiene todas las situaciones
   */
  getSituaciones(): SituacionAdministrativa[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const situaciones: SituacionAdministrativa[] = JSON.parse(stored);
    return situaciones.map((s) => ({
      ...s,
      fechaSolicitud: new Date(s.fechaSolicitud),
      fechaInicio: new Date(s.fechaInicio),
      fechaFin: new Date(s.fechaFin),
      fechaCreacion: new Date(s.fechaCreacion),
      fechaModificacion: s.fechaModificacion ? new Date(s.fechaModificacion) : undefined,
      fechaAprobacion: s.fechaAprobacion ? new Date(s.fechaAprobacion) : undefined,
      resolucionFecha: s.resolucionFecha ? new Date(s.resolucionFecha) : undefined,
      historialCambios: s.historialCambios.map((h) => ({
        ...h,
        fecha: new Date(h.fecha),
      })),
    }));
  }

  /**
   * Obtiene situaciones por docente
   */
  getSituacionesByDocente(docenteId: string): SituacionAdministrativa[] {
    return this.getSituaciones().filter((s) => s.docenteId === docenteId);
  }

  /**
   * Obtiene situaciones activas por docente
   */
  getSituacionesActivasByDocente(docenteId: string): SituacionAdministrativa[] {
    const ahora = new Date();
    return this.getSituaciones().filter(
      (s) =>
        s.docenteId === docenteId &&
        (s.estado === 'ACTIVA' || s.estado === 'APROBADA') &&
        s.fechaInicio <= ahora &&
        s.fechaFin >= ahora
    );
  }

  /**
   * Obtiene situaciones por territorial
   */
  getSituacionesByTerritorial(territorialId: string): SituacionAdministrativa[] {
    return this.getSituaciones().filter((s) => s.territorialId === territorialId);
  }

  /**
   * Obtiene situaciones por estado
   */
  getSituacionesByEstado(estado: EstadoSituacion): SituacionAdministrativa[] {
    return this.getSituaciones().filter((s) => s.estado === estado);
  }

  /**
   * Obtiene situaciones por tipo
   */
  getSituacionesByTipo(tipo: TipoSituacionAdministrativa): SituacionAdministrativa[] {
    return this.getSituaciones().filter((s) => s.tipo === tipo);
  }

  /**
   * Obtiene situaciones por rango de fechas
   */
  getSituacionesByRangoFechas(
    fechaInicio: Date,
    fechaFin: Date
  ): SituacionAdministrativa[] {
    return this.getSituaciones().filter(
      (s) =>
        (s.fechaInicio >= fechaInicio && s.fechaInicio <= fechaFin) ||
        (s.fechaFin >= fechaInicio && s.fechaFin <= fechaFin) ||
        (s.fechaInicio <= fechaInicio && s.fechaFin >= fechaFin)
    );
  }

  /**
   * Genera alerta automática para una situación
   */
  generarAlertaAutomatica(situacion: SituacionAdministrativa): void {
    const alertas = this.getAlertas();

    const alerta: AlertaSituacionAdministrativa = {
      id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      situacionId: situacion.id,
      docenteId: situacion.docenteId,
      docenteNombre: situacion.docenteNombre,
      tipo: situacion.tipo,
      mensaje: this.generarMensajeAlerta(situacion),
      nivelUrgencia: this.determinarNivelUrgencia(situacion),
      fechaGeneracion: new Date(),
      destinatarios: this.determinarDestinatarios(situacion),
      leida: false,
    };

    alertas.push(alerta);
    this.saveAlertas(alertas);

    // Actualizar la situación para marcar que se generó la alerta
    this.actualizarSituacion(
      situacion.id,
      {
        alertaGenerada: true,
        notificacionesEnviadas: [...situacion.notificacionesEnviadas, alerta.id],
      },
      'Sistema'
    );
  }

  /**
   * Genera mensaje de alerta según el tipo de situación
   */
  private generarMensajeAlerta(situacion: SituacionAdministrativa): string {
    const fechaInicioStr = situacion.fechaInicio.toLocaleDateString('es-CO');
    const fechaFinStr = situacion.fechaFin.toLocaleDateString('es-CO');

    switch (situacion.tipo) {
      case 'ANO_SABATICO':
        return `El docente ${situacion.docenteNombre} iniciará año sabático el ${fechaInicioStr}. Disponibilidad afectada.`;
      case 'COMISION_ESTUDIOS':
        return `El docente ${situacion.docenteNombre} estará en comisión de estudios del ${fechaInicioStr} al ${fechaFinStr}.`;
      case 'COMISION_SERVICIOS':
        return `El docente ${situacion.docenteNombre} estará en comisión de servicios del ${fechaInicioStr} al ${fechaFinStr}.`;
      case 'LICENCIA_NO_REMUNERADA':
        return `El docente ${situacion.docenteNombre} tomará licencia no remunerada del ${fechaInicioStr} al ${fechaFinStr}.`;
      case 'INCAPACIDAD_MEDICA':
        return `El docente ${situacion.docenteNombre} presenta incapacidad médica del ${fechaInicioStr} al ${fechaFinStr}.`;
      default:
        return `Situación administrativa registrada para ${situacion.docenteNombre}: ${situacion.descripcion}`;
    }
  }

  /**
   * Determina el nivel de urgencia de una alerta
   */
  private determinarNivelUrgencia(
    situacion: SituacionAdministrativa
  ): 'ALTA' | 'MEDIA' | 'BAJA' {
    const diasHastaInicio = Math.ceil(
      (situacion.fechaInicio.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (situacion.impactoDisponibilidad === 'TOTAL') return 'ALTA';
    if (diasHastaInicio <= 15) return 'ALTA';
    if (diasHastaInicio <= 30) return 'MEDIA';
    return 'BAJA';
  }

  /**
   * Determina destinatarios de la alerta
   */
  private determinarDestinatarios(situacion: SituacionAdministrativa): string[] {
    // En producción, esto obtendría IDs reales de coordinadores, directores, etc.
    // Por ahora retornamos mock IDs
    return ['coordinador-1', 'director-1', 'talento-humano-1'];
  }

  /**
   * Obtiene alertas
   */
  getAlertas(): AlertaSituacionAdministrativa[] {
    const stored = localStorage.getItem(ALERTAS_KEY);
    if (!stored) return [];

    const alertas: AlertaSituacionAdministrativa[] = JSON.parse(stored);
    return alertas.map((a) => ({
      ...a,
      fechaGeneracion: new Date(a.fechaGeneracion),
      fechaLectura: a.fechaLectura ? new Date(a.fechaLectura) : undefined,
    }));
  }

  /**
   * Marca una alerta como leída
   */
  marcarAlertaLeida(alertaId: string): void {
    const alertas = this.getAlertas();
    const index = alertas.findIndex((a) => a.id === alertaId);

    if (index !== -1) {
      alertas[index].leida = true;
      alertas[index].fechaLectura = new Date();
      this.saveAlertas(alertas);
    }
  }

  /**
   * Genera reporte para Talento Humano
   */
  generarReporteTalentoHumano(
    periodoAcademico: string,
    usuarioGenerador: string
  ): ReporteSituacionesTalentoHumano {
    const situaciones = this.getSituaciones();

    // Resumen por tipo
    const resumenPorTipo = Object.values(
      situaciones.reduce((acc: any, s) => {
        if (!acc[s.tipo]) {
          acc[s.tipo] = {
            tipo: s.tipo,
            cantidad: 0,
            docentesAfectados: [],
          };
        }
        acc[s.tipo].cantidad++;
        if (!acc[s.tipo].docentesAfectados.includes(s.docenteId)) {
          acc[s.tipo].docentesAfectados.push(s.docenteId);
        }
        return acc;
      }, {})
    );

    // Resumen por territorial
    const resumenPorTerritorial = Object.values(
      situaciones.reduce((acc: any, s) => {
        if (!acc[s.territorialId]) {
          acc[s.territorialId] = {
            territorialId: s.territorialId,
            territorialNombre: s.territorialNombre,
            cantidad: 0,
            docentesAfectados: [],
          };
        }
        acc[s.territorialId].cantidad++;
        if (!acc[s.territorialId].docentesAfectados.includes(s.docenteId)) {
          acc[s.territorialId].docentesAfectados.push(s.docenteId);
        }
        return acc;
      }, {})
    );

    const reporte: ReporteSituacionesTalentoHumano = {
      id: `REP-${Date.now()}`,
      periodoAcademico,
      fechaGeneracion: new Date(),
      situaciones,
      resumenPorTipo,
      resumenPorTerritorial,
      generadoPor: usuarioGenerador,
    };

    // Guardar reporte
    const reportes = this.getReportes();
    reportes.push(reporte);
    this.saveReportes(reportes);

    return reporte;
  }

  /**
   * Obtiene reportes guardados
   */
  getReportes(): ReporteSituacionesTalentoHumano[] {
    const stored = localStorage.getItem(REPORTES_KEY);
    if (!stored) return [];

    const reportes: ReporteSituacionesTalentoHumano[] = JSON.parse(stored);
    return reportes.map((r) => ({
      ...r,
      fechaGeneracion: new Date(r.fechaGeneracion),
      situaciones: r.situaciones.map((s) => ({
        ...s,
        fechaSolicitud: new Date(s.fechaSolicitud),
        fechaInicio: new Date(s.fechaInicio),
        fechaFin: new Date(s.fechaFin),
        fechaCreacion: new Date(s.fechaCreacion),
        fechaModificacion: s.fechaModificacion ? new Date(s.fechaModificacion) : undefined,
        fechaAprobacion: s.fechaAprobacion ? new Date(s.fechaAprobacion) : undefined,
        resolucionFecha: s.resolucionFecha ? new Date(s.resolucionFecha) : undefined,
        historialCambios: s.historialCambios.map((h) => ({
          ...h,
          fecha: new Date(h.fecha),
        })),
      })),
    }));
  }

  /**
   * Verifica si un docente tiene situaciones que afecten disponibilidad en un período
   */
  tieneDisponibilidadAfectada(
    docenteId: string,
    fechaInicio: Date,
    fechaFin: Date
  ): {
    afectada: boolean;
    situaciones: SituacionAdministrativa[];
    porcentajeDisponibilidad: number;
  } {
    const situaciones = this.getSituacionesByRangoFechas(fechaInicio, fechaFin).filter(
      (s) =>
        s.docenteId === docenteId &&
        (s.estado === 'ACTIVA' || s.estado === 'APROBADA') &&
        s.impactoDisponibilidad !== 'NINGUNO'
    );

    if (situaciones.length === 0) {
      return {
        afectada: false,
        situaciones: [],
        porcentajeDisponibilidad: 100,
      };
    }

    // Calcular el porcentaje de disponibilidad mínimo
    const porcentajeDisponibilidad = Math.min(
      ...situaciones.map((s) => s.porcentajeDisponibilidad)
    );

    return {
      afectada: true,
      situaciones,
      porcentajeDisponibilidad,
    };
  }

  /**
   * Guarda situaciones en localStorage
   */
  private saveSituaciones(situaciones: SituacionAdministrativa[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(situaciones));
  }

  /**
   * Guarda alertas en localStorage
   */
  private saveAlertas(alertas: AlertaSituacionAdministrativa[]): void {
    localStorage.setItem(ALERTAS_KEY, JSON.stringify(alertas));
  }

  /**
   * Guarda reportes en localStorage
   */
  private saveReportes(reportes: ReporteSituacionesTalentoHumano[]): void {
    localStorage.setItem(REPORTES_KEY, JSON.stringify(reportes));
  }

  /**
   * Elimina una situación (solo si está en estado SOLICITADA o RECHAZADA)
   */
  eliminarSituacion(id: string): boolean {
    const situaciones = this.getSituaciones();
    const index = situaciones.findIndex((s) => s.id === id);

    if (index === -1) return false;

    const situacion = situaciones[index];
    if (situacion.estado !== 'SOLICITADA' && situacion.estado !== 'RECHAZADA') {
      return false; // No se puede eliminar si está en otro estado
    }

    situaciones.splice(index, 1);
    this.saveSituaciones(situaciones);
    return true;
  }
}

export const situacionesAdministrativasService = new SituacionesAdministrativasService();
