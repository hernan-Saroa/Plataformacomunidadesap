/**
 * React Query Client Configuration
 * Optimizado para backoffice con múltiples módulos analíticos
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos
      staleTime: 5 * 60 * 1000,
      // Mantener datos en cache por 10 minutos
      gcTime: 10 * 60 * 1000,
      // Reintentar 3 veces en caso de error
      retry: 3,
      // Delay entre reintentos
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch automático
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // No refetch on mount si los datos están frescos
      refetchOnMount: 'always',
    },
    mutations: {
      // Reintentar mutaciones 2 veces
      retry: 2,
      // Mostrar errores de mutación en consola
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// Query Keys organizados por módulo
export const queryKeys = {
  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    metrics: () => [...queryKeys.dashboard.all, 'metrics'] as const,
    charts: (period: string) => [...queryKeys.dashboard.all, 'charts', period] as const,
  },
  
  // Usuarios
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    stats: () => [...queryKeys.users.all, 'stats'] as const,
  },
  
  // Roles
  roles: {
    all: ['roles'] as const,
    lists: () => [...queryKeys.roles.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.roles.lists(), filters] as const,
    details: () => [...queryKeys.roles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.roles.details(), id] as const,
    permissions: (roleId: string) => [...queryKeys.roles.all, 'permissions', roleId] as const,
  },
  
  // Personas
  personas: {
    all: ['personas'] as const,
    lists: () => [...queryKeys.personas.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.personas.lists(), filters] as const,
    details: () => [...queryKeys.personas.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.personas.details(), id] as const,
    documents: (personId: string) => [...queryKeys.personas.all, 'documents', personId] as const,
    stats: () => [...queryKeys.personas.all, 'stats'] as const,
  },
  
  // Auditoría
  audit: {
    all: ['audit'] as const,
    events: () => [...queryKeys.audit.all, 'events'] as const,
    eventsList: (filters: any) => [...queryKeys.audit.events(), filters] as const,
    stats: () => [...queryKeys.audit.all, 'stats'] as const,
    timeline: (filters: any) => [...queryKeys.audit.all, 'timeline', filters] as const,
  },
} as const;
