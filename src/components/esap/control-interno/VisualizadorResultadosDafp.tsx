'use client';

/**
 * VISUALIZADOR DE RESULTADOS DAFP
 * 
 * Muestra los resultados de la evaluación DAFP en un formato limpio y visual
 * Incluye:
 * - Ponderación de riesgo con badge colorido
 * - Plan de rotación
 * - Decisión final con justificación
 * - Gráfico de distribución de riesgos
 * - Comparativa con evaluación inicial (si existe)
 */

import React from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Shield, 
  TrendingUp,
  BarChart3,
  Info
} from 'lucide-react';
import { ETIQUETAS_RIESGO, ETIQUETAS_RESULTADO, ETIQUETAS_ESTADO } from '@/lib/dafp/constants';
import { formatearDiasTranscurridos } from '@/lib/dafp/calculoRiesgo';
import type { ProcesoAuditable, EvaluacionDafpCompleta, EvaluacionInicial } from '@/types/control-interno';

interface Props {
  proceso: ProcesoAuditable;
  showComparativa?: boolean;
}

export function VisualizadorResultadosDafp({ proceso, showComparativa = true }: Props) {
  const evalDafp = proceso.evaluacionDafp;
  const evalInicial = proceso.evaluacionInicial;
  
  if (!evalDafp) {
    return (
      <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900 mb-1">Evaluación DAFP pendiente</h4>
            <p className="text-sm text-yellow-700">
              Este proceso aún no tiene una evaluación DAFP completa. 
              Solo cuenta con la evaluación inicial de 7 preguntas.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  const etiquetaPonderacion = evalDafp.ponderacionRiesgo 
    ? ETIQUETAS_RIESGO[evalDafp.ponderacionRiesgo] 
    : null;
  
  const etiquetaResultado = evalDafp.resultadoUltimaAuditoria
    ? ETIQUETAS_RESULTADO[evalDafp.resultadoUltimaAuditoria]
    : null;
  
  const etiquetaEstado = ETIQUETAS_ESTADO[evalDafp.estado];
  
  return (
    <div className="space-y-6">
      {/* Header con estado */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-2xl font-bold text-gray-900">Evaluación DAFP Completa</h3>
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{
            color: etiquetaEstado.color,
            backgroundColor: etiquetaEstado.bgColor
          }}
        >
          {etiquetaEstado.label}
        </div>
      </div>
      
      {/* Ponderación de Riesgo - Destacada */}
      <div className="p-8 bg-gradient-to-br from-white via-gray-50 to-blue-50/30 rounded-2xl border-2 border-gray-200 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-gray-600" />
          <h4 className="text-lg font-bold text-gray-900">Ponderación Calculada</h4>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Badge de ponderación */}
          <div className="flex-shrink-0">
            {etiquetaPonderacion ? (
              <div
                className="px-10 py-6 rounded-2xl shadow-2xl"
                style={{
                  background: etiquetaPonderacion.bgGradient
                }}
              >
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-black text-white mb-2">
                    {etiquetaPonderacion.label.toUpperCase()}
                  </div>
                  <div className="text-white/80 text-sm font-medium">
                    Nivel de Riesgo
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-10 py-6 rounded-2xl shadow-2xl bg-gray-400">
                <div className="text-4xl font-black text-white">N/A</div>
              </div>
            )}
          </div>
          
          {/* Distribución de riesgos */}
          <div className="flex-1 w-full">
            <h5 className="text-sm font-semibold text-gray-600 mb-3">
              Distribución de Riesgos ({evalDafp.totalRiesgos} total)
            </h5>
            <div className="space-y-3">
              {/* Extremos */}
              <div>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="font-medium text-gray-700">Extremos</span>
                  <span className="font-bold text-gray-900">
                    {evalDafp.riesgosExtremos} ({evalDafp.detalleCalculo.porcentajeExtremos}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-600 to-red-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(evalDafp.riesgosExtremos / evalDafp.totalRiesgos) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Altos */}
              <div>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="font-medium text-gray-700">Altos</span>
                  <span className="font-bold text-gray-900">
                    {evalDafp.riesgosAltos} ({Math.round((evalDafp.riesgosAltos / evalDafp.totalRiesgos) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#F57C00] to-orange-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(evalDafp.riesgosAltos / evalDafp.totalRiesgos) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Moderados */}
              <div>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="font-medium text-gray-700">Moderados</span>
                  <span className="font-bold text-gray-900">
                    {evalDafp.riesgosModerados} ({Math.round((evalDafp.riesgosModerados / evalDafp.totalRiesgos) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(evalDafp.riesgosModerados / evalDafp.totalRiesgos) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Bajos */}
              <div>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="font-medium text-gray-700">Bajos</span>
                  <span className="font-bold text-gray-900">
                    {evalDafp.riesgosBajos} ({Math.round((evalDafp.riesgosBajos / evalDafp.totalRiesgos) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-600 to-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(evalDafp.riesgosBajos / evalDafp.totalRiesgos) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Plan de Rotación */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-blue-900">Plan de Rotación</h4>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-blue-700 mb-1">Período recomendado</div>
              <div className="text-2xl font-bold text-blue-900">{evalDafp.planRotacion}</div>
            </div>
            {evalDafp.fechaUltimaAuditoria && (
              <>
                <div className="border-t-2 border-blue-200 pt-3">
                  <div className="text-sm text-blue-700 mb-1">Última auditoría</div>
                  <div className="font-semibold text-blue-900">
                    {new Date(evalDafp.fechaUltimaAuditoria).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                {evalDafp.diasDesdeUltimaAuditoria !== null && (
                  <div>
                    <div className="text-sm text-blue-700 mb-1">Tiempo transcurrido</div>
                    <div className="font-semibold text-blue-900">
                      {formatearDiasTranscurridos(evalDafp.diasDesdeUltimaAuditoria)}
                      <span className="text-sm text-blue-600 ml-2">
                        ({evalDafp.diasDesdeUltimaAuditoria} días)
                      </span>
                    </div>
                  </div>
                )}
                {etiquetaResultado && (
                  <div>
                    <div className="text-sm text-blue-700 mb-1">Resultado</div>
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold"
                      style={{
                        color: etiquetaResultado.color,
                        backgroundColor: etiquetaResultado.bgColor
                      }}
                    >
                      {etiquetaResultado.label}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Decisión Final */}
        <div className={`p-6 rounded-xl border-2 ${
          evalDafp.decisionFinal === 'INCLUIR_PLAN_ANUAL'
            ? 'bg-green-50 border-green-500'
            : 'bg-yellow-50 border-yellow-500'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            {evalDafp.decisionFinal === 'INCLUIR_PLAN_ANUAL' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Clock className="w-5 h-5 text-yellow-600" />
            )}
            <h4 className={`font-bold ${
              evalDafp.decisionFinal === 'INCLUIR_PLAN_ANUAL' ? 'text-green-900' : 'text-yellow-900'
            }`}>
              Decisión Final
            </h4>
          </div>
          <div className={`text-3xl font-black mb-3 ${
            evalDafp.decisionFinal === 'INCLUIR_PLAN_ANUAL' ? 'text-green-600' : 'text-yellow-600'
          }`}>
            {evalDafp.decisionFinal === 'INCLUIR_PLAN_ANUAL' ? '✓ INCLUIR' : '○ POSTERGAR'}
          </div>
          <div className={`text-sm ${
            evalDafp.decisionFinal === 'INCLUIR_PLAN_ANUAL' ? 'text-green-700' : 'text-yellow-700'
          }`}>
            {evalDafp.decisionFinal === 'INCLUIR_PLAN_ANUAL' 
              ? 'Incluir en Plan Anual de Auditoría'
              : 'Incluir en auditoría posterior'}
          </div>
          
          <div className="mt-4 pt-4 border-t-2 border-current/20">
            <div className={`text-sm font-semibold mb-1 ${
              evalDafp.decisionFinal === 'INCLUIR_PLAN_ANUAL' ? 'text-green-900' : 'text-yellow-900'
            }`}>
              Motivo:
            </div>
            <div className={`text-sm ${
              evalDafp.decisionFinal === 'INCLUIR_PLAN_ANUAL' ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {evalDafp.motivoInclusion}
            </div>
          </div>
        </div>
      </div>
      
      {/* Banderas de Inclusión Automática */}
      {(evalDafp.inclusionAutomatica.porComite || 
        evalDafp.inclusionAutomatica.porRiesgoExtremo || 
        evalDafp.inclusionAutomatica.porEntesReguladores || 
        evalDafp.inclusionAutomatica.porRotacion) && (
        <div className="p-6 bg-purple-50 rounded-xl border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-purple-600" />
            <h4 className="font-bold text-purple-900">Criterios de Inclusión Automática</h4>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {evalDafp.inclusionAutomatica.porComite && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-purple-200">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900">Requerimiento del Comité</span>
              </div>
            )}
            {evalDafp.inclusionAutomatica.porRiesgoExtremo && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-purple-200">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900">Ponderación EXTREMO</span>
              </div>
            )}
            {evalDafp.inclusionAutomatica.porEntesReguladores && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-purple-200">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900">Entes Reguladores</span>
              </div>
            )}
            {evalDafp.inclusionAutomatica.porRotacion && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-purple-200">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900">Período de Rotación</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Comparativa con Evaluación Inicial (si existe) */}
      {showComparativa && evalInicial && (
        <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-blue-900">Comparativa de Evaluaciones</h4>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Evaluación Inicial */}
            <div className="p-4 bg-white rounded-lg border border-blue-200">
              <div className="text-sm font-semibold text-blue-600 mb-2">Evaluación Inicial (7 Preguntas)</div>
              <div className="flex items-baseline gap-2 mb-2">
                <div className="text-3xl font-bold text-blue-900">{evalInicial.scoreRiesgo}</div>
                <div className="text-sm text-blue-600">/100</div>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-100 text-blue-900 text-sm font-semibold">
                {evalInicial.nivelRiesgo}
              </div>
              <div className="mt-3 text-xs text-blue-700">
                Frecuencia sugerida: <strong>{evalInicial.frecuenciaSugerida}</strong>
              </div>
            </div>
            
            {/* Evaluación DAFP */}
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <div className="text-sm font-semibold text-purple-600 mb-2">Evaluación DAFP Completa</div>
              {etiquetaPonderacion && (
                <>
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xl font-bold mb-2"
                    style={{
                      color: etiquetaPonderacion.color,
                      backgroundColor: etiquetaPonderacion.bgColor
                    }}
                  >
                    {etiquetaPonderacion.label}
                  </div>
                  <div className="text-xs text-purple-700 mt-3">
                    Plan rotación: <strong>{evalDafp.planRotacion}</strong>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Análisis de coincidencia */}
          <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-blue-800">
                {analizarCoincidencia(evalInicial.nivelRiesgo, evalDafp.ponderacionRiesgo)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Observaciones */}
      {evalDafp.observaciones && (
        <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
          <h4 className="font-bold text-gray-900 mb-2">Observaciones</h4>
          <p className="text-gray-700 whitespace-pre-wrap">{evalDafp.observaciones}</p>
        </div>
      )}
      
      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500 mb-1">Fecha de evaluación</div>
          <div className="font-semibold text-gray-900">
            {new Date(evalDafp.fechaEvaluacion).toLocaleDateString('es-ES')}
          </div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Fecha de corte</div>
          <div className="font-semibold text-gray-900">
            {new Date(evalDafp.fechaCorte).toLocaleDateString('es-ES')}
          </div>
        </div>
        {evalDafp.evaluadoPor && (
          <div>
            <div className="text-gray-500 mb-1">Evaluado por</div>
            <div className="font-semibold text-gray-900">{evalDafp.evaluadoPor}</div>
          </div>
        )}
        {evalDafp.aprobadoPor && evalDafp.fechaAprobacion && (
          <div>
            <div className="text-gray-500 mb-1">Aprobado por</div>
            <div className="font-semibold text-gray-900">{evalDafp.aprobadoPor}</div>
            <div className="text-xs text-gray-600">
              {new Date(evalDafp.fechaAprobacion).toLocaleDateString('es-ES')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Analiza la coincidencia entre ambas evaluaciones
 */
function analizarCoincidencia(
  nivelInicial: 'Crítico' | 'Alto' | 'Medio' | 'Bajo',
  ponderacionDafp: 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO' | 'MUY_BAJO' | null
): string {
  if (!ponderacionDafp) return 'No se puede comparar sin ponderación DAFP.';
  
  const mapeo: Record<string, string[]> = {
    'Crítico': ['EXTREMO'],
    'Alto': ['EXTREMO', 'ALTO'],
    'Medio': ['ALTO', 'MODERADO'],
    'Bajo': ['MODERADO', 'BAJO', 'MUY_BAJO']
  };
  
  const coincide = mapeo[nivelInicial]?.includes(ponderacionDafp);
  
  if (coincide) {
    return `✓ Ambas evaluaciones coinciden en un nivel de riesgo ${nivelInicial === 'Crítico' ? 'crítico/extremo' : nivelInicial.toLowerCase()}.`;
  } else {
    return `⚠️ Las evaluaciones difieren: Inicial=${nivelInicial}, DAFP=${ponderacionDafp}. Se recomienda revisar la evaluación inicial.`;
  }
}
