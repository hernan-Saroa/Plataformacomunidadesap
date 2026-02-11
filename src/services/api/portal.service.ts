/**
 * Portal Service
 * Servicio para el Portal Transaccional (red social universitaria)
 */

import { apiClient } from './client';
import type {
  Publicacion,
  Comentario,
  Conexion,
  Notificacion,
} from './types';

export const portalService = {
  /**
   * FEED Y PUBLICACIONES
   */
  feed: {
    /**
     * Obtener feed principal
     */
    async obtener(params?: {
      offset?: number;
      limit?: number;
      tipo?: 'todos' | 'post' | 'evento' | 'anuncio';
      alcance?: 'todo' | 'programa' | 'sede';
    }): Promise<{
      publicaciones: Publicacion[];
      siguiente: number;
      hayMas: boolean;
    }> {
      return apiClient.get('/portal/feed', { params });
    },

    /**
     * Crear publicación
     */
    async crearPublicacion(data: {
      tipo: 'post' | 'evento' | 'anuncio';
      contenido: string;
      imagenes?: File[];
      archivos?: File[];
      visibilidad: 'publico' | 'estudiantes' | 'programa' | 'sede';
      programaId?: string;
      sedeId?: string;
    }): Promise<Publicacion> {
      const formData = new FormData();
      formData.append('tipo', data.tipo);
      formData.append('contenido', data.contenido);
      formData.append('visibilidad', data.visibilidad);
      
      if (data.programaId) formData.append('programaId', data.programaId);
      if (data.sedeId) formData.append('sedeId', data.sedeId);
      
      if (data.imagenes) {
        data.imagenes.forEach(img => formData.append('imagenes', img));
      }
      
      if (data.archivos) {
        data.archivos.forEach(file => formData.append('archivos', file));
      }
      
      return apiClient.upload<Publicacion>('/portal/publicaciones', formData);
    },

    /**
     * Editar publicación
     */
    async editarPublicacion(id: string, data: Partial<Publicacion>): Promise<Publicacion> {
      return apiClient.put<Publicacion>(`/portal/publicaciones/${id}`, data);
    },

    /**
     * Eliminar publicación
     */
    async eliminarPublicacion(id: string): Promise<{ mensaje: string }> {
      return apiClient.delete<{ mensaje: string }>(`/portal/publicaciones/${id}`);
    },

    /**
     * Like/Unlike publicación
     */
    async toggleLike(publicacionId: string): Promise<{ liked: boolean }> {
      return apiClient.post<{ liked: boolean }>(`/portal/publicaciones/${publicacionId}/like`);
    },

    /**
     * Comentar publicación
     */
    async comentar(publicacionId: string, data: {
      contenido: string;
      comentarioPadreId?: string;
    }): Promise<Comentario> {
      return apiClient.post<Comentario>(`/portal/publicaciones/${publicacionId}/comentarios`, data);
    },

    /**
     * Compartir publicación
     */
    async compartir(publicacionId: string): Promise<{ mensaje: string }> {
      return apiClient.post<{ mensaje: string }>(`/portal/publicaciones/${publicacionId}/compartir`);
    },

    /**
     * Guardar publicación
     */
    async guardar(publicacionId: string): Promise<{ guardado: boolean }> {
      return apiClient.post<{ guardado: boolean }>(`/portal/publicaciones/${publicacionId}/guardar`);
    },

    /**
     * Reportar publicación
     */
    async reportar(publicacionId: string, data: {
      motivo: string;
      descripcion: string;
    }): Promise<{ mensaje: string }> {
      return apiClient.post<{ mensaje: string }>(`/portal/publicaciones/${publicacionId}/reportar`, data);
    },
  },

  /**
   * PERFIL
   */
  perfil: {
    /**
     * Obtener perfil de usuario
     */
    async obtener(usuarioId: string): Promise<any> {
      return apiClient.get(`/portal/perfil/${usuarioId}`);
    },

    /**
     * Obtener mi perfil
     */
    async miPerfil(): Promise<any> {
      return apiClient.get('/portal/perfil/mi-perfil');
    },

    /**
     * Actualizar mi perfil
     */
    async actualizar(data: any): Promise<any> {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      
      return apiClient.upload('/portal/perfil/mi-perfil', formData);
    },

    /**
     * Obtener publicaciones de un usuario
     */
    async publicaciones(usuarioId: string, params?: {
      offset?: number;
      limit?: number;
    }): Promise<Publicacion[]> {
      return apiClient.get<Publicacion[]>(`/portal/perfil/${usuarioId}/publicaciones`, { params });
    },

    /**
     * Obtener conexiones de un usuario
     */
    async conexiones(usuarioId: string): Promise<Conexion[]> {
      return apiClient.get<Conexion[]>(`/portal/perfil/${usuarioId}/conexiones`);
    },
  },

  /**
   * CONEXIONES
   */
  conexiones: {
    /**
     * Obtener mis conexiones
     */
    async mis(): Promise<Conexion[]> {
      return apiClient.get<Conexion[]>('/portal/conexiones');
    },

    /**
     * Obtener solicitudes pendientes
     */
    async solicitudes(): Promise<{
      recibidas: Conexion[];
      enviadas: Conexion[];
    }> {
      return apiClient.get('/portal/conexiones/solicitudes');
    },

    /**
     * Enviar solicitud de conexión
     */
    async enviarSolicitud(destinatarioId: string, mensaje?: string): Promise<Conexion> {
      return apiClient.post<Conexion>('/portal/conexiones/enviar-solicitud', {
        destinatarioId,
        mensaje,
      });
    },

    /**
     * Aceptar solicitud
     */
    async aceptar(solicitudId: string): Promise<Conexion> {
      return apiClient.post<Conexion>(`/portal/conexiones/${solicitudId}/aceptar`);
    },

    /**
     * Rechazar solicitud
     */
    async rechazar(solicitudId: string): Promise<{ mensaje: string }> {
      return apiClient.post<{ mensaje: string }>(`/portal/conexiones/${solicitudId}/rechazar`);
    },

    /**
     * Remover conexión
     */
    async remover(conexionId: string): Promise<{ mensaje: string }> {
      return apiClient.delete<{ mensaje: string }>(`/portal/conexiones/${conexionId}`);
    },

    /**
     * Obtener sugerencias de conexiones
     */
    async sugerencias(params?: { limit?: number }): Promise<any[]> {
      return apiClient.get('/portal/conexiones/sugerencias', { params });
    },
  },

  /**
   * MENSAJERÍA
   */
  mensajeria: {
    /**
     * Listar conversaciones
     */
    async conversaciones(): Promise<any[]> {
      return apiClient.get('/portal/conversaciones');
    },

    /**
     * Obtener mensajes de una conversación
     */
    async mensajes(conversacionId: string, params?: {
      offset?: number;
      limit?: number;
    }): Promise<any[]> {
      return apiClient.get(`/portal/conversaciones/${conversacionId}/mensajes`, { params });
    },

    /**
     * Enviar mensaje
     */
    async enviar(data: {
      conversacionId: string;
      contenido: string;
      imagen?: File;
      archivo?: File;
      respuestaAId?: string;
    }): Promise<any> {
      const formData = new FormData();
      formData.append('conversacionId', data.conversacionId);
      formData.append('contenido', data.contenido);
      
      if (data.respuestaAId) formData.append('respuestaAId', data.respuestaAId);
      if (data.imagen) formData.append('imagen', data.imagen);
      if (data.archivo) formData.append('archivo', data.archivo);
      
      return apiClient.upload('/portal/mensajes', formData);
    },

    /**
     * Editar mensaje
     */
    async editar(mensajeId: string, contenido: string): Promise<any> {
      return apiClient.put(`/portal/mensajes/${mensajeId}`, { contenido });
    },

    /**
     * Eliminar mensaje
     */
    async eliminar(mensajeId: string): Promise<{ mensaje: string }> {
      return apiClient.delete<{ mensaje: string }>(`/portal/mensajes/${mensajeId}`);
    },

    /**
     * Marcar mensaje como leído
     */
    async marcarLeido(mensajeId: string): Promise<{ mensaje: string }> {
      return apiClient.post<{ mensaje: string }>(`/portal/mensajes/${mensajeId}/marcar-leido`);
    },
  },

  /**
   * NOTIFICACIONES
   */
  notificaciones: {
    /**
     * Obtener notificaciones
     */
    async listar(params?: { leidas?: boolean }): Promise<Notificacion[]> {
      return apiClient.get<Notificacion[]>('/portal/notificaciones', { params });
    },

    /**
     * Marcar notificación como leída
     */
    async marcarLeida(id: string): Promise<Notificacion> {
      return apiClient.put<Notificacion>(`/portal/notificaciones/${id}/marcar-leida`);
    },

    /**
     * Marcar todas como leídas
     */
    async marcarTodasLeidas(): Promise<{ mensaje: string }> {
      return apiClient.put<{ mensaje: string }>('/portal/notificaciones/marcar-todas-leidas');
    },

    /**
     * Eliminar notificación
     */
    async eliminar(id: string): Promise<{ mensaje: string }> {
      return apiClient.delete<{ mensaje: string }>(`/portal/notificaciones/${id}`);
    },
  },

  /**
   * BÚSQUEDA
   */
  buscar: {
    /**
     * Búsqueda global
     */
    async global(params: {
      q: string;
      tipo?: 'todos' | 'personas' | 'publicaciones' | 'grupos' | 'eventos';
      offset?: number;
      limit?: number;
    }): Promise<{
      personas: any[];
      publicaciones: any[];
      grupos: any[];
      eventos: any[];
      total: number;
    }> {
      return apiClient.get('/portal/buscar', { params });
    },

    /**
     * Obtener sugerencias de búsqueda
     */
    async sugerencias(): Promise<{ recientes: string[]; populares: string[] }> {
      return apiClient.get('/portal/buscar/sugerencias');
    },
  },
};

export default portalService;
