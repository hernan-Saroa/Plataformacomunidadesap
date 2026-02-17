/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UTILIDADES DE CONVERSIÓN - PROCESO AUDITABLE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Funciones de conversión entre tipos de datos para el módulo de
 * Universo Auditable y Programa Anual de Auditorías.
 * 
 * Uso:
 * - Conversión de ProcesoAuditableUI a FormularioDafpData (formulario)
 * - Normalización de datos del backend
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ProcesoAuditableUI } from '../hooks/useUniversoAuditableData';
import type { FormularioDafpData } from '../FormularioProcesoDafpVisualSimplificado';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

interface EvaluacionRiesgoExtendida {
  riesgosExtremos?: number;
  riesgosAltos?: number;
  riesgosModerados?: number;
  riesgosBajos?: number;
  totalRiesgos?: number;
  requerimientoComite?: boolean;
  requerimientoEntesReg?: boolean;
  probabilidad?: number;
  impacto?: number;
  riesgoInherente?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: Convertir ProcesoAuditable a FormularioDafpData
// ════════════════════════════════════════════════════════════════════════════

/**
 * Convierte un proceso auditable del formato UI al formato del formulario DAFP.
 * Útil para editar un proceso existente en el formulario visual.
 * 
 * @param proceso - Proceso auditable en formato UI (puede ser null para creación)
 * @returns Datos en formato FormularioDafpData o null si el proceso es null
 * 
 * @example
 * ```typescript
 * // En el componente
 * const procesoFormData = convertirProcesoAFormularioDafp(procesoSeleccionado);
 * return <FormularioProcesoDafpVisual procesoInicial={procesoFormData} />
 * ```
 */
export function convertirProcesoAFormularioDafp(
  proceso: ProcesoAuditableUI | null
): FormularioDafpData | null {
  if (!proceso) return null;

  // Extraer datos de riesgo del backend si existen
  const evaluacionRiesgo = proceso._evaluacionRiesgo as EvaluacionRiesgoExtendida | undefined;

  // Usar valores guardados si existen, sino usar defaults
  const riesgosExtremos = evaluacionRiesgo?.riesgosExtremos ?? 0;
  const riesgosAltos = evaluacionRiesgo?.riesgosAltos ?? 0;
  const riesgosModerados = evaluacionRiesgo?.riesgosModerados ?? 0;
  const riesgosBajos = evaluacionRiesgo?.riesgosBajos ?? 0;
  const totalRiesgos = evaluacionRiesgo?.totalRiesgos ?? 
    (riesgosExtremos + riesgosAltos + riesgosModerados + riesgosBajos);

  // Cargar requerimientos especiales guardados
  const requerimientoComite = evaluacionRiesgo?.requerimientoComite ?? false;
  const requerimientoEntesReg = evaluacionRiesgo?.requerimientoEntesReg ?? false;

  // Determinar ponderación de riesgo basada en nivel
  const ponderacionRiesgo = obtenerPonderacionRiesgo(proceso.nivelRiesgo);

  return {
    // Identificación
    id: proceso.id,
    nombre: proceso.nombre,
    vigencia: new Date().getFullYear(),
    fechaCorte: new Date().toISOString().split('T')[0],

    // Sección 1: Riesgos Inherentes
    riesgosExtremos,
    riesgosAltos,
    riesgosModerados,
    riesgosBajos,
    totalRiesgos,

    // Sección 2: Requerimientos especiales
    requerimientoComite,
    requerimientoEntesReg,

    // Sección 3: Información de auditoría anterior
    fechaUltimaAuditoria: normalizarFecha(proceso.ultimaAuditoria),
    resultadoUltimaAuditoria: (proceso as any).resultadoUltimaAuditoria || 'Sin auditoría previa',

    // Cálculos automáticos (placeholder, se recalculan en el formulario)
    ponderacionRiesgo,
    diasTranscurridos: null,
    planRotacion: '1 año',
    diasRotacion: 360,
    decisionRotacion: 'Incluir',
    decisionFinal: 'AUDITORÍA POSTERIOR',
    motivoDecision: '',
    prioridadRegla: calcularPrioridadRegla(proceso.nivelRiesgo),

    // Metadatos de compatibilidad con backend
    codigo: proceso._codigo || proceso.codigo || '',
    macroproceso: proceso._macroproceso || proceso.macroproceso || proceso.categoria || 'General',
    tipoProceso: proceso.tipo,
    dependenciaResponsable: proceso._dependencia || proceso.dependenciaResponsable || '',
    nivelRiesgo: proceso.nivelRiesgo,
    scoreRiesgo: proceso.puntajeRiesgo,
    numeroAuditorias: 0,
    frecuenciaSugerida: proceso.frecuenciaAuditoria,
    horasEstimadas: proceso.horasEstimadas || 60,
    auditable: proceso.auditable,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene la ponderación de riesgo según el nivel
 */
function obtenerPonderacionRiesgo(
  nivelRiesgo: 'Crítico' | 'Alto' | 'Medio' | 'Bajo'
): 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO' {
  const mapa: Record<string, 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO'> = {
    'Crítico': 'EXTREMO',
    'Alto': 'ALTO',
    'Medio': 'MODERADO',
    'Bajo': 'BAJO',
  };
  return mapa[nivelRiesgo] || 'MODERADO';
}

/**
 * Calcula la prioridad de regla según el nivel de riesgo
 */
function calcularPrioridadRegla(nivelRiesgo: string): number {
  const prioridades: Record<string, number> = {
    'Crítico': 1,
    'Alto': 3,
    'Medio': 5,
    'Bajo': 7,
  };
  return prioridades[nivelRiesgo] || 5;
}

/**
 * Normaliza una fecha al formato YYYY-MM-DD para inputs tipo date
 */
function normalizarFecha(fecha: string | undefined | null): string | null {
  if (!fecha) return null;
  
  // Si ya es string, extraer solo la parte de fecha (antes del T)
  if (typeof fecha === 'string') {
    return fecha.split('T')[0];
  }
  
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTACIONES ADICIONALES (para uso futuro)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Alias para compatibilidad con código existente
 */
export const convertirProcesoAFormulario = convertirProcesoAFormularioDafp;
