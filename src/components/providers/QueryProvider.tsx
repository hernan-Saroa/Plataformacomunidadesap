/**
 * ============================================
 * PROVIDER DE REACT QUERY
 * ============================================
 * 
 * Wrapper para configurar React Query en la aplicación.
 * Incluye DevTools para desarrollo.
 * 
 * FECHA: 30 Enero 2025
 * VERSIÓN: 2.0 - FASE 2
 */

import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/utils/query-client';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Provider de React Query
 * 
 * Envuelve la aplicación con QueryClientProvider y DevTools.
 * 
 * @example
 * ```typescript
 * // En App.tsx o layout principal
 * import { QueryProvider } from '@/components/providers/QueryProvider';
 * 
 * function App() {
 *   return (
 *     <QueryProvider>
 *       <TuAplicacion />
 *     </QueryProvider>
 *   );
 * }
 * ```
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      
      {/* DevTools solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

export default QueryProvider;
