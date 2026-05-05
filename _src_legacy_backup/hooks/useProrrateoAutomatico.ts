/**
 * HOOK: useProrrateoAutomatico
 * 
 * Hook que aplica automáticamente el prorrateo al PTA y gestiona logs de auditoría
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useEffect, useState, useCallback } from 'react';
import { 
  aplicarProrrateoDocumentoMaestro,
  validarProrrateo,
  crearLogProrrateo,
  type ResultadoProrrateo,
  type ComponentesPTA,
  type LogProrrateo
} from '../lib/pta/prorrateo';

interface UseProrrateoOptions {
  horasBase: number;
  componentes: ComponentesPTA;
  ptaId?: string;
  docenteId?: string;
  autoAplicar?: boolean;
  onProrrateoAplicado?: (resultado: ResultadoProrrateo) => void;
  onError?: (error: string) => void;
}

interface UseProrrateoReturn {
  resultado: ResultadoProrrateo | null;
  componentesAjustados: ComponentesPTA;
  seAplicoProrrateo: boolean;
  esValido: boolean;
  erroresValidacion: string[];
  logs: LogProrrateo[];
  aplicarProrrateo: () => void;
  resetear: () => void;
}

export function useProrrateoAutomatico({
  horasBase,
  componentes,
  ptaId,
  docenteId,
  autoAplicar = true,
  onProrrateoAplicado,
  onError
}: UseProrrateoOptions): UseProrrateoReturn {
  
  const [resultado, setResultado] = useState<ResultadoProrrateo | null>(null);
  const [logs, setLogs] = useState<LogProrrateo[]>([]);
  
  const aplicarProrrateoManual = useCallback(() => {
    try {
      // Aplicar prorrateo
      const resultadoProrrateo = aplicarProrrateoDocumentoMaestro(horasBase, componentes);
      
      // Validar resultado
      const validacion = validarProrrateo(resultadoProrrateo);
      
      if (!validacion.valido) {
        const error = `Errores de validación: ${validacion.errores.join(', ')}`;
        onError?.(error);
        console.error('[Prorrateo] Validación fallida:', validacion.errores);
        return;
      }
      
      // Guardar resultado
      setResultado(resultadoProrrateo);
      
      // Crear log de auditoría si tenemos IDs
      if (ptaId && docenteId && resultadoProrrateo.seAplicoProrrateo) {
        const log = crearLogProrrateo(
          ptaId,
          docenteId,
          resultadoProrrateo,
          `Prorrateo automático aplicado. Exceso: ${resultadoProrrateo.exceso}h`
        );
        setLogs(prev => [...prev, log]);
        
        // En producción, aquí enviaríamos el log al backend
        console.log('[Prorrateo] Log de auditoría creado:', log);
      }
      
      // Notificar
      onProrrateoAplicado?.(resultadoProrrateo);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      onError?.(`Error al aplicar prorrateo: ${errorMsg}`);
      console.error('[Prorrateo] Error:', error);
    }
  }, [horasBase, componentes, ptaId, docenteId, onProrrateoAplicado, onError]);
  
  // Auto-aplicar cuando cambien los componentes
  useEffect(() => {
    if (autoAplicar) {
      aplicarProrrateoManual();
    }
  }, [autoAplicar, aplicarProrrateoManual]);
  
  const resetear = useCallback(() => {
    setResultado(null);
    setLogs([]);
  }, []);
  
  // Validar resultado actual
  const validacion = resultado ? validarProrrateo(resultado) : { valido: true, errores: [] };
  
  return {
    resultado,
    componentesAjustados: resultado?.prorrateado || componentes,
    seAplicoProrrateo: resultado?.seAplicoProrrateo || false,
    esValido: validacion.valido,
    erroresValidacion: validacion.errores,
    logs,
    aplicarProrrateo: aplicarProrrateoManual,
    resetear
  };
}

/**
 * Hook simplificado para obtener solo los componentes ajustados
 */
export function useComponentesAjustados(
  horasBase: number,
  componentes: ComponentesPTA
): ComponentesPTA {
  const { componentesAjustados } = useProrrateoAutomatico({
    horasBase,
    componentes,
    autoAplicar: true
  });
  
  return componentesAjustados;
}

/**
 * Hook para verificar si se necesita prorrateo
 */
export function useNecesitaProrrateo(
  horasBase: number,
  componentes: ComponentesPTA
): boolean {
  const total = 
    componentes.docencia + 
    componentes.investigacion + 
    componentes.extension + 
    componentes.complementarias +
    (componentes.administrativas || 0);
  
  return total > horasBase;
}
