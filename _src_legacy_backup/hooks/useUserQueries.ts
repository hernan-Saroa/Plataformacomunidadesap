/**
 * React Query Hooks para Usuarios
 * Manejo optimizado de datos de usuarios con cache inteligente
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// TODO: Usar usuariosService cuando el backend esté listo
// import { usuariosService } from '../services/api';
import { queryKeys } from './useQueryClient';
import { toast } from 'sonner';

// Mock service temporal
const mockUsersService = {
  getAll: async (filters: any) => ({ data: [], pagination: {} }),
  getById: async (id: string) => ({ id, nombre: 'Usuario Test', email: 'test@esap.edu.co' }),
  getStats: async () => ({ total: 0, active: 0, inactive: 0 }),
  create: async (data: any) => ({ id: '1', ...data }),
  update: async (id: string, data: any) => ({ id, ...data }),
  delete: async (id: string) => {},
};

// Types
interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface User {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  [key: string]: any;
}

// Hook para obtener lista de usuarios con filtros
export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => mockUsersService.getAll(filters),
    placeholderData: (previousData) => previousData, // Mantener datos anteriores mientras carga
  });
}

// Hook para obtener detalles de un usuario
export function useUser(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => mockUsersService.getById(userId),
    enabled: !!userId && enabled,
  });
}

// Hook para obtener estadísticas de usuarios
export function useUsersStats() {
  return useQuery({
    queryKey: queryKeys.users.stats(),
    queryFn: () => mockUsersService.getStats(),
    staleTime: 2 * 60 * 1000, // Stats pueden estar cacheadas por 2 minutos
  });
}

// Hook para crear usuario
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: Partial<User>) => mockUsersService.create(userData),
    onSuccess: (newUser) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
      
      // Optimistic update: agregar el nuevo usuario al cache
      queryClient.setQueryData(
        queryKeys.users.detail(newUser.id),
        newUser
      );
      
      toast.success('Usuario creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear usuario');
    },
  });
}

// Hook para actualizar usuario
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      mockUsersService.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancelar queries en vuelo
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(id) });

      // Snapshot del valor anterior
      const previousUser = queryClient.getQueryData(queryKeys.users.detail(id));

      // Optimistic update
      queryClient.setQueryData(queryKeys.users.detail(id), (old: any) => ({
        ...old,
        ...data,
      }));

      return { previousUser };
    },
    onSuccess: (updatedUser, { id }) => {
      // Actualizar cache con datos reales del servidor
      queryClient.setQueryData(queryKeys.users.detail(id), updatedUser);
      
      // Invalidar listas para refrescar
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
      
      toast.success('Usuario actualizado exitosamente');
    },
    onError: (error: any, { id }, context) => {
      // Rollback en caso de error
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.users.detail(id), context.previousUser);
      }
      toast.error(error.message || 'Error al actualizar usuario');
    },
  });
}

// Hook para eliminar usuario
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => mockUsersService.delete(userId),
    onMutate: async (userId) => {
      // Cancelar queries
      await queryClient.cancelQueries({ queryKey: queryKeys.users.lists() });

      // Snapshot
      const previousUsers = queryClient.getQueryData(queryKeys.users.lists());

      // Optimistic update: remover de todas las listas
      queryClient.setQueriesData(
        { queryKey: queryKeys.users.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((user: User) => user.id !== userId),
          };
        }
      );

      return { previousUsers };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
      toast.success('Usuario eliminado exitosamente');
    },
    onError: (error: any, userId, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(queryKeys.users.lists(), context.previousUsers);
      }
      toast.error(error.message || 'Error al eliminar usuario');
    },
  });
}

// Hook para búsqueda en tiempo real con debounce
export function useUserSearch(searchTerm: string, debounceMs = 300) {
  const [debouncedSearch, setDebouncedSearch] = React.useState(searchTerm);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  return useUsers({ search: debouncedSearch });
}

// Hook para prefetch de usuario (hover, etc)
export function usePrefetchUser() {
  const queryClient = useQueryClient();

  return (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.users.detail(userId),
      queryFn: () => mockUsersService.getById(userId),
      staleTime: 5 * 60 * 1000,
    });
  };
}