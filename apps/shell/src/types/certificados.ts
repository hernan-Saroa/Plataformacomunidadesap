/**
 * Tipos TypeScript - Módulo de Certificados Laborales
 * 
 * Estos tipos deben coincidir exactamente con los modelos del backend
 */

// ============================================================================
// RESPUESTAS PAGINADAS
// ============================================================================

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
}

// ============================================================================
// SOLICITUDES DE CERTIFICADOS
// ============================================================================

export interface SolicitudCertificado {
  id: string;
  codigo: string;
  empleadoId: string;
  empleadoNombre: string;
  empleadoDocumento: string;
  empleadoCargo: string;
  empleadoDependencia: string;
  tipoSolicitud: 'laboral' | 'salario' | 'tiempo_servicio' | 'prestaciones';
  motivo?: string;
  entidadDestino?: string;
  observaciones?: string;
  estado: 'pendiente' | 'en_revision' | 'aprobada' | 'rechazada' | 'cancelada' | 'procesada';
  fechaSolicitud: string;
  fechaRevision?: string;
  fechaAprobacion?: string;
  revisadoPor?: string;
  aprobadoPor?: string;
  motivoRechazo?: string;
  prioridad: 'normal' | 'alta' | 'urgente';
  certificadoId?: string;
  diasPendientes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSolicitudRequest {
  empleadoId: string;
  tipoSolicitud: string;
  motivo?: string;
  entidadDestino?: string;
  observaciones?: string;
  prioridad?: string;
}

export interface UpdateSolicitudRequest extends Partial<CreateSolicitudRequest> {
  estado?: string;
}

// ============================================================================
// CERTIFICADOS
// ============================================================================

export interface Certificado {
  id: string;
  codigo: string;
  codigoVerificacion: string;
  solicitudId?: string;
  empleadoId: string;
  empleadoNombre: string;
  empleadoDocumentoTipo: string;
  empleadoDocumentoNumero: string;
  empleadoCargo: string;
  empleadoDependencia: string;
  empleadoFechaIngreso: string;
  empleadoFechaRetiro?: string;
  empleadoSalario?: number;
  empleadoTipoContrato: string;
  tipoCertificado: 'laboral' | 'salario' | 'tiempo_servicio' | 'prestaciones';
  plantillaId: string;
  plantillaNombre: string;
  contenido: string;
  entidadDestino?: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  vigente: boolean;
  estado: 'activo' | 'anulado' | 'vencido';
  motivoAnulacion?: string;
  firmantes: Firmante[];
  qrCode: string;
  urlPublica: string;
  archivoUrl: string;
  validacionesCount: number;
  generadoPor: string;
  anuladoPor?: string;
  fechaAnulacion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CertificadoDetalle extends Certificado {
  solicitud?: SolicitudCertificado;
  empleado: EmpleadoCertificado;
  plantilla: PlantillaCertificado;
  validaciones: ValidacionCertificado[];
  historial: HistorialCertificado[];
}

export interface EmpleadoCertificado {
  id: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  documentoTipo: string;
  documentoNumero: string;
  cargo: string;
  dependencia: string;
  territorial: string;
  tipoContrato: string;
  fechaIngreso: string;
  fechaRetiro?: string;
  estado: string;
  salarioBasico?: number;
  email?: string;
}

export interface Firmante {
  id: string;
  nombre: string;
  cargo: string;
  dependencia: string;
  tipoFirma: 'fisica' | 'digital' | 'mecanica';
  firmaUrl?: string;
  selloUrl?: string;
  orden: number;
  activo: boolean;
}

export interface GenerarCertificadoRequest {
  solicitudId?: string;
  empleadoId: string;
  tipoCertificado: string;
  plantillaId: string;
  entidadDestino?: string;
  datosAdicionales?: Record<string, any>;
  firmantes?: string[];
  fechaVencimiento?: string;
}

// ============================================================================
// VALIDACIÓN DE CERTIFICADOS
// ============================================================================

export interface ValidacionCertificado {
  id: string;
  certificadoId: string;
  certificadoCodigo: string;
  metodoValidacion: 'codigo' | 'qr' | 'url';
  resultado: 'valido' | 'invalido' | 'vencido' | 'anulado';
  mensaje: string;
  certificadoData?: {
    codigo: string;
    empleadoNombre: string;
    empleadoCargo: string;
    empleadoDependencia: string;
    fechaEmision: string;
    fechaVencimiento?: string;
    estado: string;
  };
  validadoPor?: string;
  ipAddress?: string;
  userAgent?: string;
  ubicacion?: {
    pais?: string;
    ciudad?: string;
    coordenadas?: {
      lat: number;
      lng: number;
    };
  };
  fechaValidacion: string;
  duracionMs: number;
}

export interface ValidacionQRResponse {
  valido: boolean;
  resultado: 'valido' | 'invalido' | 'vencido' | 'anulado';
  mensaje: string;
  certificado?: {
    codigo: string;
    empleadoNombre: string;
    empleadoDocumento: string;
    empleadoCargo: string;
    empleadoDependencia: string;
    fechaEmision: string;
    fechaVencimiento?: string;
    estado: string;
    firmantes: {
      nombre: string;
      cargo: string;
    }[];
  };
  urlDetalle?: string;
}

export interface HistorialValidaciones {
  id: string;
  certificadoId: string;
  certificadoCodigo: string;
  empleadoNombre: string;
  metodo: string;
  resultado: string;
  fecha: string;
  ipAddress?: string;
  ubicacion?: string;
}

// ============================================================================
// PLANTILLAS
// ============================================================================

export interface PlantillaCertificado {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo: 'laboral' | 'salario' | 'tiempo_servicio' | 'prestaciones' | 'personalizada';
  contenidoHTML: string;
  variables: VariablePlantilla[];
  estilos: string;
  encabezado?: string;
  piePagina?: string;
  marcaAgua?: string;
  logoUrl?: string;
  tamañoPagina: 'carta' | 'oficio' | 'a4';
  orientacion: 'vertical' | 'horizontal';
  margenes: {
    superior: number;
    inferior: number;
    izquierdo: number;
    derecho: number;
  };
  firmantes: string[];
  requiereAprobacion: boolean;
  validezDias?: number;
  activa: boolean;
  version: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VariablePlantilla {
  nombre: string;
  descripcion: string;
  tipo: 'texto' | 'numero' | 'fecha' | 'boolean' | 'lista';
  requerida: boolean;
  valorDefecto?: any;
  formato?: string;
  validacion?: {
    patron?: string;
    minimo?: number;
    maximo?: number;
    opciones?: string[];
  };
}

export interface CreatePlantillaRequest {
  codigo?: string;
  nombre: string;
  descripcion?: string;
  tipo: string;
  contenidoHTML: string;
  variables?: VariablePlantilla[];
  estilos?: string;
  encabezado?: string;
  piePagina?: string;
  marcaAgua?: string;
  logoUrl?: string;
  tamañoPagina?: string;
  orientacion?: string;
  margenes?: any;
  firmantes?: string[];
  requiereAprobacion?: boolean;
  validezDias?: number;
}

// ============================================================================
// HISTORIAL
// ============================================================================

export interface HistorialCertificado {
  id: string;
  certificadoId: string;
  accion: 'creacion' | 'modificacion' | 'anulacion' | 'regeneracion' | 'validacion';
  descripcion: string;
  realizadoPor: string;
  realizadoPorNombre: string;
  datosAntes?: any;
  datosDespues?: any;
  motivo?: string;
  ipAddress?: string;
  fecha: string;
}

// ============================================================================
// ESTADÍSTICAS
// ============================================================================

export interface EstadisticasCertificados {
  periodo?: {
    fechaInicio: string;
    fechaFin: string;
  };
  totales: {
    solicitudes: number;
    certificadosGenerados: number;
    certificadosActivos: number;
    certificadosAnulados: number;
    validaciones: number;
  };
  porTipo: Record<string, number>;
  porEstado: Record<string, number>;
  tiempoPromedio: {
    solicitudAprobacion: number;
    aprobacionGeneracion: number;
    procesoCompleto: number;
  };
  tendencias: {
    solicitudesPorDia: Record<string, number>;
    certificadosPorDia: Record<string, number>;
    validacionesPorDia: Record<string, number>;
  };
  topEmpleados: {
    empleadoId: string;
    empleadoNombre: string;
    totalCertificados: number;
  }[];
  topDependencias: {
    dependencia: string;
    totalCertificados: number;
  }[];
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export interface ConfiguracionCertificados {
  id: string;
  general: {
    prefijocodigo: string;
    longitudCodigo: number;
    validezDiasPorDefecto: number;
    requiereAprobacionDefault: boolean;
    permitirDescarga: boolean;
    habilitarQR: boolean;
  };
  notificaciones: {
    enviarEmailSolicitud: boolean;
    enviarEmailAprobacion: boolean;
    enviarEmailGeneracion: boolean;
    plantillaEmail: string;
  };
  validacion: {
    permitirValidacionPublica: boolean;
    registrarIP: boolean;
    registrarUbicacion: boolean;
    limiteValidacionesDiarias: number;
  };
  seguridad: {
    marcaAguaDefault: string;
    encriptarPDFs: boolean;
    passwordPDFDefault?: string;
    firmaDigitalHabilitada: boolean;
  };
  plantillaDefault: {
    laboral: string;
    salario: string;
    tiempo_servicio: string;
    prestaciones: string;
  };
  firmantes: Firmante[];
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// FILTROS
// ============================================================================

export interface FiltrosCertificados {
  page?: number;
  pageSize?: number;
  search?: string;
  tipoCertificado?: string;
  tipoSolicitud?: string;
  estado?: string;
  estadoSolicitud?: string;
  empleadoId?: string;
  dependencia?: string;
  territorial?: string;
  fechaEmisionInicio?: string;
  fechaEmisionFin?: string;
  fechaSolicitudInicio?: string;
  fechaSolicitudFin?: string;
  vigente?: boolean;
  metodoValidacion?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}
