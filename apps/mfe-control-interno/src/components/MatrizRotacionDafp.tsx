'use client';

/**
 * MATRIZ DE ROTACIÓN DAFP
 * 
 * Tabla de referencia que muestra la matriz oficial de períodos de rotación
 * según la ponderación de riesgo y el resultado de la última auditoría
 */

import React from 'react';
import { Info, Calendar } from 'lucide-react';
import { MATRIZ_ROTACION_TABLA } from '@/lib/dafp/constants';

export function MatrizRotacionDafp() {
  return (
    <div className="p-6 bg-white rounded-xl border-2 border-gray-200">
      <div className="flex items-start gap-3 mb-6">
        <Calendar className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            Matriz de Rotación DAFP
          </h3>
          <p className="text-sm text-gray-600">
            Períodos recomendados entre auditorías según ponderación de riesgo y resultado de última auditoría
          </p>
        </div>
      </div>
      
      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#2962FF] to-[#003DA5] text-white">
              <th className="px-4 py-3 text-left font-bold rounded-tl-lg">
                Ponderación de Riesgo
              </th>
              <th className="px-4 py-3 text-center font-bold">
                Resultado ADECUADO
              </th>
              <th className="px-4 py-3 text-center font-bold">
                Resultado INADECUADO
              </th>
              <th className="px-4 py-3 text-center font-bold rounded-tr-lg">
                SIN AUDITORÍA
              </th>
            </tr>
          </thead>
          <tbody>
            {MATRIZ_ROTACION_TABLA.map((fila, index) => {
              const bgColor = 
                fila.ponderacion === 'EXTREMO' ? 'bg-red-50' :
                fila.ponderacion === 'ALTO' ? 'bg-orange-50' :
                fila.ponderacion === 'MODERADO' ? 'bg-yellow-50' :
                fila.ponderacion === 'BAJO' ? 'bg-green-50' :
                'bg-blue-50';
              
              const textColor =
                fila.ponderacion === 'EXTREMO' ? 'text-red-900' :
                fila.ponderacion === 'ALTO' ? 'text-orange-900' :
                fila.ponderacion === 'MODERADO' ? 'text-yellow-900' :
                fila.ponderacion === 'BAJO' ? 'text-green-900' :
                'text-blue-900';
              
              return (
                <tr
                  key={fila.ponderacion}
                  className={`border-b-2 border-gray-100 ${bgColor} hover:bg-opacity-80 transition-colors`}
                >
                  <td className={`px-4 py-3 font-bold ${textColor} ${index === MATRIZ_ROTACION_TABLA.length - 1 ? 'rounded-bl-lg' : ''}`}>
                    {fila.ponderacion}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900 bg-green-50/50">
                    {fila.adecuado}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900 bg-red-50/50">
                    {fila.inadecuado}
                  </td>
                  <td className={`px-4 py-3 text-center font-semibold text-gray-900 bg-gray-50/50 ${index === MATRIZ_ROTACION_TABLA.length - 1 ? 'rounded-br-lg' : ''}`}>
                    {fila.sinAuditoria}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Leyenda */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2 text-xs text-blue-800">
            <p>
              <strong>Interpretación:</strong> La matriz cruza la ponderación de riesgo del proceso (calculada automáticamente) 
              con el resultado de la última auditoría para determinar el período de rotación recomendado.
            </p>
            <p>
              <strong>Ejemplo:</strong> Un proceso con ponderación ALTO y última auditoría INADECUADA debe auditarse en 1 año. 
              Si la última auditoría fue ADECUADA, puede auditarse en 2 años.
            </p>
            <p className="text-blue-700 font-semibold">
              ⚠️ Casos especiales: Ponderación EXTREMO siempre requiere auditoría anual, independientemente del resultado anterior.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
