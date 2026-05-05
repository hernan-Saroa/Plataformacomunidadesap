/**
 * PASO 3: EVALUACIÓN DE RIESGOS DAFP
 * Metodología oficial DAFP para priorización
 */

'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useWizardPAI } from './WizardCrearPAI';
import { calcularPuntajeDAFP, determinarCategoriaRiesgo } from '../types';

export function Paso3EvaluacionRiesgos() {
  const { universoAuditable, evaluacionesRiesgo, setEvaluacionesRiesgo } = useWizardPAI();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#003DA5] flex items-center mb-2">
          <AlertTriangle className="w-7 h-7 mr-3" />
          ⚠️ Evaluación de Riesgos DAFP
        </h2>
        <p className="text-gray-600">
          Evalúe el riesgo de cada unidad auditable usando la metodología DAFP oficial
        </p>
      </div>

      <div className="bg-[#E0EDFF] rounded-xl p-6">
        <h3 className="font-bold text-[#003DA5] mb-3">📊 Fórmula DAFP</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>Score = </strong>(Materialidad × 30%) + (Impacto × 35%) + (Vulnerabilidad × 25%) + (Reincidencia × 10%)</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>✅ <strong>Crítico:</strong> ≥ 4.0</div>
            <div>🟡 <strong>Alto:</strong> 3.0 - 3.9</div>
            <div>🟢 <strong>Medio:</strong> 2.0 - 2.9</div>
            <div>⚪ <strong>Bajo:</strong> &lt; 2.0</div>
          </div>
        </div>
      </div>

      {universoAuditable.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">Primero agregue unidades auditables en el Paso 2</p>
        </div>
      ) : (
        <div className="space-y-4">
          {universoAuditable.map(unidad => {
            const evaluacion = evaluacionesRiesgo.find(e => e.unidadAuditableId === unidad.id);
            const score = evaluacion ? calcularPuntajeDAFP({
              materialidad: evaluacion.materialidad.valor,
              impacto: evaluacion.impacto.valor,
              vulnerabilidad: evaluacion.vulnerabilidad.valor,
              reincidencia: evaluacion.reincidencia.valor
            }) : 0;
            const categoria = determinarCategoriaRiesgo(score);

            return (
              <div key={unidad.id} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                <h3 className="font-bold text-[#003DA5] mb-3">{unidad.nombre}</h3>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <label className="block text-gray-600 mb-1">Materialidad (1-5)</label>
                    <input type="number" min="1" max="5" className="w-full px-2 py-1 border-2 border-gray-300 rounded" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Impacto (1-5)</label>
                    <input type="number" min="1" max="5" className="w-full px-2 py-1 border-2 border-gray-300 rounded" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Vulnerabilidad (1-5)</label>
                    <input type="number" min="1" max="5" className="w-full px-2 py-1 border-2 border-gray-300 rounded" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Reincidencia (1-5)</label>
                    <input type="number" min="1" max="5" className="w-full px-2 py-1 border-2 border-gray-300 rounded" />
                  </div>
                </div>
                {evaluacion && (
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-600">Score: </span>
                      <span className="font-bold text-[#003DA5]">{score.toFixed(2)}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      categoria === 'Crítico' ? 'bg-red-100 text-red-700' :
                      categoria === 'Alto' ? 'bg-orange-100 text-orange-700' :
                      categoria === 'Medio' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {categoria}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
