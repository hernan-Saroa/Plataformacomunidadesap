/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * TIPOS COMPARTIDOS: COMUNIDAD ESAP UNIFICADA
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Tipos únicos para Portal + Backoffice
 * Base de datos unificada en Supabase
 * 
 * FECHA: 7 de Diciembre de 2025
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POSTS DE COMUNIDAD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CommunityPost {
  id: string;
  contenido: string;
  autor_id: string; // FK a users
  autor_nombre: string;
  autor_rol: 'Estudiante' | 'Docente' | 'Administrativo' | 'Graduado';
  autor_foto?: string;
  
  // Contenido multimedia
  imagenes?: string[]; // URLs de imágenes
  archivos?: {
    nombre: string;
    url: string;
    tipo: string;
    tamano: number;
  }[];
  
  // Estado y moderación
  estado: 'Borrador' | 'Publicado' | 'En Revisión' | 'Rechazado' | 'Archivado';
  requiere_moderacion: boolean; // true para Estudiantes, false para Docentes/Admin
  moderado_por?: string; // ID del moderador
  moderado_fecha?: string;
  razon_rechazo?: string;
  
  // Categorización
  categoria: 'General' | 'Académico' | 'Deportes' | 'Cultura' | 'Investigación' | 'Graduados';
  etiquetas: string[];
  
  // Interacciones
  likes: number;
  comentarios: number;
  compartidos: number;
  vistas: number;
  
  // Flags
  es_oficial: boolean; // true si es publicado por Admin/Docente
  es_destacado: boolean;
  permite_comentarios: boolean;
  
  // Timestamps
  fecha_creacion: string;
  fecha_publicacion?: string;
  fecha_actualizacion?: string;
  
  // Auditoría
  created_by: string;
  updated_by?: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  contenido: string;
  autor_id: string;
  autor_nombre: string;
  autor_rol: string;
  autor_foto?: string;
  likes: number;
  fecha_creacion: string;
  editado: boolean;
}

export interface CommunityLike {
  id: string;
  post_id?: string;
  comment_id?: string;
  usuario_id: string;
  fecha_creacion: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVENTOS DE COMUNIDAD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CommunityEvent {
  id: string;
  titulo: string;
  descripcion: string;
  imagen_portada?: string;
  
  // Organizador
  organizador_id: string;
  organizador_nombre: string;
  organizador_tipo: 'Facultad' | 'Dirección' | 'Bienestar' | 'Estudiantes' | 'Otro';
  
  // Fecha y hora
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string;
  hora_fin: string;
  zona_horaria: string;
  
  // Ubicación
  modalidad: 'Presencial' | 'Virtual' | 'Híbrido';
  ubicacion_presencial?: string;
  sede?: string; // Nacional, Territorial, CETAP
  enlace_virtual?: string;
  
  // Categorización
  categoria: 'Académico' | 'Cultural' | 'Deportivo' | 'Social' | 'Conferencia' | 'Taller' | 'Seminario';
  publico_objetivo: ('Estudiantes' | 'Docentes' | 'Administrativos' | 'Graduados' | 'Público General')[];
  
  // Inscripción
  requiere_inscripcion: boolean;
  cupos_maximos?: number;
  cupos_disponibles?: number;
  inscripciones_abiertas: boolean;
  fecha_cierre_inscripcion?: string;
  
  // Estado
  estado: 'Borrador' | 'Publicado' | 'En Curso' | 'Finalizado' | 'Cancelado';
  
  // Interacciones
  asistentes_confirmados: number;
  interesados: number;
  
  // Flags
  es_oficial: boolean;
  es_destacado: boolean;
  
  // Timestamps
  fecha_creacion: string;
  fecha_publicacion?: string;
  fecha_actualizacion?: string;
  
  // Auditoría
  created_by: string;
  updated_by?: string;
}

export interface EventAttendee {
  id: string;
  evento_id: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_rol: string;
  estado: 'Inscrito' | 'Asistió' | 'No Asistió' | 'Cancelado';
  fecha_inscripcion: string;
  fecha_confirmacion?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANUNCIOS OFICIALES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CommunityAnnouncement {
  id: string;
  titulo: string;
  contenido: string;
  resumen?: string;
  imagen_portada?: string;
  
  // Emisor
  emisor_id: string;
  emisor_nombre: string;
  emisor_dependencia: string;
  
  // Tipo y prioridad
  tipo: 'Convocatoria' | 'Comunicado' | 'Aviso' | 'Norma' | 'Evento' | 'Académico';
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Urgente';
  
  // Alcance
  alcance: 'Nacional' | 'Territorial' | 'CETAP' | 'Programa' | 'Facultad';
  territoriales?: string[]; // Si aplica
  cetaps?: string[]; // Si aplica
  programas?: string[]; // Si aplica
  
  // Destinatarios
  dirigido_a: ('Estudiantes' | 'Docentes' | 'Administrativos' | 'Graduados' | 'Aspirantes' | 'Todos')[];
  
  // Vigencia
  fecha_vigencia_inicio: string;
  fecha_vigencia_fin?: string;
  es_permanente: boolean;
  
  // Archivos adjuntos
  archivos?: {
    nombre: string;
    url: string;
    tipo: string;
    tamano: number;
  }[];
  
  // Estado
  estado: 'Borrador' | 'Publicado' | 'Vencido' | 'Archivado';
  
  // Flags
  es_oficial: true; // Siempre true
  aparece_en_inicio: boolean;
  requiere_lectura: boolean; // Si true, se marca como "leído" por cada usuario
  
  // Interacciones
  vistas: number;
  
  // Timestamps
  fecha_creacion: string;
  fecha_publicacion?: string;
  fecha_actualizacion?: string;
  
  // Auditoría
  created_by: string;
  updated_by?: string;
  aprobado_por?: string;
  fecha_aprobacion?: string;
}

export interface AnnouncementRead {
  id: string;
  anuncio_id: string;
  usuario_id: string;
  fecha_lectura: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ESTADÍSTICAS DE COMUNIDAD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CommunityStats {
  posts: {
    total: number;
    publicados: number;
    en_revision: number;
    rechazados: number;
    hoy: number;
    esta_semana: number;
  };
  eventos: {
    total: number;
    proximos: number;
    en_curso: number;
    finalizados: number;
    con_inscripcion: number;
  };
  anuncios: {
    total: number;
    activos: number;
    urgentes: number;
    vencidos: number;
  };
  interacciones: {
    total_likes: number;
    total_comentarios: number;
    total_compartidos: number;
    usuarios_activos: number;
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FILTROS Y OPCIONES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CommunityFilters {
  categoria?: string;
  estado?: string;
  autor_rol?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  busqueda?: string;
  solo_oficiales?: boolean;
  solo_destacados?: boolean;
}

export interface EventFilters {
  categoria?: string;
  modalidad?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  publico_objetivo?: string;
  estado?: string;
  busqueda?: string;
}

export interface AnnouncementFilters {
  tipo?: string;
  prioridad?: string;
  alcance?: string;
  dirigido_a?: string;
  estado?: string;
  solo_vigentes?: boolean;
  busqueda?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACCIONES Y RESPUESTAS DE API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CreatePostRequest {
  contenido: string;
  categoria: string;
  etiquetas: string[];
  imagenes?: File[];
  archivos?: File[];
  permite_comentarios: boolean;
}

export interface CreateEventRequest {
  titulo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string;
  hora_fin: string;
  modalidad: string;
  ubicacion_presencial?: string;
  enlace_virtual?: string;
  categoria: string;
  publico_objetivo: string[];
  requiere_inscripcion: boolean;
  cupos_maximos?: number;
}

export interface CreateAnnouncementRequest {
  titulo: string;
  contenido: string;
  resumen?: string;
  tipo: string;
  prioridad: string;
  alcance: string;
  dirigido_a: string[];
  fecha_vigencia_inicio: string;
  fecha_vigencia_fin?: string;
  es_permanente: boolean;
  aparece_en_inicio: boolean;
  requiere_lectura: boolean;
  archivos?: File[];
}

export interface ModeratePostRequest {
  accion: 'aprobar' | 'rechazar';
  razon_rechazo?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTIFICACIONES DE COMUNIDAD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CommunityNotification {
  id: string;
  tipo: 'post_aprobado' | 'post_rechazado' | 'comentario_nuevo' | 'like_recibido' | 'evento_proximo' | 'anuncio_nuevo';
  titulo: string;
  mensaje: string;
  referencia_id: string; // ID del post/evento/anuncio
  referencia_tipo: 'post' | 'evento' | 'anuncio' | 'comentario';
  usuario_id: string;
  leida: boolean;
  fecha_creacion: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT DEFAULT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default {
  // Types are exported individually
};
