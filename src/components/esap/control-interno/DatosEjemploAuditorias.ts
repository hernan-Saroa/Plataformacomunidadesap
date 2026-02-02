/**
 * DATOS DE EJEMPLO: AUDITORÍAS CON HALLAZGOS - STUB
 * ⚠️ Datos eliminados para reducir tamaño del proyecto
 */

import { useEffect } from 'react';
import { useIntegracionAuditoriaPlanes, type AuditoriaParaPlan } from './IntegracionAuditoriasPlanesContext';

/**
 * Hook para inicializar datos de ejemplo (STUB)
 */
export function useInicializarDatosEjemplo() {
  const { agregarAuditoriaConHallazgos } = useIntegracionAuditoriaPlanes();

  useEffect(() => {
    // STUB: Sin datos de ejemplo
    AUDITORIAS_EJEMPLO.forEach(auditoria => {
      agregarAuditoriaConHallazgos(auditoria);
    });
  }, []);
}

/**
 * STUB: Array vacío - Agregar datos reales cuando se requieran
 */
const AUDITORIAS_EJEMPLO: AuditoriaParaPlan[] = [];
