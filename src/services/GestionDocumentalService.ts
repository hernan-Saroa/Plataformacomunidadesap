/**
 * SERVICIO DE GESTIÓN DOCUMENTAL
 * Integración Fase 1 - Centralización de documentos con RF014
 * Control Interno de Gestión - ESAP
 */

// ============ TIPOS ============

export type TipoDocumento =
  | 'Plan Individual'
  | 'Memorando de Asignación'
  | 'Cronograma'
  | 'Programa de Trabajo'
  | 'Papel de Trabajo'
  | 'Evidencia'
  | 'Lista de Chequeo Aplicada'
  | 'Informe Preliminar'
  | 'Informe Final'
  | 'Ficha de Hallazgo'
  | 'Plan de Mejoramiento'
  | 'Evidencia de Cumplimiento'
  | 'Informe de Ley'
  | 'Acta'
  | 'Comunicación Oficial'
  | 'Otro';

export type EstadoDocumento = 'Borrador' | 'En Revisión' | 'Aprobado' | 'Publicado' | 'Archivado';

export interface Documento {
  id: string;
  nombre: string;
  tipo: TipoDocumento;
  descripcion?: string;
  
  // Archivo
  nombreArchivo: string;
  extension: string;
  tamano: number; // en bytes
  url?: string;
  
  // Ubicación en Gestión Documental (RF014)
  carpetaId: string;
  rutaCarpeta: string;
  
  // Origen
  origenModulo: string;
  origenId?: string;
  
  // Auditoría relacionada
  auditoriaId?: string;
  codigoAuditoria?: string;
  
  // Versionamiento
  version: number;
  versionAnteriorId?: string;
  esUltimaVersion: boolean;
  
  // Estado
  estado: EstadoDocumento;
  
  // Metadata
  creadoPor: string;
  fechaCreacion: string;
  actualizadoPor?: string;
  fechaActualizacion?: string;
  
  // Permisos
  permisos: {
    roles: string[];
    usuarios: string[];
  };
  
  // Sincronización con file server
  sincronizadoFileServer: boolean;
  rutaFileServer?: string; // Ruta en G:
  fechaSincronizacion?: string;
  
  // Tags y búsqueda
  tags: string[];
  palabrasClave: string[];
  
  // Metadata adicional
  metadata?: Record<string, any>;
}

export interface ConfiguracionDocumento {
  nombre: string;
  tipo: TipoDocumento;
  descripcion?: string;
  archivo: File | Blob;
  
  // Ubicación
  carpetaId?: string;
  rutaCarpeta?: string;
  
  // Origen
  origenModulo: string;
  origenId?: string;
  
  // Auditoría
  auditoriaId?: string;
  codigoAuditoria?: string;
  
  // Estado inicial
  estado?: EstadoDocumento;
  
  // Permisos
  roles?: string[];
  usuarios?: string[];
  
  // Tags
  tags?: string[];
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Opciones
  sincronizarFileServer?: boolean;
  notificar?: boolean;
  versionarAutomaticamente?: boolean;
}

export interface ResultadoGuardado {
  exito: boolean;
  documento?: Documento;
  error?: string;
  documentoId?: string;
  url?: string;
  rutaFileServer?: string;
}

// ============ SERVICIO ============

class GestionDocumentalServiceClass {
  private baseUrl = '/api/documentos'; // URL de la API (mock por ahora)
  
  /**
   * Guardar documento en Gestión Documental (RF014)
   * MÉTODO PRINCIPAL - Todos los módulos deben usar este método
   */
  async guardarDocumento(config: ConfiguracionDocumento): Promise<ResultadoGuardado> {
    try {
      // 1. Validar configuración
      this.validarConfiguracion(config);
      
      // 2. Crear documento
      const documento = await this.crearDocumento(config);
      
      // 3. Asignar permisos automáticos
      await this.asignarPermisos(documento, config.roles, config.usuarios);
      
      // 4. Sincronizar con file server G: (si está habilitado)
      if (config.sincronizarFileServer !== false) {
        await this.sincronizarConFileServer(documento);
      }
      
      // 5. Versionar si es necesario
      if (config.versionarAutomaticamente !== false) {
        await this.verificarVersionamiento(documento);
      }
      
      // 6. Notificar (integración con RF015)
      if (config.notificar !== false) {
        await this.notificarGuardado(documento, config.origenModulo);
      }
      
      // 7. Registrar en auditoría si aplica
      if (config.auditoriaId) {
        await this.vincularConAuditoria(documento.id, config.auditoriaId);
      }
      
      return {
        exito: true,
        documento,
        documentoId: documento.id,
        url: documento.url,
        rutaFileServer: documento.rutaFileServer
      };
      
    } catch (error: any) {
      console.error('Error al guardar documento:', error);
      return {
        exito: false,
        error: error.message || 'Error desconocido al guardar documento'
      };
    }
  }
  
  /**
   * Crear documento en el sistema
   */
  private async crearDocumento(config: ConfiguracionDocumento): Promise<Documento> {
    const ahora = new Date().toISOString();
    const nombreArchivo = config.archivo instanceof File ? config.archivo.name : `documento-${Date.now()}.pdf`;
    const extension = nombreArchivo.split('.').pop() || 'pdf';
    const tamano = config.archivo.size || 0;
    
    // Determinar carpeta automáticamente si no se especifica
    const carpetaId = config.carpetaId || await this.determinarCarpeta(config);
    const rutaCarpeta = config.rutaCarpeta || await this.obtenerRutaCarpeta(carpetaId);
    
    const documento: Documento = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nombre: config.nombre,
      tipo: config.tipo,
      descripcion: config.descripcion,
      
      nombreArchivo,
      extension,
      tamano,
      url: undefined, // Se asignará después de subir
      
      carpetaId,
      rutaCarpeta,
      
      origenModulo: config.origenModulo,
      origenId: config.origenId,
      
      auditoriaId: config.auditoriaId,
      codigoAuditoria: config.codigoAuditoria,
      
      version: 1,
      esUltimaVersion: true,
      
      estado: config.estado || 'Borrador',
      
      creadoPor: this.obtenerUsuarioActual(),
      fechaCreacion: ahora.split('T')[0],
      
      permisos: {
        roles: config.roles || [],
        usuarios: config.usuarios || []
      },
      
      sincronizadoFileServer: false,
      
      tags: config.tags || [],
      palabrasClave: this.extraerPalabrasClave(config.nombre, config.descripcion),
      
      metadata: config.metadata || {}
    };
    
    // Simular guardado en base de datos
    await this.guardarEnBD(documento);
    
    // Subir archivo
    const url = await this.subirArchivo(config.archivo, documento.id);
    documento.url = url;
    
    return documento;
  }
  
  /**
   * Asignar permisos automáticos según el tipo de documento
   */
  private async asignarPermisos(
    documento: Documento, 
    rolesAdicionales?: string[], 
    usuariosAdicionales?: string[]
  ): Promise<void> {
    const permisosPorTipo: Record<TipoDocumento, string[]> = {
      'Plan Individual': ['Jefe OCI', 'Auditor Líder', 'Auditor'],
      'Memorando de Asignación': ['Jefe OCI', 'Auditor Líder', 'Responsable Proceso'],
      'Cronograma': ['Jefe OCI', 'Auditor Líder', 'Auditor', 'Responsable Proceso'],
      'Programa de Trabajo': ['Auditor Líder', 'Auditor'],
      'Papel de Trabajo': ['Auditor Líder', 'Auditor'],
      'Evidencia': ['Auditor Líder', 'Auditor', 'Responsable Proceso'],
      'Lista de Chequeo Aplicada': ['Auditor Líder', 'Auditor'],
      'Informe Preliminar': ['Jefe OCI', 'Auditor Líder', 'Responsable Proceso'],
      'Informe Final': ['Jefe OCI', 'Auditor Líder', 'Responsable Proceso', 'Direccion'],
      'Ficha de Hallazgo': ['Jefe OCI', 'Auditor Líder', 'Responsable Proceso'],
      'Plan de Mejoramiento': ['Jefe OCI', 'Auditor Líder', 'Responsable Proceso'],
      'Evidencia de Cumplimiento': ['Jefe OCI', 'Auditor Líder', 'Responsable Proceso'],
      'Informe de Ley': ['Jefe OCI', 'Direccion', 'Entes Externos'],
      'Acta': ['Jefe OCI', 'Auditor Líder', 'Responsable Proceso'],
      'Comunicación Oficial': ['Jefe OCI', 'Direccion'],
      'Otro': ['Jefe OCI']
    };
    
    const rolesBase = permisosPorTipo[documento.tipo] || ['Jefe OCI'];
    documento.permisos.roles = [...new Set([...rolesBase, ...(rolesAdicionales || [])])];
    documento.permisos.usuarios = usuariosAdicionales || [];
  }
  
  /**
   * Sincronizar con file server G:
   */
  private async sincronizarConFileServer(documento: Documento): Promise<void> {
    try {
      // Construir ruta en file server
      const anio = new Date().getFullYear();
      const rutaBase = `G:/Control_Interno/Auditorias/${anio}`;
      
      let rutaCompleta: string;
      
      if (documento.codigoAuditoria) {
        rutaCompleta = `${rutaBase}/${documento.codigoAuditoria}/${documento.tipo}/${documento.nombreArchivo}`;
      } else {
        rutaCompleta = `${rutaBase}/General/${documento.tipo}/${documento.nombreArchivo}`;
      }
      
      // Simular sincronización (en producción sería una llamada a API de file server)
      console.log(`Sincronizando documento con file server: ${rutaCompleta}`);
      
      // Actualizar documento
      documento.sincronizadoFileServer = true;
      documento.rutaFileServer = rutaCompleta;
      documento.fechaSincronizacion = new Date().toISOString().split('T')[0];
      
      await this.actualizarEnBD(documento);
      
    } catch (error) {
      console.error('Error al sincronizar con file server:', error);
      // No lanzar error, solo registrar
    }
  }
  
  /**
   * Verificar si existe versión anterior y crear nueva versión
   */
  private async verificarVersionamiento(documento: Documento): Promise<void> {
    // Buscar documentos con el mismo nombre y auditoría
    const documentosAnteriores = await this.buscarDocumentosAnteriores(
      documento.nombre,
      documento.auditoriaId
    );
    
    if (documentosAnteriores.length > 0) {
      // Marcar versión anterior como no vigente
      const versionAnterior = documentosAnteriores[0];
      versionAnterior.esUltimaVersion = false;
      await this.actualizarEnBD(versionAnterior);
      
      // Actualizar nueva versión
      documento.version = versionAnterior.version + 1;
      documento.versionAnteriorId = versionAnterior.id;
      await this.actualizarEnBD(documento);
    }
  }
  
  /**
   * Notificar guardado del documento (integración con RF015)
   */
  private async notificarGuardado(documento: Documento, origenModulo: string): Promise<void> {
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { notificarConfirmacionRecepcion } = await import('./NotificacionesService');
      
      await notificarConfirmacionRecepcion({
        titulo: 'Documento guardado correctamente',
        mensaje: `El documento "${documento.nombre}" ha sido guardado y sincronizado correctamente.`,
        origenModulo,
        origenId: documento.id,
        datos: {
          nombreDocumento: documento.nombre,
          tipoDocumento: documento.tipo,
          carpeta: documento.rutaCarpeta,
          rutaFileServer: documento.rutaFileServer,
          sincronizado: documento.sincronizadoFileServer
        }
      });
      
    } catch (error) {
      console.error('Error al notificar guardado:', error);
      // No lanzar error
    }
  }
  
  /**
   * Vincular documento con auditoría en el contexto global
   */
  private async vincularConAuditoria(documentoId: string, auditoriaId: string): Promise<void> {
    try {
      // Esta función se llamaría desde el componente usando el contexto
      console.log(`Vinculando documento ${documentoId} con auditoría ${auditoriaId}`);
    } catch (error) {
      console.error('Error al vincular con auditoría:', error);
    }
  }
  
  // ============ MÉTODOS AUXILIARES ============
  
  private validarConfiguracion(config: ConfiguracionDocumento): void {
    if (!config.nombre) throw new Error('El nombre del documento es obligatorio');
    if (!config.tipo) throw new Error('El tipo de documento es obligatorio');
    if (!config.archivo) throw new Error('El archivo es obligatorio');
    if (!config.origenModulo) throw new Error('El módulo de origen es obligatorio');
  }
  
  private async determinarCarpeta(config: ConfiguracionDocumento): Promise<string> {
    // Lógica para determinar carpeta automáticamente
    if (config.auditoriaId) {
      return `carpeta-auditoria-${config.auditoriaId}`;
    }
    return `carpeta-general-${config.origenModulo.toLowerCase().replace(/\s+/g, '-')}`;
  }
  
  private async obtenerRutaCarpeta(carpetaId: string): Promise<string> {
    // Simular obtención de ruta
    return `/Gestión Documental/${carpetaId}`;
  }
  
  private obtenerUsuarioActual(): string {
    // En producción obtendría del contexto de autenticación
    return localStorage.getItem('usuarioActual') || 'Sistema';
  }
  
  private extraerPalabrasClave(nombre: string, descripcion?: string): string[] {
    const texto = `${nombre} ${descripcion || ''}`.toLowerCase();
    const palabras = texto.split(/\s+/).filter(p => p.length > 3);
    return [...new Set(palabras)];
  }
  
  private async guardarEnBD(documento: Documento): Promise<void> {
    // Simular guardado en base de datos
    const documentos = JSON.parse(localStorage.getItem('documentos') || '[]');
    documentos.push(documento);
    localStorage.setItem('documentos', JSON.stringify(documentos));
  }
  
  private async actualizarEnBD(documento: Documento): Promise<void> {
    // Simular actualización en base de datos
    const documentos = JSON.parse(localStorage.getItem('documentos') || '[]');
    const index = documentos.findIndex((d: Documento) => d.id === documento.id);
    if (index !== -1) {
      documentos[index] = documento;
      localStorage.setItem('documentos', JSON.stringify(documentos));
    }
  }
  
  private async subirArchivo(archivo: File | Blob, documentoId: string): Promise<string> {
    // Simular subida de archivo
    // En producción usaría FormData y fetch/axios
    return `/api/archivos/${documentoId}`;
  }
  
  private async buscarDocumentosAnteriores(nombre: string, auditoriaId?: string): Promise<Documento[]> {
    const documentos = JSON.parse(localStorage.getItem('documentos') || '[]');
    return documentos.filter((d: Documento) => 
      d.nombre === nombre && 
      d.auditoriaId === auditoriaId &&
      d.esUltimaVersion
    );
  }
  
  // ============ MÉTODOS PÚBLICOS ADICIONALES ============
  
  /**
   * Obtener documento por ID
   */
  async obtenerDocumento(id: string): Promise<Documento | null> {
    const documentos = JSON.parse(localStorage.getItem('documentos') || '[]');
    return documentos.find((d: Documento) => d.id === id) || null;
  }
  
  /**
   * Obtener documentos de una auditoría
   */
  async obtenerDocumentosAuditoria(auditoriaId: string): Promise<Documento[]> {
    const documentos = JSON.parse(localStorage.getItem('documentos') || '[]');
    return documentos.filter((d: Documento) => d.auditoriaId === auditoriaId);
  }
  
  /**
   * Obtener historial de versiones
   */
  async obtenerVersiones(documentoId: string): Promise<Documento[]> {
    const documentos = JSON.parse(localStorage.getItem('documentos') || '[]');
    const documento = documentos.find((d: Documento) => d.id === documentoId);
    
    if (!documento) return [];
    
    const versiones: Documento[] = [documento];
    let versionAnteriorId = documento.versionAnteriorId;
    
    while (versionAnteriorId) {
      const versionAnterior = documentos.find((d: Documento) => d.id === versionAnteriorId);
      if (versionAnterior) {
        versiones.push(versionAnterior);
        versionAnteriorId = versionAnterior.versionAnteriorId;
      } else {
        break;
      }
    }
    
    return versiones.sort((a, b) => b.version - a.version);
  }
  
  /**
   * Actualizar estado del documento
   */
  async actualizarEstado(id: string, nuevoEstado: EstadoDocumento): Promise<void> {
    const documento = await this.obtenerDocumento(id);
    if (documento) {
      documento.estado = nuevoEstado;
      documento.actualizadoPor = this.obtenerUsuarioActual();
      documento.fechaActualizacion = new Date().toISOString().split('T')[0];
      await this.actualizarEnBD(documento);
    }
  }
}

// Exportar instancia única (Singleton)
export const GestionDocumentalService = new GestionDocumentalServiceClass();

// ============ TIPOS DE EXPORTACIÓN ============

export type { Documento, ConfiguracionDocumento, ResultadoGuardado };
