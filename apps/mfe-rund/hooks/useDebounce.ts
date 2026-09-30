/**
 * ============================================
 * HOOK: useDebounce
 * ============================================
 * 
 * Custom hook para optimizar búsquedas y filtros con debounce.
 * Reduce el número de llamadas a API y mejora performance.
 * 
 * FECHA: 30 Enero 2025
 * VERSIÓN: 2.0 - FASE 2
 */

import { useState, useEffect } from 'react';

/**
 * Hook de debounce genérico
 * 
 * @param value - Valor a hacer debounce
 * @param delay - Tiempo de espera en milisegundos (default: 300ms)
 * @returns Valor con debounce aplicado
 * 
 * @example
 * ```typescript
 * const [busqueda, setBusqueda] = useState('');
 * const busquedaDebounced = useDebounce(busqueda, 500);
 * 
 * useEffect(() => {
 *   // Solo se ejecuta 500ms después de que el usuario deje de escribir
 *   if (busquedaDebounced) {
 *     fetchResultados(busquedaDebounced);
 *   }
 * }, [busquedaDebounced]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Crear timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpiar timeout si value cambia antes del delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook de debounce con callback
 * 
 * @param callback - Función a ejecutar con debounce
 * @param delay - Tiempo de espera en milisegundos
 * @returns Función con debounce aplicado
 * 
 * @example
 * ```typescript
 * const buscarAuditorias = useDebouncedCallback(
 *   async (texto: string) => {
 *     const resultados = await fetchAuditorias({ busqueda: texto });
 *     setResultados(resultados);
 *   },
 *   500
 * );
 * 
 * // En el input:
 * <input onChange={(e) => buscarAuditorias(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };
}

/**
 * Hook de debounce con estado de carga
 * Útil para mostrar indicadores de carga durante búsquedas
 * 
 * @param value - Valor a hacer debounce
 * @param delay - Tiempo de espera en milisegundos
 * @returns Objeto con valor debounced e indicador de carga
 * 
 * @example
 * ```typescript
 * const [busqueda, setBusqueda] = useState('');
 * const { debouncedValue, isDebouncing } = useDebouncedValue(busqueda, 300);
 * 
 * return (
 *   <div>
 *     <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
 *     {isDebouncing && <Spinner />}
 *     <ResultadosBusqueda query={debouncedValue} />
 *   </div>
 * );
 * ```
 */
export function useDebouncedValue<T>(
  value: T,
  delay: number = 300
): { debouncedValue: T; isDebouncing: boolean } {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    setIsDebouncing(true);

    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return { debouncedValue, isDebouncing };
}

export default useDebounce;
