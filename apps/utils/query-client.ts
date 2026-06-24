/**
 * ============================================
 * CONFIGURACIÓN DE REACT QUERY
 * ============================================
 * 
 * Cliente de React Query optimizado para el módulo OCIG con:
 * - Cacheo inteligente (stale-while-revalidate)
 * - Retry automático con backoff exponencial
 * - Invalidación selectiva de caché
 * - DevTools en desarrollo
 * 
 * FECHA: 30 Enero 2025
 * VERSIÓN: 2.0 - FASE 2
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

// ============================================
// CONFIGURACIÓN DEL CACHE
// ============================================

/**
 * Query Cache - Manejo centralizado de queries
 */
const queryCache = new QueryCache({
  onError: (error, query) => {
    // Log de errores en queries
    console.error('❌ Query Error:', {
      queryKey: query.queryKey,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    // Notificar errores críticos
    if (error instanceof Error && error.message.includes('Network')) {
      toast.error('Error de conexión', {
        description: 'Verifique su conexión a internet',
        duration: 5000
      });
    }
  },
  onSuccess: (data, query) => {
    // Log de éxito en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Query Success:', {
        queryKey: query.queryKey,
        dataSize: JSON.stringify(data).length
      });
    }
  }
});

/**
 * Mutation Cache - Manejo centralizado de mutations
 */
const mutationCache = new MutationCache({
  onError: (error, variables, context, mutation) => {
    // Log de errores en mutations
    console.error('❌ Mutation Error:', {
      mutationKey: mutation.options.mutationKey,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  },
  onSuccess: (data, variables, context, mutation) => {
    // Log de éxito en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Mutation Success:', {
        mutationKey: mutation.options.mutationKey
      });
    }
  }
});

// ============================================
// CLIENTE DE REACT QUERY
// ============================================

/**
 * Cliente global de React Query
 * 
 * Configuración optimizada para OCIG:
 * - staleTime: Tiempo que los datos se consideran frescos
 * - cacheTime: Tiempo que los datos permanecen en caché
 * - retry: Número de reintentos automáticos
 * - refetchOnWindowFocus: Refetch al volver a la ventana
 */
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // CACHEO Y FRESHNESS
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      /**
       * staleTime: 5 minutos
       * Datos se consideran frescos por 5 minutos.
       * Durante este tiempo, no se refetchean automáticamente.
       */
      staleTime: 5 * 60 * 1000,

      /**
       * cacheTime: 30 minutos
       * Datos permanecen en caché 30 minutos después del último uso.
       * Útil para navegación rápida entre páginas.
       */
      cacheTime: 30 * 60 * 1000,

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // REFETCHING
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      /**
       * refetchOnWindowFocus: true
       * Refetch al volver al tab/ventana (datos siempre frescos)
       */
      refetchOnWindowFocus: true,

      /**
       * refetchOnReconnect: true
       * Refetch al recuperar conexión a internet
       */
      refetchOnReconnect: true,

      /**
       * refetchOnMount: true
       * Refetch al montar componente (si datos están stale)
       */
      refetchOnMount: true,

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // RETRY Y ERROR HANDLING
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      /**
       * retry: 3 intentos
       * Reintenta 3 veces en caso de error
       */
      retry: 3,

      /**
       * retryDelay: Backoff exponencial
       * Espera 1s, 2s, 4s entre reintentos (max 30s)
       */
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      /**
       * retryOnMount: true
       * Reintentar al montar si la última petición falló
       */
      retryOnMount: true,

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // SUSPENSE Y PLACEHOLDERS
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      /**
       * suspense: false
       * No usar Suspense por defecto (control manual de loading)
       */
      suspense: false,

      /**
       * useErrorBoundary: false
       * Manejo de errores manual en componentes
       */
      useErrorBoundary: false,

      /**
       * keepPreviousData: true
       * Mantener datos anteriores mientras se cargan nuevos (mejor UX)
       */
      keepPreviousData: true,

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PERFORMANCE
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      /**
       * notifyOnChangeProps: 'tracked'
       * Solo re-render si las props usadas cambian (optimización)
       */
      notifyOnChangeProps: 'tracked'
    },

    mutations: {
      /**
       * retry: 2 intentos para mutations
       * Menos reintentos que queries (mutations son más críticas)
       */
      retry: 2,

      /**
       * retryDelay: 1 segundo fijo
       * Delay más corto para mutations
       */
      retryDelay: 1000,

      /**
       * useErrorBoundary: false
       * Manejo de errores manual
       */
      useErrorBoundary: false
    }
  }
});

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Invalidar todas las queries de auditorías
 * Útil después de operaciones que afecten múltiples auditorías
 */
export function invalidarAuditorias() {
  queryClient.invalidateQueries({ queryKey: ['auditorias'] });
}

/**
 * Invalidar todas las queries de planes
 */
export function invalidarPlanes() {
  queryClient.invalidateQueries({ queryKey: ['plan-anual'] });
  queryClient.invalidateQueries({ queryKey: ['planes-mejora'] });
}

/**
 * Limpiar completamente el caché
 * Útil después de logout o cambio de contexto
 */
export function limpiarCache() {
  queryClient.clear();
  toast.info('Caché limpiado');
}

/**
 * Prefetch de datos
 * Cargar datos antes de que el usuario los necesite
 */
export async function prefetchAuditorias(filtros?: any) {
  await queryClient.prefetchQuery({
    queryKey: ['auditorias', 'list', filtros],
    queryFn: () => fetch('/api/v1/auditorias').then(res => res.json())
  });
}

/**
 * Obtener datos del caché sin triggear refetch
 */
export function getDatosCache<T>(queryKey: any[]): T | undefined {
  return queryClient.getQueryData<T>(queryKey);
}

/**
 * Setear datos en caché manualmente
 */
export function setDatosCache<T>(queryKey: any[], data: T) {
  queryClient.setQueryData<T>(queryKey, data);
}

/**
 * Cancelar queries en curso
 * Útil antes de unmount de componentes
 */
export async function cancelarQueries(queryKey: any[]) {
  await queryClient.cancelQueries({ queryKey });
}

// ============================================
// CONFIGURACIÓN DE PERSISTENCIA (OPCIONAL)
// ============================================

/**
 * Persistir caché en localStorage (opcional)
 * Útil para mantener datos entre sesiones
 * 
 * NOTA: Deshabilitado por defecto por temas de seguridad
 * (datos sensibles de auditorías)
 */
export function habilitarPersistencia() {
  if (typeof window !== 'undefined') {
    // Guardar caché al descargar página
    window.addEventListener('beforeunload', () => {
      const cache = queryClient.getQueryCache();
      const datos = cache.getAll().map(query => ({
        queryKey: query.queryKey,
        queryHash: query.queryHash,
        state: query.state
      }));

      // Solo persistir datos no sensibles
      const datosFiltrados = datos.filter(d => {
        const key = d.queryKey[0];
        return !['usuarios', 'audit-log'].includes(key as string);
      });

      localStorage.setItem('ocig-query-cache', JSON.stringify(datosFiltrados));
    });

    // Restaurar caché al cargar página
    const cacheGuardado = localStorage.getItem('ocig-query-cache');
    if (cacheGuardado) {
      try {
        const datos = JSON.parse(cacheGuardado);
        datos.forEach((d: any) => {
          queryClient.setQueryData(d.queryKey, d.state.data);
        });
      } catch (error) {
        console.error('Error al restaurar caché:', error);
        localStorage.removeItem('ocig-query-cache');
      }
    }
  }
}

// ============================================
// MÉTRICAS Y MONITOREO (DESARROLLO)
// ============================================

if (process.env.NODE_ENV === 'development') {
  /**
   * Log de métricas de caché cada 30 segundos
   */
  setInterval(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    console.log('📊 React Query Metrics:', {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      cacheSizeKB: Math.round(
        JSON.stringify(queries.map(q => q.state.data)).length / 1024
      )
    });
  }, 30000);
}

// ============================================
// EXPORTACIONES
// ============================================

export default queryClient;

export {
  queryCache,
  mutationCache,
};
