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
import type { EvaluacionProcesoUI } from '../hooks/useEvaluacionesProcesoData';
import type { FormularioDafpData } from '../FormularioProcesoDafpVisualSimplificado';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

interface EvaluacionRiesgoExtendida {
  vigencia?: number;
  fechaCorte?: string;
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
  criticidad?: number;
  exposicion?: number;
  mitigantes?: number;
  scoreRiesgo?: number;
  ponderacionRiesgo?: string;
  decisionFinal?: string;
  motivoDecision?: string;
  prioridadRegla?: number;
  diasTranscurridos?: number | null;
  planRotacion?: string;
  diasRotacion?: number;
  decisionRotacion?: string;
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
function mapPonderacionABackend(
  raw: string | undefined,
  fallbackNivel: ProcesoAuditableUI['nivelRiesgo']
): FormularioDafpData['ponderacionRiesgo'] {
  const mapa: Record<string, FormularioDafpData['ponderacionRiesgo']> = {
    EXTREMO: 'EXTREMO',
    ALTO: 'ALTO',
    MODERADO: 'MODERADO',
    BAJO: 'BAJO',
    'MUY BAJO': 'MUY BAJO',
  };
  if (raw && mapa[raw]) return mapa[raw];
  return obtenerPonderacionRiesgo(fallbackNivel);
}

/**
 * @param evaluacionOpcional — Registro `evaluacion_proceso` del backend (hook). Si existe, es la fuente de verdad al editar.
 */
export function convertirProcesoAFormularioDafp(
  proceso: ProcesoAuditableUI | null,
  evaluacionOpcional?: EvaluacionProcesoUI | null
): FormularioDafpData | null {
  if (!proceso) return null;

  if (evaluacionOpcional) {
    const ev = evaluacionOpcional;
    const fechaCorteStr =
      typeof ev.fechaCorte === 'string' ? ev.fechaCorte.split('T')[0] : new Date().toISOString().split('T')[0];
    const totalEv =
      ev.totalRiesgos ??
      (ev.riesgosExtremos || 0) +
        (ev.riesgosAltos || 0) +
        (ev.riesgosModerados || 0) +
        (ev.riesgosBajos || 0);
    const c = ev.criticidad ?? 0;
    const e = ev.exposicion ?? 0;
    const m = ev.mitigantes ?? 0;
    const scoreRiesgoCEM = ev.scoreRiesgo ?? Math.max(0, Math.min(15, c + e - m));
    const nivelRiesgoCEM =
      scoreRiesgoCEM >= 10 ? 'Crítico' : scoreRiesgoCEM >= 7 ? 'Alto' : scoreRiesgoCEM >= 4 ? 'Moderado' : 'Bajo';

    return {
      id: proceso.id,
      nombre: proceso.nombre,
      vigencia: ev.vigencia,
      fechaCorte: fechaCorteStr,
      riesgosExtremos: ev.riesgosExtremos ?? 0,
      riesgosAltos: ev.riesgosAltos ?? 0,
      riesgosModerados: ev.riesgosModerados ?? 0,
      riesgosBajos: ev.riesgosBajos ?? 0,
      totalRiesgos: totalEv,
      requerimientoComite: ev.requerimientoComite ?? false,
      requerimientoEntesReg: ev.requerimientoEntesReg ?? false,
      fechaUltimaAuditoria: ev.fechaUltimaAuditoria ? normalizarFecha(ev.fechaUltimaAuditoria) : null,
      resultadoUltimaAuditoria: (ev.resultadoUltimaAuditoria as FormularioDafpData['resultadoUltimaAuditoria']) || 'Sin auditoría previa',
      ponderacionRiesgo: mapPonderacionABackend(ev.ponderacionRiesgo, proceso.nivelRiesgo),
      diasTranscurridos: ev.diasTranscurridos ?? null,
      planRotacion: ev.planRotacion || '1 año',
      diasRotacion: ev.diasRotacion ?? 360,
      decisionRotacion: (ev.decisionRotacion as FormularioDafpData['decisionRotacion']) || 'Incluir',
      decisionFinal: (ev.decisionFinal as FormularioDafpData['decisionFinal']) || 'AUDITORÍA POSTERIOR',
      motivoDecision: ev.motivoDecision || '',
      prioridadRegla: ev.prioridadRegla ?? 5,
      criticidad: c,
      exposicion: e,
      mitigantes: m,
      scoreRiesgoCEM,
      nivelRiesgoCEM,
      // ── Criterios de priorización DAFP (RE-E-GE-034) ──
      tiempoUltimaAuditoria: ev.tiempoUltimaAuditoria ?? 0,
      temasAltaDireccion: ev.temasAltaDireccion ?? 0,
      objetivosEstrategicos: ev.objetivosEstrategicos ?? 0,
      hallazgosAnteriores: ev.hallazgosAnteriores ?? 0,
      ponderacionFinalDafp: ev.ponderacionFinalDafp ?? 0,
      nivelCriticidadDafp: ev.nivelCriticidadDafp || '',
      cicloRotacionDafp: ev.cicloRotacionDafp || '',
      codigo: proceso._codigo || proceso.codigo || '',
      macroproceso: proceso._macroproceso || proceso.macroproceso || proceso.categoria || 'General',
      tipoProceso: proceso.tipo,
      dependenciaResponsable: ev.dependenciaResponsable || proceso._dependencia || proceso.dependenciaResponsable || '',
      nivelRiesgo: proceso.nivelRiesgo,
      scoreRiesgo: scoreRiesgoCEM ?? proceso.puntajeRiesgo,
      numeroAuditorias: 0,
      frecuenciaSugerida: proceso.frecuenciaAuditoria,
      horasEstimadas: proceso.horasEstimadas || 60,
      auditable: proceso.auditable,
    };
  }

  const evaluacionRiesgo = proceso._evaluacionRiesgo as EvaluacionRiesgoExtendida | undefined;

  const riesgosExtremos = evaluacionRiesgo?.riesgosExtremos ?? 0;
  const riesgosAltos = evaluacionRiesgo?.riesgosAltos ?? 0;
  const riesgosModerados = evaluacionRiesgo?.riesgosModerados ?? 0;
  const riesgosBajos = evaluacionRiesgo?.riesgosBajos ?? 0;
  const totalRiesgos =
    evaluacionRiesgo?.totalRiesgos ??
    riesgosExtremos + riesgosAltos + riesgosModerados + riesgosBajos;

  const requerimientoComite = evaluacionRiesgo?.requerimientoComite ?? false;
  const requerimientoEntesReg = evaluacionRiesgo?.requerimientoEntesReg ?? false;

  const criticidad = evaluacionRiesgo?.criticidad ?? 0;
  const exposicion = evaluacionRiesgo?.exposicion ?? 0;
  const mitigantes = evaluacionRiesgo?.mitigantes ?? 0;
  const scoreRiesgoCEM =
    evaluacionRiesgo?.scoreRiesgo ?? proceso.scoreRiesgo ?? criticidad + exposicion - mitigantes;
  const nivelRiesgoCEM =
    scoreRiesgoCEM >= 10 ? 'Crítico' : scoreRiesgoCEM >= 7 ? 'Alto' : scoreRiesgoCEM >= 4 ? 'Moderado' : 'Bajo';

  const vigencia =
    evaluacionRiesgo?.vigencia ?? new Date().getFullYear();
  const fechaCorteRaw = evaluacionRiesgo?.fechaCorte;
  const fechaCorte = fechaCorteRaw
    ? normalizarFecha(String(fechaCorteRaw)) || new Date().toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const ponderacionRiesgo = evaluacionRiesgo?.ponderacionRiesgo
    ? mapPonderacionABackend(evaluacionRiesgo.ponderacionRiesgo, proceso.nivelRiesgo)
    : obtenerPonderacionRiesgo(proceso.nivelRiesgo);

  return {
    id: proceso.id,
    nombre: proceso.nombre,
    vigencia,
    fechaCorte,

    riesgosExtremos,
    riesgosAltos,
    riesgosModerados,
    riesgosBajos,
    totalRiesgos,

    requerimientoComite,
    requerimientoEntesReg,

    fechaUltimaAuditoria: evaluacionRiesgo?.fechaUltimaAuditoria
      ? normalizarFecha(String(evaluacionRiesgo.fechaUltimaAuditoria))
      : normalizarFecha(proceso.ultimaAuditoria),
    resultadoUltimaAuditoria:
      (evaluacionRiesgo?.resultadoUltimaAuditoria as FormularioDafpData['resultadoUltimaAuditoria']) ||
      (proceso as { resultadoUltimaAuditoria?: string }).resultadoUltimaAuditoria ||
      'Sin auditoría previa',

    ponderacionRiesgo,
    diasTranscurridos: evaluacionRiesgo?.diasTranscurridos ?? null,
    planRotacion: evaluacionRiesgo?.planRotacion || '1 año',
    diasRotacion: evaluacionRiesgo?.diasRotacion ?? 360,
    decisionRotacion: (evaluacionRiesgo?.decisionRotacion as FormularioDafpData['decisionRotacion']) || 'Incluir',
    decisionFinal:
      (evaluacionRiesgo?.decisionFinal as FormularioDafpData['decisionFinal']) || 'AUDITORÍA POSTERIOR',
    motivoDecision: evaluacionRiesgo?.motivoDecision || '',
    prioridadRegla: evaluacionRiesgo?.prioridadRegla ?? calcularPrioridadRegla(proceso.nivelRiesgo),

    criticidad,
    exposicion,
    mitigantes,
    scoreRiesgoCEM,
    nivelRiesgoCEM,

    codigo: proceso._codigo || proceso.codigo || '',
    macroproceso: proceso._macroproceso || proceso.macroproceso || proceso.categoria || 'General',
    tipoProceso: proceso.tipo,
    dependenciaResponsable: proceso._dependencia || proceso.dependenciaResponsable || '',
    nivelRiesgo: proceso.nivelRiesgo,
    scoreRiesgo: scoreRiesgoCEM ?? proceso.puntajeRiesgo,
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
