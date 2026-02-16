'use client';

/**
 * FORMULARIO DE EVALUACIÓN DAFP COMPLETA
 * 
 * Wizard de 3 pasos para evaluación de riesgos según modelo DAFP oficial
 * - Paso 1: Conteo de riesgos por nivel
 * - Paso 2: Factores especiales y última auditoría
 * - Paso 3: Vista previa y confirmación
 * 
 * Responsive design con cálculos en tiempo real
 */

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Shield, FileText, ChevronRight, ChevronLeft, Info, Calculator } from 'lucide-react';
import { calcularRiesgoDafp, validarDatosEvaluacion, formatearDiasTranscurridos, type DatosEvaluacionRiesgo, type ResultadoCalculoRiesgo } from '@/lib/dafp/calculoRiesgo';
import { CUESTIONARIO_DAFP, MENSAJES_AYUDA, TOOLTIPS } from '@/lib/dafp/cuestionario';
import { ETIQUETAS_RIESGO, ETIQUETAS_RESULTADO, MATRIZ_ROTACION_TABLA, ORIENTACIONES_PONDERACION } from '@/lib/dafp/constants';
import type { ProcesoAuditable, EvaluacionDafpCompleta } from '@/types/control-interno';

interface Props {
  proceso: ProcesoAuditable;
  evaluacionExistente?: EvaluacionDafpCompleta;
  onGuardar: (evaluacion: Partial<EvaluacionDafpCompleta>) => Promise<void>;
  onCancelar: () => void;
}

export function FormularioEvaluacionDafpCompleta({ 
  proceso, 
  evaluacionExistente,
  onGuardar, 
  onCancelar 
}: Props) {
  // ══════════════════════════════════════════════════════════════
  // ESTADO
  // ══════════════════════════════════════════════════════════════
  
  const [pasoActual, setPasoActual] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    // Paso 1: Conteo de riesgos
    riesgosExtremos: evaluacionExistente?.riesgosExtremos ?? 0,
    riesgosAltos: evaluacionExistente?.riesgosAltos ?? 0,
    riesgosModerados: evaluacionExistente?.riesgosModerados ?? 0,
    riesgosBajos: evaluacionExistente?.riesgosBajos ?? 0,
    
    // Paso 2: Factores especiales
    requerimientoComite: evaluacionExistente?.requerimientoComite ?? false,
    requerimientoEntesReg: evaluacionExistente?.requerimientoEntesReg ?? false,
    fechaUltimaAuditoria: evaluacionExistente?.fechaUltimaAuditoria ?? '',
    resultadoUltimaAuditoria: evaluacionExistente?.resultadoUltimaAuditoria ?? 'SIN_AUDITORIA',
    
    // Paso 3: Observaciones
    observaciones: evaluacionExistente?.observaciones ?? ''
  });
  
  // Resultado del cálculo en tiempo real
  const [resultado, setResultado] = useState<ResultadoCalculoRiesgo | null>(null);
  
  // ══════════════════════════════════════════════════════════════
  // CÁLCULO EN TIEMPO REAL
  // ══════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const fechaCorte = new Date();
    const fechaUltima = formData.fechaUltimaAuditoria ? new Date(formData.fechaUltimaAuditoria) : null;
    
    const datosEvaluacion: DatosEvaluacionRiesgo = {
      riesgosExtremos: formData.riesgosExtremos,
      riesgosAltos: formData.riesgosAltos,
      riesgosModerados: formData.riesgosModerados,
      riesgosBajos: formData.riesgosBajos,
      requerimientoComite: formData.requerimientoComite,
      requerimientoEntesReguladores: formData.requerimientoEntesReg,
      fechaUltimaAuditoria: fechaUltima,
      resultadoUltimaAuditoria: formData.resultadoUltimaAuditoria as any,
      fechaCorte
    };
    
    // Solo calcular si hay al menos un riesgo
    const total = formData.riesgosExtremos + formData.riesgosAltos + formData.riesgosModerados + formData.riesgosBajos;
    if (total > 0) {
      const resultadoCalculo = calcularRiesgoDafp(datosEvaluacion);
      setResultado(resultadoCalculo);
    } else {
      setResultado(null);
    }
  }, [formData]);
  
  // ══════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════
  
  const handleCampoNumerico = (campo: string, valor: string) => {
    const valorNumerico = parseInt(valor) || 0;
    setFormData(prev => ({ ...prev, [campo]: Math.max(0, valorNumerico) }));
  };
  
  const handleCampoBooleano = (campo: string, valor: boolean) => {
    setFormData(prev => ({ ...prev, [campo]: valor }));
  };
  
  const handleCampoTexto = (campo: string, valor: string) => {
    setFormData(prev => ({ ...prev, [campo]: valor }));
  };
  
  const siguiente = () => {
    setErrores([]);
    
    // Validar paso actual antes de avanzar
    if (pasoActual === 1) {
      const total = formData.riesgosExtremos + formData.riesgosAltos + formData.riesgosModerados + formData.riesgosBajos;
      if (total === 0) {
        setErrores(['Debe registrar al menos un riesgo para continuar']);
        return;
      }
    }
    
    setPasoActual(prev => Math.min(3, prev + 1));
  };
  
  const anterior = () => {
    setPasoActual(prev => Math.max(1, prev - 1));
    setErrores([]);
  };
  
  const handleGuardar = async () => {
    if (!resultado) {
      setErrores(['No se puede guardar sin un cálculo válido']);
      return;
    }
    
    setGuardando(true);
    setErrores([]);
    
    try {
      const evaluacion: Partial<EvaluacionDafpCompleta> = {
        // Datos de entrada
        riesgosExtremos: formData.riesgosExtremos,
        riesgosAltos: formData.riesgosAltos,
        riesgosModerados: formData.riesgosModerados,
        riesgosBajos: formData.riesgosBajos,
        totalRiesgos: resultado.totalRiesgos,
        
        requerimientoComite: formData.requerimientoComite,
        requerimientoEntesReg: formData.requerimientoEntesReg,
        
        fechaUltimaAuditoria: formData.fechaUltimaAuditoria || null,
        resultadoUltimaAuditoria: formData.resultadoUltimaAuditoria as any,
        diasDesdeUltimaAuditoria: resultado.diasDesdeUltimaAuditoria,
        
        // Resultados calculados
        ponderacionRiesgo: resultado.ponderacionRiesgo,
        planRotacion: resultado.planRotacion,
        planRotacionDias: resultado.planRotacionDias,
        decisionRotacion: resultado.decisionRotacion,
        decisionFinal: resultado.decisionFinal,
        motivoInclusion: resultado.motivoInclusion,
        
        detalleCalculo: resultado.detalleCalculo,
        inclusionAutomatica: resultado.inclusionAutomatica,
        
        // Metadata
        fechaCorte: new Date().toISOString(),
        fechaEvaluacion: new Date().toISOString(),
        estado: 'BORRADOR',
        observaciones: formData.observaciones
      };
      
      await onGuardar(evaluacion);
    } catch (error) {
      console.error('Error al guardar evaluación DAFP:', error);
      setErrores(['Error al guardar la evaluación. Por favor, intente nuevamente.']);
    } finally {
      setGuardando(false);
    }
  };
  
  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  
  const totalRiesgos = formData.riesgosExtremos + formData.riesgosAltos + formData.riesgosModerados + formData.riesgosBajos;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start md:items-center justify-center p-0 md:p-6 overflow-y-auto">
      <div className="bg-white w-full md:max-w-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-screen md:max-h-[90vh]">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#2962FF] to-[#003DA5] text-white px-6 md:px-8 py-6 md:rounded-t-2xl flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Evaluación DAFP Completa</h2>
              <p className="text-white/90 text-base md:text-lg">{proceso.nombre}</p>
              <p className="text-white/70 text-sm mt-1">{proceso.codigo}</p>
            </div>
            <button
              onClick={onCancelar}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="mt-6 flex items-center gap-2">
            {[1, 2, 3].map((paso) => (
              <div
                key={paso}
                className={`h-2 flex-1 rounded-full transition-all ${
                  paso <= pasoActual ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
          <div className="mt-2 text-sm text-white/80">
            Paso {pasoActual} de 3
          </div>
        </div>
        
        {/* Contenido del paso actual */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
          {/* Errores */}
          {errores.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-1">Error de validación</h4>
                  <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                    {errores.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* PASO 1: Conteo de Riesgos */}
          {pasoActual === 1 && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">{CUESTIONARIO_DAFP[0].titulo}</h3>
                  <p className="text-blue-700 text-sm">{CUESTIONARIO_DAFP[0].descripcion}</p>
                </div>
              </div>
              
              {/* Inputs de conteo */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Riesgos Extremos */}
                <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50/50">
                  <label className="block mb-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-red-900 mb-1">
                      Riesgos EXTREMOS
                      <span className="ml-auto inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white text-xs font-bold">
                        {formData.riesgosExtremos}
                      </span>
                    </span>
                    <span className="text-xs text-red-700">{TOOLTIPS.riesgosExtremos}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.riesgosExtremos}
                    onChange={(e) => handleCampoNumerico('riesgosExtremos', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-red-300 rounded-lg text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                </div>
                
                {/* Riesgos Altos */}
                <div className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50/50">
                  <label className="block mb-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-orange-900 mb-1">
                      Riesgos ALTOS
                      <span className="ml-auto inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#F57C00] text-white text-xs font-bold">
                        {formData.riesgosAltos}
                      </span>
                    </span>
                    <span className="text-xs text-orange-700">{TOOLTIPS.riesgosAltos}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.riesgosAltos}
                    onChange={(e) => handleCampoNumerico('riesgosAltos', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                </div>
                
                {/* Riesgos Moderados */}
                <div className="p-4 border-2 border-yellow-200 rounded-lg bg-yellow-50/50">
                  <label className="block mb-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-yellow-900 mb-1">
                      Riesgos MODERADOS
                      <span className="ml-auto inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500 text-gray-900 text-xs font-bold">
                        {formData.riesgosModerados}
                      </span>
                    </span>
                    <span className="text-xs text-yellow-700">{TOOLTIPS.riesgosModerados}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.riesgosModerados}
                    onChange={(e) => handleCampoNumerico('riesgosModerados', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-yellow-300 rounded-lg text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="0"
                  />
                </div>
                
                {/* Riesgos Bajos */}
                <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50/50">
                  <label className="block mb-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-green-900 mb-1">
                      Riesgos BAJOS
                      <span className="ml-auto inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-xs font-bold">
                        {formData.riesgosBajos}
                      </span>
                    </span>
                    <span className="text-xs text-green-700">{TOOLTIPS.riesgosBajos}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.riesgosBajos}
                    onChange={(e) => handleCampoNumerico('riesgosBajos', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-green-300 rounded-lg text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                </div>
              </div>
              
              {/* Total de riesgos */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calculator className="w-6 h-6 text-blue-600" />
                    <span className="text-lg font-semibold text-blue-900">Total de Riesgos</span>
                  </div>
                  <span className="text-3xl font-bold text-blue-600">{totalRiesgos}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* PASO 2: Factores Especiales */}
          {pasoActual === 2 && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 mb-1">{CUESTIONARIO_DAFP[1].titulo}</h3>
                  <p className="text-purple-700 text-sm">{CUESTIONARIO_DAFP[1].descripcion}</p>
                </div>
              </div>
              
              {/* Requerimiento del Comité */}
              <div className="p-5 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <label className="flex items-start gap-4 cursor-pointer">
                  <div className="relative inline-flex items-center flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={formData.requerimientoComite}
                      onChange={(e) => handleCampoBooleano('requerimientoComite', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                  <div className="flex-1">
                    <span className="block font-semibold text-gray-900 mb-1">
                      ¿Existe requerimiento del Comité de Auditoría o la Dirección?
                    </span>
                    <span className="block text-sm text-gray-600">
                      Si la respuesta es SÍ, automáticamente e independientemente del resultado de la ponderación, el proceso debe ser incluido en el Plan Anual de Auditoría.
                    </span>
                    {formData.requerimientoComite && (
                      <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                        <p className="text-sm font-semibold text-blue-900">✓ INCLUSIÓN AUTOMÁTICA activada</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
              
              {/* Requerimiento de Entes Reguladores */}
              <div className="p-5 border-2 border-gray-200 rounded-lg hover:border-orange-300 transition-colors">
                <label className="flex items-start gap-4 cursor-pointer">
                  <div className="relative inline-flex items-center flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={formData.requerimientoEntesReg}
                      onChange={(e) => handleCampoBooleano('requerimientoEntesReg', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#F57C00]"></div>
                  </div>
                  <div className="flex-1">
                    <span className="block font-semibold text-gray-900 mb-1">
                      ¿Existe requerimiento de Entes Reguladores?
                    </span>
                    <span className="block text-sm text-gray-600">
                      Si la respuesta es SÍ (por ejemplo: Contraloría, Procuraduría, Ministerios), automáticamente el proceso debe ser incluido en el Plan Anual de Auditoría.
                    </span>
                    {formData.requerimientoEntesReg && (
                      <div className="mt-3 p-3 bg-orange-50 border-l-4 border-[#F57C00] rounded">
                        <p className="text-sm font-semibold text-orange-900">✓ INCLUSIÓN AUTOMÁTICA activada</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
              
              {/* Fecha de última auditoría */}
              <div>
                <label className="block mb-2">
                  <span className="block text-sm font-semibold text-gray-900 mb-1">
                    Fecha de última auditoría
                  </span>
                  <span className="block text-sm text-gray-600 mb-3">
                    Ingrese la fecha en que se realizó la última auditoría a este proceso. Deje vacío si nunca se ha auditado.
                  </span>
                </label>
                <input
                  type="date"
                  value={formData.fechaUltimaAuditoria}
                  onChange={(e) => handleCampoTexto('fechaUltimaAuditoria', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Resultado de última auditoría */}
              <div>
                <label className="block mb-2">
                  <span className="block text-sm font-semibold text-gray-900 mb-1">
                    Resultado de la última auditoría
                  </span>
                  <span className="block text-sm text-gray-600 mb-3">
                    Seleccione el resultado general de la última auditoría realizada.
                  </span>
                </label>
                <div className="grid md:grid-cols-3 gap-3">
                  {['SIN_AUDITORIA', 'ADECUADO', 'INADECUADO'].map((resultado) => (
                    <label
                      key={resultado}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.resultadoUltimaAuditoria === resultado
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="resultadoAuditoria"
                        value={resultado}
                        checked={formData.resultadoUltimaAuditoria === resultado}
                        onChange={(e) => handleCampoTexto('resultadoUltimaAuditoria', e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            formData.resultadoUltimaAuditoria === resultado
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {formData.resultadoUltimaAuditoria === resultado && (
                            <div className="w-full h-full rounded-full bg-white scale-50" />
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          formData.resultadoUltimaAuditoria === resultado ? 'text-blue-900' : 'text-gray-700'
                        }`}>
                          {ETIQUETAS_RESULTADO[resultado].label}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* PASO 3: Vista Previa y Confirmación */}
          {pasoActual === 3 && resultado && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                <FileText className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-1">{CUESTIONARIO_DAFP[2].titulo}</h3>
                  <p className="text-green-700 text-sm">{CUESTIONARIO_DAFP[2].descripcion}</p>
                </div>
              </div>
              
              {/* Resultado: Ponderación de Riesgo */}
              <div className="p-6 bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200">
                <h4 className="text-sm font-semibold text-gray-600 mb-3">Ponderación Calculada</h4>
                <div className="flex items-center justify-center mb-4">
                  <div
                    className="inline-flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg"
                    style={{
                      background: resultado.ponderacionRiesgo 
                        ? ETIQUETAS_RIESGO[resultado.ponderacionRiesgo].bgGradient 
                        : '#9CA3AF'
                    }}
                  >
                    <span className="text-2xl md:text-3xl font-bold text-white">
                      {resultado.ponderacionRiesgo 
                        ? ETIQUETAS_RIESGO[resultado.ponderacionRiesgo].label 
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                
                {/* Distribución de riesgos */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-16 text-gray-600">Extremos:</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full transition-all"
                        style={{ width: `${(formData.riesgosExtremos / totalRiesgos) * 100}%` }}
                      />
                    </div>
                    <div className="w-24 text-right font-semibold text-gray-900">
                      {formData.riesgosExtremos} ({resultado.detalleCalculo.porcentajeExtremos}%)
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-16 text-gray-600">Altos:</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#F57C00] h-2 rounded-full transition-all"
                        style={{ width: `${(formData.riesgosAltos / totalRiesgos) * 100}%` }}
                      />
                    </div>
                    <div className="w-24 text-right font-semibold text-gray-900">
                      {formData.riesgosAltos} ({Math.round((formData.riesgosAltos / totalRiesgos) * 100)}%)
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-16 text-gray-600">Moderados:</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full transition-all"
                        style={{ width: `${(formData.riesgosModerados / totalRiesgos) * 100}%` }}
                      />
                    </div>
                    <div className="w-24 text-right font-semibold text-gray-900">
                      {formData.riesgosModerados} ({Math.round((formData.riesgosModerados / totalRiesgos) * 100)}%)
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-16 text-gray-600">Bajos:</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${(formData.riesgosBajos / totalRiesgos) * 100}%` }}
                      />
                    </div>
                    <div className="w-24 text-right font-semibold text-gray-900">
                      {formData.riesgosBajos} ({Math.round((formData.riesgosBajos / totalRiesgos) * 100)}%)
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Plan de Rotación */}
              <div className="p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">Plan de Rotación</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700">Período de rotación:</span>
                    <span className="font-bold text-blue-900">{resultado.planRotacion}</span>
                  </div>
                  {resultado.diasDesdeUltimaAuditoria !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700">Días desde última auditoría:</span>
                      <span className="font-bold text-blue-900">
                        {resultado.diasDesdeUltimaAuditoria} días
                        {' '}
                        ({formatearDiasTranscurridos(resultado.diasDesdeUltimaAuditoria)})
                      </span>
                    </div>
                  )}
                  {resultado.decisionRotacion && (
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700">Decisión por rotación:</span>
                      <span className={`font-bold ${resultado.decisionRotacion === 'INCLUIR' ? 'text-green-600' : 'text-orange-600'}`}>
                        {resultado.decisionRotacion === 'INCLUIR' ? '✓ Incluir' : '○ No incluir'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Decisión Final */}
              <div className={`p-6 rounded-xl border-2 ${
                resultado.decisionFinal === 'INCLUIR_PLAN_ANUAL'
                  ? 'bg-green-50 border-green-500'
                  : 'bg-yellow-50 border-yellow-500'
              }`}>
                <h4 className="text-sm font-semibold mb-3 ${
                  resultado.decisionFinal === 'INCLUIR_PLAN_ANUAL' ? 'text-green-900' : 'text-yellow-900'
                }">
                  Decisión Final
                </h4>
                <div className={`text-2xl font-bold mb-2 ${
                  resultado.decisionFinal === 'INCLUIR_PLAN_ANUAL' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {resultado.decisionFinal === 'INCLUIR_PLAN_ANUAL' 
                    ? '✓ INCLUIR EN PLAN ANUAL' 
                    : '○ Incluir en auditoría posterior'}
                </div>
                <div className={`text-sm ${
                  resultado.decisionFinal === 'INCLUIR_PLAN_ANUAL' ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  <strong>Motivo:</strong> {resultado.motivoInclusion}
                </div>
              </div>
              
              {/* Observaciones */}
              <div>
                <label className="block mb-2">
                  <span className="block text-sm font-semibold text-gray-900 mb-1">
                    Observaciones (opcional)
                  </span>
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => handleCampoTexto('observaciones', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Agregue cualquier observación adicional sobre esta evaluación..."
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Footer con botones de navegación */}
        <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 px-6 md:px-8 py-4 md:rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            {/* Botón Anterior */}
            {pasoActual > 1 && (
              <button
                onClick={anterior}
                className="flex items-center gap-2 px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                <ChevronLeft className="w-5 h-5" />
                Anterior
              </button>
            )}
            
            {pasoActual === 1 && (
              <button
                onClick={onCancelar}
                className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
            )}
            
            {/* Botón Siguiente/Guardar */}
            <div className="ml-auto flex items-center gap-3">
              {pasoActual < 3 ? (
                <button
                  onClick={siguiente}
                  disabled={pasoActual === 1 && totalRiesgos === 0}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#2962FF] to-[#003DA5] text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                >
                  Siguiente
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleGuardar}
                  disabled={guardando || !resultado}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                >
                  {guardando ? 'Guardando...' : 'Guardar Evaluación'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
