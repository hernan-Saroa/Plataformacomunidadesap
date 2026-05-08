/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SERVICIO UNIFICADO: COMUNIDAD ESAP
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * API centralizada para Posts, Eventos y Anuncios
 * Compartida entre Portal Transaccional y Backoffice
 * 
 * ARQUITECTURA:
 * - Portal usa este servicio para mostrar contenido
 * - Backoffice usa este servicio para gestionar/moderar
 * - Base de datos única en Supabase
 * - WebSocket para actualizaciones en tiempo real (próximamente)
 * 
 * FECHA: 7 de Diciembre de 2025
 */

import type {
  CommunityPost,
  CommunityEvent,
  CommunityAnnouncement,
  CommunityComment,
  CommunityStats,
  CommunityFilters,
  EventFilters,
  AnnouncementFilters,
  CreatePostRequest,
  CreateEventRequest,
  CreateAnnouncementRequest,
  ModeratePostRequest,
  ApiResponse,
  PaginatedResponse
} from '../../types/community.types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURACIÓN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const API_BASE_URL = '/api/community'; // En producción: proceso.env.NEXT_PUBLIC_API_URL
const USE_MOCK_DATA = true; // Cambiar a false cuando Supabase esté conectado

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOCK DATA (Simulación hasta conectar Supabase)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let MOCK_POSTS: CommunityPost[] = [
  {
    id: '1',
    contenido: '¡Bienvenidos al nuevo Portal Transaccional de ESAP! 🎓 Aquí podrán compartir experiencias, conocimiento y conectarse con toda la comunidad universitaria.',
    autor_id: 'user-001',
    autor_nombre: 'Rector ESAP',
    autor_rol: 'Administrativo',
    estado: 'Publicado',
    requiere_moderacion: false,
    categoria: 'General',
    etiquetas: ['bienvenida', 'comunidad'],
    likes: 245,
    comentarios: 38,
    compartidos: 12,
    vistas: 1250,
    es_oficial: true,
    es_destacado: true,
    permite_comentarios: true,
    fecha_creacion: '2025-12-01T10:00:00Z',
    fecha_publicacion: '2025-12-01T10:00:00Z',
    created_by: 'user-001'
  },
  {
    id: '2',
    contenido: '¿Alguien más está emocionado por el nuevo sistema de matrículas en línea? Ya no más filas! 😄',
    autor_id: 'user-002',
    autor_nombre: 'María González',
    autor_rol: 'Estudiante',
    estado: 'Publicado',
    requiere_moderacion: true,
    categoria: 'Académico',
    etiquetas: ['matriculas', 'tecnologia'],
    likes: 89,
    comentarios: 15,
    compartidos: 3,
    vistas: 450,
    es_oficial: false,
    es_destacado: false,
    permite_comentarios: true,
    fecha_creacion: '2025-12-03T14:30:00Z',
    fecha_publicacion: '2025-12-03T15:00:00Z',
    created_by: 'user-002'
  },
  {
    id: '3',
    contenido: 'Investigación en progreso sobre transformación digital en el sector público. ¿Alguien interesado en colaborar?',
    autor_id: 'user-003',
    autor_nombre: 'Dr. Carlos Rodríguez',
    autor_rol: 'Docente',
    estado: 'Publicado',
    requiere_moderacion: false,
    categoria: 'Investigación',
    etiquetas: ['investigacion', 'digital', 'colaboracion'],
    likes: 56,
    comentarios: 8,
    compartidos: 5,
    vistas: 320,
    es_oficial: false,
    es_destacado: false,
    permite_comentarios: true,
    fecha_creacion: '2025-12-05T09:15:00Z',
    fecha_publicacion: '2025-12-05T09:15:00Z',
    created_by: 'user-003'
  }
];

let MOCK_EVENTS: CommunityEvent[] = [
  {
    id: 'evt-001',
    titulo: 'Foro de Innovación en Administración Pública 2026',
    descripcion: 'Evento académico donde expertos nacionales e internacionales compartirán tendencias en gestión pública, transformación digital y políticas públicas innovadoras.',
    imagen_portada: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    organizador_id: 'user-001',
    organizador_nombre: 'Vicerrectoría Académica',
    organizador_tipo: 'Dirección',
    fecha_inicio: '2026-02-15',
    fecha_fin: '2026-02-17',
    hora_inicio: '08:00',
    hora_fin: '18:00',
    zona_horaria: 'America/Bogota',
    modalidad: 'Híbrido',
    ubicacion_presencial: 'Auditorio Principal - Sede Nacional',
    sede: 'Nacional',
    enlace_virtual: 'https://zoom.us/j/123456789',
    categoria: 'Conferencia',
    publico_objetivo: ['Estudiantes', 'Docentes', 'Graduados', 'Público General'],
    requiere_inscripcion: true,
    cupos_maximos: 500,
    cupos_disponibles: 387,
    inscripciones_abiertas: true,
    fecha_cierre_inscripcion: '2026-02-10',
    estado: 'Publicado',
    asistentes_confirmados: 113,
    interesados: 245,
    es_oficial: true,
    es_destacado: true,
    fecha_creacion: '2025-11-20T10:00:00Z',
    fecha_publicacion: '2025-11-25T10:00:00Z',
    created_by: 'user-001'
  },
  {
    id: 'evt-002',
    titulo: 'Taller de Excel Avanzado para Análisis de Datos',
    descripcion: 'Aprende técnicas avanzadas de Excel para análisis estadístico y visualización de datos aplicados a la gestión pública.',
    organizador_id: 'user-010',
    organizador_nombre: 'Bienestar Universitario',
    organizador_tipo: 'Bienestar',
    fecha_inicio: '2025-12-15',
    fecha_fin: '2025-12-15',
    hora_inicio: '14:00',
    hora_fin: '17:00',
    zona_horaria: 'America/Bogota',
    modalidad: 'Virtual',
    enlace_virtual: 'https://meet.google.com/abc-defg-hij',
    categoria: 'Taller',
    publico_objetivo: ['Estudiantes', 'Docentes'],
    requiere_inscripcion: true,
    cupos_maximos: 50,
    cupos_disponibles: 12,
    inscripciones_abiertas: true,
    fecha_cierre_inscripcion: '2025-12-14',
    estado: 'Publicado',
    asistentes_confirmados: 38,
    interesados: 67,
    es_oficial: true,
    es_destacado: false,
    fecha_creacion: '2025-11-30T09:00:00Z',
    fecha_publicacion: '2025-12-01T09:00:00Z',
    created_by: 'user-010'
  }
];

let MOCK_ANNOUNCEMENTS: CommunityAnnouncement[] = [
  {
    id: 'ann-001',
    titulo: 'Convocatoria: Becas de Maestría 2026',
    contenido: 'La ESAP anuncia la apertura de la convocatoria para becas de maestría 2026. Se otorgarán 50 becas completas para programas de maestría en Gestión Pública, Políticas Públicas y Gobierno Digital.\n\nRequisitos:\n- Ser graduado ESAP\n- Promedio mínimo 4.0/5.0\n- Proyecto de investigación\n\nInscripciones hasta el 31 de enero de 2026.',
    resumen: 'Convocatoria de 50 becas completas para maestría en ESAP. Inscripciones hasta enero 31.',
    emisor_id: 'user-admin',
    emisor_nombre: 'Vicerrectoría Académica',
    emisor_dependencia: 'Vicerrectoría Académica',
    tipo: 'Convocatoria',
    prioridad: 'Alta',
    alcance: 'Nacional',
    dirigido_a: ['Graduados', 'Estudiantes'],
    fecha_vigencia_inicio: '2025-12-07',
    fecha_vigencia_fin: '2026-01-31',
    es_permanente: false,
    estado: 'Publicado',
    es_oficial: true,
    aparece_en_inicio: true,
    requiere_lectura: true,
    vistas: 1850,
    fecha_creacion: '2025-12-06T08:00:00Z',
    fecha_publicacion: '2025-12-07T08:00:00Z',
    created_by: 'user-admin',
    aprobado_por: 'user-rector',
    fecha_aprobacion: '2025-12-06T16:00:00Z'
  },
  {
    id: 'ann-002',
    titulo: 'Comunicado: Calendario Académico 2026',
    contenido: 'Se publica el calendario académico oficial para el año 2026.\n\nPeriodo I: Febrero 10 - Mayo 30\nPeriodo II: Junio 15 - Septiembre 30\nPeriodo III: Octubre 15 - Diciembre 20\n\nVer calendario completo en el portal.',
    resumen: '3 periodos académicos en 2026. Consulta fechas importantes.',
    emisor_id: 'user-admin',
    emisor_nombre: 'Registro y Control Académico',
    emisor_dependencia: 'Registro y Control',
    tipo: 'Comunicado',
    prioridad: 'Media',
    alcance: 'Nacional',
    dirigido_a: ['Estudiantes', 'Docentes', 'Administrativos'],
    fecha_vigencia_inicio: '2025-12-05',
    es_permanente: true,
    estado: 'Publicado',
    es_oficial: true,
    aparece_en_inicio: true,
    requiere_lectura: false,
    vistas: 3420,
    fecha_creacion: '2025-12-04T10:00:00Z',
    fecha_publicacion: '2025-12-05T10:00:00Z',
    created_by: 'user-admin',
    aprobado_por: 'user-rector',
    fecha_aprobacion: '2025-12-05T09:00:00Z'
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SERVICIO DE POSTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CommunityPostsService = {
  /**
   * Obtener todos los posts (con filtros y paginación)
   */
  async getPosts(
    filters?: CommunityFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<CommunityPost>> {
    if (USE_MOCK_DATA) {
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let filteredPosts = [...MOCK_POSTS];
      
      // Aplicar filtros
      if (filters?.categoria) {
        filteredPosts = filteredPosts.filter(p => p.categoria === filters.categoria);
      }
      if (filters?.estado) {
        filteredPosts = filteredPosts.filter(p => p.estado === filters.estado);
      }
      if (filters?.autor_rol) {
        filteredPosts = filteredPosts.filter(p => p.autor_rol === filters.autor_rol);
      }
      if (filters?.busqueda) {
        const query = filters.busqueda.toLowerCase();
        filteredPosts = filteredPosts.filter(p => 
          p.contenido.toLowerCase().includes(query) ||
          p.autor_nombre.toLowerCase().includes(query) ||
          p.etiquetas.some(e => e.toLowerCase().includes(query))
        );
      }
      if (filters?.solo_oficiales) {
        filteredPosts = filteredPosts.filter(p => p.es_oficial);
      }
      if (filters?.solo_destacados) {
        filteredPosts = filteredPosts.filter(p => p.es_destacado);
      }
      
      // Ordenar por fecha (más recientes primero)
      filteredPosts.sort((a, b) => 
        new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
      );
      
      // Paginación
      const total = filteredPosts.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedPosts = filteredPosts.slice(start, end);
      
      return {
        data: paginatedPosts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    }
    
    // Cuando Supabase esté conectado:
    // const response = await fetch(`${API_BASE_URL}/posts?${new URLSearchParams(filters as any)}`);
    // return response.json();
    
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  },

  /**
   * Obtener un post por ID
   */
  async getPostById(id: string): Promise<ApiResponse<CommunityPost>> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const post = MOCK_POSTS.find(p => p.id === id);
      if (post) {
        return { success: true, data: post };
      }
      return { success: false, error: 'Post no encontrado' };
    }
    
    // const response = await fetch(`${API_BASE_URL}/posts/${id}`);
    // return response.json();
    
    return { success: false, error: 'Not implemented' };
  },

  /**
   * Crear un nuevo post
   */
  async createPost(request: CreatePostRequest, userId: string): Promise<ApiResponse<CommunityPost>> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newPost: CommunityPost = {
        id: `post-${Date.now()}`,
        contenido: request.contenido,
        autor_id: userId,
        autor_nombre: 'Usuario Actual', // En producción viene del contexto
        autor_rol: 'Estudiante', // En producción viene del contexto
        estado: 'En Revisión', // Los estudiantes requieren moderación
        requiere_moderacion: true,
        categoria: request.categoria as any,
        etiquetas: request.etiquetas,
        likes: 0,
        comentarios: 0,
        compartidos: 0,
        vistas: 0,
        es_oficial: false,
        es_destacado: false,
        permite_comentarios: request.permite_comentarios,
        fecha_creacion: new Date().toISOString(),
        created_by: userId
      };
      
      MOCK_POSTS.unshift(newPost);
      
      return { 
        success: true, 
        data: newPost,
        message: 'Post creado exitosamente. Está en revisión por moderadores.' 
      };
    }
    
    // const response = await fetch(`${API_BASE_URL}/posts`, {
    //   method: 'POST',
    //   body: JSON.stringify(request),
    //   headers: { 'Content-Type': 'application/json' }
    // });
    // return response.json();
    
    return { success: false, error: 'Not implemented' };
  },

  /**
   * Moderar un post (aprobar/rechazar)
   */
  async moderatePost(
    postId: string, 
    request: ModeratePostRequest,
    moderatorId: string
  ): Promise<ApiResponse<CommunityPost>> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const postIndex = MOCK_POSTS.findIndex(p => p.id === postId);
      if (postIndex === -1) {
        return { success: false, error: 'Post no encontrado' };
      }
      
      const post = MOCK_POSTS[postIndex];
      post.estado = request.accion === 'aprobar' ? 'Publicado' : 'Rechazado';
      post.moderado_por = moderatorId;
      post.moderado_fecha = new Date().toISOString();
      if (request.accion === 'rechazar') {
        post.razon_rechazo = request.razon_rechazo;
      } else {
        post.fecha_publicacion = new Date().toISOString();
      }
      
      return { 
        success: true, 
        data: post,
        message: `Post ${request.accion === 'aprobar' ? 'aprobado' : 'rechazado'} exitosamente` 
      };
    }
    
    return { success: false, error: 'Not implemented' };
  },

  /**
   * Dar like a un post
   */
  async likePost(postId: string, userId: string): Promise<ApiResponse<void>> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const post = MOCK_POSTS.find(p => p.id === postId);
      if (post) {
        post.likes += 1;
        return { success: true, message: 'Like agregado' };
      }
      return { success: false, error: 'Post no encontrado' };
    }
    
    return { success: false, error: 'Not implemented' };
  },

  /**
   * Eliminar un post
   */
  async deletePost(postId: string, userId: string): Promise<ApiResponse<void>> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const index = MOCK_POSTS.findIndex(p => p.id === postId);
      if (index !== -1) {
        MOCK_POSTS.splice(index, 1);
        return { success: true, message: 'Post eliminado' };
      }
      return { success: false, error: 'Post no encontrado' };
    }
    
    return { success: false, error: 'Not implemented' };
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SERVICIO DE EVENTOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CommunityEventsService = {
  async getEvents(filters?: EventFilters, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<CommunityEvent>> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let filteredEvents = [...MOCK_EVENTS];
      
      if (filters?.categoria) {
        filteredEvents = filteredEvents.filter(e => e.categoria === filters.categoria);
      }
      if (filters?.modalidad) {
        filteredEvents = filteredEvents.filter(e => e.modalidad === filters.modalidad);
      }
      if (filters?.estado) {
        filteredEvents = filteredEvents.filter(e => e.estado === filters.estado);
      }
      if (filters?.busqueda) {
        const query = filters.busqueda.toLowerCase();
        filteredEvents = filteredEvents.filter(e => 
          e.titulo.toLowerCase().includes(query) ||
          e.descripcion.toLowerCase().includes(query)
        );
      }
      
      filteredEvents.sort((a, b) => 
        new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
      );
      
      const total = filteredEvents.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      
      return {
        data: filteredEvents.slice(start, end),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    }
    
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  },

  async createEvent(request: CreateEventRequest, userId: string): Promise<ApiResponse<CommunityEvent>> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newEvent: CommunityEvent = {
        id: `evt-${Date.now()}`,
        ...request as any,
        organizador_id: userId,
        organizador_nombre: 'Usuario Actual',
        organizador_tipo: 'Otro',
        zona_horaria: 'America/Bogota',
        cupos_disponibles: request.cupos_maximos || 0,
        inscripciones_abiertas: true,
        estado: 'Publicado',
        asistentes_confirmados: 0,
        interesados: 0,
        es_oficial: false,
        es_destacado: false,
        fecha_creacion: new Date().toISOString(),
        fecha_publicacion: new Date().toISOString(),
        created_by: userId
      };
      
      MOCK_EVENTS.unshift(newEvent);
      
      return { success: true, data: newEvent, message: 'Evento creado exitosamente' };
    }
    
    return { success: false, error: 'Not implemented' };
  },

  async registerToEvent(eventId: string, userId: string): Promise<ApiResponse<void>> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const event = MOCK_EVENTS.find(e => e.id === eventId);
      if (event && event.cupos_disponibles && event.cupos_disponibles > 0) {
        event.asistentes_confirmados += 1;
        event.cupos_disponibles -= 1;
        return { success: true, message: 'Inscripción exitosa' };
      }
      return { success: false, error: 'No hay cupos disponibles' };
    }
    
    return { success: false, error: 'Not implemented' };
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SERVICIO DE ANUNCIOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CommunityAnnouncementsService = {
  async getAnnouncements(filters?: AnnouncementFilters, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<CommunityAnnouncement>> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let filteredAnnouncements = [...MOCK_ANNOUNCEMENTS];
      
      if (filters?.tipo) {
        filteredAnnouncements = filteredAnnouncements.filter(a => a.tipo === filters.tipo);
      }
      if (filters?.prioridad) {
        filteredAnnouncements = filteredAnnouncements.filter(a => a.prioridad === filters.prioridad);
      }
      if (filters?.solo_vigentes) {
        const now = new Date().toISOString();
        filteredAnnouncements = filteredAnnouncements.filter(a => 
          a.es_permanente || (a.fecha_vigencia_fin && a.fecha_vigencia_fin > now)
        );
      }
      if (filters?.busqueda) {
        const query = filters.busqueda.toLowerCase();
        filteredAnnouncements = filteredAnnouncements.filter(a => 
          a.titulo.toLowerCase().includes(query) ||
          a.contenido.toLowerCase().includes(query)
        );
      }
      
      filteredAnnouncements.sort((a, b) => 
        new Date(b.fecha_publicacion || b.fecha_creacion).getTime() - 
        new Date(a.fecha_publicacion || a.fecha_creacion).getTime()
      );
      
      const total = filteredAnnouncements.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      
      return {
        data: filteredAnnouncements.slice(start, end),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    }
    
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  },

  async createAnnouncement(request: CreateAnnouncementRequest, userId: string): Promise<ApiResponse<CommunityAnnouncement>> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newAnnouncement: CommunityAnnouncement = {
        id: `ann-${Date.now()}`,
        ...request as any,
        emisor_id: userId,
        emisor_nombre: 'Usuario Actual',
        emisor_dependencia: 'Dependencia',
        estado: 'Borrador',
        es_oficial: true,
        vistas: 0,
        fecha_creacion: new Date().toISOString(),
        created_by: userId
      };
      
      MOCK_ANNOUNCEMENTS.unshift(newAnnouncement);
      
      return { success: true, data: newAnnouncement, message: 'Anuncio creado exitosamente' };
    }
    
    return { success: false, error: 'Not implemented' };
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SERVICIO DE ESTADÍSTICAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CommunityStatsService = {
  async getStats(): Promise<ApiResponse<CommunityStats>> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const stats: CommunityStats = {
        posts: {
          total: MOCK_POSTS.length,
          publicados: MOCK_POSTS.filter(p => p.estado === 'Publicado').length,
          en_revision: MOCK_POSTS.filter(p => p.estado === 'En Revisión').length,
          rechazados: MOCK_POSTS.filter(p => p.estado === 'Rechazado').length,
          hoy: MOCK_POSTS.filter(p => {
            const today = new Date().toISOString().split('T')[0];
            return p.fecha_creacion.startsWith(today);
          }).length,
          esta_semana: MOCK_POSTS.filter(p => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(p.fecha_creacion) > weekAgo;
          }).length
        },
        eventos: {
          total: MOCK_EVENTS.length,
          proximos: MOCK_EVENTS.filter(e => new Date(e.fecha_inicio) > new Date()).length,
          en_curso: MOCK_EVENTS.filter(e => e.estado === 'En Curso').length,
          finalizados: MOCK_EVENTS.filter(e => e.estado === 'Finalizado').length,
          con_inscripcion: MOCK_EVENTS.filter(e => e.requiere_inscripcion).length
        },
        anuncios: {
          total: MOCK_ANNOUNCEMENTS.length,
          activos: MOCK_ANNOUNCEMENTS.filter(a => a.estado === 'Publicado').length,
          urgentes: MOCK_ANNOUNCEMENTS.filter(a => a.prioridad === 'Urgente').length,
          vencidos: MOCK_ANNOUNCEMENTS.filter(a => {
            if (a.es_permanente) return false;
            if (!a.fecha_vigencia_fin) return false;
            return new Date(a.fecha_vigencia_fin) < new Date();
          }).length
        },
        interacciones: {
          total_likes: MOCK_POSTS.reduce((sum, p) => sum + p.likes, 0),
          total_comentarios: MOCK_POSTS.reduce((sum, p) => sum + p.comentarios, 0),
          total_compartidos: MOCK_POSTS.reduce((sum, p) => sum + p.compartidos, 0),
          usuarios_activos: 1250 // Simulado
        }
      };
      
      return { success: true, data: stats };
    }
    
    return { success: false, error: 'Not implemented' };
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT DEFAULT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default {
  posts: CommunityPostsService,
  events: CommunityEventsService,
  announcements: CommunityAnnouncementsService,
  stats: CommunityStatsService
};
