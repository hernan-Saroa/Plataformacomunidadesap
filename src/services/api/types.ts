/**
 * API Types
 * Tipos TypeScript compartidos entre frontend y backend
 */

// ============================================
// AUTENTICACIÓN
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
  sistema?: 'backoffice' | 'portal';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  usuario: {
    id: string;
    email: string;
    nombre: string;
    roles: string[];
    sistema: 'backoffice' | 'portal';
    accesoDual: boolean;
  };
  seleccionarSistema?: boolean;
}

export interface RecuperarPasswordSolicitud {
  email: string;
}

export interface RecuperarPasswordVerificar {
  email: string;
  codigo: string;
}

export interface RecuperarPasswordCambiar {
  token: string;
  passwordNueva: string;
  confirmarPassword: string;
}

// ============================================
// USUARIOS
// ============================================

export interface Usuario {
  id: string;
  personaId: string;
  email: string;
  emailVerified: boolean;
  avatar?: string;
  estado: 'Activo' | 'Inactivo' | 'Suspendido' | 'Bloqueado';
  ultimoAcceso?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Persona {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  nombreCompleto: string;
  fechaNacimiento?: string;
  genero?: string;
  telefonoMovil?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  foto?: string;
}

export interface UsuarioRol {
  id: string;
  usuarioId: string;
  rol: string;
  territorialId?: string;
  regionalId?: string;
  sedeId?: string;
  programaId?: string;
  fechaInicio: string;
  fechaFin?: string;
  activo: boolean;
}

export interface FichaUsuario {
  usuario: Usuario;
  persona: Persona;
  roles: UsuarioRol[];
  historialAcademico?: any[];
  actividadReciente?: any[];
}

export interface CrearUsuarioRequest {
  // Datos personales
  tipoDocumento: string;
  numeroDocumento: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  fechaNacimiento?: string;
  genero?: string;

  // Contacto
  email: string;
  telefonoMovil: string;
  direccion?: string;
  ciudad: string;
  departamento: string;

  // Roles
  roles: {
    rol: string;
    territorialId?: string;
    sedeId?: string;
    programaId?: string;
    fechaInicio: string;
    fechaFin?: string;
  }[];

  // Configuración
  estado: 'Activo' | 'Inactivo';
  enviarEmailBienvenida: boolean;
}

export interface ListarUsuariosParams {
  page?: number;
  limit?: number;
  busqueda?: string;
  estado?: string;
  rol?: string;
  territorialId?: string;
  sedeId?: string;
  ordenarPor?: string;
  direccion?: 'asc' | 'desc';
}

// ============================================
// ESTRUCTURA ORGANIZACIONAL
// ============================================

export interface Territorial {
  id: string;
  codigo: string;
  nombre: string;
  departamento?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  directorNombre?: string;
  directorEmail?: string;
  activa: boolean;
  orden?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sede {
  id: string;
  territorialId: string;
  regionalId?: string;
  codigo: string;
  nombre: string;
  tipo: 'Principal' | 'Subsede' | 'CREAD' | 'Extensión';
  departamento?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  coordenadasLat?: number;
  coordenadasLng?: number;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PROGRAMAS ACADÉMICOS
// ============================================

export interface Programa {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'Pregrado' | 'Especialización' | 'Maestría' | 'Doctorado' | 'Diplomado' | 'Curso';
  nivel?: string;
  modalidad: 'Presencial' | 'Virtual' | 'Híbrido';
  duracionSemestres?: number;
  duracionHoras?: number;
  creditos?: number;
  snies?: string;
  registroCalificado?: string;
  descripcion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CERTIFICADOS
// ============================================

export interface CertificadoGraduado {
  id: string;
  codigoCertificado: string;
  qrCode: string;
  qrImageUrl?: string;
  personaId: string;
  usuarioId: string;
  numeroDocumento: string;
  nombreCompleto: string;
  programaId: string;
  nombrePrograma: string;
  tipoPrograma: string;
  sedeId: string;
  nombreSede: string;
  ciudadSede: string;
  fechaGrado: string;
  fechaExpedicion: string;
  actaGrado?: string;
  folio?: string;
  libro?: string;
  estado: 'Activo' | 'Revocado' | 'Suspendido';
  validacionesCount: number;
  ultimaValidacion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidarCertificadoRequest {
  qrCode?: string;
  codigoCertificado?: string;
  ubicacion?: {
    lat: number;
    lng: number;
  };
}

export interface ValidarCertificadoResponse {
  valido: boolean;
  estado: 'Válido' | 'No Válido' | 'No Encontrado' | 'Revocado';
  certificado?: {
    codigoCertificado: string;
    nombreGraduado: string;
    tipoDocumento: string;
    numeroDocumento: string;
    programa: string;
    tipoPrograma: string;
    sede: string;
    ciudad: string;
    fechaGrado: string;
    fechaExpedicion: string;
    estadoCertificado: string;
  };
  trazabilidad?: {
    numeroValidacion: number;
    fechaValidacion: string;
  };
  mensaje?: string;
  razon?: string;
}

export interface CertificadoLaboral {
  id: string;
  codigoCertificado: string;
  personaId: string;
  numeroDocumento: string;
  nombreCompleto: string;
  emailSolicitante: string;
  cargo: string;
  dependencia: string;
  sedeId?: string;
  tipoContrato?: string;
  fechaIngreso: string;
  fechaRetiro?: string;
  salarioActual?: number;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Generado';
  fechaSolicitud: string;
  fechaAprobacion?: string;
  fechaGeneracion?: string;
  aprobadoPor?: string;
  generadoPor?: string;
  pdfUrl?: string;
  observaciones?: string;
  motivoRechazo?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// VINCULACIONES
// ============================================

export interface Vinculacion {
  id: string;
  folio: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  ciudad: string;
  departamento: string;
  nivelEducativo: string;
  institucionProcedencia?: string;
  programaInteresId?: string;
  nombreProgramaInteres: string;
  sedePreferenciaId?: string;
  nombreSedePreferencia?: string;
  estado: 'Pendiente' | 'En Revisión' | 'Aprobado' | 'Rechazado' | 'Contactado';
  fechaSolicitud: string;
  fechaRespuesta?: string;
  atendidoPor?: string;
  observaciones?: string;
  respuesta?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrearVinculacionRequest {
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  ciudad: string;
  departamento: string;
  nivelEducativo: string;
  institucionProcedencia?: string;
  programaInteresId: string;
  sedePreferenciaId?: string;
  observaciones?: string;
  recaptchaToken: string;
}

// ============================================
// CONVOCATORIAS DOCENTES
// ============================================

export interface ConvocatoriaDocente {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  requisitos: string;
  sedeId?: string;
  territorialId?: string;
  ciudad?: string;
  fechaApertura: string;
  fechaCierre: string;
  tipoContrato?: string;
  dedicacion?: string;
  areasConocimiento?: string[];
  salarioMin?: number;
  salarioMax?: number;
  estado: 'Abierta' | 'Cerrada' | 'Cancelada';
  cupos?: number;
  aplicacionesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AplicacionConvocatoria {
  id: string;
  convocatoriaId: string;
  folio: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  ciudad: string;
  nivelEducativo: string;
  tituloProfesional: string;
  universidadGrado: string;
  anosExperiencia?: number;
  areasExperiencia?: string[];
  hojaVidaUrl?: string;
  diplomasUrl?: string[];
  certificadosUrl?: string[];
  estado: 'Recibida' | 'En Revisión' | 'Preseleccionado' | 'Seleccionado' | 'Descartado';
  fechaAplicacion: string;
  fechaActualizacion?: string;
  revisadoPor?: string;
  puntaje?: number;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PORTAL TRANSACCIONAL
// ============================================

export interface Publicacion {
  id: string;
  usuarioId: string;
  tipo: 'post' | 'evento' | 'anuncio' | 'encuesta';
  contenido: string;
  imagenes?: string[];
  archivos?: any[];
  visibilidad: 'publico' | 'estudiantes' | 'programa' | 'sede';
  programaId?: string;
  sedeId?: string;
  likesCount: number;
  comentariosCount: number;
  compartidosCount: number;
  estado: 'Borrador' | 'Publicado' | 'Archivado' | 'Eliminado' | 'Moderado';
  publicadoAt: string;
  editadoAt?: string;
  eliminadoAt?: string;
  reportesCount: number;
  moderadoPor?: string;
  motivoModeracion?: string;
  createdAt: string;
  updatedAt: string;
  // Datos adicionales del autor
  autor?: {
    id: string;
    nombre: string;
    avatar?: string;
    rol: string;
    programa?: string;
    sede?: string;
  };
  // Interacciones del usuario actual
  usuarioLike?: boolean;
  usuarioGuardado?: boolean;
}

export interface Comentario {
  id: string;
  publicacionId: string;
  usuarioId: string;
  comentarioPadreId?: string;
  contenido: string;
  likesCount: number;
  estado: string;
  publicadoAt: string;
  editadoAt?: string;
  createdAt: string;
  // Datos del autor
  autor?: {
    id: string;
    nombre: string;
    avatar?: string;
    rol: string;
  };
}

export interface Conexion {
  id: string;
  usuario1Id: string;
  usuario2Id: string;
  estado: 'Pendiente' | 'Aceptada' | 'Rechazada';
  fechaSolicitud: string;
  fechaRespuesta?: string;
  mensaje?: string;
  createdAt: string;
  // Datos del otro usuario
  otroUsuario?: {
    id: string;
    nombre: string;
    avatar?: string;
    headline: string;
    programa?: string;
    sede?: string;
  };
}

export interface Notificacion {
  id: string;
  usuarioId: string;
  tipo: 'info' | 'success' | 'warning' | 'error' | 'sistema';
  titulo: string;
  mensaje: string;
  icono?: string;
  accionUrl?: string;
  accionTexto?: string;
  leida: boolean;
  leidaAt?: string;
  archivada: boolean;
  createdAt: string;
}

// ============================================
// DASHBOARD
// ============================================

export interface MetricasSuperiores {
  totalUsuarios: {
    valor: number;
    tendencia: 'up' | 'down' | 'neutral';
    porcentaje: string;
    comparacion: string;
  };
  usuariosActivos: {
    valor: number;
    tendencia: 'up' | 'down' | 'neutral';
    porcentaje: string;
    periodo: string;
  };
  usuariosBloqueados: {
    valor: number;
    alerta: boolean;
  };
  crecimientoMensual: {
    valor: string;
    tendencia: 'up' | 'down' | 'neutral';
  };
}

export interface CrecimientoUsuarios {
  etiquetas: string[];
  series: {
    totalUsuarios: number[];
    nuevosUsuarios: number[];
    usuariosActivos: number[];
  };
}

export interface DistribucionRol {
  rol: string;
  cantidad: number;
  porcentaje: number;
  color: string;
}

export interface ActividadReciente {
  tipo: string;
  descripcion: string;
  usuario: string;
  timestamp: string;
  icono: string;
  color: string;
}
