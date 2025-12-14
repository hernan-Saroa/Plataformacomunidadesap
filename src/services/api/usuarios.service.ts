/**
 * Usuarios Service
 * Servicio para gestión de usuarios del backoffice
 */

import { apiClient } from './client';
import type { PaginatedResponse } from './config';
import type {
  Usuario,
  FichaUsuario,
  CrearUsuarioRequest,
  ListarUsuariosParams,
  UsuarioRol,
} from './types';

export const usuariosService = {
  /**
   * Listar usuarios con filtros y paginación
   */
  async listar(params: ListarUsuariosParams = {}): Promise<PaginatedResponse<FichaUsuario>> {
    return apiClient.get<PaginatedResponse<FichaUsuario>>('/backoffice/usuarios', { params });
  },

  /**
   * Obtener usuario por ID
   */
  async obtenerPorId(id: string): Promise<FichaUsuario> {
    return apiClient.get<FichaUsuario>(`/backoffice/usuarios/${id}`);
  },

  /**
   * Crear usuario
   */
  async crear(data: CrearUsuarioRequest): Promise<FichaUsuario> {
    return apiClient.post<FichaUsuario>('/backoffice/usuarios', data);
  },

  /**
   * Actualizar usuario
   */
  async actualizar(id: string, data: Partial<CrearUsuarioRequest>): Promise<FichaUsuario> {
    return apiClient.put<FichaUsuario>(`/backoffice/usuarios/${id}`, data);
  },

  /**
   * Eliminar usuario (soft delete)
   */
  async eliminar(id: string): Promise<{ mensaje: string }> {
    return apiClient.delete<{ mensaje: string }>(`/backoffice/usuarios/${id}`);
  },

  /**
   * Cambiar estado de usuario
   */
  async cambiarEstado(
    id: string,
    estado: 'Activo' | 'Inactivo' | 'Suspendido' | 'Bloqueado',
    motivo?: string
  ): Promise<Usuario> {
    return apiClient.patch<Usuario>(`/backoffice/usuarios/${id}/estado`, { estado, motivo });
  },

  /**
   * Asignar rol a usuario
   */
  async asignarRol(
    usuarioId: string,
    data: Omit<UsuarioRol, 'id' | 'usuarioId' | 'activo'>
  ): Promise<UsuarioRol> {
    return apiClient.post<UsuarioRol>(`/backoffice/usuarios/${usuarioId}/roles`, data);
  },

  /**
   * Remover rol de usuario
   */
  async removerRol(usuarioId: string, rolId: string): Promise<{ mensaje: string }> {
    return apiClient.delete<{ mensaje: string }>(`/backoffice/usuarios/${usuarioId}/roles/${rolId}`);
  },

  /**
   * Exportar usuarios
   */
  async exportar(formato: 'csv' | 'excel' | 'pdf', filtros: ListarUsuariosParams = {}): Promise<Blob> {
    const response = await fetch(
      apiClient['buildURL'](`/backoffice/usuarios/exportar`, { ...filtros, formato }),
      {
        headers: apiClient['addAuthHeader'](),
      }
    );
    return response.blob();
  },

  /**
   * Importar usuarios masivamente
   */
  async importar(archivo: File): Promise<{
    totalProcesados: number;
    exitosos: number;
    errores: { fila: number; error: string }[];
  }> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    
    return apiClient.upload('/backoffice/usuarios/importar', formData);
  },

  /**
   * Obtener métricas por sede
   */
  async metricasPorSede(territorialId?: string): Promise<any[]> {
    return apiClient.get('/backoffice/usuarios/metricas/por-sede', {
      params: { territorialId },
    });
  },
};

export default usuariosService;
