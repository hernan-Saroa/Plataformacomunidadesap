/**
 * ============================================
 * RF020: AUDIT LOG SERVICE - SISTEMA COMPLETO
 * ============================================
 * 
 * Service para gestión de auditoría de cambios (Audit Trail)
 * Registro COMPLETO de TODAS las acciones en TODOS los módulos
 * 
 * COMPLIANCE:
 * - Ley 1581/2012 (Protección de Datos)
 * - Decreto 2106/2019 (Transparencia)
 * - ISO 27001 (Seguridad de la Información)
 * - MECI (Modelo Estándar Control Interno)
 * 
 * ÚLTIMA ACTUALIZACIÓN: 14 Enero 2026
 */

// ============ TIPOS COMPLETOS ============

// ✅ TODAS LAS ACCIONES POSIBLES EN EL SISTEMA
export type TipoAccion = 
  // Acciones CRUD básicas
  | 'crear'
  | 'actualizar'
  | 'eliminar'
  | 'consultar'
  | 'ver_detalle'
  
  // Acciones de aprobación y validación
  | 'aprobar'
  | 'rechazar'
  | 'validar'
  | 'revisar'
  | 'verificar'
  
  // Acciones de estado
  | 'cambiar_estado'
  | 'activar'
  | 'desactivar'
  | 'suspender'
  | 'reactivar'
  | 'anular'
  | 'cerrar'
  | 'archivar'
  
  // Acciones de asignación
  | 'asignar'
  | 'reasignar'
  | 'transferir'
  
  // Acciones de documentación
  | 'cargar_documento'
  | 'descargar_documento'
  | 'eliminar_documento'
  | 'firmar_documento'
  | 'enviar_documento'
  
  // Acciones de generación
  | 'generar'
  | 'generar_reporte'
  | 'generar_certificado'
  | 'generar_informe'
  
  // Acciones de exportación
  | 'exportar'
  | 'exportar_excel'
  | 'exportar_pdf'
  | 'exportar_csv'
  
  // Acciones de importación
  | 'importar'
  | 'importar_excel'
  | 'importar_csv'
  
  // Acciones de notificación
  | 'notificar'
  | 'enviar_email'
  | 'enviar_notificacion'
  
  // Acciones de configuración
  | 'configurar'
  | 'cambiar_configuracion'
  
  // Acciones de autenticación y permisos
  | 'login'
  | 'logout'
  | 'cambiar_password'
  | 'restablecer_password'
  | 'asignar_rol'
  | 'revocar_permiso'
  | 'otorgar_permiso'
  
  // Acciones de enrolamiento
  | 'enrolar_usuario'
  | 'enrolamiento_masivo'
  
  // Acciones de firma electrónica
  | 'firmar'
  | 'solicitar_firma'
  | 'rechazar_firma'
  
  // Acciones de certificados
  | 'solicitar_certificado'
  | 'generar_certificado'
  | 'entregar_certificado'
  | 'validar_certificado'
  | 'revocar_certificado'
  
  // Acciones de publicación
  | 'publicar'
  | 'despublicar'
  | 'programar_publicacion'
  
  // Acciones de comunidad
  | 'crear_publicacion'
  | 'crear_evento'
  | 'crear_anuncio'
  | 'comentar'
  | 'reaccionar'
  | 'compartir'
  
  // Acciones de procesos disciplinarios
  | 'iniciar_proceso'
  | 'crear_auto'
  | 'crear_resolucion'
  | 'aplicar_sancion'
  | 'archivo_proceso'
  
  // Acciones de procesos legales
  | 'crear_expediente'
  | 'asignar_abogado'
  | 'crear_concepto_juridico'
  | 'cerrar_expediente'
  
  // Acciones de auditoría
  | 'crear_auditoria'
  | 'ejecutar_auditoria'
  | 'crear_hallazgo'
  | 'crear_plan_mejoramiento'
  | 'validar_evidencia'
  
  // Acciones de gestión profesoral
  | 'crear_convocatoria'
  | 'postular_docente'
  | 'evaluar_desempeño'
  | 'asignar_carga_academica';

// ✅ TODAS LAS ENTIDADES/TABLAS DEL SISTEMA
export type TipoEntidad = 
  // Módulo: Control Interno
  | 'plan_anual'
  | 'actividad'
  | 'auditoria'
  | 'programa_anual'
  | 'hallazgo'
  | 'evidencia'
  | 'plan_mejoramiento'
  | 'accion_correctiva'
  | 'informe_ley'
  | 'lista_chequeo'
  | 'matriz_riesgo'
  
  // Módulo: Gestión de Usuarios y Personas
  | 'usuario'
  | 'persona'
  | 'perfil'
  | 'rol'
  | 'permiso'
  | 'carpeta_digital'
  | 'documento_personal'
  
  // Módulo: Graduados y Verificación de títulos
  | 'graduado'
  | 'titulo'
  | 'programa_academico'
  | 'certificado_titulo'
  | 'diploma'
  
  // Módulo: Enrolamiento
  | 'enrolamiento'
  | 'enrolamiento_masivo'
  | 'solicitud_enrolamiento'
  
  // Módulo: Comunidad
  | 'publicacion'
  | 'evento'
  | 'anuncio'
  | 'comentario'
  | 'reaccion'
  
  // Módulo: Bolsa de Empleo
  | 'oferta_empleo'
  | 'postulacion'
  | 'empresa'
  
  // Módulo: Certificados
  | 'solicitud_certificado'
  | 'certificado'
  | 'certificado_laboral'
  | 'validacion_certificado'
  
  // Módulo: Firma Electrónica
  | 'documento_firma'
  | 'firma_digital'
  | 'solicitud_firma'
  
  // Módulo: Control Disciplinario
  | 'proceso_disciplinario'
  | 'auto_disciplinario'
  | 'resolucion_disciplinaria'
  | 'sancion'
  | 'queja'
  
  // Módulo: Gestión Legal
  | 'expediente_legal'
  | 'concepto_juridico'
  | 'demanda'
  | 'tutela'
  | 'contrato'
  | 'proceso_coactivo'
  
  // Módulo: Estructura Organizacional
  | 'dependencia'
  | 'cargo'
  | 'organigrama'
  
  // Módulo: Arquitectura Empresarial
  | 'capacidad'
  | 'proceso_negocio'
  | 'sistema_informacion'
  | 'aplicacion'
  
  // Módulo: Gestión Profesoral
  | 'docente'
  | 'convocatoria'
  | 'postulacion_docente'
  | 'evaluacion_desempeño'
  | 'carga_academica'
  
  // General
  | 'documento'
  | 'notificacion'
  | 'configuracion'
  | 'reporte';

// ✅ TODOS LOS MÓDULOS DEL SISTEMA
export type Modulo = 
  | 'Control Interno'
  | 'Control Disciplinario'
  | 'Gestión Legal'
  | 'Gestión de Usuarios'
  | 'Carpeta Digital'
  | 'Roles y Permisos'
  | 'Graduados'
  | 'Enrolamiento'
  | 'Comunidad'
  | 'Publicaciones'
  | 'Eventos'
  | 'Anuncios'
  | 'Bolsa de Empleo'
  | 'Certificados'
  | 'Certificados Laborales'
  | 'Firma Electrónica'
  | 'Estructura Organizacional'
  | 'Programas Académicos'
  | 'Arquitectura Empresarial'
  | 'Gestión de Passwords'
  | 'Gestión Profesoral'
  | 'Informes'
  | 'Auditoría';

export interface AuditLog {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioEmail: string;
  usuarioRol: string;
  
  accion: TipoAccion;
  accionDescripcion: string; // Descripción legible: "Aprobar Plan Anual 2025"
  
  tabla: TipoEntidad;
  registroId: string;
  registroDescripcion?: string; // Nombre del registro: "Plan Anual 2025", "AUD-2025-001"
  
  cambios: {
    antes?: any;
    despues?: any;
  };
  
  timestamp: string;
  ip?: string;
  userAgent?: string;
  
  // Metadatos adicionales
  modulo?: Modulo;
  criticidad?: 'baja' | 'media' | 'alta' | 'critica';
  
  // Datos adicionales contextuales
  metadata?: {
    navegador?: string;
    dispositivo?: string;
    ubicacion?: string;
    duracion?: number; // ms
    resultado?: 'exito' | 'error' | 'pendiente';
    errorMessage?: string;
  };
}

export interface AuditLogFiltros {
  usuarioId?: string;
  fechaInicio?: string;
  fechaFin?: string;
  accion?: TipoAccion | 'todas';
  tabla?: TipoEntidad | 'todas';
  modulo?: Modulo | 'todos';
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
  modulosMasActivos: { modulo: string; cantidad: number }[];
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
      modulo?: Modulo;
      criticidad?: 'baja' | 'media' | 'alta' | 'critica';
      ip?: string;
      userAgent?: string;
      metadata?: {
        navegador?: string;
        dispositivo?: string;
        ubicacion?: string;
        duracion?: number;
        resultado?: 'exito' | 'error' | 'pendiente';
        errorMessage?: string;
      };
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
      criticidad: opciones?.criticidad || this.determinarCriticidad(accion, tabla),
      metadata: opciones?.metadata
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

    if (filtros.modulo && filtros.modulo !== 'todos') {
      logsFiltrados = logsFiltrados.filter(log => log.modulo === filtros.modulo);
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
        (log.registroDescripcion && log.registroDescripcion.toLowerCase().includes(busqueda)) ||
        (log.modulo && log.modulo.toLowerCase().includes(busqueda))
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

    // Módulos más activos
    const modulosMap = new Map<string, number>();
    logsEnRango.forEach(log => {
      if (log.modulo) {
        const count = modulosMap.get(log.modulo) || 0;
        modulosMap.set(log.modulo, count + 1);
      }
    });
    const modulosMasActivos = Array.from(modulosMap.entries())
      .map(([modulo, cantidad]) => ({ modulo, cantidad }))
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
      modulosMasActivos,
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
    // Acciones críticas (Eliminaciones, rechazos, anulaciones)
    if (['eliminar', 'rechazar', 'anular', 'revocar_certificado', 'revocar_permiso', 'aplicar_sancion'].includes(accion)) {
      return 'critica';
    }
    
    // Acciones altas (Aprobaciones, asignaciones importantes, cambios de estado críticos)
    if (['aprobar', 'validar', 'firmar', 'generar_certificado', 'asignar_rol', 'cerrar_expediente'].includes(accion)) {
      return 'alta';
    }
    
    // Acciones medias (Cambios de estado, asignaciones, actualizaciones importantes)
    if (['cambiar_estado', 'asignar', 'actualizar', 'cargar_documento', 'iniciar_proceso'].includes(accion)) {
      return 'media';
    }
    
    // Tablas críticas (Planes, auditorías, procesos legales/disciplinarios)
    if (['plan_anual', 'auditoria', 'proceso_disciplinario', 'expediente_legal', 'sancion'].includes(tabla)) {
      return 'alta';
    }
    
    // Tablas medias (Hallazgos, planes de mejoramiento, certificados)
    if (['plan_mejoramiento', 'hallazgo', 'certificado', 'firma_digital'].includes(tabla)) {
      return 'media';
    }
    
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
    const headers = ['Timestamp', 'Usuario', 'Email', 'Rol', 'Módulo', 'Acción', 'Descripción', 'Entidad', 'Registro ID', 'Criticidad'];
    const rows = logs.map(log => [
      log.timestamp,
      log.usuarioNombre,
      log.usuarioEmail,
      log.usuarioRol,
      log.modulo || 'N/A',
      log.accion,
      log.accionDescripcion,
      log.tabla,
      log.registroId,
      log.criticidad || 'media'
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }
}

// Exportar instancia singleton
export const auditLogService = new AuditLogService();

export default auditLogService;
