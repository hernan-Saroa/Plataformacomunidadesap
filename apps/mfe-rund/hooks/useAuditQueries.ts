/**
 * React Query Hooks para Auditoría
 * Optimizado para grandes volúmenes de eventos
 */

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './useQueryClient';

// Types
interface AuditFilters {
  module?: string;
  severity?: string;
  user?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// Servicio mock
const auditService = {
  getEvents: async (filters: AuditFilters) => ({
    data: [],
    total: 0,
    page: filters.page || 1,
    totalPages: 1,
  }),
  getStats: async () => ({
    totalEvents: 15234,
    criticalEvents: 23,
    warningEvents: 187,
  }),
  getTimeline: async (filters: any) => [],
};

// Hook para eventos de auditoría
export function useAuditEvents(filters: AuditFilters = {}) {
  return useQuery({
    queryKey: queryKeys.audit.eventsList(filters),
    queryFn: () => auditService.getEvents(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000, // Events son más volátiles, 30 segundos
  });
}

// Hook con Infinite Scroll para logs largos
export function useAuditEventsInfinite(filters: Omit<AuditFilters, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.audit.events(), 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => 
      auditService.getEvents({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    // Cargar más automáticamente cuando se acerque al final
    staleTime: 30 * 1000,
  });
}

// Hook para estadísticas de auditoría
export function useAuditStats() {
  return useQuery({
    queryKey: queryKeys.audit.stats(),
    queryFn: () => auditService.getStats(),
    staleTime: 1 * 60 * 1000, // Stats pueden ser cacheadas por 1 minuto
    // Refetch automático cada 2 minutos
    refetchInterval: 2 * 60 * 1000,
  });
}

// Hook para timeline de eventos
export function useAuditTimeline(filters: any = {}) {
  return useQuery({
    queryKey: queryKeys.audit.timeline(filters),
    queryFn: () => auditService.getTimeline(filters),
    staleTime: 1 * 60 * 1000,
  });
}

// Hook para auto-refresh de eventos críticos
export function useAuditCriticalEvents(autoRefresh = true) {
  return useQuery({
    queryKey: [...queryKeys.audit.events(), 'critical'],
    queryFn: () => auditService.getEvents({ severity: 'critical', limit: 10 }),
    staleTime: 0, // Siempre fresh
    refetchInterval: autoRefresh ? 30 * 1000 : false, // Refetch cada 30 segundos
    refetchIntervalInBackground: true, // Continuar refetch en background
  });
}

// Hook para prefetch de siguiente página
export function usePrefetchNextAuditPage() {
  const queryClient = useQueryClient();

  return (filters: AuditFilters) => {
    const nextPage = (filters.page || 1) + 1;
    queryClient.prefetchQuery({
      queryKey: queryKeys.audit.eventsList({ ...filters, page: nextPage }),
      queryFn: () => auditService.getEvents({ ...filters, page: nextPage }),
      staleTime: 30 * 1000,
    });
  };
}
