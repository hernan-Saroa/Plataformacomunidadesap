/**
 * ============================================
 * RF020: AUDIT LOG SERVICE
 * ============================================
 * 
 * Service para gestión de auditoría de cambios (Audit Trail)
 * Registro de quién-cuándo-qué para compliance normativo
 * 
 * COMPLIANCE:
 * - Ley 1581/2012 (Protección de Datos)
 * - Decreto 2106/2019 (Transparencia)
 * - ISO 27001 (Seguridad de la Información)
 * - MECI (Modelo Estándar Control Interno)
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025
 */

// ============ TIPOS ============

export type TipoAccion = 
  | 'crear' 
  | 'actualizar' 
  | 'eliminar' 
  | 'aprobar' 
  | 'rechazar' 
  | 'cambiar_estado'
  | 'asignar'
  | 'validar'
  | 'generar'
  | 'exportar'
  | 'consultar';

export type TipoEntidad = 
  | 'plan_anual'
  | 'actividad'
  | 'auditoria'
  | 'programa_anual'
  | 'hallazgo'
  | 'evidencia'
  | 'plan_mejoramiento'
  | 'accion_correctiva'
  | 'informe_ley'
  | 'documento'
  | 'notificacion'
  | 'usuario'
  | 'rol'
  | 'permiso'
  | 'configuracion'
  | 'reporte';

export interface AuditLog {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioEmail: string;
  usuarioRol: string;
  
  accion: TipoAccion;
  accionDescripcion: string; // "Aprobar Plan Anual 2025"
  
  tabla: TipoEntidad;
  registroId: string;
  registroDescripcion?: string; // "Plan Anual 2025", "AUD-2025-001"
  
  cambios: {
    antes?: any;
    despues?: any;
  };
  
  timestamp: string;
  ip?: string;
  userAgent?: string;
  
  // Metadatos adicionales
  modulo?: string; // "Planificación", "Proceso Auditoría", etc.
  criticidad?: 'baja' | 'media' | 'alta' | 'critica';
}

export interface AuditLogFiltros {
  usuarioId?: string;
  fechaInicio?: string;
  fechaFin?: string;
  accion?: TipoAccion | 'todas';
  tabla?: TipoEntidad | 'todas';
  criticidad?: 'baja' | 'media' | 'alta' | 'critica' | 'todas';
  busqueda?: string;
  pagina: number;
  registrosPorPagina: number;
}

export interface AuditLogStats {
  totalRegistros: number;
  actividadPorDia: { fecha: string; cantidad: number }[];
  topUsuarios: { usuarioNombre: string; cantidad: number }[];
  accionesFrecuentes: { accion: string; cantidad: number }[];
  entidadesMasModificadas: { entidad: string; cantidad: number }[];
  criticidadDistribucion: { criticidad: string; cantidad: number }[];
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

// ============ SERVICE ============

class AuditLogService {
  private logs: AuditLog[] = [];

  /**
   * Registrar un cambio en el sistema
   */
  async registrar(
    usuarioId: string,
    usuarioNombre: string,
    usuarioEmail: string,
    usuarioRol: string,
    accion: TipoAccion,
    accionDescripcion: string,
    tabla: TipoEntidad,
    registroId: string,
    cambios: { antes?: any; despues?: any },
    opciones?: {
      registroDescripcion?: string;
      modulo?: string;
      criticidad?: 'baja' | 'media' | 'alta' | 'critica';
      ip?: string;
      userAgent?: string;
    }
  ): Promise<AuditLog> {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      usuarioId,
      usuarioNombre,
      usuarioEmail,
      usuarioRol,
      accion,
      accionDescripcion,
      tabla,
      registroId,
      registroDescripcion: opciones?.registroDescripcion,
      cambios,
      timestamp: new Date().toISOString(),
      ip: opciones?.ip,
      userAgent: opciones?.userAgent,
      modulo: opciones?.modulo,
      criticidad: opciones?.criticidad || this.determinarCriticidad(accion, tabla)
    };

    this.logs.unshift(log); // Agregar al inicio
    
    // En producción, aquí se enviaría al backend
    console.log('📝 Audit Log registrado:', log);
    
    return log;
  }

  /**
   * Obtener logs con filtros y paginación
   */
  async obtenerLogs(filtros: AuditLogFiltros): Promise<AuditLogResponse> {
    let logsFiltrados = [...this.logs];

    // Aplicar filtros
    if (filtros.usuarioId) {
      logsFiltrados = logsFiltrados.filter(log => log.usuarioId === filtros.usuarioId);
    }

    if (filtros.fechaInicio) {
      const inicio = new Date(filtros.fechaInicio);
      logsFiltrados = logsFiltrados.filter(log => new Date(log.timestamp) >= inicio);
    }

    if (filtros.fechaFin) {
      const fin = new Date(filtros.fechaFin);
      fin.setHours(23, 59, 59, 999);
      logsFiltrados = logsFiltrados.filter(log => new Date(log.timestamp) <= fin);
    }

    if (filtros.accion && filtros.accion !== 'todas') {
      logsFiltrados = logsFiltrados.filter(log => log.accion === filtros.accion);
    }

    if (filtros.tabla && filtros.tabla !== 'todas') {
      logsFiltrados = logsFiltrados.filter(log => log.tabla === filtros.tabla);
    }

    if (filtros.criticidad && filtros.criticidad !== 'todas') {
      logsFiltrados = logsFiltrados.filter(log => log.criticidad === filtros.criticidad);
    }

    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      logsFiltrados = logsFiltrados.filter(log => 
        log.accionDescripcion.toLowerCase().includes(busqueda) ||
        log.usuarioNombre.toLowerCase().includes(busqueda) ||
        log.usuarioEmail.toLowerCase().includes(busqueda) ||
        log.registroId.toLowerCase().includes(busqueda) ||
        (log.registroDescripcion && log.registroDescripcion.toLowerCase().includes(busqueda))
      );
    }

    // Paginación
    const total = logsFiltrados.length;
    const totalPaginas = Math.ceil(total / filtros.registrosPorPagina);
    const inicio = (filtros.pagina - 1) * filtros.registrosPorPagina;
    const fin = inicio + filtros.registrosPorPagina;
    const logsPaginados = logsFiltrados.slice(inicio, fin);

    return {
      logs: logsPaginados,
      total,
      pagina: filtros.pagina,
      totalPaginas
    };
  }

  /**
   * Obtener detalle de un log específico
   */
  async obtenerDetalle(logId: string): Promise<AuditLog | null> {
    return this.logs.find(log => log.id === logId) || null;
  }

  /**
   * Obtener estadísticas de auditoría
   */
  async obtenerEstadisticas(fechaInicio: Date, fechaFin: Date): Promise<AuditLogStats> {
    const logsEnRango = this.logs.filter(log => {
      const fecha = new Date(log.timestamp);
      return fecha >= fechaInicio && fecha <= fechaFin;
    });

    // Actividad por día
    const actividadPorDia = this.calcularActividadPorDia(logsEnRango, fechaInicio, fechaFin);

    // Top usuarios
    const usuariosMap = new Map<string, number>();
    logsEnRango.forEach(log => {
      const count = usuariosMap.get(log.usuarioNombre) || 0;
      usuariosMap.set(log.usuarioNombre, count + 1);
    });
    const topUsuarios = Array.from(usuariosMap.entries())
      .map(([usuarioNombre, cantidad]) => ({ usuarioNombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    // Acciones frecuentes
    const accionesMap = new Map<string, number>();
    logsEnRango.forEach(log => {
      const count = accionesMap.get(log.accion) || 0;
      accionesMap.set(log.accion, count + 1);
    });
    const accionesFrecuentes = Array.from(accionesMap.entries())
      .map(([accion, cantidad]) => ({ accion, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Entidades más modificadas
    const entidadesMap = new Map<string, number>();
    logsEnRango.forEach(log => {
      const count = entidadesMap.get(log.tabla) || 0;
      entidadesMap.set(log.tabla, count + 1);
    });
    const entidadesMasModificadas = Array.from(entidadesMap.entries())
      .map(([entidad, cantidad]) => ({ entidad, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Distribución por criticidad
    const criticidadMap = new Map<string, number>();
    logsEnRango.forEach(log => {
      const crit = log.criticidad || 'media';
      const count = criticidadMap.get(crit) || 0;
      criticidadMap.set(crit, count + 1);
    });
    const criticidadDistribucion = Array.from(criticidadMap.entries())
      .map(([criticidad, cantidad]) => ({ criticidad, cantidad }));

    return {
      totalRegistros: logsEnRango.length,
      actividadPorDia,
      topUsuarios,
      accionesFrecuentes,
      entidadesMasModificadas,
      criticidadDistribucion
    };
  }

  /**
   * Exportar logs a Excel (simulado)
   */
  async exportarExcel(filtros: AuditLogFiltros): Promise<Blob> {
    const response = await this.obtenerLogs({ ...filtros, pagina: 1, registrosPorPagina: 10000 });
    
    // En producción, aquí se generaría un archivo Excel real
    const csvContent = this.generarCSV(response.logs);
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Exportar logs a PDF (simulado)
   */
  async exportarPDF(filtros: AuditLogFiltros): Promise<Blob> {
    const response = await this.obtenerLogs({ ...filtros, pagina: 1, registrosPorPagina: 10000 });
    
    // En producción, aquí se generaría un PDF real
    const content = `Audit Log Report\n\nTotal registros: ${response.total}\n`;
    return new Blob([content], { type: 'application/pdf' });
  }

  /**
   * Limpiar logs (solo para testing)
   */
  limpiar(): void {
    this.logs = [];
  }

  /**
   * Obtener todos los logs (solo para testing)
   */
  obtenerTodos(): AuditLog[] {
    return this.logs;
  }

  // ============ MÉTODOS PRIVADOS ============

  private determinarCriticidad(accion: TipoAccion, tabla: TipoEntidad): 'baja' | 'media' | 'alta' | 'critica' {
    // Acciones críticas
    if (accion === 'eliminar' || accion === 'rechazar') return 'critica';
    if (accion === 'aprobar') return 'alta';
    if (accion === 'cambiar_estado' || accion === 'asignar') return 'media';
    
    // Tablas críticas
    if (tabla === 'plan_anual' || tabla === 'auditoria') return 'alta';
    if (tabla === 'plan_mejoramiento' || tabla === 'hallazgo') return 'media';
    
    return 'baja';
  }

  private calcularActividadPorDia(
    logs: AuditLog[], 
    fechaInicio: Date, 
    fechaFin: Date
  ): { fecha: string; cantidad: number }[] {
    const dias = new Map<string, number>();
    
    // Inicializar todos los días en el rango con 0
    const current = new Date(fechaInicio);
    while (current <= fechaFin) {
      const fechaStr = current.toISOString().split('T')[0];
      dias.set(fechaStr, 0);
      current.setDate(current.getDate() + 1);
    }

    // Contar logs por día
    logs.forEach(log => {
      const fecha = new Date(log.timestamp).toISOString().split('T')[0];
      if (dias.has(fecha)) {
        dias.set(fecha, (dias.get(fecha) || 0) + 1);
      }
    });

    return Array.from(dias.entries())
      .map(([fecha, cantidad]) => ({ fecha, cantidad }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  private generarCSV(logs: AuditLog[]): string {
    const headers = ['Timestamp', 'Usuario', 'Email', 'Acción', 'Descripción', 'Entidad', 'Registro ID', 'Criticidad'];
    const rows = logs.map(log => [
      log.timestamp,
      log.usuarioNombre,
      log.usuarioEmail,
      log.accion,
      log.accionDescripcion,
      log.tabla,
      log.registroId,
      log.criticidad || 'media'
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }
}

// Exportar instancia singleton
export const auditLogService = new AuditLogService();

export default auditLogService;
