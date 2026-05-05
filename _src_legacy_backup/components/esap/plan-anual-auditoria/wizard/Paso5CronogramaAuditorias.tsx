/**
 * PASO 5: CRONOGRAMA DE AUDITORÍAS
 * Programación anual de auditorías
 */

'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { useWizardPAI } from './WizardCrearPAI';

export function Paso5CronogramaAuditorias() {
  const { universoAuditable, cronogramaAuditorias } = useWizardPAI();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#003DA5] flex items-center mb-2">
          <Calendar className="w-7 h-7 mr-3" />
          📅 Cronograma de Auditorías
        </h2>
        <p className="text-gray-600">
          Programe las auditorías para el año fiscal
        </p>
      </div>

      <div className="bg-[#E0EDFF] rounded-xl p-6">
        <p className="text-sm text-gray-700">
          🚧 Este paso se completará seleccionando las unidades de mayor riesgo
          y programando las auditorías a lo largo del año.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Auditorías programadas: <strong>{cronogramaAuditorias.length}</strong>
        </p>
      </div>
    </div>
  );
}
