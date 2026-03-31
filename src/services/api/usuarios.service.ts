/**
 * Usuarios Service
 * Servicio para gestión de usuarios del backoffice
 *
 * Nota: Todos los endpoints van al servicio 'auth' del API Gateway
 * URL: /auth/api/v1/backoffice/usuarios -> auth-service:3001/backoffice/usuarios
 */

import { apiClient } from './apiClient';
import type { PaginatedResponse } from './config';
import type {
  Usuario,
  FichaUsuario,
  CrearUsuarioRequest,
  ListarUsuariosParams,
  UsuarioRol,
} from './types';

// Prefijo del servicio en el API Gateway
// Nueva estructura: /{service}/api/v{version}/{path}
const SERVICE_PREFIX = '/auth/api/v1';

export const usuariosService = {
  /**
   * Listar usuarios con filtros y paginación
   */
  async listar(params: ListarUsuariosParams = {}): Promise<PaginatedResponse<FichaUsuario>> {
    return apiClient.get<PaginatedResponse<FichaUsuario>>(`${SERVICE_PREFIX}/backoffice/usuarios`, { params });
  },

  /**
   * Obtener usuario por ID
   */
  async obtenerPorId(id: string): Promise<FichaUsuario> {
    return apiClient.get<FichaUsuario>(`${SERVICE_PREFIX}/backoffice/usuarios/${id}`);
  },

  /**
   * Crear usuario
   */
  async crear(data: CrearUsuarioRequest): Promise<FichaUsuario> {
    return apiClient.post<FichaUsuario>(`${SERVICE_PREFIX}/backoffice/usuarios`, data);
  },

  /**
   * Actualizar usuario
   */
  async actualizar(id: string, data: Partial<CrearUsuarioRequest>): Promise<FichaUsuario> {
    return apiClient.put<FichaUsuario>(`${SERVICE_PREFIX}/backoffice/usuarios/${id}`, data);
  },

  /**
   * Eliminar usuario (soft delete)
   */
  async eliminar(id: string): Promise<{ mensaje: string }> {
    return apiClient.delete<{ mensaje: string }>(`${SERVICE_PREFIX}/backoffice/usuarios/${id}`);
  },

  /**
   * Cambiar estado de usuario
   */
  async cambiarEstado(
    id: string,
    estado: 'Activo' | 'Inactivo' | 'Suspendido' | 'Bloqueado',
    motivo?: string
  ): Promise<Usuario> {
    return apiClient.patch<Usuario>(`${SERVICE_PREFIX}/backoffice/usuarios/${id}/estado`, { estado, motivo });
  },

  /**
   * Asignar rol a usuario
   */
  async asignarRol(
    usuarioId: string,
    data: Omit<UsuarioRol, 'id' | 'usuarioId' | 'activo'>
  ): Promise<UsuarioRol> {
    return apiClient.post<UsuarioRol>(`${SERVICE_PREFIX}/backoffice/usuarios/${usuarioId}/roles`, data);
  },

  /**
   * Remover rol de usuario
   */
  async removerRol(usuarioId: string, rolId: string): Promise<{ mensaje: string }> {
    return apiClient.delete<{ mensaje: string }>(`${SERVICE_PREFIX}/backoffice/usuarios/${usuarioId}/roles/${rolId}`);
  },

  /**
   * Exportar usuarios
   */
  async exportar(formato: 'csv' | 'excel' | 'pdf', filtros: ListarUsuariosParams = {}): Promise<Blob> {
    const response = await fetch(
      apiClient['buildURL'](`${SERVICE_PREFIX}/backoffice/usuarios/exportar`, { ...filtros, formato }),
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

    return apiClient.upload(`${SERVICE_PREFIX}/backoffice/usuarios/importar`, formData);
  },

  /**
   * Obtener métricas por sede
   */
  async metricasPorSede(territorialId?: string): Promise<any[]> {
    return apiClient.get(`${SERVICE_PREFIX}/backoffice/usuarios/metricas/por-sede`, {
      params: { territorialId },
    });
  },
};

export default usuariosService;
