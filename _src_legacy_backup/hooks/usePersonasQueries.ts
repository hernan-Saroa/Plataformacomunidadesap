/**
 * React Query Hooks para Personas
 * Optimizado para manejo de grandes volúmenes de datos
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from './useQueryClient';
import { toast } from 'sonner';

// Types
interface PersonaFilters {
  search?: string;
  tipo?: string;
  estado?: string;
  programa?: string;
  page?: number;
  limit?: number;
}

// Servicio mock - reemplazar con el real
const personasService = {
  getAll: async (filters: PersonaFilters) => {
    // Mock data - reemplazar con API real
    return {
      data: [],
      total: 0,
      page: filters.page || 1,
      totalPages: 1,
    };
  },
  getById: async (id: string) => ({ id, nombre: 'Persona' }),
  getStats: async () => ({ total: 0, activos: 0 }),
  getDocuments: async (personId: string) => [],
  create: async (data: any) => ({ id: '1', ...data }),
  update: async (id: string, data: any) => ({ id, ...data }),
  delete: async (id: string) => ({ success: true }),
  validateDocument: async (personId: string, documentId: string) => ({ success: true }),
};

// Hook para lista de personas con infinite scroll
export function usePersonas(filters: PersonaFilters = {}) {
  return useQuery({
    queryKey: queryKeys.personas.list(filters),
    queryFn: () => personasService.getAll(filters),
    placeholderData: (previousData) => previousData,
  });
}

// Hook con Infinite Scroll para tablas grandes
export function usePersonasInfinite(filters: Omit<PersonaFilters, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.personas.lists(), 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => 
      personasService.getAll({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

// Hook para detalles de persona
export function usePersona(personaId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.personas.detail(personaId),
    queryFn: () => personasService.getById(personaId),
    enabled: !!personaId && enabled,
  });
}

// Hook para documentos de persona
export function usePersonaDocuments(personaId: string) {
  return useQuery({
    queryKey: queryKeys.personas.documents(personaId),
    queryFn: () => personasService.getDocuments(personaId),
    enabled: !!personaId,
    staleTime: 1 * 60 * 1000, // Documentos son más estáticos
  });
}

// Hook para estadísticas
export function usePersonasStats() {
  return useQuery({
    queryKey: queryKeys.personas.stats(),
    queryFn: () => personasService.getStats(),
    staleTime: 2 * 60 * 1000,
  });
}

// Hook para crear persona
export function useCreatePersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => personasService.create(data),
    onSuccess: (newPersona) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personas.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.personas.stats() });
      queryClient.setQueryData(
        queryKeys.personas.detail(newPersona.id),
        newPersona
      );
      toast.success('Persona creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear persona');
    },
  });
}

// Hook para actualizar persona
export function useUpdatePersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      personasService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.personas.detail(id) });
      const previousPersona = queryClient.getQueryData(queryKeys.personas.detail(id));
      
      queryClient.setQueryData(queryKeys.personas.detail(id), (old: any) => ({
        ...old,
        ...data,
      }));

      return { previousPersona };
    },
    onSuccess: (updatedPersona, { id }) => {
      queryClient.setQueryData(queryKeys.personas.detail(id), updatedPersona);
      queryClient.invalidateQueries({ queryKey: queryKeys.personas.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.personas.stats() });
      toast.success('Persona actualizada exitosamente');
    },
    onError: (error: any, { id }, context) => {
      if (context?.previousPersona) {
        queryClient.setQueryData(
          queryKeys.personas.detail(id),
          context.previousPersona
        );
      }
      toast.error(error.message || 'Error al actualizar persona');
    },
  });
}

// Hook para validar documento
export function useValidateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ personId, documentId }: { personId: string; documentId: string }) =>
      personasService.validateDocument(personId, documentId),
    onSuccess: (_, { personId }) => {
      // Invalidar documentos y stats
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.personas.documents(personId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.personas.stats() 
      });
      toast.success('Documento validado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al validar documento');
    },
  });
}

// Hook para eliminar persona
export function useDeletePersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (personaId: string) => personasService.delete(personaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personas.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.personas.stats() });
      toast.success('Persona eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar persona');
    },
  });
}

// Hook para prefetch
export function usePrefetchPersona() {
  const queryClient = useQueryClient();

  return (personaId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.personas.detail(personaId),
      queryFn: () => personasService.getById(personaId),
      staleTime: 5 * 60 * 1000,
    });
  };
}
